# Adze · Beta tester guide

This page is for everyone in the closed beta. It's the same content the in-app "Beta guide" modal carries (Settings → About Adze · Beta guide), in long form for reading on a calm screen.

## What Adze is

Adze is a small web app for keeping a daily meditation practice. It is rooted in the Theravāda tradition — the early Buddhist canon, the Pāli suttas, the five hindrances the Buddha named under the Bodhi tree. It tries to listen before it recommends, and to recommend before it teaches.

Three things, layered:

- **A practice journal** — daily reflections, what you noticed, what came up.
- **A diagnostic** — a short, honest self-assessment that shapes what the app suggests for you. The same diagnostic can be re-run as you change.
- **A game scaffolding** — Māra's ten armies, the eight noble path layers, characters drawn from the Buddha's circle. The game is there to keep practice alive in the early days when discipline is fragile. When it stops being useful, set it down.

Underneath all of it is a curated sutta library. New suttas land most weeks. Citations are accurate to SuttaCentral.

## What's still rough — honest expectations

This is closed beta. Three things to expect:

1. **You will find bugs.** Not "maybe", will. Some are obvious; some you'll only catch because you're using the app in your own way. Both are equally useful.
2. **The recommendations are early.** The engine that decides what to surface — which sutta, which duration, which prompt — is rule-based and small. It will sometimes be off. Your push-back is the main way it gets better.
3. **Content is being added weekly.** Sutta translations, teaching quotes, the diagnostic copy — all under active editing. If you notice a missing piece, that's a real signal.

There is also a `CHANGELOG.md` in the project repo if you want to see what shipped between sessions: https://github.com/slate915first/adze/blob/main/CHANGELOG.md

## How to give feedback — the 💬 button

In the bottom-right corner of every screen there is a small 💬 button. Tap it.

It opens two modes:

1. **General feedback** — a form. Pick a category (bug, idea, asking for help, praise), write a short summary and longer details if you want. It opens a draft in your mail app — review, edit, send. Or copy the body and email yourself.
2. **Element feedback** — toggle it on. Every interactive element on the screen gets a dashed gold outline as you hover. Click whichever element is the source of your reaction (a button, a card, a sentence). The form pre-fills with the path to that exact element so I know precisely what you're talking about. This is the more powerful mode for visual or specific issues.

You can also just reply to any email I send you, or write to `hello@adze.life` directly.

## Try the recommendations against your own judgment

This is the most useful thing a beta tester can do.

When you finish onboarding, Adze will recommend a duration, a focus, a first sutta. It will surface specific teachings under your "today" view. **None of these recommendations are sacred.** They come from a small set of rules, weighted by your diagnostic answers, and they will sometimes be wrong for you specifically.

What helps:

- **Run the diagnostic at different "experience" levels.** From Settings → reset, then re-take, picking different answers. See what the engine surfaces for "Never sat" vs. "Years of practice". Which feels right? Which feels like a mismatch?
- **Push back when a suggestion feels off.** Use the 💬 button on that exact element. Tell me *why* it feels off — was it too advanced? Too basic? The wrong tradition? Tone-deaf to your situation? All of these are useful.
- **Notice what's missing.** If the recommendation didn't speak to where you actually are, that gap is the real signal. Name the gap.

You are more authoritative than the heuristics inside the engine. The whole point of beta is to find the seams where the rules fail.

## Why your feedback actually matters — three reasons

Beta is real work. You're giving time. Here's what that time produces:

- **Variety.** Each tester finds friction nobody else does. Your particular setup — your tradition, your physical situation, your time of day, your years of practice or lack thereof — uncovers a path through the app nobody else has walked. The bug you find is one I would otherwise have shipped.
- **Direct loop.** I read every report personally. Most get a reply within a day or two. Many shape the next release; you can usually see the change in `CHANGELOG.md` within a week.
- **Significance.** This circle is small on purpose. Five to fifteen people deciding what this is. Without your push-back, Adze stays my private project. With it, it becomes ours.

I don't expect you to use the app every day or to write long reports. A single line — "this felt wrong" with a screenshot — is more valuable than weeks of polite silence.

## Privacy, in one paragraph

Your reflections, your diagnostic answers, anything you've typed — all of it is encrypted in your browser before it leaves your device. The encryption uses a passphrase you choose, separate from your login password. That passphrase never leaves your browser. Even I, the person running Supabase for you, cannot read your data on the server. The full technical details are in Settings → Account & Sync → "How encryption works".

If you forget the passphrase, your synced data is unrecoverable. The app account survives, but the encrypted blob is gone. That's not a bug; it's the cost of meaning it when we say nobody else can read your data. Write the passphrase down somewhere safe.

## Contact

For anything — questions, bugs, ideas, frustrations, just-saying-hello — `hello@adze.life`. The same address that took your beta-access request takes your reports.

For things you want to disappear from the project entirely, write to me first; I will delete what's deletable and tell you what isn't (auth records have to stay for a few days for security audit reasons; everything else can go immediately).

— Dirk
