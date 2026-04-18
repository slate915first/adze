// ============================================================================
// src/systems/path.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 2 function(s): openPathView, pickNextStep
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function openPathView(memberId) {
  view.modal = { type: 'path_viewer', memberId };
  renderModal();
}

function pickNextStep(memberId) {
  if (!memberId) return { type: 'no_member', title: 'Select a practitioner', subtitle: '', icon: '🪷', color: 'amber', cta: '', action: '' };

  const habits = (state.habits || []).filter(h => h.who === 'all' || h.who === memberId);
  const dk = todayKey();
  const log = (state.log[dk] && state.log[dk][memberId]) || {};
  const hour = new Date().getHours();

  // Find sit habits and check their completion
  const sitHabits = habits.filter(h => /sit/i.test(h.name));
  const morningSit = sitHabits.find(h => /morning/i.test(h.name));
  const eveningSit = sitHabits.find(h => /evening/i.test(h.name));
  const middaySit = sitHabits.find(h => /midday|noon/i.test(h.name));

  // v11.1 — tone awareness. Same action, different copy. The dominant
  // hindrance (from diagnostic, 14-day average) changes HOW we invite the
  // sit — softer when sloth or doubt is heavy, firmer when restlessness is
  // heavy, level when no dominant hindrance has emerged. The CTA, icon,
  // and color intensity adapt. The action itself does not change.
  const dom = (typeof topTwoHindrances === 'function' && view.currentMember)
    ? topTwoHindrances(view.currentMember)
    : [];
  const dominantHindrance = (dom && dom[0]) ? dom[0].id : null;

  // Returns tone variant for a sit card, given slot (morning/midday/evening)
  const sitTone = (slot) => {
    const slotIcon = slot === 'morning' ? '🌅' : slot === 'evening' ? '🌙' : '☀️';
    const slotLabel = slot === 'morning' ? 'morning' : slot === 'evening' ? 'evening' : 'midday';
    if (dominantHindrance === 'sloth') {
      return {
        subtitle: 'A small sit is enough. Five minutes met is worth more than thirty planned.',
        cta: 'Begin gently →',
        color: 'amber-bright',
        icon: slotIcon
      };
    }
    if (dominantHindrance === 'doubt') {
      return {
        subtitle: 'The path is tested on the cushion, not in thinking about it.',
        cta: 'Sit anyway →',
        color: 'amber-bright',
        icon: slotIcon
      };
    }
    if (dominantHindrance === 'restless' || dominantHindrance === 'uddhacca') {
      return {
        subtitle: 'Sit. Let the body settle first. The antidote.',
        cta: 'Start the sit →',
        color: 'amber-bright',
        icon: slotIcon
      };
    }
    if (dominantHindrance === 'illwill') {
      return {
        subtitle: 'Start with a minute of metta. Then the breath.',
        cta: 'Begin with kindness →',
        color: 'amber-bright',
        icon: slotIcon
      };
    }
    if (dominantHindrance === 'sensual') {
      return {
        subtitle: 'Notice what is pulling attention. Return to the breath.',
        cta: 'Start the sit →',
        color: 'amber-bright',
        icon: slotIcon
      };
    }
    // Default — neutral, respectful
    const defaultSubs = {
      morning: 'The day begins on the cushion',
      evening: 'Settle the day before sleep',
      midday: 'A pause in the middle of the day'
    };
    return {
      subtitle: defaultSubs[slot] || 'A moment of practice',
      cta: 'Start the sit →',
      color: 'amber-bright',
      icon: slotIcon
    };
  };

  // Priority 1: Morning sit not done (any time of day before evening)
  if (morningSit && !log[morningSit.id] && hour < 18) {
    const tone = sitTone('morning');
    return {
      type: 'morning_sit',
      title: morningSit.name,
      subtitle: tone.subtitle,
      icon: tone.icon,
      color: tone.color,
      cta: tone.cta,
      action: `openMeditationTimerForHabit('${morningSit.id}')`
    };
  }

  // Priority 2: Midday sit if configured and not done
  if (middaySit && !log[middaySit.id] && hour >= 11 && hour < 17) {
    const tone = sitTone('midday');
    return {
      type: 'midday_sit',
      title: middaySit.name,
      subtitle: tone.subtitle,
      icon: tone.icon,
      color: tone.color,
      cta: tone.cta,
      action: `openMeditationTimerForHabit('${middaySit.id}')`
    };
  }

  // Priority 3: Evening sit, but only after 17:00 — don't push it earlier
  if (eveningSit && !log[eveningSit.id] && hour >= 17) {
    const tone = sitTone('evening');
    return {
      type: 'evening_sit',
      title: eveningSit.name,
      subtitle: tone.subtitle,
      icon: tone.icon,
      color: tone.color,
      cta: tone.cta,
      action: `openMeditationTimerForHabit('${eveningSit.id}')`
    };
  }

  // Priority 4: Evening sit not yet — quiet inactive state if before 17:00
  if (eveningSit && !log[eveningSit.id] && hour < 17 && morningSit && log[morningSit.id]) {
    return {
      type: 'evening_sit_waits',
      title: eveningSit.name,
      subtitle: 'Waits until later — there is time',
      icon: '🌗',
      color: 'amber-quiet',
      cta: '',
      action: ''
    };
  }

  // Priority 5: All sits done, no one-line journal yet today
  const sitsAllDone = sitHabits.every(h => log[h.id]);
  const onelineToday = state.reflectionLog?.[dk]?.[memberId]?.oneline;
  if (sitsAllDone && sitHabits.length > 0 && !onelineToday && !isDailyReflectionDoneToday(memberId)) {
    return {
      type: 'oneline',
      title: 'One line about today\'s practice',
      subtitle: 'A single sentence — anything you noticed',
      icon: '✍️',
      color: 'emerald',
      cta: 'Write a line',
      action: 'openOnelineJournal()'
    };
  }

  // Priority 6: Evening close (graduated reflection) — after 19:00 if reflection not done
  // v13.6 — Dirk feedback: he completed the onboarding assessment this
  // morning and still got prompted for an evening reflection that night.
  // The assessment already surfaced the diagnostic data; a second reflection
  // on the same day is redundant and makes the first day feel chore-heavy.
  // Suppress the evening close on day 0 (setup day). The one-line journal
  // above still fires if the user naturally wants to write something after
  // their first sit — that's opt-in and welcome.
  const isSetupDay = state.reflectionStartDate && state.reflectionStartDate === dk;
  if (hour >= 19 && !isDailyReflectionDoneToday(memberId) && !isSetupDay) {
    return {
      type: 'evening_close',
      title: 'Close the day',
      subtitle: 'Two quick questions to find the right depth',
      icon: '🪷',
      color: 'emerald',
      cta: 'Begin →',
      action: 'openEveningClose()'
    };
  }

  // Priority 7: Everything done — honor the rest
  return {
    type: 'rest',
    title: 'The day is held 🪷',
    subtitle: 'Sits done, reflection done. The practice continues tomorrow.',
    icon: '☸️',
    color: 'rest',
    cta: '',
    action: ''
  };
}
