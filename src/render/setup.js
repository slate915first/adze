// ============================================================================
// render/setup.js
// ----------------------------------------------------------------------------
// The setup flow — the onboarding wizard that runs when someone first opens
// the app (or restarts a quest). It's a multi-step, branching UI:
//
//   0: welcome / mode selection
//   1: character selection (one or more members)
//   2: pre-vow diagnostic (optional) — calls into render/diagnostic.js
//   3: quest type (Story Path vs Free Path)
//   4: habit mode (habits first, or sit first)
//   5: small-habits confirmation (for very hesitant practitioners)
//   6: recommendation card (for Free Path users who ran diagnostic)
//   7: custom-finish (for users who declined recommendations)
//
// Each setup step is a small render function; renderSetup() is the
// dispatcher that picks which to show based on view.setupStep / setupData.
//
// Six top-level functions:
//
//   renderSetup()                      The dispatcher — picks step 0-7.
//   renderSetupStep3Quests()           Step 3: pick a story quest.
//   renderSetupHabitMode()             Step 4: habits-first or sit-first.
//   renderSetupSmallHabits()           Step 5: confirm smaller commitment.
//   renderRecommendationCard()         Step 6: diagnostic-derived prescription.
//   renderSetupCustomFinish()          Step 7: custom finish card.
//
// The diagnostic phases (A/B/C) live in render/diagnostic.js — they're
// reached from step 2 of this flow but are self-contained and reusable
// (also called from the member_diagnostic modal for adding members
// post-setup).
//
// Dependencies (all read from global scope):
//   State:     state (members, prefs, questMode, questActive, habits)
//              view (setupStep, setupData, setupCustomData)
//   Engine:    t() from engine/i18n.js
//   Helpers:   finishSetup, commitSetup, pickStoryQuest, seedOnboarding,
//              getPrescription, memberStageStart, membersWithTriggered,
//              getFirstSuttaName, renderDiagnosticPhaseA/B/C
//   Data:      CHARACTERS, STORY_QUESTS, STAGES, TECHNIQUE_PRESCRIPTIONS
// ============================================================================

function renderSetupStep3Quests() {
  const data = view.setupData;
  const cat = QUEST_CATEGORIES[data.category];
  return `
    <div class="fade-in">
      <button class="text-xs text-amber-300/60 mb-2" onclick="setupBack()">${t('common.back')}</button>
      <h2 class="text-2xl font-bold gold-text mb-1">${cat.icon} ${cat.name}</h2>
      <p class="text-sm text-amber-100/60 mb-5">${t('setup.level.intro')}</p>
      <div class="space-y-3 mb-5">
        ${Object.entries(cat.quests).map(([k,q]) => {
          const isSelected = data.quest === k;
          return `
          <button class="parchment rounded-xl p-4 text-left w-full ${isSelected ? 'parchment-active lotus-glow' : 'hover:parchment-active'} character-card" onclick="selectLevel('${k}')" style="border-left: 4px solid ${q.levelColor||'#d4a857'}">
            <div class="flex items-start gap-3">
              <div class="text-4xl">${q.levelIcon||'🪷'}</div>
              <div class="flex-1">
                <div class="flex items-baseline gap-2">
                  <h3 class="font-bold text-amber-100 text-lg">${q.name}</h3>
                  ${isSelected ? `<span class="text-xs text-amber-300">${t('common.selected')}</span>` : ''}
                </div>
                <p class="text-xs font-bold mt-1" style="color:${q.levelColor||'#d4a857'}">${q.tagline||''}</p>
                <p class="text-xs text-amber-100/70 mt-2 leading-relaxed">${q.desc}</p>
              </div>
            </div>
          </button>
          `;
        }).join('')}
      </div>
      <div class="flex justify-between">
        <button class="btn btn-ghost" onclick="setupBack()">${t('common.back')}</button>
        <button class="btn ${data.quest ? 'btn-gold' : 'btn-ghost opacity-50 pointer-events-none'}" onclick="confirmLevelAndContinue()">${t('common.continue')}</button>
      </div>
    </div>
  `;
}

function selectLevel(questKey) {
  view.setupData.quest = questKey;
  // Pre-populate sliders with this level's defaults for the custom path
  const quest = QUEST_CATEGORIES[view.setupData.category].quests[questKey];
  view.setupData.duration = quest.duration;
  view.setupData.customMorning = quest.morningMinutes;
  view.setupData.customEvening = quest.eveningMinutes;
  renderModal();  // re-render to show the selection highlight
}

function confirmLevelAndContinue() {
  const data = view.setupData;
  if (!data.quest) return;
  if (!data.habitMode) data.habitMode = 'constant';
  setupNext();
}

