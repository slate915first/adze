// ============================================================================
// tests/unit/setup-progress-redaction.test.js
// ----------------------------------------------------------------------------
// Guards the security-reviewer contract for v15.18.1 setup-progress
// persistence: sensitive fields (Art. 9 health-adjacent + practitioner-
// disclosed freetext) must never survive the redaction pass that runs before
// the payload hits localStorage.
//
// The actual helper (`_redactSetupDataForStorage`) lives inside
// src/systems/setup-flow.js, which is a non-module script concatenated into
// a global scope at runtime. To keep the test pure and import-free, we parse
// the redaction list + function body out of the source and eval them in a
// sandboxed scope. If the redaction list drifts or a new freetext field is
// added to the diagnostic without being declared sensitive, this test fails
// loudly.
//
// Context: a beta tester lost ~1.5h of input when a dangling sutta link in
// setup bounced him to the welcome page. Fix: persist setup state to
// localStorage. Security-reviewer required that Art. 9 / freetext fields be
// stripped from the persisted payload. This test locks that requirement.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(
  join(__dirname, '..', '..', 'src', 'systems', 'setup-flow.js'),
  'utf8'
);

// Extract the redaction list + the function body from the source. The
// regexes are intentionally narrow so a future refactor that moves the
// helper to a different module fails the test explicitly instead of
// silently matching nothing.
function extractRedaction() {
  const listMatch = SRC.match(
    /const SETUP_PROGRESS_REDACT_DIAGNOSTIC_KEYS\s*=\s*\[([\s\S]*?)\];/
  );
  if (!listMatch) throw new Error('redaction key list not found in setup-flow.js');
  const keys = listMatch[1]
    .split(/[\r\n]+/)
    .map(s => s.trim().replace(/['",]/g, ''))
    .filter(Boolean)
    .filter(s => !s.startsWith('//'));

  const fnMatch = SRC.match(/function _redactSetupDataForStorage\([\s\S]*?\n\}/);
  if (!fnMatch) throw new Error('_redactSetupDataForStorage not found');
  // eslint-disable-next-line no-new-func
  const fn = new Function(
    'SETUP_PROGRESS_REDACT_DIAGNOSTIC_KEYS',
    fnMatch[0] + '; return _redactSetupDataForStorage;'
  )(keys);

  return { keys, fn };
}

describe('setup-progress redaction (v15.18.1)', () => {
  const { keys, fn } = extractRedaction();

  it('declares the expected sensitive-field set', () => {
    expect(keys).toEqual(
      expect.arrayContaining([
        'teachers',
        'wantFromTool',
        'unclear',
        'stoppedBeforeOther',
        'physicalConcernsOther',
        'concernsOther'
      ])
    );
  });

  it('blanks every declared sensitive field on the diagnostic copy', () => {
    const input = {
      mode: 'story',
      diagnostic: {
        energy: 6,
        experience: 'some',
        teachers: 'Ajahn X, Goenka retreat 2019',
        wantFromTool: 'something for my anxiety spikes',
        unclear: 'what is right view really',
        stoppedBeforeOther: 'knee pain after surgery',
        physicalConcernsOther: 'asthma',
        concernsOther: 'family crisis',
        hopes: ['stability', 'insight']
      }
    };
    const out = fn(input);
    for (const k of keys) {
      expect(out.diagnostic[k]).toBe('');
    }
  });

  it('does not mutate the input object', () => {
    const input = {
      diagnostic: {
        teachers: 'Ajahn X',
        energy: 5
      }
    };
    const snapshot = JSON.stringify(input);
    fn(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('preserves non-sensitive structural fields', () => {
    const input = {
      mode: 'story',
      category: 'mind',
      quest: 'level-2',
      members: [{ name: 'Dirk', character: 'sariputta' }],
      diagnostic: {
        energy: 7,
        experience: 'experienced',
        dominantHindrance: 'doubt',
        hopes: ['stability', 'wisdom'],
        sensual: 4, illwill: 2, restless: 6, doubt: 5, purpose: 8,
        realisticMinutes: 25,
        currentSitLength: 45,
        tradition: 'theravada',
        stuckness: 'plateau',
        stoppedBefore: ['too-hard', 'bored'],
        physicalConcerns: ['knees'],
        concerns: [],
        wellbeingAck: 'ok'
      },
      recommendation: { morningMin: 20, eveningMin: 20, middayMin: 0, level: 2 }
    };
    const out = fn(input);
    expect(out.mode).toBe('story');
    expect(out.members[0].name).toBe('Dirk');
    expect(out.diagnostic.energy).toBe(7);
    expect(out.diagnostic.dominantHindrance).toBe('doubt');
    expect(out.diagnostic.tradition).toBe('theravada');
    expect(out.diagnostic.hopes).toEqual(['stability', 'wisdom']);
    expect(out.diagnostic.stoppedBefore).toEqual(['too-hard', 'bored']);
    expect(out.diagnostic.wellbeingAck).toBe('ok');
    expect(out.recommendation.morningMin).toBe(20);
  });

  it('handles missing diagnostic gracefully', () => {
    expect(fn({}).diagnostic).toBeUndefined();
    expect(fn(null)).toBeNull();
    expect(fn(undefined)).toBeUndefined();
  });
});
