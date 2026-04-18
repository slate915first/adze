// ============================================================================
// src/systems/factors.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 2 function(s): factorScore, getAllFactorScores
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function factorScore(memberId, factorId) {
  const f = SEVEN_FACTORS.find(x => x.id === factorId);
  if (!f) return null;

  // Measurable factors — derived from existing telemetry
  if (factorId === 'sati') {
    // Mindfulness is reflected in the practitioner's ability to name states
    // as they arise. Journal entries naming hindrances are direct evidence.
    const j = journalEvidenceCount(memberId, 30);
    return Math.min(10, j);
  }
  if (factorId === 'dhammavicaya') {
    // Investigation is sati plus seeing — slightly harder, so weighted down.
    // Every third journal entry counts as a "seeing" event.
    // v9.10: also feed from suttas read — investigation of phenomena includes
    // study of the canonical material that ground that investigation. Each
    // sutta read counts as one investigation event (capped together with
    // journal evidence at the +10 ceiling).
    const j = journalEvidenceCount(memberId, 30);
    const suttasRead = suttasReadCount(memberId);
    return Math.min(10, Math.round(j * 0.7 + suttasRead * 0.5));
  }
  if (factorId === 'viriya') {
    // Energy is sit consistency. 30 sits in 30 days = full score (10).
    const sits = sitCountInWindow(memberId, 30);
    return Math.min(10, Math.round(sits / 3));
  }
  if (factorId === 'samadhi') {
    // Pull directly from the existing concentration diagnostic.
    const s = rollingFactorAverage(memberId, 'concentration', 14);
    if (s === null) return 0;
    return Math.round(s * 10) / 10;
  }

  // Emergent factors — honest non-measurement, only signaled when the
  // prerequisite factors are established. Returns null if not yet arisen.
  const samadhiScore = factorScore(memberId, 'samadhi') || 0;
  const p = ensurePathRecord(memberId);
  const sustained = p.sustainedDays || 0;
  const maxSustained = p.maxSustainedDays || 0;

  if (factorId === 'piti') {
    // Rapture arises when samādhi has begun to collect and some sustained
    // practice has happened. Signal-only, not a proper score.
    if (samadhiScore >= 5 && maxSustained >= 7) return Math.min(10, Math.round((samadhiScore + maxSustained / 10) / 2));
    return null;
  }
  if (factorId === 'passaddhi') {
    // Tranquility follows rapture. Requires the same plus a longer window.
    if (samadhiScore >= 6 && maxSustained >= 14) return Math.min(10, Math.round((samadhiScore + maxSustained / 10) / 2));
    return null;
  }
  if (factorId === 'upekkha') {
    // Equanimity is the final factor. Only marked as present when all the
    // earlier factors are simultaneously strong. This condition is deliberately
    // hard — the game should almost never show this one.
    const sati = factorScore(memberId, 'sati') || 0;
    const viriya = factorScore(memberId, 'viriya') || 0;
    if (sati >= 6 && viriya >= 6 && samadhiScore >= 6 && maxSustained >= 30) {
      return Math.min(10, Math.round((sati + viriya + samadhiScore + maxSustained / 10) / 4));
    }
    return null;
  }

  return null;
}

function getAllFactorScores(memberId) {
  return SEVEN_FACTORS.map(f => {
    const score = factorScore(memberId, f.id);
    return {
      factor: f,
      score,
      measurable: f.measurable,
      emerged: score !== null && score > 0
    };
  });
}
