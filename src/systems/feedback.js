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
  // v15.11.3 — Intercept EVERY click in feedback mode, not just on
  // elements with data-component. Previously testers complained nothing
  // happened when they tapped — most buttons aren't annotated with
  // data-component. Falling through opened the setup flow they were
  // trying to report on. Now: prefer data-component for the path, fall
  // back to a derived CSS-ish path. Always open the report modal.
  e.preventDefault();
  e.stopPropagation();
  const annotated = e.target.closest('[data-component]');
  const target = annotated || e.target;
  const path = annotated
    ? annotated.getAttribute('data-component')
    : deriveDomPath(e.target);
  const snippet = getElementSnippet(target);
  openElementFeedbackModal(path, snippet);
}

function getElementSnippet(el) {
  if (!el) return '';
  const raw = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
  return raw.length > 140 ? raw.slice(0, 137) + '...' : raw;
}

// v15.11.3 — Derive a CSS-selector-ish path for elements without
// data-component. Walks up the DOM until it hits a landmark we
// recognize (id, body, #app, #modal-root). Enough to help me find the
// element in source when a tester reports.
function deriveDomPath(el) {
  if (!el || !el.tagName) return '(unknown)';
  const parts = [];
  let cur = el;
  let depth = 0;
  while (cur && cur.tagName && cur.tagName !== 'BODY' && depth < 6) {
    let token = cur.tagName.toLowerCase();
    if (cur.id) { token += '#' + cur.id; parts.unshift(token); break; }
    const cls = (cur.className && typeof cur.className === 'string')
      ? cur.className.split(/\s+/).filter(Boolean).slice(0, 2).map(c => '.' + c).join('')
      : '';
    if (cls) token += cls;
    parts.unshift(token);
    cur = cur.parentElement;
    depth++;
  }
  return parts.join(' > ') || el.tagName.toLowerCase();
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
