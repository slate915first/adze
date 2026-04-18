// ============================================================================
// src/systems/prescription.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 1 function(s): getPrescription
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function getPrescription(memberId) {
  const onboarding = getOnboardingDiagnostic(memberId);
  const rollingFactors = ['sensual','illwill','sloth','restless','doubt','energy','purpose'];
  const baseline = onboarding?.answers || {};
  const scored = [];
  for (const key of rollingFactors) {
    let val = rollingFactorAverage(memberId, key, 7);
    if (val == null && typeof baseline[key] === 'number') val = baseline[key];
    if (val == null) continue;
    scored.push({ key, val });
  }
  if (scored.length === 0) return null;

  // Choose the most urgent factor: high hindrance OR low energy/purpose
  let best = null;
  for (const s of scored) {
    if (['sensual','illwill','sloth','restless','doubt'].includes(s.key) && s.val >= 6) {
      if (!best || s.val > best.val) best = { key: s.key, val: s.val, direction: 'high' };
    }
    if (s.key === 'energy' && s.val <= 4) {
      if (!best || (10 - s.val) > (best.direction === 'high' ? best.val : (10 - best.val))) {
        best = { key: 'low_energy', val: s.val, direction: 'low' };
      }
    }
    if (s.key === 'purpose' && s.val <= 4) {
      if (!best) best = { key: 'low_purpose', val: s.val, direction: 'low' };
    }
  }
  if (!best) return null;
  const rx = TECHNIQUE_PRESCRIPTIONS[best.key];
  if (!rx) return null;
  return { ...rx, key: best.key, observedValue: best.val };
}
