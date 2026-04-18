// ============================================================================
// render/quest.js
// ----------------------------------------------------------------------------
// The Quest tab (part of the story path — not shown for Free Path users).
// This is the narrative surface, distinct from the Path tab (which is
// the canonical path-of-liberation dashboard). The Quest tab shows
// stage progress, current chapter's armies, and the "Teachings" section
// with guided flows (basic meditation, metta, etc.) and a library link.
//
// Five functions, tightly coupled:
//
//   showArmyChallenge(armyId)    Opens the army_challenge modal. Called
//                                from the Quest-tab army cards.
//
//   renderQuest()                Tab body. Shows a "no active quest"
//                                placeholder for free-path mode; otherwise
//                                renders the current stage, armies in
//                                play, and the teachings section.
//
//   openMeditationTutorial(step) Legacy alias — delegates to
//                                openGuidedFlow('basic_meditation').
//                                v4_2: kept so existing call sites and
//                                the tutorial's own back/next buttons
//                                keep working.
//
//   renderTeachingsSection()     The Teachings subcard on the Quest tab.
//                                Iterates GUIDED_FLOWS and shows each
//                                as a card. Flows with a requiresLevel
//                                that the current quest doesn't satisfy
//                                appear as "locked" (not hidden) so the
//                                player knows what's coming.
//
//   openTeachingsLibrary()       Opens the technique-prescription library
//                                modal (browse-all-teachings).
//
// Dependencies (from global scope):
//   State:     state (questActive, currentStage, stageStartDate, members,
//                     diagnostics, abilityStatus, questName)
//              view (currentMember, modal)
//   Engine:    t() from engine/i18n.js
//   Helpers:   todayKey, daysBetween, getCurrentStageArmies,
//              openGuidedFlow, renderModal
//   Data:      STAGES, MARA_ARMIES, GUIDED_FLOWS
// ============================================================================

function showArmyChallenge(armyId) {
  view.modal = { type: 'army_challenge', armyId };
  renderModal();
}

// ============================================================================
// QUEST TAB - the path map
// ============================================================================

function renderQuest() {
  if (!state.questActive) {
    return `<div class="parchment rounded-xl p-8 text-center"><p class="text-amber-100/70">${t('quest.no_active')}</p></div>`;
  }

  return `
    <div class="quest-banner rounded-xl p-6 mb-6 fade-in text-center">
      <div class="text-xs uppercase tracking-wider text-amber-300/70 mb-2">${t('quest.eyebrow')}</div>
      <h2 class="text-3xl font-bold gold-text mb-2">${state.questName}</h2>
      <p class="text-sm text-amber-100/70 italic">${t('quest.subtitle')}</p>
    </div>

    <div class="parchment rounded-xl p-6 mb-6">
      <h3 class="text-xs uppercase tracking-wider text-amber-300 mb-4">${t('quest.path_label')}</h3>
      <div class="space-y-4">
        ${STAGES.map((stage, i) => {
          const isComplete = i < state.currentStage;
          const isCurrent = i === state.currentStage;
          const isLocked = i > state.currentStage;
          return `
            <div class="flex gap-4 ${isLocked ? 'opacity-40' : ''}">
              <div class="stage-marker ${isComplete?'stage-complete':''} ${isCurrent?'stage-current':''}">
                ${isComplete ? '<span class="text-2xl">✓</span>' : `<span class="text-2xl">${stage.icon}</span>`}
              </div>
              <div class="flex-1">
                <div class="flex items-baseline justify-between">
                  <div>
                    <h4 class="font-bold text-amber-100">${stage.name}</h4>
                    <p class="text-xs text-amber-300/70 italic">${stage.subtitle} • ${stage.suttaRef}</p>
                  </div>
                  ${isCurrent ? `<div class="text-xs text-amber-300">${t('quest.stage_current_badge')}</div>` : ''}
                  ${isComplete ? `<div class="text-xs text-emerald-400">${t('quest.stage_complete_badge')}</div>` : ''}
                </div>
                ${(isCurrent || isComplete) ? `
                <p class="text-sm text-amber-100/80 mt-2 leading-relaxed">${stage.description}</p>
                ${isCurrent ? `
                  <div class="mt-3 parchment rounded-lg p-3">
                    <div class="text-xs text-amber-300/70 mb-1">${t('quest.progress_to_next')}</div>
                    <div class="text-xs text-amber-100/80 mb-2">${t('quest.key_habit_days', {current: state.keyHabitDaysAtStage, required: stage.requiredKeyHabitDays})}</div>
                    <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100,(state.keyHabitDaysAtStage/stage.requiredKeyHabitDays)*100)}%"></div></div>
                  </div>
                ` : ''}
                ` : `<p class="text-xs text-amber-100/40 italic mt-1">${t('quest.stage_locked_note')}</p>`}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