function renderSetupHabitMode() {
  const data = view.setupData;
  const cat = QUEST_CATEGORIES[data.category];
  const quest = cat.quests[data.quest];
  const isCustom = quest.levelKey === 'custom';
  return `
    <div class="fade-in">
      <button class="text-xs text-amber-300/60 mb-2" onclick="setupBack()">${t('setup.habit_mode.back_label')}</button>
      <h2 class="text-2xl font-bold gold-text mb-1">${t('setup.habit_mode.heading')}</h2>
      <p class="text-sm text-amber-100/60 mb-5">${t('setup.habit_mode.subheading')}</p>

      <div class="space-y-3 mb-5">
        <button onclick="setSetupHabitMode('constant')" class="parchment rounded-xl p-4 text-left w-full hover:parchment-active character-card ${data.habitMode==='constant'?'parchment-active':''}">
          <div class="flex items-start gap-3">
            <div class="text-3xl">⚖️</div>
            <div class="flex-1">
              <h3 class="font-bold text-amber-100">${t('setup.habit_mode.constant.title')}</h3>
              <p class="text-xs text-amber-100/70 mt-1">${t('setup.habit_mode.constant.body')} ${data.habitMode==='constant'?`<span class="text-amber-300 ml-2">${t('common.selected')}</span>`:''}</p>
              <p class="text-xs text-amber-300/60 mt-2 italic">${t('setup.habit_mode.constant.quote')}</p>
            </div>
          </div>
        </button>

        <button onclick="setSetupHabitMode('progressive')" class="parchment rounded-xl p-4 text-left w-full hover:parchment-active character-card ${data.habitMode==='progressive'?'parchment-active':''}">
          <div class="flex items-start gap-3">
            <div class="text-3xl">📈</div>
            <div class="flex-1">
              <h3 class="font-bold text-amber-100">${t('setup.habit_mode.progressive.title')}</h3>
              <p class="text-xs text-amber-100/70 mt-1">${t('setup.habit_mode.progressive.body')} ${data.habitMode==='progressive'?`<span class="text-amber-300 ml-2">${t('common.selected')}</span>`:''}</p>
              <p class="text-xs text-amber-300/60 mt-2 italic">${t('setup.habit_mode.progressive.quote')}</p>
            </div>
          </div>
        </button>

        ${isCustom ? `
        <div class="parchment rounded-xl p-4 ${data.habitMode==='custom'?'parchment-active':''}">
          <div class="flex items-start gap-3 mb-3">
            <div class="text-3xl">✨</div>
            <div class="flex-1">
              <h3 class="font-bold text-amber-100">${t('setup.habit_mode.custom.title')} <span class="text-amber-300 text-xs ml-2">${t('setup.habit_mode.custom.subtitle')}</span></h3>
              <p class="text-xs text-amber-100/70 mt-1">${t('setup.habit_mode.custom.body')}</p>
            </div>
          </div>
          <div class="mt-3 space-y-3">
            <div>
              <label class="text-xs text-amber-300 flex justify-between"><span>${t('setup.habit_mode.custom.morning_label')}</span><span id="morning-val">${t('common.minutes', {n: data.customMorning||15})}</span></label>
              <input type="range" min="0" max="90" step="5" value="${data.customMorning||15}" oninput="setSetupCustomMinutes('morning', this.value)" class="w-full mt-1">
            </div>
            <div>
              <label class="text-xs text-amber-300 flex justify-between"><span>${t('setup.habit_mode.custom.evening_label')}</span><span id="evening-val">${t('common.minutes', {n: data.customEvening||15})}</span></label>
              <input type="range" min="0" max="90" step="5" value="${data.customEvening||15}" oninput="setSetupCustomMinutes('evening', this.value)" class="w-full mt-1">
            </div>
          </div>
          <button onclick="setSetupHabitMode('custom')" class="btn ${data.habitMode==='custom'?'btn-gold':'btn-ghost'} text-sm w-full mt-3">${data.habitMode==='custom'?t('setup.habit_mode.custom.selected_label'):t('setup.habit_mode.custom.use_button')}</button>
        </div>
        ` : ''}
      </div>

      <div class="flex justify-between">
        <button class="btn btn-ghost" onclick="setupBack()">${t('common.back')}</button>
        <button class="btn btn-gold ${!data.habitMode?'opacity-50 pointer-events-none':''}" onclick="setupNext()">${t('common.continue')}</button>
      </div>
    </div>
  `;
}

function renderSetupSmallHabits() {
  const data = view.setupData;
  const cat = QUEST_CATEGORIES[data.category];
  const quest = cat.quests[data.quest];
  const max = quest.maxSmallHabits;

  // Sotāpatti: should never reach here because setupNext skips this step
  // But as a safety net, advance forward
  if (max === 0) {
    setTimeout(() => { view.setupStep = 6; renderModal(); }, 0);
    return `<div class="text-center text-amber-100/60">${t('setup.small_habits.continuing')}</div>`;
  }

  const maxLabel = max >= 99
    ? t('setup.small_habits.max_unlimited')
    : (max === 1 ? t('setup.small_habits.max_one') : t('setup.small_habits.max_n', {n: max}));
  if (!data.selectedSmallHabits) data.selectedSmallHabits = [];
  // Use static t() keys (one per branch) rather than a dynamic introKey
  // variable, so verify_strings.js can detect both usages.
  const introText = max === 1
    ? t('setup.small_habits.intro_singular', {maxLabel})
    : t('setup.small_habits.intro_plural',   {maxLabel});

  return `
    <div class="fade-in">
      <button class="text-xs text-amber-300/60 mb-2" onclick="setupBack()">${t('setup.small_habits.back_label')}</button>
      <h2 class="text-2xl font-bold gold-text mb-1">${t('setup.small_habits.heading')}</h2>
      <p class="text-sm text-amber-100/60 mb-2">${introText}</p>
      <p class="text-xs text-amber-300/70 mb-5">${t('setup.small_habits.count', {count: data.selectedSmallHabits.length, max: max >= 99 ? t('setup.small_habits.unlimited_symbol') : max})}</p>

      <div class="space-y-2 mb-5 max-h-96 overflow-y-auto scrollbar pr-2">
        ${MINDFULNESS_SMALL_HABITS.map(h => {
          const sel = data.selectedSmallHabits.includes(h.id);
          const disabled = !sel && max < 99 && data.selectedSmallHabits.length >= max;
          return `
            <button onclick="toggleSetupSmallHabit('${h.id}')" class="parchment rounded-lg p-3 text-left w-full ${sel?'parchment-active':'hover:parchment-active'} ${disabled?'opacity-40 pointer-events-none':''}">
              <div class="flex items-start gap-3">
                <div class="text-2xl">${h.icon}</div>
                <div class="flex-1">
                  <div class="flex items-baseline justify-between">
                    <div class="font-bold text-amber-100 text-sm">${h.name}</div>
                    <div class="text-xs text-amber-300">+${h.points}pt${sel?' ✓':''}</div>
                  </div>
                  <p class="text-xs text-amber-100/65 mt-1">${h.desc}</p>
                </div>
              </div>
            </button>
          `;
        }).join('')}
      </div>

      <div class="flex justify-between">
        <button class="btn btn-ghost" onclick="setupBack()">${t('common.back')}</button>
        <button class="btn btn-gold" onclick="setupNext()">${data.selectedSmallHabits.length===0 ? t('setup.small_habits.skip_button') : t('setup.small_habits.continue_with_count', {n: data.selectedSmallHabits.length})}</button>
      </div>
    </div>
  `;
}

