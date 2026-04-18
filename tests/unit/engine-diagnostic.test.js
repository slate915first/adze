// ============================================================================
// tests/unit/engine-diagnostic.test.js
// ----------------------------------------------------------------------------
// Tests for src/engine/diagnostic.js — the pure recommendation engine.
//
// The v15.1.1 hotfix exists because computeRecommendation called
// diag.physicalConcerns.trim() and diag.concerns.trim() in the beginner
// branch. Those fields became arrays in v15.1 (chip selections), so calling
// .trim() on them threw TypeError, silently crashing onboarding for any
// "Never sat" or "A little" tester.
//
// These tests would have caught it. Keep them.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { computeRecommendation } = require('../../src/engine/diagnostic.js');

describe('computeRecommendation · returns a complete recommendation', () => {
  it('returns the expected top-level shape', () => {
    const r = computeRecommendation({ experience: 'none' });
    expect(r).toHaveProperty('level');
    expect(r).toHaveProperty('levelDisplay');
    expect(r).toHaveProperty('morningMin');
    expect(r).toHaveProperty('eveningMin');
    expect(r).toHaveProperty('rationale');
    expect(r).toHaveProperty('focus');
    expect(r).toHaveProperty('firstSutta');
    expect(r).toHaveProperty('supporting');
    expect(r).toHaveProperty('insights');
    expect(r).toHaveProperty('beginnerCare');
  });
});

describe('computeRecommendation · experience branches', () => {
  it('routes "none" to sotapatti / Beginner Path with 5/5 minutes', () => {
    const r = computeRecommendation({ experience: 'none' });
    expect(r.level).toBe('sotapatti');
    expect(r.levelDisplay).toBe('Beginner Path');
    expect(r.morningMin).toBe(5);
    expect(r.eveningMin).toBe(5);
  });

  it('routes "some" to sotapatti, scaled by realisticMinutes', () => {
    const r = computeRecommendation({ experience: 'some', realisticMinutes: 12 });
    expect(r.level).toBe('sotapatti');
    expect(r.morningMin).toBe(12);
    expect(r.eveningMin).toBe(10);
  });

  it('routes "regular" to sakadagami / Established Path', () => {
    const r = computeRecommendation({ experience: 'regular', currentSitLength: 25 });
    expect(r.level).toBe('sakadagami');
    expect(r.levelDisplay).toBe('Established Path');
    expect(r.morningMin).toBe(25);
    expect(r.eveningMin).toBe(25);
  });

  it('routes "long" with currentSitLength >= 60 to arahant / Veteran Path', () => {
    const r = computeRecommendation({ experience: 'long', currentSitLength: 60 });
    expect(r.level).toBe('arahant');
    expect(r.levelDisplay).toBe('Veteran Path');
  });

  it('routes "long" with currentSitLength < 60 to anagami / Dedicated Path', () => {
    const r = computeRecommendation({ experience: 'long', currentSitLength: 45 });
    expect(r.level).toBe('anagami');
    expect(r.levelDisplay).toBe('Dedicated Path');
  });

  it('falls back to sotapatti on unknown experience', () => {
    const r = computeRecommendation({ experience: 'something_weird' });
    expect(r.level).toBe('sotapatti');
  });
});

describe('computeRecommendation · low-energy override', () => {
  it('reduces minutes for non-beginner with energy <= 3', () => {
    const r = computeRecommendation({ experience: 'regular', currentSitLength: 30, energy: 2 });
    expect(r.morningMin).toBeLessThan(30);
    expect(r.eveningMin).toBeLessThan(30);
    expect(r.morningMin).toBeGreaterThanOrEqual(10);
  });

  it('does NOT reduce minutes for sotapatti even with low energy', () => {
    const r = computeRecommendation({ experience: 'none', energy: 1 });
    expect(r.morningMin).toBe(5);
  });
});

describe('computeRecommendation · chip array handling (v15.1.1 regression guard)', () => {
  it('does not throw when physicalConcerns is a chip array', () => {
    expect(() => computeRecommendation({
      experience: 'none',
      physicalConcerns: ['back', 'knees'],
      physicalConcernsOther: ''
    })).not.toThrow();
  });

  it('does not throw when concerns is a chip array', () => {
    expect(() => computeRecommendation({
      experience: 'some',
      concerns: ['doing_right', 'thoughts_stop'],
      concernsOther: ''
    })).not.toThrow();
  });

  it('does not throw when both are empty arrays', () => {
    expect(() => computeRecommendation({
      experience: 'none',
      physicalConcerns: [],
      concerns: []
    })).not.toThrow();
  });

  it('does not throw when physicalConcerns is the legacy string format', () => {
    // Pre-v15.0 saved diags may still have strings.
    expect(() => computeRecommendation({
      experience: 'none',
      physicalConcerns: 'old back pain text',
      concerns: 'old worry text'
    })).not.toThrow();
  });

  it('sets beginnerCare.physicalNote when chip array has selections (excl. "none")', () => {
    const r = computeRecommendation({
      experience: 'none',
      physicalConcerns: ['back']
    });
    expect(r.beginnerCare.physicalNote).toBeTruthy();
  });

  it('does NOT set beginnerCare.physicalNote when only "none" chip selected', () => {
    const r = computeRecommendation({
      experience: 'none',
      physicalConcerns: ['none']
    });
    expect(r.beginnerCare.physicalNote).toBeFalsy();
  });

  it('sets beginnerCare.physicalNote when only an "Other" free-text is given', () => {
    const r = computeRecommendation({
      experience: 'none',
      physicalConcerns: [],
      physicalConcernsOther: 'specific thing'
    });
    expect(r.beginnerCare.physicalNote).toBeTruthy();
  });
});

