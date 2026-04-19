// ============================================================================
// src/config.js
// ----------------------------------------------------------------------------
// Hardcoded constants that were formerly inline in src/app.html (between the
// `// INLINE-JS:` markers). These have zero dependencies on loaded JSON, so
// they can live in their own file and load before bootstrap.js.
//
// Data-derived constants (PATH_RANKS, SHADOW_FLOOR_BY_RANK, SETUP_DIAGNOSTIC_*,
// AJAHN_CHAH_TEACHINGS) are NOT here — they depend on loadAllData() and are
// set inside boot() in bootstrap.js.
// ============================================================================

// ---------------------------------------------------------------------------
// Sutta overreach penalties
// ---------------------------------------------------------------------------
const SUTTA_OVERREACH_PANNA_COST = 3;
const SUTTA_OVERREACH_KAMACCHANDA_TICK = 2;
const PANNA_COST_SUTTA_ABOVE_RANK = 3;
const KAMACCHANDA_TICK_FOR_OVERREACH = 2;  // amount added to sensual diagnostic

// ---------------------------------------------------------------------------
// Diagnostic factor key labels
// ---------------------------------------------------------------------------
const FACTOR_KEYS = {
  energy:       { label: 'Energy',           low: 'Depleted',     high: 'Vital'    },
  sensual:      { label: 'Sensual desire',   low: 'Quiet',        high: 'Pulling'  },
  illwill:      { label: 'Ill will',         low: 'Open',         high: 'Hardened' },
  sloth:        { label: 'Sloth & torpor',   low: 'Clear',        high: 'Heavy'    },
  restless:     { label: 'Restlessness',     low: 'Settled',      high: 'Agitated' },
  doubt:        { label: 'Doubt',            low: 'Confident',    high: 'Uncertain'},
  purpose:      { label: 'Sense of purpose', low: 'Lost',         high: 'Clear'    },
  sila:         { label: 'Ethical ground',   low: 'Slipping',     high: 'Steady'   },
  mettaWarmth:  { label: 'Warmth toward others', low: 'Cold',     high: 'Warm'     },
  concentration:{ label: 'Concentration',    low: 'Scattered',    high: 'Collected'}
};

// ---------------------------------------------------------------------------
// Beta access mode
// v15.0 — during the closed beta, public sign-up is disabled in Supabase
// (Authentication → Providers → Email → Enable sign ups: OFF). The auth
// modal uses this flag to decide whether to show the "Create an account"
// button. Flip to `true` when you open general signups.
// ---------------------------------------------------------------------------
const ADZE_PUBLIC_SIGNUP_ENABLED = false;

// ---------------------------------------------------------------------------
// Beta feedback routing
// ---------------------------------------------------------------------------
const FEEDBACK_CONFIG = {
  email: 'feedback@adze.life',  // routed via Cloudflare Email Routing → Dirk's inbox
  subjects: {
    bug:    '[HQ-BUG]',
    idea:   '[HQ-IDEA]',
    help:   '[HQ-HELP]',
    praise: '[HQ-PRAISE]'
  }
};

// ---------------------------------------------------------------------------
// AN 8.51 belongs/avoid filter (teaching quote categorization)
// ---------------------------------------------------------------------------
const AN_8_51_FILTER = [
  { belongs: 'dispassion (virāga)',          avoid: 'passion (rāga)' },
  { belongs: 'detachment (visaṃyoga)',       avoid: 'bondage (saṃyoga)' },
  { belongs: 'shedding (apacaya)',            avoid: 'accumulation (ācaya)' },
  { belongs: 'modesty (appicchatā)',          avoid: 'ambition for more (mahicchatā)' },
  { belongs: 'contentment (santuṭṭhi)',      avoid: 'discontent (asantuṭṭhi)' },
  { belongs: 'solitude (pavivekatā)',         avoid: 'entanglement (saṅgaṇikā)' },
  { belongs: 'energy (āraddhavīriya)',        avoid: 'laziness (kosajja)' },
  { belongs: 'frugality (subharatā)',         avoid: 'extravagance (dubbharatā)' }
];

// ---------------------------------------------------------------------------
// Habit downgrade thresholds
// ---------------------------------------------------------------------------
const DOWNGRADE_MISS_THRESHOLD = 3;   // misses in the rolling window
const DOWNGRADE_WINDOW_DAYS    = 7;   // window size
const DOWNGRADE_MIN_MINUTES    = 5;   // never drop below this
const DOWNGRADE_FACTOR         = 0.6; // drop to 60% of current

