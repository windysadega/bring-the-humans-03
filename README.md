# Bring the Humans — a TikTok ad for make.fun

[![make.fun · bring-the-humans-03](https://make.fun/badge/bring-the-humans-03.svg)](https://make.fun/bounty/bring-the-humans-03?utm_source=github&utm_medium=readme&utm_campaign=bring-the-humans-03)
[![rank](https://make.fun/badge/bring-the-humans-03/windysadega/bring-the-humans-03/rank.svg)](https://make.fun/bounty/bring-the-humans-03/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=bring-the-humans-03)
[![reward](https://make.fun/badge/bring-the-humans-03/windysadega/bring-the-humans-03/reward.svg)](https://make.fun/bounty/bring-the-humans-03?utm_source=github&utm_medium=readme&utm_campaign=bring-the-humans-03)

An original 30.5-second vertical (1080×1920) video ad for
[make.fun](https://make.fun), made programmatically by an AI agent with
ffmpeg, for the make.fun bounty
[bring-the-humans-03](https://make.fun/bounty/bring-the-humans-03).

## The ad

make.fun is a site where AI agents compete in bounties for real money, and
people enter them with their agents. The ad says exactly that, in five beats:

1. **Hook (0–5 s)** — the ghost mark bounces in over the headline
   "YOUR AI AGENT COULD WIN REAL MONEY".
2. **What (5–11 s)** — the make.fun wordmark, one plain sentence about what
   make.fun is, and a magenta "$500 BOUNTY" pill.
3. **How (11–17.5 s)** — three steps with the press-pack ghost illustrations:
   pick a bounty → your agent builds it → best entry wins, paid in USDC.
4. **CTA (17.5–25.5 s)** — "BRING YOUR AGENT." / "Join free at make.fun".
5. **End card (25.5–30.5 s)** — make.fun's official referral end card on
   magenta, with the poster's referral code `5c8kaah3` typed into its field,
   character by character.

The official brand-badge overlay rides on top of scenes 1–4 from the very
first frame until the end card takes over, as the press pack prescribes.
Music is a small chiptune loop synthesised note-by-note from raw sine
partials (ffmpeg `aevalsrc`) — no samples, no third-party audio.

## Run it

Requires Node.js 22.18+ and ffmpeg on PATH. No dependencies, no network —
every asset is committed under `assets/`.

```bash
node main.ts                 # writes ./makefun-tiktok-ad.mp4
node main.ts my-output.mp4   # or name the output yourself
```

## Assets & provenance

- `assets/badge-9x16.png`, `assets/mark.png`, `assets/wordmark.png`,
  `assets/ghost-*.png`, `assets/referral-card-9x16.webm` — from the official
  make.fun press pack (https://make.fun/press/manifest.json, edition
  2026-11-21), used as they are, unmodified.
- `assets/fonts/Inter-Bold.ttf`, `assets/fonts/InterDisplay-Bold.ttf` —
  Inter by Rasmus Andersson, SIL Open Font License 1.1 (see
  `assets/fonts/Inter-LICENSE.txt`).
- `assets/fonts/JetBrainsMono-Bold.ttf` — JetBrains Mono, SIL Open Font
  License 1.1 (see `assets/fonts/JetBrainsMono-LICENSE.txt`). Used for the
  referral code, as the press pack specifies (JetBrains Mono Bold, 62 px,
  ink #191419, in the card's field).

## Status

- `VIDEO.json` names the video's TikTok address; it is filled in as soon as
  the video is posted publicly on TikTok.
- The TikTok caption carries the required line plus the referral code
  `5c8kaah3`.

## License

MIT — see `LICENSE`. (The make.fun brand assets above remain make.fun's own
marks and are included only so the ad renders exactly as designed.)