function renderSetup() {
  const step = view.setupStep;
  const data = view.setupData;

  // Step 0: Welcome
  if (step === 0) {
    return `
      <div data-component="setup.step0_welcome" class="text-center fade-in">
        <div class="text-6xl mb-4 breath">☸️</div>
        <h1 class="text-4xl font-bold gold-text mb-2">${APP_NAME}</h1>
        <p class="text-2xl serif italic text-amber-200/80 mb-1">${APP_TAGLINE}</p>
        <p class="text-xs text-amber-300/60 mb-6">v${APP_VERSION} · ${t('setup.welcome.version_suffix')}</p>

        <!-- v13.6 — Ehipassiko frame + three clear steps laid out upfront.
             Dirk feedback: users were dropped into name/icon selection with
             no narrative scaffolding. Now the welcome page tells the whole
             arc in three lines before anyone has to choose anything. -->
        <div class="parchment rounded-xl p-5 text-left mb-4">
          <p class="serif text-amber-100/90 leading-relaxed mb-3">
            ${t('setup.welcome.ehipassiko_body')}
          </p>
          <p class="serif text-amber-100/85 leading-relaxed text-sm italic border-t border-amber-700/30 pt-3">
            ${t('setup.welcome.ehipassiko_italics')}
          </p>
        </div>

        <div class="parchment rounded-xl p-4 mb-4 text-left">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-3 text-center">${t('setup.welcome.three_steps_header')}</div>
          <div class="space-y-3">
            <div class="flex gap-3">
              <div class="text-amber-300 font-bold text-lg flex-shrink-0 w-6 text-center">1</div>
              <div class="flex-1">
                <div class="text-sm font-bold text-amber-100">${t('setup.welcome.step1_title')}</div>
                <div class="text-xs text-amber-100/65 italic leading-relaxed">${t('setup.welcome.step1_body')}</div>
              </div>
            </div>
            <div class="flex gap-3">
              <div class="text-amber-300 font-bold text-lg flex-shrink-0 w-6 text-center">2</div>
              <div class="flex-1">
                <div class="text-sm font-bold text-amber-100">${t('setup.welcome.step2_title')}</div>
                <div class="text-xs text-amber-100/65 italic leading-relaxed">${t('setup.welcome.step2_body')}</div>
              </div>
            </div>
            <div class="flex gap-3">
              <div class="text-amber-300 font-bold text-lg flex-shrink-0 w-6 text-center">3</div>
              <div class="flex-1">
                <div class="text-sm font-bold text-amber-100">${t('setup.welcome.step3_title')}</div>
                <div class="text-xs text-amber-100/65 italic leading-relaxed">${t('setup.welcome.step3_body')}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="parchment rounded-xl p-4 text-left mb-4 border-amber-700/40">
          <p class="serif text-amber-100/80 leading-relaxed text-sm">
            <strong class="text-amber-300">${t('setup.welcome.honesty_lead')}</strong> ${t('setup.welcome.honesty_body')}
          </p>
        </div>

        <div class="flex gap-3 justify-center">
          <button class="btn btn-gold" onclick="setupNext()">${t('setup.welcome.begin_button')}</button>
        </div>
        <p class="text-[10px] text-amber-100/40 italic mt-3">${t('setup.welcome.nothing_written_note')}</p>
      </div>
    `;
  }

  // Step 1: Mode selection
  if (step === 1) {
    return `
      <div data-component="setup.step1_mode_select" class="fade-in">
        <div class="text-center mb-4">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('setup.mode.eyebrow')}</div>
          <h2 class="text-2xl md:text-3xl font-bold gold-text mb-2">${t('setup.mode.heading')}</h2>
          <p class="text-amber-100/70 text-sm max-w-lg mx-auto leading-relaxed">${t('setup.mode.subheading')}</p>
        </div>
        <div class="grid md:grid-cols-2 gap-4">
          <button data-component="setup.step1_mode_select.story_card" class="parchment rounded-xl p-5 text-left hover:parchment-active transition character-card" onclick="setSetupMode('story')">
            <div class="text-5xl mb-3 text-center">📜</div>
            <h3 class="text-xl font-bold gold-text mb-2">${t('setup.mode.story_title')}</h3>
            <p class="text-sm text-amber-100/80 leading-relaxed">
              ${t('setup.mode.story_body')}
            </p>
            <div class="mt-3 text-xs text-amber-300/70">${t('setup.mode.story_recommended')}</div>
          </button>
          <button data-component="setup.step1_mode_select.free_card" class="parchment rounded-xl p-5 text-left hover:parchment-active transition character-card" onclick="setSetupMode('custom')">
            <div class="text-5xl mb-3 text-center">⚙️</div>
            <h3 class="text-xl font-bold gold-text mb-2">${t('setup.mode.free_title')}</h3>
            <p class="text-sm text-amber-100/80 leading-relaxed">
              ${t('setup.mode.free_body')}
            </p>
            <div class="mt-3 text-xs text-amber-100/50">${t('setup.mode.free_experienced')}</div>
          </button>
        </div>
        <p class="text-[10px] text-amber-100/45 italic text-center mt-4">${t('setup.mode.switch_later')}</p>
        <div class="flex justify-center mt-4">
          <button class="btn btn-ghost text-sm" onclick="setupBack()">${t('setup.mode.back_to_welcome')}</button>
        </div>
      </div>
    `;
  }

  // v12.5 — Step 2: YOU walk first. Sangha joins later.
  // Earlier versions allowed up to 10 members during setup. Feedback was clear:
  // it was overwhelming, it cluttered the UI, and the collaboration features
  // weren't really implemented anyway. Now: one person, one character, one
  // clear start. Inviting a sangha becomes a later feature reachable from
  // Settings once multi-member logic is properly built.
  if (step === 2) {
    const pendingChar = data.pendingChar;
    // Already set up? Show them; otherwise let them choose
    const current = data.members[0] || null;
    // Static keys per branch so verify_strings detects both continue variants.
    const continueLabel = data.members.length === 0
      ? t('setup.character.continue_disabled')
      : (data.mode === 'custom' ? t('common.continue') : t('setup.character.continue_to_assessment'));
    return `
      <div data-component="setup.step2_character_select" class="fade-in">
        <div class="text-center mb-3">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('setup.character.eyebrow')}</div>
          <h2 class="text-2xl font-bold gold-text mb-2">${t('setup.character.heading')}</h2>
        </div>

        <!-- v13.6 — Narrative bridge. Dirk feedback: the jump from "Begin →"
             straight into name + icon grid felt cold and gimmicky. A single
             teacher-voiced paragraph explains why the character choice matters
             before the practitioner is asked to make it. -->
        <div class="parchment rounded-xl p-4 mb-4 border-amber-700/40">
          <p class="serif text-amber-100/85 text-sm leading-relaxed">
            ${t('setup.character.bridge_body')}
          </p>
          <p class="text-[11px] text-amber-100/55 italic mt-2">${t('setup.character.walk_alone_note')}</p>
        </div>

        ${current ? `
          <div class="parchment rounded-lg p-3 flex items-center gap-3 mb-3">
            <div class="text-3xl">${CHARACTERS[current.character]?.icon || '🧘'}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2 flex-wrap">
                <div class="font-bold text-amber-100">${current.name}</div>
                <div class="text-xs text-amber-300/80">[${CHARACTERS[current.character]?.name || ''}]</div>
              </div>
              <div class="text-xs text-amber-100/60 mb-1">${CHARACTERS[current.character]?.title || ''}</div>
              <div class="flex gap-1 flex-wrap">
                <span class="text-[10px] bg-amber-900/30 text-amber-200 px-1.5 py-0.5 rounded">✨ ${CHARACTERS[current.character]?.ability || ''}</span>
              </div>
            </div>
            <button onclick="removeSetupMember(0)" class="text-red-400/60 hover:text-red-300 text-sm" title="${t('setup.character.start_over_title')}">✕</button>
          </div>
        ` : `
          <div class="parchment rounded-xl p-4 mb-4">
            <input id="setup-name" placeholder="${t('setup.character.name_placeholder')}" class="mb-3" value="${data.pendingName||''}" oninput="onNameInput(this.value)">
            <p class="text-xs text-amber-200/70 mb-2 font-bold">${t('setup.character.choose_label')} <span class="text-amber-300/70 font-normal">${t('setup.character.choose_hint')}</span></p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-80 overflow-y-auto scrollbar pr-1">
              ${Object.entries(CHARACTERS).map(([k,c]) => {
                const isPending = pendingChar === k;
                return `
                  <button onclick="openCharacterDetail('${k}')" class="parchment rounded-lg p-2 text-center relative ${isPending?'character-selected lotus-glow':'hover:parchment-active'}">
                    ${isPending ? '<div class="absolute top-1 right-1 text-xs text-amber-300">✓</div>' : ''}
                    <div class="text-3xl mb-1">${c.icon}</div>
                    <div class="text-xs font-bold text-amber-100">${c.name}</div>
                    <div class="text-[10px] text-amber-300/70">${c.title}</div>
                  </button>
                `;
              }).join('')}
            </div>
            ${pendingChar ? `
              <div class="mt-3 parchment rounded-lg p-3 border-amber-700/50">
                <div class="text-xs text-amber-300/70 mb-1">${t('setup.character.currently_selected')}</div>
                <div class="flex items-start gap-2">
                  <div class="text-2xl">${CHARACTERS[pendingChar].icon}</div>
                  <div class="flex-1">
                    <div class="font-bold text-amber-100 text-sm">${CHARACTERS[pendingChar].name} <span class="text-xs text-amber-300/70">— ${CHARACTERS[pendingChar].title}</span></div>
                    <div class="flex gap-1 flex-wrap mt-1">
                      <span class="text-[10px] bg-amber-900/30 text-amber-200 px-1.5 py-0.5 rounded">✨ ${CHARACTERS[pendingChar].ability}</span>
                    </div>
                  </div>
                </div>
              </div>
            ` : `<p class="text-xs text-amber-200/50 mt-3 text-center">${t('setup.character.tap_to_select')}</p>`}
            <button id="add-sangha-btn" class="btn btn-gold mt-3 w-full text-sm" onclick="addSetupMember()">${t('setup.character.confirm_button')}</button>
          </div>
        `}

        <div class="flex justify-between mt-4">
          <button class="btn btn-ghost" onclick="setupBack()">${t('common.back')}</button>
          <button class="btn btn-gold ${data.members.length === 0 ? 'opacity-50 pointer-events-none' : ''}" onclick="setupNext()">
            ${continueLabel}
          </button>
        </div>
      </div>
    `;
  }

  // v11 — Step 3: Diagnostic Phase A (everyone: energy, experience, hopes, hindrance)
  // Custom mode skips all diagnostic steps and jumps to the final confirm.
  if (step === 3 && data.mode === 'story') {
    return renderDiagnosticPhaseA();
  }

  // v11 — Step 4: Diagnostic Phase B (branches by experience)
  if (step === 4 && data.mode === 'story') {
    return renderDiagnosticPhaseB();
  }

  // v11 — Step 5: Diagnostic Phase C (hindrance sliders + purpose)
  if (step === 5 && data.mode === 'story') {
    return renderDiagnosticPhaseC();
  }

  // v11 — Step 6: Recommendation card (the engine speaks)
  if (step === 6 && data.mode === 'story') {
    return renderRecommendationCard();
  }

  // v11 — Step 7: Vow (cleaned up — no duration picker, no habit mode picker;
  // the recommendation has set everything, the user is just confirming)
  if (step === 7) {
    if (data.mode === 'custom') {
      return renderSetupCustomFinish();
    }
    const rec = data.recommendation;
    if (!rec) {
      // Shouldn't happen, but guard against it
      view.setupStep = 3;
      return renderDiagnosticPhaseA();
    }
    return `
      <div class="fade-in">
        <div class="text-center mb-2">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('setup.vow.eyebrow')}</div>
          <h2 class="text-2xl font-bold gold-text">${t('setup.vow.heading')}</h2>
        </div>
        <p class="text-center text-amber-100/60 mb-5 text-sm italic">${t('setup.vow.subheading')}</p>

        <div class="parchment rounded-xl p-5 mb-4">
          <div class="text-center mb-4">
            <div class="text-5xl mb-2">🪷</div>
            <h3 class="text-xl font-bold gold-text">${rec.levelDisplay}</h3>
            <p class="text-sm text-amber-100/70 mt-2">${t('setup.rec.duration_display', {morning: rec.morningMin, evening: rec.eveningMin})}</p>
          </div>

          <div class="border-t border-amber-700/30 pt-4">
            <div class="text-xs uppercase tracking-wider text-amber-300/70 mb-2">${t('setup.vow.who_walking_label')}</div>
            <div class="flex flex-wrap gap-2 mb-4">
              ${data.members.map(m => `
                <div class="bg-amber-900/20 border border-amber-700/40 rounded-lg p-2 flex items-center gap-2">
                  <span class="text-xl">${CHARACTERS[m.character]?.icon}</span>
                  <span class="text-sm text-amber-100">${m.name}</span>
                </div>
              `).join('')}
            </div>

            <div class="text-xs uppercase tracking-wider text-amber-300/70 mb-2">${t('setup.vow.focus_label')}</div>
            <div class="text-sm text-amber-100/85 italic mb-4">${rec.focus.icon} ${rec.focus.title}</div>

            <div class="text-xs uppercase tracking-wider text-amber-300/70 mb-2">${t('setup.vow.minutes_move_label')}</div>
            <p class="text-xs text-amber-100/70 leading-relaxed">${t('setup.vow.minutes_move_body')}</p>
          </div>
        </div>

        <div class="parchment rounded-xl p-4 mb-4 border-amber-700/50">
          <p class="text-sm serif italic text-amber-100/90 leading-relaxed text-center">
            ${t('setup.vow.bodhisatta_quote')}
          </p>
          <p class="text-xs text-amber-300/60 text-center mt-2">${t('setup.vow.bodhisatta_attribution')}</p>
        </div>

        <div class="flex justify-between">
          <button class="btn btn-ghost" onclick="setupBack()">${t('common.back')}</button>
          <button id="vow-btn" class="btn btn-gold" onclick="takeTheVow()">${t('setup.vow.take_vow_button')}</button>
        </div>
      </div>
    `;
  }
}

