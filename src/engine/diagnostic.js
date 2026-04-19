// ============================================================================
// engine/diagnostic.js
// ----------------------------------------------------------------------------
// Pure function: given a `diag` object of collected diagnostic answers,
// return a recommendation (practice level, morning/evening minutes,
// rationale, first sutta, supporting habits, and any foundation-gap
// insights).
//
// Extracted verbatim from adze_v14_2.html by scripts/extract_diagnostic.js.
// Kept as a plain script (no ES module syntax) so the build step can inline
// it into the single-file HTML without transformation. The `typeof module`
// guard at the bottom makes it require()-able from Node for tests.
//
// The engine does NOT import question definitions from assessment.json.
// It operates on an already-collected answer object; the question file is
// the source of truth for which field names will exist.
// ============================================================================

const FOUR_TRUTHS_CORRECT = ['dukkha', 'origin', 'cessation', 'path'];

const EIGHTFOLD_NAMES = {
  view: 'right view',
  intention: 'right intention',
  speech: 'right speech',
  action: 'right action',
  livelihood: 'right livelihood',
  effort: 'right effort',
  mindfulness: 'right mindfulness',
  concentration: 'right concentration'
};

const EIGHTFOLD_CORRECT = ['view', 'intention', 'speech', 'action', 'livelihood', 'effort', 'mindfulness', 'concentration'];

