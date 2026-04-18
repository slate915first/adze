// ============================================================================
// src/systems/chip-interpretation.js
// ----------------------------------------------------------------------------
// Maps setup Phase-B chip selections (stoppedBefore / physicalConcerns /
// concerns) to diagnostic-factor bumps and practical flags.
//
// This is the single source of truth for "what the chips mean". Every mapping
// is documented in docs/CHIP-INTERPRETATION.md with the rationale — change
// both files together when you edit a mapping, and re-read the doc with a
// teacher before shipping a change in mapping.
//
// Rules:
//   * Each chip contributes a fixed set of { factorDeltas, flags } tuples.
//   * Factor deltas are small (+1 per chip) and capped per dimension (+3) to
//     prevent chip stacking from dominating the Phase-A diagnostic.
//   * Flags are boolean. Multiple chips implying the same flag set it once.
//   * The "none" / "never_started" chips contribute nothing — they are
//     explicit neutral answers, not zero-information answers.
// ============================================================================

const CHIP_FACTOR_CAP = 3; // max cumulative chip contribution to a single factor

const CHIP_MAP = {
  // -------------------------------------------------------------------------
  // Q1 · stoppedBefore — what has stopped a daily practice from sticking?
  // -------------------------------------------------------------------------
  stoppedBefore: {
    forget:        { factors: {},                          flags: ['friction.memory'] },
    no_time:       { factors: {},                          flags: ['friction.time'] },
    doubt_works:   { factors: { doubt: 1 },                flags: [] },
    dry_boring:    { factors: { doubt: 1, sloth: 1 },      flags: [] },
    missed_day:    { factors: {},                          flags: ['friction.all_or_nothing'] },
    discomfort:    { factors: {},                          flags: ['posture.general'] },
    busy_mind:     { factors: { restless: 1 },             flags: [] },
    emotions:      { factors: { illwill: 1 },              flags: ['emotion.tentative'] },
    never_started: { factors: {},                          flags: [] }
  },
  // -------------------------------------------------------------------------
  // Q2 · physicalConcerns — any physical concerns to be aware of?
  // -------------------------------------------------------------------------
  physicalConcerns: {
    back:         { factors: {},                           flags: ['posture.back'] },
    knees:        { factors: {},                           flags: ['posture.lower_body'] },
    hips:         { factors: {},                           flags: ['posture.lower_body'] },
    shoulders:    { factors: {},                           flags: ['posture.upper_body'] },
    chronic_pain: { factors: {},                           flags: ['posture.general'] },
    sleep_energy: { factors: { sloth: 1 },                 flags: ['bias.morning_sits'] },
    injury:       { factors: {},                           flags: ['posture.injury_temporary'] },
    none:         { factors: {},                           flags: [] }
  },
  // -------------------------------------------------------------------------
  // Q3 · concerns — anything about starting that makes you nervous?
  // -------------------------------------------------------------------------
  concerns: {
    doing_right:   { factors: { doubt: 1 },                flags: ['self_image.nervous'] },
    thoughts_stop: { factors: { doubt: 1 },                flags: ['misconception.thoughts'] },
    fall_asleep:   { factors: { sloth: 1 },                flags: [] },
    time_commit:   { factors: {},                          flags: ['friction.time'] },
    religious:     { factors: { doubt: 1 },                flags: ['framing.secular_preferred'] },
    emotions_up:   { factors: { illwill: 1 },              flags: ['emotion.tentative'] },
    missing_days:  { factors: {},                          flags: ['friction.perfectionism'] },
    not_spiritual: { factors: {},                          flags: ['self_image.nervous'] },
    none:          { factors: {},                          flags: [] }
  }
};

// ---------------------------------------------------------------------------
// interpretChipSelections — given the in-progress diagnostic object from the
// setup flow (view.setupData.diagnostic), returns { factorBumps, flags,
// otherTexts } without mutating anything. Caller decides where to apply.
// ---------------------------------------------------------------------------
function interpretChipSelections(diag) {
  const factorBumps = {};
  const flagSet = new Set();
  const otherTexts = {};

  for (const questionId of Object.keys(CHIP_MAP)) {
    const selected = Array.isArray(diag[questionId]) ? diag[questionId] : [];
    const questionMap = CHIP_MAP[questionId];
    for (const chipKey of selected) {
      const mapping = questionMap[chipKey];
      if (!mapping) continue;
      // Factor deltas — cap cumulative contribution per factor.
      for (const [factor, delta] of Object.entries(mapping.factors || {})) {
        factorBumps[factor] = Math.min(
          CHIP_FACTOR_CAP,
          (factorBumps[factor] || 0) + delta
        );
      }
      // Flags — dedupe via Set.
      for (const f of (mapping.flags || [])) flagSet.add(f);
    }
    // Preserve the "other" free-text field if present. Stored only, not parsed.
    const otherKey = questionId + 'Other';
    if (typeof diag[otherKey] === 'string' && diag[otherKey].trim()) {
      otherTexts[questionId] = diag[otherKey].trim();
    }
  }

  return {
    factorBumps,
    flags: Array.from(flagSet),
    otherTexts
  };
}
