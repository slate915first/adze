# Bell sound credits

All bell recordings in this directory are released under **CC0 1.0 Universal (Public Domain Dedication)**. They are free to use, modify, and redistribute commercially and non-commercially, without attribution. This file gives credit anyway, because the recordings are good and the people who made them deserve to be named.

| File | Source | Author | Original URL | License |
| ---- | ------ | ------ | ------------ | ------- |
| `tibetan-bowl-singing.mp3` | BigSoundBank | Joseph SARDIN | https://bigsoundbank.com/detail-1109-tibetan-bowl-singing.html | CC0 1.0 |
| `tibetan-bowl-struck-1.mp3` | BigSoundBank | Joseph SARDIN | https://bigsoundbank.com/tibetan-bowl-struck-s1110.html | CC0 1.0 |
| `tibetan-bowl-struck-2.mp3` | BigSoundBank | Joseph SARDIN | https://bigsoundbank.com/tibetan-bowl-struck-2-s2553.html | CC0 1.0 |
| `tibetan-bowl-struck-3.mp3` | BigSoundBank | Joseph SARDIN | https://bigsoundbank.com/tibetan-bowl-struck-3-s2554.html | CC0 1.0 |
| `tibetan-bowl-struck-4.mp3` | BigSoundBank | Joseph SARDIN | https://bigsoundbank.com/sound-2555-tibetan-bowl-struck-4.html | CC0 1.0 |

Recorded with a Tascam DR-40 + Sennheiser ME66, mono, 48 kHz, 16-bit. Re-encoded as MP3 for distribution; the originals are also available in WAV/FLAC at the source URLs above.

## Why these specifically

- **`tibetan-bowl-singing.mp3`** — the long friction-rung sustain, used as the `singing` variant. Best for a sit-end signal where you want the practitioner to come back gradually.
- **`tibetan-bowl-struck-1.mp3`** — the warmest, lowest-pitch strike of the four. Used as `warm`, the default.
- **`tibetan-bowl-struck-2.mp3`** — strike with a longer sing-out. Currently unused in `BELL_VARIANTS`; available for future variants.
- **`tibetan-bowl-struck-3.mp3`** — the brightest, highest-pitch strike. Used as `thai`.
- **`tibetan-bowl-struck-4.mp3`** — strike with extended decay, closest CC0 match for a Burmese-style ritual bell. Used as `goenka`.

## Note on Goenka's actual bell

The bell used in S.N. Goenka's 10-day Vipassana courses is a recording owned by the Vipassana Research Institute (VRI). It is **not** in the public domain and we cannot ship it. The `goenka` variant in Adze uses a CC0 Tibetan bowl strike with extended decay as the closest privacy-respecting substitute. If you want the actual VRI gong, install the official Vipassana Meditation app (free) and let it run alongside.

## Adding new bells

To add a new variant:

1. Drop a CC0 / public-domain `.mp3` into this directory.
2. Add an entry to the table above (file, source, author, URL, license).
3. Add a new entry to `BELL_VARIANTS` in `src/config.js` with `sample: 'content/sounds/bells/your-file.mp3'` and a synth `play(ctx)` fallback in case the file fails to load.
4. Bump `CACHE_NAME` in `src/sw.js` so old caches purge.
5. Commit + tag a new version per `docs/VERSIONING.md`.

If you record one yourself: 5 seconds of clean audio is enough for a single strike. 30+ seconds for a sustained sing. Mono, 44.1 kHz or 48 kHz, MP3 at 128 kbps is plenty for bell content. Trim leading silence so playback feels instant.
