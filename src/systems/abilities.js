// ============================================================================
// src/systems/abilities.js
// ----------------------------------------------------------------------------
// Extracted in Turn 31 from src/app.html systems layer.
// Contains 17 function(s): memberHasAbility, getMemberHooks, sumPassiveHook, multiplyPassiveHook, anyPassiveHook, memberHasTriggeredAbility, currentISOWeek, currentPeriodKey, getAbilityDef, abilityUsesThisPeriod, canUseAbility, recordAbilityUse, membersWithTriggered, isHabitMissForgiven, useSariputtaForgiveness, useKhemaArmyDismissal, useAbility_moggallana
// ============================================================================

function memberHasAbility(memberId, charId) {
  const m = state.members.find(x => x.id === memberId);
  return m && m.character === charId;
}

function getMemberHooks(memberId, kind) {
  const member = state.members?.find(x => x.id === memberId);
  if (!member) return null;
  const entry = ABILITY_HOOKS[member.character];
  if (!entry) return null;
  return entry[kind] || null;
}

function sumPassiveHook(hookName, ctx) {
  if (!state.members) return 0;
  let total = 0;
  for (const m of state.members) {
    const passive = getMemberHooks(m.id, 'passive');
    if (passive && typeof passive[hookName] === 'function') {
      const v = passive[hookName](ctx || {});
      if (typeof v === 'number' && !isNaN(v)) total += v;
    }
  }
  return total;
}

function multiplyPassiveHook(hookName, ctx) {
  if (!state.members) return 1;
  let product = 1;
  for (const m of state.members) {
    const passive = getMemberHooks(m.id, 'passive');
    if (passive && typeof passive[hookName] === 'function') {
      const v = passive[hookName](ctx || {});
      if (typeof v === 'number' && !isNaN(v)) product *= v;
    }
  }
  return product;
}

function anyPassiveHook(hookName, ctx) {
  if (!state.members) return false;
  for (const m of state.members) {
    const passive = getMemberHooks(m.id, 'passive');
    if (passive && typeof passive[hookName] === 'function') {
      if (passive[hookName](ctx || {})) return true;
    }
  }
  return false;
}

function memberHasTriggeredAbility(memberId, hookName) {
  const triggered = getMemberHooks(memberId, 'triggered');
  return !!(triggered && triggered[hookName]);
}

function currentISOWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNo = 1 + Math.round(
    ((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  );
  return d.getFullYear() + '-W' + String(weekNo).padStart(2, '0');
}

function currentPeriodKey(budget) {
  if (budget === 'perDay') return todayKey();
  if (budget === 'perWeek') return currentISOWeek();
  if (budget === 'perStage') return 'stage-' + (state.currentStage || 0);
  if (budget === 'perQuest') return 'quest';
  return 'unknown';
}

function getAbilityDef(memberId, abilityKey) {
  const triggered = getMemberHooks(memberId, 'triggered');
  if (!triggered || !triggered[abilityKey]) return null;
  return triggered[abilityKey];
}

function abilityUsesThisPeriod(memberId, abilityKey) {
  const def = getAbilityDef(memberId, abilityKey);
  if (!def) return 0;
  const period = currentPeriodKey(def.budget);
  return (state.abilityUses?.[memberId]?.[abilityKey]?.[period]) ? 1 : 0;
}

function canUseAbility(memberId, abilityKey) {
  const def = getAbilityDef(memberId, abilityKey);
  if (!def) return false;
  return abilityUsesThisPeriod(memberId, abilityKey) < (def.max || 1);
}

function recordAbilityUse(memberId, abilityKey, payload) {
  const def = getAbilityDef(memberId, abilityKey);
  if (!def) return;
  const period = currentPeriodKey(def.budget);
  if (!state.abilityUses) state.abilityUses = {};
  if (!state.abilityUses[memberId]) state.abilityUses[memberId] = {};
  if (!state.abilityUses[memberId][abilityKey]) state.abilityUses[memberId][abilityKey] = {};
  state.abilityUses[memberId][abilityKey][period] = payload || true;
  saveState();
}

function membersWithTriggered(abilityKey) {
  return (state.members || []).filter(m => memberHasTriggeredAbility(m.id, abilityKey));
}

function isHabitMissForgiven(memberId, habitId, dateK) {
  const sariputtas = membersWithTriggered('weeklyMissForgiveness');
  for (const s of sariputtas) {
    const uses = state.abilityUses?.[s.id]?.weeklyMissForgiveness;
    if (!uses) continue;
    for (const period in uses) {
      const entry = uses[period];
      if (entry && entry.dateK === dateK && entry.habitId === habitId) return true;
    }
  }
  return false;
}

function useSariputtaForgiveness(callerMemberId, targetMemberId, habitId, dateK) {
  if (!canUseAbility(callerMemberId, 'weeklyMissForgiveness')) {
    alert(t('alerts.sariputta_used'));
    return;
  }
  recordAbilityUse(callerMemberId, 'weeklyMissForgiveness', {
    dateK, habitId, targetMemberId
  });
  recalculateShadow();
  render();
}

function useKhemaArmyDismissal(callerMemberId, armyId) {
  if (!canUseAbility(callerMemberId, 'armyDismissal')) {
    alert(t('alerts.khema_used'));
    return;
  }
  recordAbilityUse(callerMemberId, 'armyDismissal', { armyId });
  if (!state.defeatedArmies.includes(armyId)) {
    state.defeatedArmies.push(armyId);
  }
  // Same shadow recede as a normal defeat
  state.shadow = Math.max(shadowFloorForTeam(), state.shadow - 8);
  saveState();
  recalculateShadow();
  closeModal();
  render();
}

function useAbility_moggallana(targetMemberId) {
  // Transfer 10 of caller's points to target as rescue
  const dk = todayKey();
  if (!state.log[dk]) state.log[dk] = {};
  if (!state.log[dk][targetMemberId]) state.log[dk][targetMemberId] = {};
  if (!state.log[dk]._rescues) state.log[dk]._rescues = [];
  state.log[dk]._rescues.push({ from: view.currentMember, to: targetMemberId, amount: 10 });
  // Track ability use
  if (!state.abilityUses[view.currentMember]) state.abilityUses[view.currentMember] = {};
  state.abilityUses[view.currentMember][dk + '_rescue'] = true;
  saveState();
  recalculateShadow();
  alert(t('alerts.rescue_sent'));
  render();
}
