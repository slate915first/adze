// ============================================================================
// src/systems/feedback-builder.js
// ----------------------------------------------------------------------------
// Extracted in Turn 31 from src/app.html systems layer.
// Contains 8 function(s): elementFeedbackSet, buildElementFeedbackReport, copyElementFeedbackReport, feedbackSet, feedbackToggleArea, feedbackUpdateInput, buildFeedbackMailto, feedbackSend
// ============================================================================

function elementFeedbackSet(field, value) {
  if (!view.modal || view.modal.type !== 'element_feedback') return;
  view.modal[field] = value;
  renderModal();
}

function buildElementFeedbackReport() {
  const m = view.modal;
  if (!m || m.type !== 'element_feedback') return '';
  const lines = [];
  lines.push('[adze v' + APP_VERSION + ' · beta element feedback]');
  lines.push('Path: ' + (m.path || t('element_feedback.path_fallback')));
  lines.push('Tab: ' + (m.tab || t('element_feedback.path_fallback')));
  lines.push('Severity: ' + (m.severity || '(unspecified)'));
  if (m.snippet) {
    lines.push('Element text: ' + m.snippet);
  }
  lines.push('');
  lines.push('Report:');
  lines.push((m.report || '').trim() || '(no report text)');
  if ((m.suggestion || '').trim()) {
    lines.push('');
    lines.push('Suggested fix:');
    lines.push(m.suggestion.trim());
  }
  return lines.join('\n');
}

function copyElementFeedbackReport() {
  const text = buildElementFeedbackReport();
  if (!text) return;
  // Use clipboard API with a fallback to a hidden textarea for older envs.
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(ta);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(fallback);
  } else {
    fallback();
  }
  // Mark as copied in the modal state so the UI can flash confirmation
  if (view.modal && view.modal.type === 'element_feedback') {
    view.modal.copied = true;
    renderModal();
    // Unflash after 2 seconds
    setTimeout(() => {
      if (view.modal && view.modal.type === 'element_feedback') {
        view.modal.copied = false;
        renderModal();
      }
    }, 2000);
  }
}

function feedbackSet(field, value) {
  if (!view.modal || view.modal.type !== 'feedback') return;
  view.modal[field] = value;
  renderModal();
}

function feedbackToggleArea(areaId) {
  if (!view.modal || view.modal.type !== 'feedback') return;
  const areas = view.modal.areas || [];
  const idx = areas.indexOf(areaId);
  if (idx >= 0) areas.splice(idx, 1);
  else areas.push(areaId);
  view.modal.areas = areas;
  renderModal();
}

function feedbackUpdateInput(field, value) {
  // Used for text inputs — does NOT re-render (would steal focus)
  if (!view.modal || view.modal.type !== 'feedback') return;
  view.modal[field] = value;
}

function buildFeedbackMailto(m) {
  const kindPrefix = FEEDBACK_CONFIG.subjects[m.kind] || '[HQ-FEEDBACK]';
  const areaTag = (m.areas && m.areas.length)
    ? `[${m.areas.join(',')}]`
    : '';
  const sevTag = (m.kind === 'bug' && m.severity)
    ? `[${m.severity}]`
    : '';
  const summary = (m.summary || '').trim().slice(0, 80) || '(no summary)';
  const subject = `${kindPrefix}${areaTag}${sevTag} ${summary}`;

  // Context — auto-filled, tester can edit before sending
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : 'unknown';
  const platform = (typeof navigator !== 'undefined' && navigator.platform) ? navigator.platform : 'unknown';
  const lang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'unknown';
  const screen = (typeof window !== 'undefined' && window.innerWidth) ? `${window.innerWidth}x${window.innerHeight}` : 'unknown';

  const tab = view?.tab || 'unknown';
  const mode = state?.questMode || 'unset';
  const questActive = !!state?.questActive;
  const stage = state?.currentStage != null ? state.currentStage : '-';
  const daysIn = state?.questStartDate ? daysBetween(state.questStartDate, todayKey()) : 0;
  const shadow = state?.shadow != null ? state.shadow : '-';
  const attempts = state?.questAttempts || 0;
  const memberCount = (state?.members || []).length;

  const areaLabels = (m.areas || [])
    .map(id => FEEDBACK_AREAS.find(a => a.id === id)?.label || id)
    .join(', ') || '(not specified)';
  const severityLabel = (m.kind === 'bug' && m.severity)
    ? FEEDBACK_SEVERITY.find(s => s.id === m.severity)?.label || m.severity
    : null;
  const frequencyLabel = (m.kind === 'bug' && m.frequency)
    ? FEEDBACK_FREQUENCY.find(f => f.id === m.frequency)?.label || m.frequency
    : null;

  const kindTitle = {
    bug:    'Bug report',
    idea:   'Idea / suggestion',
    help:   'Help request',
    praise: 'Praise / what works'
  }[m.kind] || 'Feedback';

  const lines = [];
  lines.push(`## ${kindTitle}`);
  lines.push('');
  lines.push(`**Summary:** ${summary}`);
  lines.push(`**Area(s):** ${areaLabels}`);
  if (severityLabel)  lines.push(`**Severity:** ${severityLabel}`);
  if (frequencyLabel) lines.push(`**Frequency:** ${frequencyLabel}`);
  lines.push('');
  lines.push('### Details');
  lines.push(m.details || '(no details provided)');
  lines.push('');
  lines.push('### May the maintainer reply to you?');
  lines.push(m.allowContact ? 'Yes — please reply to this email.' : 'No — this is a one-way report.');
  lines.push('');
  lines.push('---');
  lines.push('### Context (auto-filled, please leave for debugging)');
  lines.push(`App:           Adze v${APP_VERSION}`);
  lines.push(`Tab:           ${tab}`);
  lines.push(`Mode:          ${mode}`);
  lines.push(`Quest active:  ${questActive}`);
  lines.push(`Stage:         ${stage}`);
  lines.push(`Day in quest:  ${daysIn}`);
  lines.push(`Shadow:        ${shadow}`);
  lines.push(`Past attempts: ${attempts}`);
  lines.push(`Members:       ${memberCount}`);
  lines.push(`Screen:        ${screen}`);
  lines.push(`Language:      ${lang}`);
  lines.push(`Platform:      ${platform}`);
  lines.push(`User agent:    ${ua}`);
  lines.push('');
  lines.push('---');
  lines.push('*This report was prepared by Adze. Nothing was sent automatically —');
  lines.push('you are reviewing a draft in your mail client. Edit any field (including');
  lines.push('the context block) before sending. Thank you for making the app better.*');

  const body = lines.join('\n');
  return `mailto:${encodeURIComponent(FEEDBACK_CONFIG.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function feedbackSend() {
  if (!view.modal || view.modal.type !== 'feedback') return;
  // Validate the bare minimum — a summary line
  if (!view.modal.summary || view.modal.summary.trim().length < 3) {
    alert(t('alerts.feedback_summary_required'));
    return;
  }
  const url = buildFeedbackMailto(view.modal);
  // Record a lightweight local copy so the tester knows what they sent
  if (!state.feedbackLog) state.feedbackLog = [];
  state.feedbackLog.push({
    at: new Date().toISOString(),
    kind: view.modal.kind,
    areas: [...(view.modal.areas || [])],
    severity: view.modal.severity,
    frequency: view.modal.frequency,
    summary: view.modal.summary,
    appVersion: APP_VERSION
  });
  saveState();
  // Open the mail client
  try { window.location.href = url; } catch(e) { /* fall through to thanks screen */ }
  // Move to the thank-you step
  view.modal.step = 'sent';
  renderModal();
}