// ============================================================================
// v11 — DIAGNOSTIC PHASE RENDERERS
// ============================================================================

function renderRecommendationCard() {
  const diag = view.setupData.diagnostic;
  const rec = view.setupData.recommendation;
  if (!rec) {
    // Compute on the fly if somehow missing. v15.2 — pass chipInterpretation
    // (computed lazily here if not already present) so beginnerCare copy
    // matches what computeAndShowRecommendation would have produced.
    if (!view.setupData.chipInterpretation && typeof interpretChipSelections === 'function') {
      view.setupData.chipInterpretation = interpretChipSelections(diag);
    }
    view.setupData.recommendation = computeRecommendation(diag, view.setupData.chipInterpretation);
    return renderRecommendationCard();
  }
  const r = rec;
  // Use static t() keys per hindrance so verify_strings detects each usage.
  const hindranceNames = {
    sensual:  t('setup.rec.hindrance_name.sensual'),
    illwill:  t('setup.rec.hindrance_name.illwill'),
    sloth:    t('setup.rec.hindrance_name.sloth'),
    restless: t('setup.rec.hindrance_name.restless'),
    doubt:    t('setup.rec.hindrance_name.doubt')
  };
  const dominantName = hindranceNames[diag.dominantHindrance] || t('setup.rec.hindrance_name.default');
  return `
    <div class="fade-in">
      <div class="text-center mb-2">
        <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('setup.rec.eyebrow')}</div>
        <h2 class="text-2xl font-bold gold-text">${t('setup.rec.heading')}</h2>
      </div>
      <p class="text-center text-amber-100/60 mb-5 text-sm italic">${t('setup.rec.intro')}</p>

      <div class="parchment rounded-xl p-5 mb-4 lotus-glow">
        <div class="text-center mb-4">
          <div class="text-5xl mb-2">🪷</div>
          <h3 class="text-xl font-bold gold-text">${r.levelDisplay}</h3>
          <p class="text-sm text-amber-200/80 mt-1">${t('setup.rec.duration_display', {morning: r.morningMin, evening: r.eveningMin})}</p>
        </div>

        <div class="border-t border-amber-700/30 pt-3 mb-3">
          <p class="serif text-sm text-amber-100/90 leading-relaxed italic">${r.rationale}</p>
        </div>

        <div class="border-t border-amber-700/30 pt-3 mb-3">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('setup.rec.focus_label')}</div>
          <div class="text-sm text-amber-100"><span class="text-lg">${r.focus.icon}</span> <b>${r.focus.title}</b></div>
          <p class="text-xs text-amber-100/70 italic mt-1 leading-relaxed">${r.focus.detail}</p>
        </div>

        <div class="border-t border-amber-700/30 pt-3 mb-3">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('setup.rec.first_sutta_label')}</div>
          <div class="text-sm text-amber-100 mb-1">${getFirstSuttaName(r.firstSutta)}</div>
          <p class="text-xs text-amber-100/65 italic">${t('setup.rec.first_sutta_note')}</p>
        </div>

        ${r.supporting && r.supporting.length ? `
          <div class="border-t border-amber-700/30 pt-3">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-2">${t('setup.rec.supporting_label')}</div>
            <div class="space-y-1.5">
              ${r.supporting.map(s => `
                <div class="text-xs text-amber-100/85">• <b>${s.label}</b> <span class="text-amber-100/60 italic">— ${s.why}</span></div>
              `).join('')}
            </div>
            <p class="text-[10px] text-amber-100/50 italic mt-2">${t('setup.rec.supporting_note')}</p>
          </div>
        ` : ''}
      </div>

      ${r.beginnerCare && (r.beginnerCare.posture || r.beginnerCare.physicalNote || r.beginnerCare.reassurance) ? `
        <div class="parchment rounded-xl p-4 mb-4 border border-emerald-700/40 bg-emerald-950/15">
          <div class="text-[10px] uppercase tracking-wider text-emerald-300/80 mb-2">${t('setup.rec.beginner_care.label')}</div>
          ${r.beginnerCare.posture ? `
            <div class="mb-2">
              <div class="text-sm text-amber-100"><span class="text-lg">${r.beginnerCare.posture.icon}</span> <b>${t('setup.rec.beginner_care.posture')}</b></div>
              <p class="text-xs text-amber-100/80 leading-relaxed mt-1">${r.beginnerCare.posture.line}</p>
            </div>
          ` : ''}
          ${r.beginnerCare.physicalNote ? `
            <div class="mb-2">
              <div class="text-sm text-amber-100"><span class="text-lg">🩹</span> <b>${t('setup.rec.beginner_care.physical')}</b></div>
              <p class="text-xs text-amber-100/80 leading-relaxed mt-1">${r.beginnerCare.physicalNote}</p>
            </div>
          ` : ''}
          ${r.beginnerCare.reassurance ? `
            <div>
              <div class="text-sm text-amber-100"><span class="text-lg">🪷</span> <b>${t('setup.rec.beginner_care.reassurance')}</b></div>
              <p class="text-xs text-amber-100/80 leading-relaxed mt-1">${r.beginnerCare.reassurance}</p>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- v13.6 — Dirk feedback: the assessment previously gave zero
           feedback on the 4NT / 8FP questions. The engine scored silently,
           and insights only fired on gaps. Now the reveal happens here, in
           teacher voice, whether the answers were right or partial or off.
           Shown only for regular/long practitioners (only they saw the
           questions to begin with). -->
      ${(diag.experience === 'regular' || diag.experience === 'long') ? (() => {
        const truthsPicked = diag.fourTruths || [];
        const truthsRight = truthsPicked.filter(k => FOUR_TRUTHS_CORRECT.includes(k));
        const truthsWrong = truthsPicked.filter(k => !FOUR_TRUTHS_CORRECT.includes(k));
        const truthsMissed = FOUR_TRUTHS_CORRECT.filter(k => !truthsPicked.includes(k));
        const eightPicked = diag.eightfold || [];
        const eightRight = eightPicked.filter(k => EIGHTFOLD_CORRECT.includes(k));
        const eightWrong = eightPicked.filter(k => !EIGHTFOLD_CORRECT.includes(k));
        const eightMissed = EIGHTFOLD_CORRECT.filter(k => !eightPicked.includes(k));
        // Use static t() keys per truth name so verify_strings detects each.
        const truthNames = {
          dukkha:    t('setup.rec.truth_name.dukkha'),
          origin:    t('setup.rec.truth_name.origin'),
          cessation: t('setup.rec.truth_name.cessation'),
          path:      t('setup.rec.truth_name.path')
        };
        const truthsPerfect = truthsRight.length === 4 && truthsWrong.length === 0;
        const eightPerfect = eightRight.length === 8 && eightWrong.length === 0;
        return `
          <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/40 bg-amber-950/10">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('setup.rec.knowledge.label')}</div>
            <p class="text-[11px] text-amber-100/60 italic mb-3 leading-relaxed">${t('setup.rec.knowledge.intro')}</p>
            <div class="space-y-3">
              <div>
                <div class="text-xs font-bold text-amber-100 mb-1">${t('setup.rec.knowledge.truths_label')}</div>
                ${truthsPerfect ? `
                  <p class="text-xs text-amber-100/80 serif leading-relaxed">${t('setup.rec.knowledge.truths_perfect')}</p>
                ` : `
                  ${truthsRight.length > 0 ? `<p class="text-xs text-amber-100/80 serif leading-relaxed mb-1">${t('setup.rec.knowledge.truths_named', {names: truthsRight.map(k => truthNames[k]).join(', ')})}</p>` : ''}
                  ${truthsMissed.length > 0 ? `<p class="text-xs text-amber-200/85 serif leading-relaxed mb-1">${t('setup.rec.knowledge.truths_missed', {names: truthsMissed.map(k => truthNames[k]).join(', ')})}</p>` : ''}
                  ${truthsWrong.length > 0 ? `<p class="text-xs text-amber-200/85 serif leading-relaxed">${t('setup.rec.knowledge.truths_wrong')}</p>` : ''}
                `}
              </div>
              <div class="border-t border-amber-700/30 pt-3">
                <div class="text-xs font-bold text-amber-100 mb-1">${t('setup.rec.knowledge.eight_label')}</div>
                ${eightPerfect ? `
                  <p class="text-xs text-amber-100/80 serif leading-relaxed">${t('setup.rec.knowledge.eight_perfect')}</p>
                ` : `
                  <p class="text-xs text-amber-100/80 serif leading-relaxed mb-1">${t('setup.rec.knowledge.eight_count', {count: eightRight.length})}</p>
                  ${eightMissed.length > 0 ? `<p class="text-xs text-amber-200/85 serif leading-relaxed mb-1">${t('setup.rec.knowledge.eight_missed', {names: eightMissed.map(k => EIGHTFOLD_NAMES[k]).join(', ')})}</p>` : ''}
                  ${eightWrong.length > 0 ? `<p class="text-xs text-amber-200/85 serif leading-relaxed">${t('setup.rec.knowledge.eight_wrong', {names: eightWrong.join(', ')})}</p>` : ''}
                `}
              </div>
            </div>
            ${(!truthsPerfect || !eightPerfect) ? `
              <p class="text-[11px] text-amber-100/55 italic mt-3 serif">${t('setup.rec.knowledge.engine_adjusted')}</p>
            ` : ''}
          </div>
        `;
      })() : ''}

      ${r.insights && r.insights.length ? `
        <div class="parchment rounded-xl p-4 mb-4 border border-purple-700/40 bg-purple-950/10">
          <div class="text-[10px] uppercase tracking-wider text-purple-300/80 mb-2">${t('setup.rec.insights.label')}</div>
          <p class="text-[10px] text-amber-100/55 italic mb-3 leading-relaxed">${t('setup.rec.insights.intro')}</p>
          <div class="space-y-3">
            ${r.insights.map(ins => `
              <div class="bg-purple-950/25 border border-purple-700/30 rounded-lg p-3">
                <div class="text-sm text-amber-100 mb-1"><span class="text-base">${ins.icon}</span> <b>${ins.title}</b></div>
                <p class="text-xs text-amber-100/80 leading-relaxed serif">${ins.body}</p>
                ${ins.suttaId ? `
                  <button onclick="openSutta('${ins.suttaId}')" class="text-[10px] text-amber-300 hover:text-amber-200 underline mt-2">${t('setup.rec.insights.open_sutta')}</button>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- v13.4 — cleaner adjust block:
           - Daily total readout at top so the practitioner sees the real cost
           - Proper "+ Add midday sitting" button instead of the misaligned checkbox
           - All sliders/inputs already use stable IDs so live-labels don't re-render
           v13.6 — Dirk feedback: users felt duration was asked twice. It isn't
           technically duplicated (beginner sliders drive the recommendation,
           the adjust block only reflects it back), but the framing makes it
           feel that way. The headline now names explicitly that these numbers
           come from what they already said. -->
      <div class="parchment rounded-xl p-4 mb-4 border-amber-700/40">
        <div class="flex items-baseline justify-between mb-2 px-1">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${t('setup.rec.adjust.label')}</div>
          <div class="text-[11px] text-amber-200/80">${t('setup.rec.adjust.total_prefix')} <b id="rec-total-daily">${(r.morningMin || 0) + (r.middayMin || 0) + (r.eveningMin || 0)}</b> ${t('setup.rec.adjust.min_per_day_suffix')}</div>
        </div>
        <p class="text-[11px] text-amber-100/55 italic mb-3 px-1">${t('setup.rec.adjust.intro')}</p>

        <!-- Morning sit (v13.6: can be set to 0 to skip — the engine enforces
             at least one sit per day across morning + midday + evening) -->
        <div class="mb-4">
          <div class="flex items-baseline justify-between mb-2 px-1">
            <label class="text-[11px] font-bold text-amber-200/90">${t('setup.rec.adjust.morning_label')} <span class="text-[10px] text-amber-200/55 font-normal">${t('setup.rec.adjust.skip_hint')}</span></label>
            <span class="text-[11px] text-amber-300/80"><b id="rec-adjust-val-morningMin">${t('common.minutes', {n: r.morningMin})}</b></span>
          </div>
          <div class="flex flex-wrap gap-1.5 mb-2 px-1">
            ${[0, 5, 15, 20, 30, 45, 60, 75, 90, 120].map(mins => `
              <button onclick="setRecommendationMinutes('morningMin', ${mins})"
                      class="${r.morningMin === mins ? 'parchment-active border border-amber-400 text-amber-100' : 'parchment border border-amber-700/30 text-amber-100/70 hover:parchment-active'} rounded-full px-2.5 py-1 text-[11px] transition">
                ${mins === 0 ? '—' : mins}
              </button>
            `).join('')}
          </div>
          <div class="flex items-center gap-2 px-1">
            <label class="text-[10px] text-amber-200/60">${t('setup.rec.adjust.custom_label')}</label>
            <input type="number" min="0" max="180" value="${r.morningMin}" class="w-20 bg-amber-950/40 border border-amber-900/40 rounded px-2 py-1 text-xs text-amber-100" oninput="adjustRecommendation('morningMin', this.value)">
            <span class="text-[10px] text-amber-200/50">${t('setup.rec.adjust.min_short')}</span>
          </div>
        </div>

        <!-- Optional midday sit -->
        ${r.middayMin > 0 ? `
          <div class="mb-4 p-3 rounded-lg bg-amber-950/20 border border-amber-700/30">
            <div class="flex items-baseline justify-between mb-2">
              <label class="text-[11px] font-bold text-amber-200/90">${t('setup.rec.adjust.midday_label')}</label>
              <div class="flex items-center gap-2">
                <span class="text-[11px] text-amber-300/80"><b id="rec-adjust-val-middayMin">${t('common.minutes', {n: r.middayMin})}</b></span>
                <button onclick="toggleRecommendationMidday(false)" class="text-[10px] text-red-400/70 hover:text-red-300 underline">${t('setup.rec.adjust.midday_remove')}</button>
              </div>
            </div>
            <div class="flex flex-wrap gap-1.5 mb-2">
              ${[5, 10, 15, 20, 30].map(mins => `
                <button onclick="setRecommendationMinutes('middayMin', ${mins})"
                        class="${r.middayMin === mins ? 'parchment-active border border-amber-400 text-amber-100' : 'parchment border border-amber-700/30 text-amber-100/70 hover:parchment-active'} rounded-full px-2.5 py-1 text-[11px] transition">
                  ${mins}
                </button>
              `).join('')}
            </div>
            <div class="flex items-center gap-2">
              <label class="text-[10px] text-amber-200/60">${t('setup.rec.adjust.custom_label')}</label>
              <input type="number" min="2" max="60" value="${r.middayMin}" class="w-20 bg-amber-950/40 border border-amber-900/40 rounded px-2 py-1 text-xs text-amber-100" oninput="adjustRecommendation('middayMin', this.value)">
              <span class="text-[10px] text-amber-200/50">${t('setup.rec.adjust.min_short')}</span>
            </div>
          </div>
        ` : `
          <button onclick="toggleRecommendationMidday(true)" class="w-full mb-4 parchment rounded-lg p-2.5 text-center border border-amber-700/20 text-[11px] text-amber-200/75 hover:parchment-active hover:text-amber-100 transition">
            ☀️ <b>${t('setup.rec.adjust.midday_add_label')}</b> <span class="text-amber-200/55">${t('setup.rec.adjust.optional_suffix')}</span>
          </button>
        `}

        <!-- Evening sit (can be set to 0 to skip) -->
        <div class="mb-4">
          <div class="flex items-baseline justify-between mb-2 px-1">
            <label class="text-[11px] font-bold text-amber-200/90">${t('setup.rec.adjust.evening_label')} <span class="text-[10px] text-amber-200/55 font-normal">${t('setup.rec.adjust.skip_hint')}</span></label>
            <span class="text-[11px] text-amber-300/80"><b id="rec-adjust-val-eveningMin">${t('common.minutes', {n: r.eveningMin})}</b></span>
          </div>
          <div class="flex flex-wrap gap-1.5 mb-2 px-1">
            ${[0, 5, 15, 20, 30, 45, 60, 75, 90].map(mins => `
              <button onclick="setRecommendationMinutes('eveningMin', ${mins})"
                      class="${r.eveningMin === mins ? 'parchment-active border border-amber-400 text-amber-100' : 'parchment border border-amber-700/30 text-amber-100/70 hover:parchment-active'} rounded-full px-2.5 py-1 text-[11px] transition">
                ${mins === 0 ? '—' : mins}
              </button>
            `).join('')}
          </div>
          <div class="flex items-center gap-2 px-1">
            <label class="text-[10px] text-amber-200/60">${t('setup.rec.adjust.custom_label')}</label>
            <input type="number" min="0" max="180" value="${r.eveningMin}" class="w-20 bg-amber-950/40 border border-amber-900/40 rounded px-2 py-1 text-xs text-amber-100" oninput="adjustRecommendation('eveningMin', this.value)">
            <span class="text-[10px] text-amber-200/50">${t('setup.rec.adjust.min_short')}</span>
          </div>
        </div>

        <p class="text-[10px] text-amber-100/50 italic mt-3 px-1">${t('setup.rec.adjust.tail')}</p>
      </div>

      ${(() => {
        // v13.6 — validate at least one sit per day. A tracker for a meditation
        // practice cannot start with zero meditation; the engine enforces this
        // gently rather than silently defaulting.
        const totalDaily = (r.morningMin || 0) + (r.middayMin || 0) + (r.eveningMin || 0);
        if (totalDaily <= 0) {
          return `
            <div class="parchment rounded-xl p-3 mb-3 border border-red-800/40 bg-red-950/15">
              <p class="text-xs text-amber-100/85 serif leading-relaxed">
                ${t('setup.rec.validation.zero_sits')}
              </p>
            </div>
          `;
        }
        return '';
      })()}

      <div class="flex justify-between gap-2">
        <button class="btn btn-ghost text-sm" onclick="setupBack()">${t('common.back')}</button>
        <button class="btn btn-gold text-sm ${((r.morningMin || 0) + (r.middayMin || 0) + (r.eveningMin || 0)) <= 0 ? 'opacity-40 pointer-events-none' : ''}" onclick="acceptRecommendation()">${t('setup.rec.accept_button')}</button>
      </div>
    </div>
  `;
}

function renderSetupCustomFinish() {
  const data = view.setupData;
  return `
    <div class="fade-in">
      <h2 class="text-2xl font-bold gold-text mb-1 text-center">${t('setup.custom_finish.heading')}</h2>
      <p class="text-center text-amber-100/60 mb-5 text-sm">${t('setup.custom_finish.subheading')}</p>
      <div class="parchment rounded-xl p-5 mb-4">
        <div class="text-xs uppercase tracking-wider text-amber-300/70 mb-2">${t('setup.custom_finish.group_label')}</div>
        <div class="flex flex-wrap gap-2 mb-4">
          ${data.members.map(m => `
            <div class="bg-amber-900/20 border border-amber-700/40 rounded-lg p-2 flex items-center gap-2">
              <span class="text-xl">${CHARACTERS[m.character]?.icon}</span>
              <span class="text-sm text-amber-100">${m.name}</span>
            </div>
          `).join('')}
        </div>
        <p class="text-sm text-amber-100/70">${t('setup.custom_finish.after_setup_note')}</p>
      </div>
      <div class="flex justify-between">
        <button class="btn btn-ghost" onclick="setupBack()">${t('common.back')}</button>
        <button class="btn btn-gold" onclick="finishSetup()">${t('setup.custom_finish.begin_button')}</button>
      </div>
    </div>
  `;
}

