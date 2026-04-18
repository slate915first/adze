// ============================================================================
// src/data/loaders.js
// ----------------------------------------------------------------------------
// Fetch-based JSON loader. Replaces the v14.2 DOM-sidecar approach: there is
// no build step, nothing is inlined, every data file is a real file under
// src/content/ that's fetched at boot.
//
// All content globals (STRINGS, CHARACTERS, MARA_ARMIES, PATH_LAYERS, ...)
// are declared here with `let` and populated by `loadAllData()`. They start
// as `undefined`. Other modules reference these names inside function bodies,
// so those references resolve at call time — which is always after
// loadAllData() has resolved (bootstrap.js awaits it before calling render).
//
// Load order contract:
//   1. index.html includes config.js, then this file, then everything else.
//   2. bootstrap.js (loaded last) does `await loadAllData()` before any
//      render() call or state read.
//
// Three file shapes are handled:
//   - Plain JSON files (46 of them) — fetch + parse.
//   - Sutta markdown files under content/suttas/*.md — fetch, parse YAML
//     frontmatter, extract summary paragraph. Replicates the build.js
//     resolveSuttasMd() logic in the browser.
//   - Sutta-questions JSON files under content/sutta-questions/*.json —
//     each has shape { suttaId, questions: [...] }; merge into a dict
//     keyed by suttaId. Replicates build.js resolveSuttaQuestionsJson().
// ============================================================================

// ---------------------------------------------------------------------------
// App-wide identifiers (synchronous — no dependency on fetched data)
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'habit_quest_v4';
const APP_VERSION = '15.8';
const LEGACY_KEYS = ['habit_quest_v3_5', 'habit_quest_v3_3'];
const APP_NAME = 'Adze';
const APP_TAGLINE = 'The Path of Awakening';

// ---------------------------------------------------------------------------
// Content globals — declared here, populated by loadAllData().
// `let` (not `const`) because assignment happens after fetch resolves.
// Other modules reference these inside function bodies; those references
// see the post-fetch value at call time.
// ---------------------------------------------------------------------------
let STRINGS,
    CHARACTERS,
    MARA_ARMIES,
    PATH_LAYERS,
    TEN_FETTERS,
    NOBLE_PERSONS,
    PATH_GATE,
    FIVE_HINDRANCES,
    HINDRANCE_EVIDENCE_KEYWORDS,
    __PATH_RANKS_DATA,
    SEVEN_FACTORS,
    DAILY_REFLECTIONS,
    WEEKLY_REFLECTIONS,
    MONTHLY_REFLECTIONS,
    STAGES,
    WISDOM_SCROLLS,
    SUTTA_LIBRARY,
    SUTTA_SUBCATEGORIES,
    SUTTA_SUBCATEGORY_GROUPS,
    SUTTA_SUBCATEGORY_TAGS,
    STRUGGLE_PHRASES,
    SUTTA_QUESTIONS,
    FOUNDATION_CURRICULUM,
    DIFFICULTY_PATHS,
    DURATION_MODES,
    QUEST_CATEGORIES,
    MINDFULNESS_SMALL_HABITS,
    __ASSESSMENT,
    ONBOARDING_DIAGNOSTIC,
    DAILY_DIAGNOSTIC_POOL,
    WEEKLY_DIAGNOSTIC,
    MONTHLY_DIAGNOSTIC,
    TECHNIQUE_PRESCRIPTIONS,
    MEDITATION_TUTORIAL,
    METTA_TUTORIAL,
    JHANA_INTRO,
    GUIDED_FLOWS,
    FOUR_NOBLE_TRUTHS,
    EIGHTFOLD_PATH,
    FOUNDATIONS_CONTENT_MAP,
    PRE_SIT_CHIPS,
    POST_SIT_CHIPS,
    TISIKKHA_THRESHOLDS_BY_RANK,
    ARMY_STATUS_THRESHOLDS,
    FEEDBACK_AREAS,
    FEEDBACK_SEVERITY,
    FEEDBACK_FREQUENCY,
    TEACHING_QUOTES;