// ---------------------------------------------------------------------------
// Character ability hooks — each character class has passive and/or
// triggered abilities. Referenced by systems/abilities.js at call time.
// ---------------------------------------------------------------------------
const ABILITY_HOOKS = {
  ananda: {
    passive: {
      extraScrollsPerStage: () => 1
    },
    triggered: {} // none
  },

  sariputta: {
    passive: {},
    triggered: {
      weeklyMissForgiveness: { budget: 'perWeek', max: 1 }
    }
  },

  moggallana: {
    passive: {},
    triggered: {
      teammateRescue: { budget: 'perDay', max: 1 }
    }
  },

  mahakassapa: {
    passive: {
      shadowAdjust: () => -3
    },
    triggered: {}
  },

  anuruddha: {
    passive: {
      revealsNextStageArmies: () => true
    },
    triggered: {}
  },

  upali: {
    passive: {
      streakGraceDaysPerWeek: () => 1
    },
    triggered: {}
  },

  mahapajapati: {
    passive: {
      teamScoreMultiplier: (ctx) => ctx.teamShadow > 60 ? 1.2 : 1.0
    },
    triggered: {}
  },

  khema: {
    passive: {},
    triggered: {
      armyDismissal: { budget: 'perStage', max: 1 }
    }
  }
};

// ---------------------------------------------------------------------------
// Sutta Central Bodhi translation availability (per-sutta gate).
// ---------------------------------------------------------------------------
const SUTTA_CENTRAL_BODHI_AVAILABLE = {
  mn2: true, mn4: true, mn9: true, mn10: true, mn13: true, mn14: true,
  mn18: true, mn19: true, mn20: true, mn21: true, mn22: true, mn26: true,
  mn27: true, mn36: true, mn58: true, mn61: true, mn117: true, mn118: true,
  mn139: true, mn152: true,
  sn4_1: true, sn7_2: true, sn12_2: true, sn16_5: true, sn22_45: true,
  sn22_83: true, sn22_101: true, sn35_28: true, sn46_51: true, sn46_55: true,
  sn47_19: true, sn55_5: true, sn56_11: true,
  an1_189: true, an1_190: true, an1_192: true, an1_196: true, an1_236: true,
  an2_3: true, an3_65: true, an3_86: true, an3_87: true, an4_170: true,
  an4_241: true, an5_51: true, an5_159: true, an5_198: true, an7_58: true,
  an8_51: true, an10_60: true,
  dn1: false, dn16: false,
  snp1_8: true, snp2_4: true, snp3_2: true
};

// ---------------------------------------------------------------------------
// Audio state (lazily initialized on first bell tap)
// ---------------------------------------------------------------------------
let _audioCtx = null;

// ---------------------------------------------------------------------------
// Bell sound variants for the meditation timer. Each variant exposes a
// `play(ctx)` function that schedules oscillators on the provided AudioContext.
// ---------------------------------------------------------------------------
// v15.4 — variants now prefer real CC0 recorded samples (BigSoundBank,
// public-domain Tibetan bowls). Synthesized oscillator implementations
// remain as a fallback (used when sample fails to load) and as the only
// option for sounds we don't have a recording for yet (wood block).
// See content/sounds/bells/CREDITS.md for licensing.
const BELL_VARIANTS = {
  warm: {
    label: 'Warm bell',
    description: 'Real Tibetan bowl strike, low and round. Default.',
    sample: 'content/sounds/bells/tibetan-bowl-struck-1.mp3',
    play(ctx, dest = ctx.destination) {
      const now = ctx.currentTime;
      const tone = (freq, gain, duration) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = freq;
        o.type = 'sine';
        o.connect(g); g.connect(dest);
        g.gain.setValueAtTime(0.001, now);
        g.gain.exponentialRampToValueAtTime(gain, now + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + duration);
        o.start(now); o.stop(now + duration + 0.1);
      };
      tone(320, 0.4, 4.0);
      tone(640, 0.15, 3.0);
      tone(960, 0.05, 2.0);
    }
  },
  goenka: {
    label: 'Long-decay bowl',
    description: 'Real Tibetan bowl strike with extended sustain. Closest match to the rising-falling feel of a Burmese practice bell while remaining CC0.',
    sample: 'content/sounds/bells/tibetan-bowl-struck-4.mp3',
    play(ctx, dest = ctx.destination) {
      const now = ctx.currentTime;
      const tone = (freq, gain, duration, attack) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = freq;
        o.type = 'sine';
        o.connect(g); g.connect(dest);
        g.gain.setValueAtTime(0.001, now);
        g.gain.exponentialRampToValueAtTime(gain, now + attack);
        g.gain.exponentialRampToValueAtTime(0.001, now + duration);
        o.start(now); o.stop(now + duration + 0.1);
      };
      tone(440, 0.35, 5.5, 0.25);
      tone(880, 0.12, 4.5, 0.3);
      tone(1320, 0.04, 3.0, 0.35);
    }
  },
  singing: {
    label: 'Tibetan singing bowl',
    description: 'Real friction-rung Tibetan singing bowl. Long sustained tone.',
    sample: 'content/sounds/bells/tibetan-bowl-singing.mp3',
    play(ctx, dest = ctx.destination) {
      const now = ctx.currentTime;
      const tone = (freq, gain, duration, detune) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = freq;
        if (detune) o.detune.value = detune;
        o.type = 'sine';
        o.connect(g); g.connect(dest);
        g.gain.setValueAtTime(0.001, now);
        g.gain.exponentialRampToValueAtTime(gain, now + 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, now + duration);
        o.start(now); o.stop(now + duration + 0.1);
      };
      tone(280, 0.32, 7.0, 0);
      tone(282, 0.20, 7.0, 0);     // beat frequency
      tone(560, 0.14, 6.0, 0);
      tone(840, 0.07, 5.0, 0);
      tone(1120, 0.03, 4.0, 0);
    }
  },
  wood: {
    label: 'Wood block',
    description: 'Short, dry, percussive. Zen-style kotsu. (Synthesized — replace with a real recording when one is sourced.)',
    play(ctx, dest = ctx.destination) {
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 520;
      o.type = 'triangle';
      o.connect(g); g.connect(dest);
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.5, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      o.start(now); o.stop(now + 0.25);
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.frequency.value = 1040;
      o2.type = 'sine';
      o2.connect(g2); g2.connect(dest);
      g2.gain.setValueAtTime(0.001, now);
      g2.gain.exponentialRampToValueAtTime(0.2, now + 0.005);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      o2.start(now); o2.stop(now + 0.2);
    }
  },
  thai: {
    label: 'Bright bowl strike',
    description: 'Real Tibetan bowl strike, smaller bowl, brighter tone — closest match for a Thai forest bell while CC0.',
    sample: 'content/sounds/bells/tibetan-bowl-struck-3.mp3',
    play(ctx, dest = ctx.destination) {
      const now = ctx.currentTime;
      const tone = (freq, gain, duration) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = freq;
        o.type = 'sine';
        o.connect(g); g.connect(dest);
        g.gain.setValueAtTime(0.001, now);
        g.gain.exponentialRampToValueAtTime(gain, now + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, now + duration);
        o.start(now); o.stop(now + duration + 0.1);
      };
      tone(520, 0.35, 3.5);
      tone(1040, 0.18, 3.0);
      tone(1560, 0.07, 2.5);
      tone(2080, 0.03, 2.0);
    }
  }
};

