# Sangha · multi-user social design

Design brief for extending the Sangha tab from a single-household view (each user's own members/characters) to a **cross-user social layer** — invite other Adze practitioners as sangha-bonds, see where they stand on the path, support each other without breaking the E2E privacy story.

This is a design document, not a ship plan. It records intent + constraints so when we build, we know what's load-bearing.

---

## Goal in one sentence

Let practitioners support each other's practice with honest visibility into *where each one stands*, without turning Adze into a streak-comparison or exposing reflective journaling to anyone.

---

## The privacy tension

Adze's whole promise is that reflections, diagnostic answers, and journals are encrypted in the browser with a passphrase only the user holds. Sangha sharing means *some* data must be readable by *other* users. Reconciling these cleanly is the whole design problem.

### What must NEVER leave E2E encryption

- Journal entries (one-line + evening close)
- Freeform reflection text
- Diagnostic answers (chip selections + "other" free text)
- Anything the user typed

### What can be shared, but ONLY with explicit per-field opt-in

The user picks which of these go to sangha members. Defaults: all OFF. Toggled in Settings → Privacy & sharing.

| Field                         | Why a practitioner might share                                 | Risk if shared sloppily                 |
| ----------------------------- | -------------------------------------------------------------- | --------------------------------------- |
| Display name                  | So bonds show a name instead of an email                       | Identifies the person; choose a pen name |
| Character icon                | A visual marker, no info leak                                  | —                                       |
| Current rank                  | So others know what stage to meet you at                       | Mild comparison anxiety possible         |
| Current quest name            | Context for "what they're working on"                          | —                                       |
| This week's dominant hindrance | Context for mutual support (e.g. "I'm in illwill, send metta") | Can feel exposing if you're in illwill  |
| Minutes sat this week (bucket, not exact) | Keeps mutual accountability honest                | Streak-shame risk — mitigated with buckets (see below) |
| Last-active indicator         | Shows if they're still practicing or on pause                  | Surveillance-adjacent if too granular — weekly not hourly |

### What is NEVER shared even when the user toggles "share everything"

- Every field under "What must never leave E2E" above.
- Habit-level details (which specific habits, streak lengths per habit).
- Character *detail* beyond the icon.
- Setback history (someone else knowing you broke a streak = pressure, not support).

### The honest framing — shown in Settings

> *Anything you share with your sangha is stored on the server un-encrypted so your friends can read it. This is different from your journal, reflections, and diagnostic — those stay encrypted with your passphrase and nobody, not even your sangha, can read them. Choose what you share here the way you'd choose what to say aloud in a group meeting.*

---

## Information architecture — what the Sangha tab shows

Each bonded sangha member appears as a card:

```
  ┌─────────────────────────────────┐
  │  🌱  Li May                      │
  │     Sotāpatti · Starting Out    │
  │                                  │
  │  This week:                      │
  │  🧘 Sat 4 of 7 days             │
  │  🗡️ Working with ill-will       │
  │                                  │
  │  Last active: yesterday          │
  │                                  │
  │  [  Send metta 🙏  ] [  Nudge  ] │
  └─────────────────────────────────┘
```

Fields only appear when the bonded user has toggled them on. Empty card = "they're on the path but not sharing details" (still useful as a social marker).

### Minutes-sat bucketing

Rather than "47 minutes", show ranges: **< 30 min**, **30–90 min**, **90–180 min**, **3–7 hrs**, **7+ hrs**. This keeps the signal (are they actively practicing?) without inviting obsessive comparison.

---

## Social actions — how sangha members interact

Designed to mimic in-person sangha support, not social-media engagement.

### Send metta 🙏

One-tap action. No text. No emoji chooser. Just: *you sent Li May metta*. On her side she sees a small "Dirk sent you metta" notification in the Sangha tab + (optionally) as a home-screen banner on her next sit. No numbers, no counters, no "15 people sent you metta today". One-at-a-time, no back-and-forth.

### Share a quote

When the quote-save feature ships (see FEEDBACK.md), a saved quote can be shared to one sangha member. Arrives as "Dirk shared a quote with you: *'…'* — from SN 22.83". One-shot, not a chat. The recipient can add it to their own collection.

### Nudge

*Only* available when the recipient has been silent for more than 7 days. A nudge sends them a very short message: "The sangha is holding you. Pick up wherever you are." Rate-limited: one nudge per sender per week per recipient. Absolute opt-out on the recipient's side. Default off.

### What we DO NOT build

- **No chat.** Adze is not a messaging app. Chat turns into DMs turns into drama. If testers want to talk, they have Signal.
- **No likes / kudos / counters.** These are comparison engines. A metta sent is not a like.
- **No leaderboards.** The weekly summary should show *your* pattern, never a ranking.
- **No public feed / timeline.** The card is the data.
- **No streaks displayed to others.** See setback-history carve-out above.

---

## Game integration — character abilities across sangha bonds

This is where the existing character-ability system (Moggallāna, Sāriputta, Khemā, etc.) becomes socially meaningful.

Character abilities that already exist (from `src/config.js ABILITY_HOOKS`) gain a **bonded-sangha** dimension:

- **Moggallāna (teammateRescue)** — already can restore a teammate's broken streak once per day for members in the same household. Extended: can do the same for bonded sangha across users. Playing Moggallāna becomes a socially meaningful role.
- **Sāriputta (weeklyMissForgiveness)** — grant a bonded sangha member one missed-day grace per week.
- **Mahāpajāpati (teamScoreMultiplier on high shadow)** — emits a small "protection" signal to everyone in sangha whose shadow is high. Visible as a gentle glow on their card.
- **Khemā (armyDismissal)** — once per stage, can help a sangha member dismiss a Māra's army they've been stuck on for 2+ weeks.

This turns character selection from "I want to play this role for me" into "I want to play this role for my circle" — directly analogous to tabletop RPG class selection.

### What makes this fit the dhamma (not just gamification)

The four traditional brahmavihāras (metta, karuṇā, muditā, upekkhā) are *practices toward others*. Adze's social layer IS the brahmavihāra mechanic — sending metta is the in-app expression of the cushion-side practice. A sangha member's struggle isn't a leaderboard signal; it's an opportunity for karuṇā (compassion). The design respects this.

---

## Technical sketch

### Supabase schema

```sql
-- Per-user shareable profile. One row per auth user who opts in.
create table public.sangha_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  character_key text,
  current_rank text,
  current_quest text,
  weekly_minutes_bucket text,    -- 'none' | 'light' | 'steady' | 'strong' | 'intensive'
  dominant_hindrance text,
  last_active_at timestamptz,
  shared_fields jsonb not null default '{}'::jsonb,   -- which fields are on
  updated_at timestamptz not null default now()
);
alter table public.sangha_profiles enable row level security;

-- RLS: self can read/write; accepted bonds can read the subset the
-- owner has toggled on. Enforced via a view or a function.

create table public.sangha_bonds (
  a uuid references auth.users(id) on delete cascade,
  b uuid references auth.users(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'blocked')),
  initiated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (a, b),
  check (a < b)   -- canonical ordering; a bond is a set of two
);
alter table public.sangha_bonds enable row level security;
-- RLS: either party can read; only initiated_by can insert as pending;
-- only the other party can update status to 'accepted' or 'blocked'.

create table public.sangha_events (
  id bigserial primary key,
  actor_id uuid references auth.users(id) on delete cascade,
  target_id uuid references auth.users(id) on delete cascade,
  kind text not null check (kind in ('metta', 'quote', 'nudge', 'ability_assist')),
  payload jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
alter table public.sangha_events enable row level security;
-- RLS: target can read and mark read; actor can insert if bond is accepted;
-- nudges rate-limited via a trigger (one per week per recipient).
```

### Client

- New `systems/sangha-net.js` — functions for: fetch my profile, update my profile + shared_fields, list my bonds, request a bond, accept/block a bond, fetch peer profiles (server-side-filtered to what they share), list events targeting me, emit an event.
- New `render/sangha.js` additions — multi-user card grid above the existing single-household view. Existing household view becomes a section below titled "Household".
- New Settings section "Privacy & sharing" — per-field toggles for `shared_fields`.

### Privacy-preserving RLS implementation

The `sangha_profiles` table stores every field regardless of whether it's shared. A view `sangha_profiles_public` filters columns per row based on `shared_fields`:

```sql
create or replace view public.sangha_profiles_public as
select
  sp.user_id,
  case when sp.shared_fields ? 'display_name' then sp.display_name else null end as display_name,
  case when sp.shared_fields ? 'character_key' then sp.character_key else null end as character_key,
  case when sp.shared_fields ? 'current_rank' then sp.current_rank else null end as current_rank,
  -- ... and so on for each field
  case when sp.shared_fields ? 'last_active_at' then sp.last_active_at else null end as last_active_at
from public.sangha_profiles sp;

-- RLS on the view: readable by any authed user who has an accepted bond
-- with sp.user_id.
```

The client reads from the view, never the base table. Field-level privacy enforced at the database layer — cannot be bypassed from the client.

---

## Rollout in stages

The whole feature is maybe 3–4 days of focused work. Stages so it can ship partially:

**Stage 1 · Self-profile + manual bonds (M)** — Settings → Privacy & sharing toggles → server stores `sangha_profiles` row. Dashboard tool to add a bond (no UI yet) — just verify the schema + RLS holds. Sangha tab shows a single extra card: "You" + any bonded users as placeholders.

**Stage 2 · Bond request / accept flow (M)** — UI in Sangha tab: "Add a practitioner" → search by email (must be on allowlist) → send bond request → target receives request, accepts or blocks. Card appears for accepted bonds.

**Stage 3 · Metta + quote + nudge actions (S)** — buttons on sangha cards, inserts into `sangha_events`. Notifications banner when there are unread events.

**Stage 4 · Champion abilities across bonds (M)** — extend the existing ability hooks to accept a target_user_id, validate bond exists, emit the assist as a sangha_event.

Stages 1–2 are required before any tester sees the feature. Stages 3–4 can layer in later.

---

## Reference patterns from other games

**Journey** (PS3, 2012) — anonymous paired-companion pattern. No names, no text, just shared experience + a single wordless call. Adze's "send metta" borrows this — no content, pure gesture.

**Habitica** — "party" mechanic: ~5 friends form a party, support each other's habits. The good part: mutual accountability without public shaming. The bad part: quests become obligations; we avoid.

**Strava** — kudos + comments. Too Instagram-adjacent for a meditation app; dropped deliberately.

**Death Stranding** — asynchronous cooperation. Players build structures other players can use, with "like" signals. Adze's "share a quote" is this pattern — asynchronous, leaves a gift.

**Sea of Thieves / EVE Online** — fleet abilities. Your character's ability affects the group. Adze's champion-abilities-across-sangha borrows directly.

---

## Open design questions (needs Dirk + possibly teacher consultation)

1. **Display name default** — real name, pen name, or auto-generated Pāli-style monastic name? Lean toward auto-generated default (e.g., "Mind of Equanimity") with user override, because it sets the tone.
2. **How large does sangha scale?** Intuitively small — 3 to 8 people, like a real sangha. Do we cap it in code? Soft nudge ("sangha is most supportive in small circles") vs. hard cap (max 12)?
3. **Is there a maintainer/teacher role?** — a sangha member who sees slightly more (e.g., can see if a member's shadow has spiked for 3+ weeks) to offer help. Requires explicit consent on both sides. Sensitive — needs more thought.
4. **Notifications strategy** — every sangha event a push notification? Daily digest? Silent (only visible in-app)? Default silent, opt-in per-type for more.

---

## Handoff to next session

Status: **design only, no code shipped**. Promoted to `docs/ROADMAP.md` backlog as a Stage-4 feature. Referenced from `docs/FEEDBACK.md` Open section.

When we build: start with Stage 1, ship each stage as its own minor release so each is testable in isolation. Do not build Stages 1–4 as one giant PR — each has its own risk surface.

The privacy constraints here are the hardest part. **No design shortcuts that put reflective text on the server unencrypted.** If we ever feel tempted, re-read the Adze privacy note first.