// ---------------------------------------------------------------------------
// Sutta file lists. Hardcoded because fetch() can't enumerate a directory.
// When a sutta is added/removed, edit these lists.
//
// Generated from content/suttas/ and content/sutta-questions/ as of v15.0.
// Adding a file without updating the list means it silently won't load;
// removing a file without updating the list throws at boot (fetch 404).
// Both failure modes are loud enough to catch.
// ---------------------------------------------------------------------------
const SUTTA_FILES = [
  'an10_60', 'an3_65', 'an5_159', 'an5_198', 'an5_51', 'an7_58',
  'dn1', 'dn16',
  'mn10', 'mn117', 'mn118', 'mn139', 'mn14', 'mn152',
  'mn18', 'mn19', 'mn2', 'mn20', 'mn21', 'mn22', 'mn26', 'mn27',
  'mn36', 'mn4', 'mn58', 'mn61', 'mn9',
  'sn12_2', 'sn22_101', 'sn22_45', 'sn35_28',
  'sn46_51', 'sn47_19', 'sn4_1', 'sn56_11', 'sn7_2',
  'snp1_8', 'snp2_4', 'snp3_2'
];

const SUTTA_QUESTION_FILES = [
  'mn10', 'mn117', 'mn118', 'mn26', 'mn9', 'sn56_11'
];

// ---------------------------------------------------------------------------
// Sutta markdown parsing (ported from scripts/build.js resolveSuttasMd).
// Supports the YAML subset the sutta files use: scalars, quoted scalars,
// numbers, booleans, null, flow-style arrays. Throws on unsupported shapes.
// ---------------------------------------------------------------------------
function parseFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) throw new Error('no frontmatter found');
  const fmText = m[1];
  const body   = text.slice(m[0].length);
  const data   = {};
  for (const rawLine of fmText.split('\n')) {
    const line = rawLine.replace(/^\s+|\s+$/g, '');
    if (!line) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) throw new Error('malformed frontmatter line: ' + line);
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    data[key] = parseYamlValue(val);
  }
  return { data, body };
}