describe('computeRecommendation · chipInterp flags shape beginnerCare copy (v15.2)', () => {
  it('appends posture.back specific guidance when flag present', () => {
    const r = computeRecommendation(
      { experience: 'none', physicalConcerns: ['back'] },
      { factorBumps: {}, flags: ['posture.back'], otherTexts: {} }
    );
    expect(r.beginnerCare.physicalNote.toLowerCase()).toContain('back');
  });

  it('appends misconception.thoughts guidance when flag present', () => {
    const r = computeRecommendation(
      { experience: 'none', concerns: ['thoughts_stop'] },
      { factorBumps: {}, flags: ['misconception.thoughts'], otherTexts: {} }
    );
    expect(r.beginnerCare.reassurance.toLowerCase()).toContain('thought');
  });

  it('appends posture.lower_body guidance for knees/hips chip', () => {
    const r = computeRecommendation(
      { experience: 'none', physicalConcerns: ['knees'] },
      { factorBumps: {}, flags: ['posture.lower_body'], otherTexts: {} }
    );
    expect(r.beginnerCare.physicalNote.toLowerCase()).toMatch(/knees|hips|bench|chair|lying/);
  });

  it('omits chip-specific copy when no chipInterp passed', () => {
    const r = computeRecommendation({ experience: 'none', physicalConcerns: ['back'] });
    // Generic line still present, chip-specific bold "Back:" line absent.
    expect(r.beginnerCare.physicalNote).toBeTruthy();
    expect(r.beginnerCare.physicalNote).not.toContain('<b>Back:');
  });
});

describe('computeRecommendation · experienced branch', () => {
  it('does not produce beginnerCare for experienced practitioners', () => {
    const r = computeRecommendation({ experience: 'long', currentSitLength: 60 });
    expect(Object.keys(r.beginnerCare).length).toBe(0);
  });

  it('detects four-truths gap and adds an insight', () => {
    const r = computeRecommendation({
      experience: 'regular',
      currentSitLength: 30,
      fourTruths: ['dukkha', 'origin']  // missing cessation + path
    });
    expect(r.insights.some(i => i.kind === 'foundation')).toBe(true);
  });

  it('detects when wrong items are folded into four truths', () => {
    const r = computeRecommendation({
      experience: 'regular',
      currentSitLength: 30,
      fourTruths: ['dukkha', 'origin', 'cessation', 'path', 'karma']  // extra wrong
    });
    expect(r.insights.some(i => i.kind === 'confusion')).toBe(true);
  });

  it('detects eightfold gap when only some factors picked', () => {
    const r = computeRecommendation({
      experience: 'regular',
      currentSitLength: 30,
      eightfold: ['view', 'intention']  // missing six
    });
    expect(r.insights.some(i => i.kind === 'eightfold-gap')).toBe(true);
  });

  it('routes Goenka-tradition + intensity-stuckness + high sit length to gratitude insight', () => {
    const r = computeRecommendation({
      experience: 'long',
      currentSitLength: 60,
      tradition: 'goenka',
      stuckness: 'intensity'
    });
    expect(r.insights.some(i => i.kind === 'tradition-gratitude')).toBe(true);
  });

  it('handles dark-territory stuckness with explicit teacher pointer', () => {
    const r = computeRecommendation({
      experience: 'long',
      currentSitLength: 50,
      stuckness: 'dark'
    });
    expect(r.insights.some(i => i.kind === 'dark')).toBe(true);
  });
});

describe('computeRecommendation · focus + first sutta selection', () => {
  it('beginners always start at SN 56.11 regardless of dominant hindrance', () => {
    const r = computeRecommendation({ experience: 'none', dominantHindrance: 'sensual' });
    expect(r.firstSutta).toBe('sn56_11');
  });

  it('experienced practitioners get a hindrance-matched first sutta', () => {
    const r = computeRecommendation({ experience: 'regular', currentSitLength: 30, dominantHindrance: 'doubt' });
    expect(r.firstSutta).toBe('an3_65');
  });

  it('focus card matches dominantHindrance', () => {
    const r = computeRecommendation({ experience: 'none', dominantHindrance: 'restless' });
    expect(r.focus.title.toLowerCase()).toContain('settle');
  });

  it('falls back to sati focus when no dominantHindrance', () => {
    const r = computeRecommendation({ experience: 'none' });
    expect(r.focus.title.toLowerCase()).toContain('sati');
  });
});

describe('computeRecommendation · supporting habits', () => {
  it('does not surface supporting habits for sotapatti', () => {
    const r = computeRecommendation({ experience: 'none' });
    expect(r.supporting.length).toBe(0);
  });

  it('surfaces walking + metta for sakadagami with normal energy', () => {
    const r = computeRecommendation({ experience: 'regular', currentSitLength: 25, energy: 6 });
    expect(r.supporting.length).toBe(2);
    expect(r.supporting.find(s => s.id === 'walking')).toBeTruthy();
    expect(r.supporting.find(s => s.id === 'metta')).toBeTruthy();
  });

  it('does NOT surface supporting habits when energy is very low', () => {
    const r = computeRecommendation({ experience: 'regular', currentSitLength: 25, energy: 2 });
    expect(r.supporting.length).toBe(0);
  });
});