// ---------------------------------------------------------------------------
// Sit-timer runtime state (module-level, cleared between sits)
// ---------------------------------------------------------------------------
let _sitTimer = {
  intervalId: null,
  startTime: 0,
  durationSec: 0,
  pausedAt: 0,
  totalPausedMs: 0,
  halfwayBellRung: false
};

// ---------------------------------------------------------------------------
// Tisikkha (three trainings) earnings and decay
// ---------------------------------------------------------------------------
const TISIKKHA_EARN = {
  sit:                 { sila: 1, samadhi: 2, panna: 1 },
  walk:                { sila: 1, samadhi: 1, panna: 1 },
  journal_oneline:     { sila: 0, samadhi: 0, panna: 1 },
  reflection_minimal:  { sila: 0, samadhi: 0, panna: 1 },
  reflection_standard: { sila: 1, samadhi: 0, panna: 2 },
  reflection_deep:     { sila: 1, samadhi: 1, panna: 3 },
  reflection_open:     { sila: 2, samadhi: 1, panna: 4 },
  hindrance_named:     { sila: 0, samadhi: 0, panna: 1 },
  sutta_read:          { sila: 0, samadhi: 0, panna: 1 },  // earning from reading at-or-below rank
  walking_meditation:  { sila: 1, samadhi: 1, panna: 1 }   // alias kept for v9.8
};

const TISIKKHA_DECAY_DAYS = 7;     // every 7 days unused → -1 of each balance
const TISIKKHA_DECAY_AMOUNT = 1;

// ---------------------------------------------------------------------------
// Path-map SVG checkpoint coordinates (10 checkpoints along the path)
// ---------------------------------------------------------------------------
const PATH_MAP_CHECKPOINTS = [
  { id: 0, x: 190, y: 665, labelAnchor: 'start', labelX: 220, labelY: 670 },
  { id: 1, x: 260, y: 600, labelAnchor: 'start', labelX: 290, labelY: 605 },
  { id: 2, x: 135, y: 535, labelAnchor: 'end',   labelX: 105, labelY: 540 },
  { id: 3, x: 265, y: 465, labelAnchor: 'start', labelX: 295, labelY: 470 },
  { id: 4, x: 120, y: 395, labelAnchor: 'end',   labelX: 90,  labelY: 400 },
  { id: 5, x: 255, y: 325, labelAnchor: 'start', labelX: 285, labelY: 330 },
  { id: 6, x: 130, y: 255, labelAnchor: 'end',   labelX: 100, labelY: 260 },
  { id: 7, x: 265, y: 185, labelAnchor: 'start', labelX: 295, labelY: 190 },
  { id: 8, x: 125, y: 115, labelAnchor: 'end',   labelX: 95,  labelY: 120 },
  { id: 9, x: 195, y: 45,  labelAnchor: 'start', labelX: 225, labelY: 50  }
];