function parseYamlValue(val) {
  if (val === '') return '';
  // Quoted string
  if ((val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))) {
    return JSON.parse('"' + val.slice(1, -1).replace(/"/g, '\\"') + '"');
  }
  // Flow-style array: [a, b, c]
  if (val.startsWith('[') && val.endsWith(']')) {
    const inner = val.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map(s => parseYamlValue(s.trim()));
  }
  // Number
  if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
  // Boolean / null
  if (val === 'true')  return true;
  if (val === 'false') return false;
  if (val === 'null' || val === '~') return null;
  // Plain string
  return val;
}

// Extract the summary paragraph from a sutta markdown body. Body structure:
//   # REF — NAME
//   *english*
//
//   <summary paragraph(s)>
//
//   ## When to return...
function extractSummary(body) {
  const lines = body.split('\n');
  let i = 0;
  // Skip to H1
  while (i < lines.length && !/^#\s/.test(lines[i])) i++;
  if (i < lines.length) i++; // skip H1 itself
  // Skip blank + italic line
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i < lines.length && /^\*[^*]+\*\s*$/.test(lines[i].trim())) i++;
  // Collect until first `## `
  const out = [];
  while (i < lines.length && !/^##\s/.test(lines[i])) {
    out.push(lines[i]);
    i++;
  }
  return out.join('\n').trim();
}

// Fetch and parse one sutta .md file → the SUTTA_LIBRARY entry shape
async function fetchSutta(stem) {
  const res = await fetch('content/suttas/' + stem + '.md');
  if (!res.ok) throw new Error('fetch failed: content/suttas/' + stem + '.md (HTTP ' + res.status + ')');
  const text = await res.text();
  const { data, body } = parseFrontmatter(text);
  const summary = extractSummary(body);
  if (!summary) throw new Error('empty summary in ' + stem + '.md');
  return {
    id:      data.id,
    ref:     data.ref,
    name:    data.name,
    english: data.english,
    minRank: data.minRank,
    teaches: data.teaches || [],
    summary: summary
  };
}

// Fetch one sutta-questions file → [stem, questions[]] pair for dict merge
async function fetchSuttaQuestions(stem) {
  const res = await fetch('content/sutta-questions/' + stem + '.json');
  if (!res.ok) throw new Error('fetch failed: content/sutta-questions/' + stem + '.json (HTTP ' + res.status + ')');
  const payload = await res.json();
  if (!payload.suttaId || !Array.isArray(payload.questions)) {
    throw new Error(stem + '.json does not match {suttaId, questions:[]} shape');
  }
  return [payload.suttaId, payload.questions];
}

// ---------------------------------------------------------------------------
// Generic JSON file fetcher
// ---------------------------------------------------------------------------
async function fetchJson(relPath) {
  const res = await fetch(relPath);
  if (!res.ok) throw new Error('fetch failed: ' + relPath + ' (HTTP ' + res.status + ')');
  return res.json();
}

// ---------------------------------------------------------------------------
// loadAllData — the one public entry point. Fetches every content file in
// parallel via Promise.all, then assigns the results to the module-level
// `let` bindings declared above.
//
// This function is idempotent; calling it twice fetches twice. bootstrap.js
// calls it exactly once.
// ---------------------------------------------------------------------------
async function loadAllData() {
  const [
    strings,
    characters,
    maraArmies,
    pathLayers,
    tenFetters,
    noblePersons,
    pathGate,
    fiveHindrances,
    hindranceEvidenceKeywords,
    pathRanksData,
    sevenFactors,
    dailyReflections,
    weeklyReflections,
    monthlyReflections,
    stages,
    wisdomScrolls,
    suttaSubcategories,
    suttaSubcategoryGroups,
    suttaSubcategoryTags,
    strugglePhrases,
    foundationCurriculum,
    difficultyPaths,
    durationModes,
    questCategories,
    mindfulnessSmallHabits,
    assessment,
    onboardingDiagnostic,
    dailyDiagnosticPool,
    weeklyDiagnostic,
    monthlyDiagnostic,
    techniquePrescriptions,
    meditationTutorial,
    mettaTutorial,
    jhanaIntro,
    guidedFlows,
    fourNobleTruths,
    eightfoldPath,
    foundationsContentMap,
    preSitChips,
    postSitChips,
    tisikkhaThresholdsByRank,
    armyStatusThresholds,
    feedbackAreas,
    feedbackSeverity,
    feedbackFrequency,
    teachingQuotes,
    suttaLibrary,
    suttaQuestionsDict
  ] = await Promise.all([
    fetchJson('content/strings/en.json'),
    fetchJson('content/characters/characters.json'),
    fetchJson('content/mara-armies/armies.json'),
    fetchJson('content/ranks/path-layers.json'),
    fetchJson('content/ranks/ten-fetters.json'),
    fetchJson('content/ranks/noble-persons.json'),
    fetchJson('content/ranks/path-gate.json'),
    fetchJson('content/hindrances/hindrances.json'),
    fetchJson('content/hindrances/evidence-keywords.json'),
    fetchJson('content/ranks/path-ranks.json'),
    fetchJson('content/dhamma/seven-factors.json'),
    fetchJson('content/reflections/daily.json'),
    fetchJson('content/reflections/weekly.json'),
    fetchJson('content/reflections/monthly.json'),
    fetchJson('content/quests/stages.json'),
    fetchJson('content/wisdom-scrolls/wisdom-scrolls.json'),
    fetchJson('content/sutta-taxonomy/subcategories.json'),
    fetchJson('content/sutta-taxonomy/groups.json'),
    fetchJson('content/sutta-taxonomy/subcategory-tags.json'),
    fetchJson('content/sutta-taxonomy/struggle-phrases.json'),
    fetchJson('content/practice/foundation-curriculum.json'),
    fetchJson('content/practice/difficulty-paths.json'),
    fetchJson('content/practice/duration-modes.json'),
    fetchJson('content/quests/quest-categories.json'),
    fetchJson('content/practice/mindfulness-small-habits.json'),
    fetchJson('content/diagnostics/assessment.json'),
    fetchJson('content/diagnostics/onboarding.json'),
    fetchJson('content/diagnostics/daily-pool.json'),
    fetchJson('content/diagnostics/weekly.json'),
    fetchJson('content/diagnostics/monthly.json'),
    fetchJson('content/practice/technique-prescriptions.json'),
    fetchJson('content/tutorials/meditation.json'),
    fetchJson('content/tutorials/metta.json'),
    fetchJson('content/tutorials/jhana-intro.json'),
    fetchJson('content/practice/guided-flows.json'),
    fetchJson('content/dhamma/four-noble-truths.json'),
    fetchJson('content/dhamma/eightfold-path.json'),
    fetchJson('content/diagnostics/foundations-content-map.json'),
    fetchJson('content/practice/pre-sit-chips.json'),
    fetchJson('content/practice/post-sit-chips.json'),
    fetchJson('content/ranks/tisikkha-thresholds.json'),
    fetchJson('content/ranks/army-status-thresholds.json'),
    fetchJson('content/feedback/areas.json'),
    fetchJson('content/feedback/severity.json'),
    fetchJson('content/feedback/frequency.json'),
    fetchJson('content/quotes/teaching-quotes.json'),
    // Sutta library: parallel-fetch all .md files, then sort like build.js did
    Promise.all(SUTTA_FILES.map(fetchSutta)).then(list =>
      list.sort((a, b) => (a.minRank || 0) - (b.minRank || 0) || a.id.localeCompare(b.id))
    ),
    // Sutta-questions: parallel-fetch all, then fold to dict keyed by suttaId
    Promise.all(SUTTA_QUESTION_FILES.map(fetchSuttaQuestions)).then(entries => {
      const dict = {};
      for (const [suttaId, questions] of entries) dict[suttaId] = questions;
      return dict;
    })
  ]);

  // ------------------------------------------------------------------------
  // Assign to module-level `let` bindings. From this point on, the names
  // resolve to live data everywhere in the app.
  // ------------------------------------------------------------------------
  STRINGS                      = strings;
  CHARACTERS                   = characters;
  MARA_ARMIES                  = maraArmies;
  PATH_LAYERS                  = pathLayers;
  TEN_FETTERS                  = tenFetters;
  NOBLE_PERSONS                = noblePersons;
  PATH_GATE                    = pathGate;
  FIVE_HINDRANCES              = fiveHindrances;
  HINDRANCE_EVIDENCE_KEYWORDS  = hindranceEvidenceKeywords;
  __PATH_RANKS_DATA            = pathRanksData;
  SEVEN_FACTORS                = sevenFactors;
  DAILY_REFLECTIONS            = dailyReflections;
  WEEKLY_REFLECTIONS           = weeklyReflections;
  MONTHLY_REFLECTIONS          = monthlyReflections;
  STAGES                       = stages;
  WISDOM_SCROLLS               = wisdomScrolls;
  SUTTA_LIBRARY                = suttaLibrary;
  SUTTA_SUBCATEGORIES          = suttaSubcategories;
  SUTTA_SUBCATEGORY_GROUPS     = suttaSubcategoryGroups;
  SUTTA_SUBCATEGORY_TAGS       = suttaSubcategoryTags;
  STRUGGLE_PHRASES             = strugglePhrases;
  SUTTA_QUESTIONS              = suttaQuestionsDict;
  FOUNDATION_CURRICULUM        = foundationCurriculum;
  DIFFICULTY_PATHS             = difficultyPaths;
  DURATION_MODES               = durationModes;
  QUEST_CATEGORIES             = questCategories;
  MINDFULNESS_SMALL_HABITS     = mindfulnessSmallHabits;
  __ASSESSMENT                 = assessment;
  ONBOARDING_DIAGNOSTIC        = onboardingDiagnostic;
  DAILY_DIAGNOSTIC_POOL        = dailyDiagnosticPool;
  WEEKLY_DIAGNOSTIC            = weeklyDiagnostic;
  MONTHLY_DIAGNOSTIC           = monthlyDiagnostic;
  TECHNIQUE_PRESCRIPTIONS      = techniquePrescriptions;
  MEDITATION_TUTORIAL          = meditationTutorial;
  METTA_TUTORIAL               = mettaTutorial;
  JHANA_INTRO                  = jhanaIntro;
  GUIDED_FLOWS                 = guidedFlows;
  FOUR_NOBLE_TRUTHS            = fourNobleTruths;
  EIGHTFOLD_PATH               = eightfoldPath;
  FOUNDATIONS_CONTENT_MAP      = foundationsContentMap;
  PRE_SIT_CHIPS                = preSitChips;
  POST_SIT_CHIPS               = postSitChips;
  TISIKKHA_THRESHOLDS_BY_RANK  = tisikkhaThresholdsByRank;
  ARMY_STATUS_THRESHOLDS       = armyStatusThresholds;
  FEEDBACK_AREAS               = feedbackAreas;
  FEEDBACK_SEVERITY            = feedbackSeverity;
  FEEDBACK_FREQUENCY           = feedbackFrequency;
  TEACHING_QUOTES              = teachingQuotes;
}
