// ============================================================================
// src/systems/navigation.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 3 function(s): switchMember, showTab, closeModal
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function switchMember(id) { view.currentMember = id; saveState(); render(); }

function showTab(t) { view.tab = t; render(); }

function closeModal() {
  // If we're closing a sub-modal (like character detail) that was opened from setup,
  // return to setup instead of closing entirely
  if (view.modal && view.modal.returnTo === 'setup') {
    view.modal = { type: 'setup' };
    renderModal();
    return;
  }
  // v4_1: if the tutorial was opened mid-onboarding from the first-guidance
  // modal, closing it should resume the onboarding chain for the remaining
  // members instead of silently dropping them at the quest view.
  const shouldResumeOnboarding = !!view._resumeOnboardingAfterTutorial;
  view._resumeOnboardingAfterTutorial = false;
  view.modal = null;
  renderModal();
  if (shouldResumeOnboarding) {
    openNextOnboardingDiagnostic();
  }
}
