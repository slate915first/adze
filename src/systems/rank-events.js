// ============================================================================
// src/systems/rank-events.js
// ----------------------------------------------------------------------------
// Extracted in Turn 31 from src/app.html systems layer.
// Contains 7 function(s): calculateSitPoints, calculateSitMissPenalty, maybeTriggerRankAnnouncement, acknowledgeRankIntro, acknowledgeRankAnnouncement, maybeTriggerEveningReflection, dismissEveningReflection
// ============================================================================

function calculateSitPoints(minutes) {
  if (minutes <= 0) return 0;
  return Math.max(10, Math.round(minutes * 1.2));
}

function calculateSitMissPenalty(minutes) {
  if (minutes <= 0) return 0;
  return -Math.max(5, Math.round(minutes * 0.5));
}

function maybeTriggerRankAnnouncement() {
  if (view.modal) return;
  if (!view.currentMember) return;
  const p = state.path?.[view.currentMember];
  if (!p) return;
  // First-time introduction (v13.6)
  if (p.rankIntroPending && !p.rankIntroSeen) {
    view.modal = { type: 'rank_intro', memberId: view.currentMember };
    renderModal();
    return;
  }
  if (!p.pendingRankAnnouncement) return;
  view.modal = { type: 'rank_announcement', memberId: view.currentMember, payload: p.pendingRankAnnouncement };
  renderModal();
}

function acknowledgeRankIntro() {
  if (!view.modal || view.modal.type !== 'rank_intro') return;
  const mid = view.modal.memberId;
  if (state.path?.[mid]) {
    state.path[mid].rankIntroSeen = true;
    state.path[mid].rankIntroPending = false;
  }
  saveState();
  view.modal = null;
  renderModal();
  // Now trigger the actual rank announcement if one is pending.
  setTimeout(() => maybeTriggerRankAnnouncement(), 100);
}

function acknowledgeRankAnnouncement() {
  if (!view.modal || view.modal.type !== 'rank_announcement') return;
  const mid = view.modal.memberId;
  if (state.path?.[mid]) state.path[mid].pendingRankAnnouncement = null;
  saveState();
  view.modal = null;
  renderModal();
  render();
}

function maybeTriggerEveningReflection() {
  if (view._eveningReflectionShownThisSession) return;
  if (view.modal) return;  // don't interrupt another modal
  const hour = new Date().getHours();
  if (hour < 18) return;
  if (isDailyReflectionDoneToday()) return;
  // Small delay so the user sees the main view briefly first
  setTimeout(() => {
    if (view.modal) return;  // still check — might have opened something
    if (isDailyReflectionDoneToday()) return;
    view._eveningReflectionShownThisSession = true;
    // v15.15.2 — route to the merged Evening reflection flow (same surface
    // as Today's single Reflection tile). Previously this opened a separate
    // `evening_reflection` modal; the diagnostic sliders + rotating daily
    // question that lived there now render inline in the `oneline` phase,
    // so no data-collection is lost.
    openEveningClose();
  }, 1500);
}

function dismissEveningReflection() {
  view._eveningReflectionShownThisSession = true;  // don't bug them again this session
  view.modal = null;
  renderModal();
}
