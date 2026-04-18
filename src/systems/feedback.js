// ============================================================================
// src/systems/feedback.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 6 function(s): openFeedbackModal, handleFeedbackFabTap, setFeedbackMode, feedbackClickCapture, getElementSnippet, openElementFeedbackModal
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function openFeedbackModal(kind) {
  view.modal = {
    type: 'feedback',
    kind: kind || 'bug',
    step: 'form',         // 'form' | 'sent'
    areas: [],            // selected area ids
    severity: null,       // bug-only
    frequency: null,      // bug-only
    summary: '',          // short one-line description
    details: '',          // freeform long text
    allowContact: false   // offer to be contacted back?
  };
  renderModal();
}

function handleFeedbackFabTap() {
  // Short tap: open the FAB menu (feedback form or element mode toggle).
  // We surface both options in a small modal rather than hiding one behind
  // a long-press — long-press is discoverability-hostile on desktop.
  if (view.feedbackMode) {
    // Already in element mode? Button acts as quick exit.
    setFeedbackMode(false);
    return;
  }
  view.modal = { type: 'feedback_fab_menu' };
  renderModal();
}

function setFeedbackMode(on) {
  view.feedbackMode = !!on;
  const body = document.body;
  const banner = document.getElementById('feedback-banner');
  const fab = document.getElementById('feedback-fab');
  if (on) {
    body.classList.add('feedback-mode');
    if (banner) banner.style.display = 'block';
    if (fab) fab.classList.add('active');
    // Prevent normal click behavior on [data-component] elements;
    // replace it with the feedback-capture handler. We attach a single
    // capture-phase listener on body so we don't have to rebind on every
    // renderModal call.
    if (!view._feedbackListenerBound) {
      document.addEventListener('click', feedbackClickCapture, true);
      view._feedbackListenerBound = true;
    }
  } else {
    body.classList.remove('feedback-mode');
    if (banner) banner.style.display = 'none';
    if (fab) fab.classList.remove('active');
    // Keep the listener bound (cheap, idempotent) but it short-circuits
    // when feedbackMode is off.
  }
}

function feedbackClickCapture(e) {
  if (!view.feedbackMode) return;
  // Let clicks on the FAB, banner, and modals pass through so the user
  // can still exit or fill out the report form.
  if (e.target.closest('#feedback-fab, #feedback-banner, #modal-root')) return;
  const comp = e.target.closest('[data-component]');
  if (!comp) return;
  e.preventDefault();
  e.stopPropagation();
  const path = comp.getAttribute('data-component');
  const snippet = getElementSnippet(comp);
  openElementFeedbackModal(path, snippet);
}

function getElementSnippet(el) {
  if (!el) return '';
  const raw = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
  return raw.length > 140 ? raw.slice(0, 137) + '...' : raw;
}

function openElementFeedbackModal(path, snippet) {
  view.modal = {
    type: 'element_feedback',
    path: path,
    snippet: snippet || '',
    tab: view.tab || 'unknown',
    severity: null,        // 'cosmetic' | 'confusing' | 'broken'
    report: '',
    suggestion: ''
  };
  renderModal();
}
