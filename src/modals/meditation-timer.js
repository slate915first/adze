// ============================================================================
// modals/meditation-timer.js
// ----------------------------------------------------------------------------
// The sit timer — a 4-phase modal called when the practitioner starts a sit.
//
//   select    : pick duration (8 presets) — 5 / 10 / 15 / 20 / 25 / 30 / 45 / 60
//   pre       : optional pre-sit readback — names the dominant hindrance as
//               a visitor (Ajahn Chah cloud simile). Flavor header varies
//               by m.flavor: breath (ānāpānasati) / mettā / walking.
//   sitting   : the running countdown. Minimal chrome: pause + end-early.
//   post      : post-sit chips — what arose? Saves the sit record.
//
// Exports:
//   renderMeditationTimerModal(m) → string
//     Where m is the view.modal object with fields:
//       - phase: 'select' | 'pre' | 'sitting' | 'post'
//       - habitId: optional habit id this sit completes
//       - duration: seconds
//       - flavor: 'breath' | 'metta' | 'walking'
//       - preChips, postChips, preChipsExpanded
//       - elapsedSec, early
//
// Dependencies (all read from global scope):
//   State:     state (habits, currentMorningMinutes, currentEveningMinutes)
//              view (currentMember, modal)
//   Engine:    t() from engine/i18n.js
//   Helpers:   topTwoHindrances, getHindranceInfo, dominantHindranceForMember
//              formatSitTime
//   Data:      PRE_SIT_CHIPS, POST_SIT_CHIPS
//
// The dispatch in renderModal() calls this helper for the whole
// `m.type === 'meditation_timer'` branch — keeps the dispatch uncluttered
// while letting this file evolve independently.
// ============================================================================