${renderTeachingsSection()}

    <div class="parchment rounded-xl p-5">
      <h3 class="text-xs uppercase tracking-wider text-amber-300 mb-3">${t('quest.stats_label')}</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        <div><div class="text-2xl font-bold gold-text">${state.currentStage + 1}/5</div><div class="text-xs text-amber-100/60">${t('quest.stat_stage')}</div></div>
        <div><div class="text-2xl font-bold gold-text">${state.keyHabitDaysAtStage || 0}</div><div class="text-xs text-amber-100/60">${t('quest.stat_days_at_stage')}</div></div>
        <div><div class="text-2xl font-bold gold-text">${state.wisdomCollected.length}</div><div class="text-xs text-amber-100/60">${t('quest.stat_scrolls')}</div></div>
        <div><div class="text-2xl font-bold gold-text">${state.questAttempts || 0}</div><div class="text-xs text-amber-100/60">${t('quest.stat_past_attempts')}</div></div>
      </div>
    </div>
  `;
}

function openMeditationTutorial(step) {
  // v4_2: legacy alias — preserved so existing call sites and the tutorial's
  // own back/next buttons keep working. New flows should call openGuidedFlow.
  openGuidedFlow('basic_meditation', step || 0);
}

// v5: render the Quest-tab Teachings section. Iterates GUIDED_FLOWS and
// shows each available flow as a card. Flows with a requiresLevel that the
// current quest doesn't satisfy appear as "locked" rather than being hidden,
// so the player knows what's coming. Also surfaces a "Browse all teachings"
// link to the technique-prescription library modal.
function renderTeachingsSection() {
  // Level-name static key per branch (lesson #5). Capitalization is locale-
  // specific; en.json carries the capitalized forms directly.
  const levelLabel = (level) => {
    if (level === 'beginner') return t('teachings.level_beginner');
    if (level === 'intermediate') return t('teachings.level_intermediate');
    if (level === 'advanced') return t('teachings.level_advanced');
    return level;
  };
  const cards = Object.values(GUIDED_FLOWS).map(flow => {
    const locked = flow.requiresLevel && !isLevelAtLeast(flow.requiresLevel);
    if (locked) {
      return `
        <div class="parchment rounded-xl p-4 mb-3 opacity-50">
          <div class="flex items-start gap-3">
            <div class="text-3xl">${flow.icon}</div>
            <div class="flex-1">
              <div class="text-xs uppercase tracking-wider text-amber-300/60">${flow.title}</div>
              <div class="font-bold text-amber-100/70 mt-0.5">${flow.subtitle}</div>
              <div class="text-xs text-amber-100/50 mt-1">${t('teachings.locked_unlocks_at', {level: levelLabel(flow.requiresLevel)})}</div>
            </div>
          </div>
        </div>
      `;
    }
    return `
      <button onclick="openGuidedFlow('${flow.id}', 0)" class="parchment rounded-xl p-4 mb-3 w-full text-left hover:parchment-active transition border-amber-700/40">
        <div class="flex items-start gap-3">
          <div class="text-3xl">${flow.icon}</div>
          <div class="flex-1">
            <div class="text-xs uppercase tracking-wider text-amber-300">${flow.title}</div>
            <div class="font-bold text-amber-100 mt-0.5">${flow.subtitle}</div>
            <div class="text-xs text-amber-100/70 mt-1">${flow.description}</div>
          </div>
        </div>
      </button>
    `;
  }).join('');
  return `
    <div class="mb-5">
      <div class="text-xs uppercase tracking-wider text-amber-300 mb-3 px-1">${t('teachings.section_label')}</div>
      ${cards}
      <button onclick="openFoundations()" class="parchment rounded-xl p-3 w-full text-left hover:parchment-active transition border-amber-700/30 mb-2">
        <div class="flex items-center gap-3">
          <div class="text-2xl">☸️</div>
          <div class="flex-1">
            <div class="text-xs uppercase tracking-wider text-amber-300/80">${t('teachings.foundations_eyebrow')}</div>
            <div class="text-xs text-amber-100/70">${t('teachings.foundations_body')}</div>
            ${state.seenFoundations ? '' : `<div class="text-[10px] text-amber-300/80 italic mt-1">${t('teachings.foundations_tap_to_read')}</div>`}
          </div>
        </div>
      </button>
      <button onclick="openTeachingsLibrary()" class="parchment rounded-xl p-3 w-full text-left hover:parchment-active transition border-amber-700/30">
        <div class="flex items-center gap-3">
          <div class="text-2xl">🪔</div>
          <div class="flex-1">
            <div class="text-xs uppercase tracking-wider text-amber-300/80">${t('teachings.library_eyebrow')}</div>
            <div class="text-xs text-amber-100/70">${t('teachings.library_body')}</div>
          </div>
        </div>
      </button>
    </div>
  `;
}

function openTeachingsLibrary() {
  view.modal = { type: 'teachings_library' };
  renderModal();
}