function computeRecommendation(diag, chipInterp) {
  // v15.2 — chipInterp is the result of interpretChipSelections(diag) from
  // systems/chip-interpretation.js. Caller may or may not pass it; engine
  // tolerates both. Use chipInterp.flags to enrich beginnerCare copy below.
  const flags = (chipInterp && Array.isArray(chipInterp.flags)) ? chipInterp.flags : [];
  const hasFlag = (f) => flags.indexOf(f) >= 0;

  const exp = diag.experience || 'none';
  let level, morningMin, eveningMin, rationale, levelDisplay;

  if (exp === 'none') {
    level = 'sotapatti';
    morningMin = 5;
    eveningMin = 5;
    levelDisplay = 'Beginner Path';
    rationale = 'You are starting fresh. The Buddha was clear: an unbroken thread of five minutes is stronger than a single hour that breaks. Five morning, five evening. Small enough to keep. The practice will ask for more when it is ready.';
  } else if (exp === 'some') {
    level = 'sotapatti';
    const realistic = Math.max(5, Math.min(20, diag.realisticMinutes || 10));
    morningMin = realistic;
    eveningMin = Math.min(realistic, 10);
    levelDisplay = 'Beginner Path';
    rationale = 'You have tasted the practice. What has been missing is the thread. Start at a length you can hold every day without bargaining. Consistency first — depth will follow on its own.';
  } else if (exp === 'regular') {
    level = 'sakadagami';
    const current = Math.max(15, Math.min(30, diag.currentSitLength || 15));
    morningMin = current;
    eveningMin = current;
    levelDisplay = 'Established Path';
    rationale = 'You have a daily practice. The middle path: two sits of equal length, room to deepen, supporting habits available if they serve the sit. Mara takes you seriously at this stage; the subtle work begins.';
  } else if (exp === 'long') {
    const current = Math.max(30, diag.currentSitLength || 30);
    if (current >= 60) {
      level = 'arahant';
      levelDisplay = 'Veteran Path';
      morningMin = current;
      eveningMin = current;
      rationale = 'A practitioner who already sits this much has, in practical terms, outgrown what a tracker can offer. What the engine can still do: hold continuity when you travel, surface the weekly contemplations you might otherwise skip, and over months reflect back the honest pattern of your practice. What it cannot do: teach you what a living teacher teaches, read your own mind, or confirm any attainment. Use it lightly. Set it aside the day it stops serving.';
    } else {
      level = 'anagami';
      levelDisplay = 'Dedicated Path';
      morningMin = current;
      eveningMin = current;
      rationale = 'The path you have already chosen. At this stage the work is the subtle defilements — conceit, restlessness about fine things, the last traces of craving for becoming. The tool is scaffolding, not instruction. Your teacher is your real teacher.';
    }
  } else {
    level = 'sotapatti';
    morningMin = 10;
    eveningMin = 10;
    levelDisplay = 'Beginner Path';
    rationale = 'Beginning with care.';
  }

  // Soften the recommendation if energy is very low — even an experienced
  // practitioner with energy 2 is not served by 45 min sits this week.
  if (diag.energy != null && diag.energy <= 3 && level !== 'sotapatti') {
    morningMin = Math.max(10, Math.floor(morningMin * 0.6));
    eveningMin = Math.max(10, Math.floor(eveningMin * 0.6));
    rationale += ' Energy is low right now — the suggested minutes are dropped accordingly. The practice does not require exhaustion; it requires presence.';
  }

  // Focus based on dominant hindrance — one-line teacher-voice instruction
  // to carry into the first sit.
  const focusMap = {
    sensual:  { title: 'Name the pull when it arises', detail: 'Pleasant feeling-tone is not the enemy. Clinging to it is. See the pleasantness arise and pass. The seeing is the practice.', icon: '🍷' },
    illwill:  { title: 'Soften toward the one who irritates you', detail: 'Metta is not agreement. It is the wish that the other be free of suffering, including the suffering that makes them difficult. Start with yourself.', icon: '🗡️' },
    sloth:    { title: 'Brighten the mind before the sit', detail: 'Cold water on the face. Standing for the first minute. Eyes slightly open. Dullness is dispelled by effort, not by forcing through.', icon: '😴' },
    restless: { title: 'Let the body settle first', detail: 'Three slow breaths before counting begins. The body leads the mind. Agitation has its own half-life — do not fight it, outwait it.', icon: '🌊' },
    doubt:    { title: 'Doubt is information, not the enemy', detail: 'Note "doubting, doubting" and return to the breath. The path is tested in the practice, not in thinking about the practice.', icon: '❓' }
  };
  const focus = focusMap[diag.dominantHindrance] || { title: 'Sati — continuous awareness', detail: 'Moment to moment, without commentary. The breath is the anchor; the body is the ground.', icon: '🪷' };

  // Suggested first sutta — matched to either experience level or hindrance.
  // Rank-0 practitioners always start at SN 56.11 (the first sermon).
  let firstSutta;
  if (exp === 'none' || exp === 'some') {
    firstSutta = 'sn56_11';
  } else {
    const suttaMap = {
      sensual: 'mn20', illwill: 'an10_60', sloth: 'mn19', restless: 'mn118', doubt: 'an3_65'
    };
    firstSutta = suttaMap[diag.dominantHindrance] || 'mn10';
  }

  // Recommended supporting habits — only surface for established/dedicated
  // levels, and only if the diagnostic didn't flag energy as very low.
  let supporting = [];
  if (level === 'sakadagami' || level === 'anagami' || level === 'arahant') {
    if (diag.energy == null || diag.energy >= 4) {
      supporting.push({ id: 'walking', label: 'Walking meditation (10 min)', why: 'Movement-anchored sati. Especially supportive when sloth is heavy or after a long sit.' });
      supporting.push({ id: 'metta', label: 'Metta (5 min)', why: 'Loving-kindness as daily prophylaxis for ill will. Five minutes before the evening sit.' });
    }
  }

  // ========================================================================
  // v11.1 — FOUNDATION GAP DETECTION (experienced branch only)
  // ========================================================================
  // The knowledge-check answers drive a list of "insights" — short teacher-
  // voice observations that show up in the recommendation card. These are
  // not gotcha messages. They name patterns honestly so the practitioner
  // can decide whether to look closer. Each insight points to a concrete
  // first action (usually a sutta to read or a habit to consider).
  const insights = [];
  if (exp === 'regular' || exp === 'long') {
    const truthsCorrect = (diag.fourTruths || []).filter(k => FOUR_TRUTHS_CORRECT.includes(k));
    const truthsWrong = (diag.fourTruths || []).filter(k => !FOUR_TRUTHS_CORRECT.includes(k));
    const eightfoldPicked = diag.eightfold || [];
    const eightfoldMissed = EIGHTFOLD_CORRECT.filter(k => !eightfoldPicked.includes(k));
    const eightfoldWrong = eightfoldPicked.filter(k => !EIGHTFOLD_CORRECT.includes(k));

    // Noble Truths — if not all four are picked, name which is missing
    if (truthsCorrect.length < 4) {
      const missed = FOUR_TRUTHS_CORRECT.filter(k => !truthsCorrect.includes(k));
      const names = { dukkha: 'dukkha', origin: 'the origin (craving)', cessation: 'cessation', path: 'the path' };
      const missedNames = missed.map(k => names[k]).join(', ');
      insights.push({
        kind: 'foundation',
        icon: '☸️',
        title: 'The Four Noble Truths — a foundation worth re-visiting',
        body: `You did not mark ${missedNames} among the four truths. Whether this was oversight or genuine lack of clarity, it is worth reading SN 56.11 (the first sermon) slowly this week. The four truths are not introductory material to be passed over — they are the structural frame the whole path hangs on. Many practitioners at your stage discover the truths were heard, never absorbed.`,
        suttaId: 'sn56_11'
      });
    }
    if (truthsWrong.length > 0) {
      insights.push({
        kind: 'confusion',
        icon: '🔍',
        title: 'Something adjacent was folded into the Four Noble Truths',
        body: `Karma, rebirth, compassion, the three characteristics — these are all important in the dhamma, but they are not the Four Noble Truths. The truths are specifically: dukkha, its origin (craving), its cessation, and the eightfold path. It is worth re-reading SN 56.11 to see the exact formulation — the precision matters.`,
        suttaId: 'sn56_11'
      });
    }

    // Eightfold Path — name the missed factors
    if (eightfoldMissed.length > 0 && eightfoldMissed.length <= 4) {
      const missedNames = eightfoldMissed.map(k => EIGHTFOLD_NAMES[k]).join(', ');
      // Special framing for the wisdom-group and ethics-group slots, which
      // get most commonly missed in sitting-heavy traditions.
      const wisdomMissed = eightfoldMissed.filter(k => k === 'view' || k === 'intention');
      const ethicsMissed = eightfoldMissed.filter(k => k === 'speech' || k === 'action' || k === 'livelihood');
      let frame;
      if (ethicsMissed.length >= 2) {
        frame = `The ethics group (sīla — right speech, action, livelihood) is the most commonly underweighted in concentration-heavy lineages. The Buddha did not list these first by accident. Without sīla as the base, samādhi has no ground to stand on.`;
      } else if (wisdomMissed.length >= 1) {
        frame = `The wisdom group (paññā — right view, right intention) frames the whole path. Without right view, the other seven factors cannot orient. This is where the tradition puts its heaviest sutta weight.`;
      } else {
        frame = `Each missed factor is a place the engine will give extra attention in the foundation curriculum.`;
      }
      insights.push({
        kind: 'eightfold-gap',
        icon: '🧭',
        title: `Missed factors of the eightfold path: ${missedNames}`,
        body: frame,
        suttaId: 'mn141'  // The full exposition of the eightfold path
      });
    } else if (eightfoldMissed.length > 4) {
      insights.push({
        kind: 'eightfold-gap',
        icon: '🧭',
        title: 'Several eightfold-path factors were missed',
        body: `It will be worth reading the full exposition (MN 141, the Saccavibhaṅga Sutta). The eightfold path is the fourth noble truth — the prescription that follows the diagnosis. Knowing which are its eight factors, and that they fall into three groups (wisdom, ethics, concentration), is foundation material.`,
        suttaId: 'mn141'
      });
    }

    // Tradition-aware stuckness — the pattern is named without criticizing
    // the lineage. The tradition is received with gratitude; the redirection
    // is a pointing, not a correction. "How would the Buddha speak to a
    // serious practitioner today?" — with respect for what they have done
    // and a quiet offer of what might be next.
    const isIntensityStuck = diag.stuckness === 'intensity' || diag.stuckness === 'plateau' || diag.stuckness === 'dryness';
    const hasHighSitLength = (diag.currentSitLength || 0) >= 45;

    const TRADITION_GRATITUDE = {
      goenka:    'Goenka\'s ten-day courses have brought more people to the dhamma in this generation than almost any other teaching, and the body-sensation work is genuine and deep.',
      theravada: 'The Theravāda forest and commentarial traditions you have trained in are among the most rigorous paths the dhamma offers.',
      mahayana:  'The Mahāyāna lineages carry a depth of compassion practice and philosophical insight that is its own complete path.',
      secular:   'The secular mindfulness work has given you a grounding in attention and non-judgment that is real foundation.',
      mixed:     'Drawing from multiple streams is itself a traditional approach — the suttas record the Buddha telling people to test teachings in their own experience.',
      other:     'Whatever contemplative tradition you have trained in is a real foundation.'
    };

    if (isIntensityStuck && hasHighSitLength) {
      const gratitude = TRADITION_GRATITUDE[diag.tradition] || TRADITION_GRATITUDE.other;
      // Goenka-specific redirection mentions the exact complements the
      // tradition itself points toward but that often thin in daily life.
      const isGoenka = diag.tradition === 'goenka';
      if (isGoenka) {
        insights.push({
          kind: 'tradition-gratitude',
          icon: '🙏',
          title: 'A quiet offering, with gratitude for the training',
          body: `${gratitude} What many long-sitters in any intensive-retreat tradition notice after some years is that the body-sensation work is complete on the cushion, but the four brahmavihāras (metta, karuṇā, muditā, upekkhā), the daily sīla, and right view sometimes ask for direct attention to round out the path. Goenka himself taught metta at the end of each course — what you might try this week is bringing it out of the retreat container into a daily five-minute practice. The engine will also surface MN 107 (gradual training) and SN 47.19 early.`,
          suttaId: 'mn107'
        });
      } else {
        insights.push({
          kind: 'tradition-gratitude',
          icon: '🙏',
          title: 'A quiet offering, with gratitude for the training',
          body: `${gratitude} What often wants attention after years of deep sitting practice is the integration — sīla as daily ground (not only on retreat), the brahmavihāras as everyday warmth, and the framing that holds the whole path together (right view). AN 4.170 — samatha and vipassanā as two wings of the same bird — is worth reading this week; when one wing has grown strong, the other may need feeding.`,
          suttaId: 'an4_170'
        });
      }
    } else if (diag.stuckness === 'offcushion') {
      insights.push({
        kind: 'offcushion',
        icon: '🚶',
        title: 'Off-cushion sati is its own training',
        body: `On-cushion strength does not automatically translate. The bridges are: right speech (AN 5.198), noting in motion (walking meditation), and the mini-sit — a 30-second pause before replies, decisions, transitions. The engine will surface these in your weekly reflection.`,
        suttaId: 'an5_198'
      });
    } else if (diag.stuckness === 'dryness') {
      insights.push({
        kind: 'dryness',
        icon: '💧',
        title: 'The dryness is feedback',
        body: `A dry practice often signals that the brahmavihāras (metta, karuṇā, muditā, upekkhā) have thinned and samādhi alone is carrying the load. Five minutes of metta before the evening sit, for a week, often restores warmth. If not, a retreat or a living teacher is the real medicine.`,
        suttaId: 'sn46_51'
      });
    } else if (diag.stuckness === 'dark') {
      insights.push({
        kind: 'dark',
        icon: '🌑',
        title: 'Dark territory deserves a real teacher',
        body: `The app is honest: what you are describing is not something a tool can support. The tradition knows this ground — Mahasi lineage calls it dukkha-ñāṇa; Willoughby Britton has written carefully about its modern Western expression. Seek a living teacher in the tradition you trust. The game continues; but a teacher is the medicine, not an app.`,
        suttaId: null
      });
    }
  }

  // Beginner-branch posture and reassurance additions
  const beginnerCare = {};
  if (exp === 'none' || exp === 'some') {
    const postureAdvice = {
      chair:   { icon: '🪑', line: 'Feet flat on the floor, spine long but not tense, hands resting on the thighs. A chair is completely honorable; the Buddha sat under a tree, not on a cushion.' },
      cushion: { icon: '🟤', line: 'Sit on the front third of the cushion so the hips tilt slightly forward. Knees toward the ground. If knees hurt, add another cushion under them, or move to a chair — no loss.' },
      bench:   { icon: '🟧', line: 'Kneel with the bench angled slightly, weight on the bench not the ankles. The bench is excellent for people with knee or hip limitations.' },
      lying:   { icon: '🛏️', line: 'Back straight, arms slightly away from the body, eyes slightly open if possible. Drowsiness is the main risk — if it wins, sit up.' },
      unsure:  { icon: '❓', line: 'Try three postures in the first week and notice which one your body settles into. Comfort matters more than form. You will know within a few sits.' }
    };
    if (diag.posture && postureAdvice[diag.posture]) {
      beginnerCare.posture = postureAdvice[diag.posture];
    }
    // v15.0 — physicalConcerns and concerns switched from textarea (string)
    // to chips (array). Pre-v15.0 saved diags may still hold strings; handle
    // both shapes so the engine doesn't crash mid-recommendation.
    const hasChipsOrOther = (chipsField, otherField) => {
      const chips = diag[chipsField];
      const other = diag[otherField];
      if (Array.isArray(chips) && chips.filter(k => k !== 'none').length > 0) return true;
      if (typeof chips === 'string' && chips.trim().length > 0) return true; // legacy
      if (typeof other === 'string' && other.trim().length > 0) return true;
      return false;
    };
    if (hasChipsOrOther('physicalConcerns', 'physicalConcernsOther')) {
      // Chip-agnostic intro: must be true regardless of WHICH physicalConcerns
      // chip was picked. The bold lines below carry chip-specific guidance.
      // Naming "pain" or "back" here would fabricate a worry the user did not
      // name (e.g. someone who only picked sleep_energy).
      const lines = ['The body you named matters. Adjust posture freely — if a sit makes anything worse, end the sit. The body is part of the practice, not an obstacle to it.'];
      // v15.2 — chip-flag-driven specifics. Each flag adds one short, targeted
      // line. Mapped from systems/chip-interpretation.js + docs/CHIP-INTERPRETATION.md.
      if (hasFlag('posture.back')) {
        lines.push('<b>Back:</b> a chair with a small lumbar pillow often beats a cushion. Spine long but not stiff; let the support do its job.');
      }
      if (hasFlag('posture.lower_body')) {
        lines.push('<b>Knees / hips:</b> a chair, a bench, or even lying down — all honorable. Comfort first; the Buddha sat under a tree, not on a cushion.');
      }
      if (hasFlag('posture.upper_body')) {
        lines.push('<b>Shoulders / neck:</b> drop the shoulders away from the ears at the start of every sit. Chin slightly tucked. The mind eases when the upper body unclenches.');
      }
      if (hasFlag('posture.general')) {
        lines.push('<b>Chronic pain:</b> walking meditation may serve you better than seated, especially in the early weeks. The whole path is available without a single seated minute.');
      }
      if (hasFlag('bias.morning_sits')) {
        lines.push('<b>Energy / sleep:</b> morning sits before fatigue settles tend to land more cleanly than evening sits when sleep has been thin.');
      }
      if (hasFlag('posture.injury_temporary')) {
        lines.push('<b>While the injury heals:</b> keep sits short and gentle. The practice will be there when the body is.');
      }
      beginnerCare.physicalNote = lines.length === 1 ? lines[0] : lines[0] + '<br><br>' + lines.slice(1).join('<br>');
    }
    if (hasChipsOrOther('concerns', 'concernsOther')) {
      // Chip-agnostic intro: previously hardcoded "Thoughts do not stop —"
      // which fabricated that worry for any user who picked any concerns chip
      // (Li May reported this bug 2026-04-19). The targeted bold lines below
      // address the actual chips the user picked.
      const lines = ['What you named is common — many practitioners face it. The path doesn\'t require getting past these things first; it includes them.'];
      if (hasFlag('misconception.thoughts')) {
        lines.push('<b>On thoughts not stopping:</b> the instruction is not "no thoughts" — it is "notice when attention has wandered, return." That return is the meditation.');
      }
      if (hasFlag('framing.secular_preferred')) {
        lines.push('<b>On the framing:</b> nothing here requires belief. The Buddha said come and see. Test the practice; keep what works.');
      }
      if (hasFlag('friction.perfectionism')) {
        lines.push('<b>On missing days:</b> a five-minute thread that holds for years is stronger than any seven-day intensive that breaks. Permission to miss is part of the path.');
      }
      if (hasFlag('self_image.nervous')) {
        lines.push('<b>On "spiritual enough":</b> there is no such thing to be. The early texts describe the Buddha\'s own students with all their fears and failures. You are exactly the right kind of person for this practice.');
      }
      if (hasFlag('friction.time')) {
        lines.push('<b>On time:</b> shorter sits done daily build more momentum than longer sits done occasionally. Five minutes counts as a real sit.');
      }
      beginnerCare.reassurance = lines.length === 1 ? lines[0] : lines[0] + '<br><br>' + lines.slice(1).join('<br>');
    }
  }

  return { level, levelDisplay, morningMin, eveningMin, middayMin: 0, rationale, focus, firstSutta, supporting, insights, beginnerCare };
}

// CommonJS export for Node-side tests. Harmless in a browser: `module` is
// undefined there and the build step doesn't need to strip it.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    computeRecommendation,
    FOUR_TRUTHS_CORRECT,
    EIGHTFOLD_CORRECT,
    EIGHTFOLD_NAMES,
  };
}