function renderMeditationTimerModal(m) {
  const phase = m.phase || 'select';
  const habit = m.habitId ? state.habits.find(x => x.id === m.habitId) : null;
  const habitLabel = habit ? habit.name : t('meditation_timer.sit_fallback');

  if (phase === 'select') {
    const presets = [5, 10, 15, 20, 25, 30, 45, 60];
    const slotSuggestion = (habit && habit.slot)
      ? t('meditation_timer.select.suggested_sit', {
          slot: habit.slot,
          mins: habit.slot === 'morning' ? state.currentMorningMinutes : state.currentEveningMinutes
        })
      : '';
    return `
      <div class="fade-in">
        <div class="text-center mb-4">
          <div class="text-5xl mb-2">🧘</div>
          <div class="text-xs uppercase tracking-wider text-amber-300/70">${t('meditation_timer.select.eyebrow')}</div>
          <h2 class="text-xl font-bold gold-text mt-1">${habitLabel}</h2>
        </div>
        <div class="parchment rounded-xl p-4 mb-4">
          <div class="text-xs uppercase tracking-wider text-amber-300/80 mb-3">${t('meditation_timer.select.choose_duration')}</div>
          <div class="grid grid-cols-4 gap-2">
            ${presets.map(d => `
              <button onclick="meditationTimerPickDuration(${d})" class="parchment ${m.duration === d*60 ? 'parchment-active' : ''} rounded-lg p-3 text-center hover:parchment-active transition">
                <div class="text-lg font-bold gold-text">${d}</div>
                <div class="text-[10px] text-amber-100/60">${t('meditation_timer.select.minutes_unit')}</div>
              </button>
            `).join('')}
          </div>
          ${slotSuggestion ? `<p class="text-xs text-amber-100/50 italic mt-3">${slotSuggestion}</p>` : ''}
        </div>
        <div class="flex justify-between gap-2">
          <button class="btn btn-ghost" onclick="closeModal()">${t('meditation_timer.select.cancel_button')}</button>
          <button class="btn btn-gold ${m.duration ? '' : 'opacity-40 pointer-events-none'}" onclick="meditationTimerToPre()">${t('meditation_timer.select.continue_button')}</button>
        </div>
      </div>
    `;
  }

  if (phase === 'pre') {
    const sel = m.preChips || [];
    // v9: name the current dominant hindrance as a visitor, not as you.
    // Ajahn Chah cloud simile: the hindrance is weather, not self.
    // v9.3: show up to two hindrances when two are moving together.
    const top = topTwoHindrances(view.currentMember);
    let hindranceBlock = '';
    if (top.length >= 1) {
      const primary = getHindranceInfo(top[0].id);
      const secondary = top.length >= 2 ? getHindranceInfo(top[1].id) : null;
      hindranceBlock = `
        <div class="parchment rounded-xl p-3 mb-3 border border-amber-700/40">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('meditation_timer.pre.hindrance_eyebrow')}</div>
          <div class="flex items-center gap-2">
            <div class="text-2xl">${primary.icon}</div>
            <div class="flex-1">
              <div class="text-sm font-bold text-amber-100">${t('meditation_timer.pre.hindrance_full', {pali: primary.pali, english: primary.english})}</div>
              <div class="text-[11px] text-amber-100/70 italic">${t('meditation_timer.pre.hindrance_visitor_note', {pali: primary.pali})}</div>
            </div>
          </div>
          ${secondary ? `
            <div class="mt-2 pt-2 border-t border-amber-900/25 flex items-center gap-2">
              <div class="text-base opacity-75">${secondary.icon}</div>
              <div class="flex-1">
                <div class="text-[11px] text-amber-100/80">${t('meditation_timer.pre.hindrance_secondary', {pali: secondary.pali})}</div>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    } else {
      // Fall back to old single-hindrance dominant if topTwo returned nothing
      const domHid = dominantHindranceForMember(view.currentMember);
      const domInfo = domHid ? getHindranceInfo(domHid) : null;
      if (domInfo) {
        hindranceBlock = `
          <div class="parchment rounded-xl p-3 mb-3 border border-amber-700/40">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('meditation_timer.pre.hindrance_eyebrow')}</div>
            <div class="flex items-center gap-2">
              <div class="text-2xl">${domInfo.icon}</div>
              <div class="flex-1">
                <div class="text-sm font-bold text-amber-100">${t('meditation_timer.pre.hindrance_full', {pali: domInfo.pali, english: domInfo.english})}</div>
                <div class="text-[11px] text-amber-100/70 italic">${t('meditation_timer.pre.hindrance_visitor_note', {pali: domInfo.pali})}</div>
              </div>
            </div>
          </div>
        `;
      }
    }

    // Flavor-specific icon, subtitle, and title — static key per branch (lesson #3).
    const flavorIcon  = m.flavor === 'metta' ? '💗' : m.flavor === 'walking' ? '🚶' : '🌿';
    const flavorEyebrow = m.flavor === 'walking'
      ? t('meditation_timer.pre.sit_or_walk_walk')
      : t('meditation_timer.pre.sit_or_walk_sit');
    const flavorTitle = m.flavor === 'metta'
      ? t('meditation_timer.pre.flavor_metta_title')
      : m.flavor === 'walking'
        ? t('meditation_timer.pre.flavor_walking_title')
        : t('meditation_timer.pre.flavor_breath_title');

    return `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-4xl mb-1">${flavorIcon}</div>
          <div class="text-xs uppercase tracking-wider text-amber-300/70">${flavorEyebrow}</div>
          <h2 class="text-lg font-bold gold-text mt-1">${flavorTitle}</h2>
          <p class="text-xs text-amber-100/60 italic mt-1">${t('meditation_timer.pre.three_breaths')}</p>
          <div class="text-[10px] text-amber-300/60 mt-2">${t('meditation_timer.pre.duration_readback', {min: Math.round((m.duration || 0) / 60)})}</div>
        </div>
        ${hindranceBlock}
        ${m.preChipsExpanded ? `
          <div class="mb-3">
            <p class="text-[10px] uppercase tracking-wider text-amber-300/70 text-center mb-2">${t('meditation_timer.pre.chips_prompt')}</p>
            <div class="flex flex-wrap gap-2 justify-center">
              ${PRE_SIT_CHIPS.map(c => `
                <button onclick="meditationTimerToggleChip('pre', '${c.id}')" class="${sel.includes(c.id) ? 'parchment-active border border-amber-400' : 'parchment border border-amber-700/30'} rounded-full px-3 py-1.5 text-xs hover:parchment-active transition">
                  ${c.icon} ${c.label}
                </button>
              `).join('')}
            </div>
          </div>
        ` : `
          <div class="text-center mb-3">
            <button onclick="toggleMeditationTimerChips('pre')" class="text-[10px] text-amber-300/60 hover:text-amber-200 underline italic">
              ${t('meditation_timer.pre.chips_toggle')}
            </button>
          </div>
        `}
        <div class="flex justify-between gap-2">
          <button class="btn btn-ghost" onclick="meditationTimerBackToSelect()">${t('meditation_timer.pre.back_button')}</button>
          <button class="btn btn-gold" onclick="meditationTimerBegin()">${t('meditation_timer.pre.begin_button')}</button>
        </div>
      </div>
    `;
  }

  if (phase === 'sitting') {
    const initialDisplay = formatSitTime(m.duration);
    return `
      <div class="fade-in">
        <div class="text-center py-4">
          <div class="text-xs uppercase tracking-wider text-amber-300/70 mb-2">${habitLabel}</div>
          <div id="sit-timer-display" class="font-bold gold-text" style="font-size: 5rem; line-height: 1; font-variant-numeric: tabular-nums;">${initialDisplay}</div>
          <p class="text-xs text-amber-100/50 italic mt-3">${t('meditation_timer.sitting.bell_note')}</p>
        </div>
        <div class="flex justify-center gap-2 mt-4">
          <button id="sit-pause-btn" class="btn btn-ghost" onclick="pauseSitTimer()">${t('meditation_timer.sitting.pause_button')}</button>
          <button class="btn btn-ghost" onclick="endSitEarly()">${t('meditation_timer.sitting.end_early_button')}</button>
        </div>
      </div>
    `;
  }

  if (phase === 'post') {
    const sel = m.postChips || [];
    const elapsed = m.elapsedSec || m.duration;
    const elapsedMin = Math.floor(elapsed / 60);
    const elapsedSec = elapsed % 60;
    // v9: the post-sit hindrance check — did the visitor move?
    const domHid = dominantHindranceForMember(view.currentMember);
    const domInfo = domHid ? getHindranceInfo(domHid) : null;
    const hindranceBlock = domInfo ? `
      <div class="parchment rounded-xl p-3 mb-3 border border-amber-700/40">
        <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('meditation_timer.post.hindrance_before', {pali: domInfo.pali})}</div>
        <div class="text-[11px] text-amber-100/80 italic leading-relaxed">${t('meditation_timer.post.hindrance_after_q', {pali: domInfo.pali})}</div>
      </div>
    ` : '';
    const timeDisplay = `${elapsedMin}:${elapsedSec < 10 ? '0' : ''}${elapsedSec}${m.early ? t('meditation_timer.post.early_suffix') : ''}`;
    const eyebrowLabel = m.early
      ? t('meditation_timer.post.early_eyebrow')
      : t('meditation_timer.post.complete_eyebrow');
    const saveButtonLabel = m.habitId
      ? t('meditation_timer.post.mark_complete_button')
      : t('meditation_timer.post.save_button');
    return `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-4xl mb-1">🪷</div>
          <div class="text-xs uppercase tracking-wider text-amber-300/70">${eyebrowLabel}</div>
          <h2 class="text-lg font-bold gold-text mt-1">${timeDisplay}</h2>
          <p class="text-xs text-amber-100/60 italic mt-2">${t('meditation_timer.post.what_did_you_find')}</p>
          <p class="text-[10px] text-amber-100/50 italic">${t('meditation_timer.post.chip_instructions')}</p>
        </div>
        ${hindranceBlock}
        <div class="flex flex-wrap gap-2 justify-center mb-4">
          ${POST_SIT_CHIPS.map(c => `
            <button onclick="meditationTimerToggleChip('post', '${c.id}')" class="${sel.includes(c.id) ? 'parchment-active border border-amber-400' : 'parchment border border-amber-700/30'} rounded-full px-3 py-1.5 text-xs hover:parchment-active transition">
              ${c.icon} ${c.label}
            </button>
          `).join('')}
        </div>
        <div class="flex justify-end gap-2">
          <button class="btn btn-gold" onclick="finalizeSit()">${saveButtonLabel}</button>
        </div>
      </div>
    `;
  }

  return '';
}
