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

// v15.18 — delegated fallback for the three legal-text buttons in Settings.
// A tester reported that Datenschutz and Impressum were un-tappable from the
// Settings tab on iOS Safari (the Privacy-Detail button on the same card did
// respond). The root cause is likely a layout/overlay interaction rather than
// a broken handler, but a capture-phase delegate keyed on data-legal-action
// makes the buttons robust against any inline-onclick failure we haven't
// pinned down. Idempotent: guarded by a flag so hot-reloads don't stack.
if (typeof window !== 'undefined' && !window.__adzeLegalClickDelegate) {
  window.__adzeLegalClickDelegate = true;
  document.addEventListener('click', (e) => {
    const el = e.target && e.target.closest ? e.target.closest('[data-legal-action]') : null;
    if (!el) return;
    const action = el.getAttribute('data-legal-action');
    if (action === 'datenschutz' && typeof openDatenschutz === 'function') openDatenschutz();
    else if (action === 'impressum' && typeof openImpressum === 'function') openImpressum();
    else if (action === 'privacy-detail' && typeof openPrivacyDetail === 'function') openPrivacyDetail();
  }, true);
}
