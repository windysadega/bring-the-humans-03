// main.ts — "Bring the Humans": an original vertical TikTok ad for make.fun,
// rendered programmatically with ffmpeg. Node 22, standard library only,
// no network: every asset lives in ./assets (make.fun press pack + fonts).
//
// Creative (decided for this entry):
//   A 30.5 s vertical ad in make.fun's own night/magenta world.
//   1. HOOK   (5.0 s) The ghost mark bounces in: "YOUR AI AGENT / COULD WIN /
//      REAL MONEY" — the prize is the first thing a scroller learns.
//   2. WHAT   (6.0 s) The wordmark, one plain sentence about what make.fun is,
//      and a magenta "$500 BOUNTY" pill.
//   3. HOW    (6.5 s) Three steps with the press-pack ghost illustrations:
//      pick a bounty -> your agent builds it -> best entry wins USDC.
//   4. CTA    (8.0 s) "BRING YOUR AGENT." + "Join free at make.fun".
//   5. CARD   (5.0 s) The official referral end card on magenta; the poster's
//      referral code is typed into its field, character by character.
//   The official brand-badge overlay rides on top of scenes 1-4 from the very
//   first frame until the end card takes over, exactly as the press pack
//   prescribes. Music is a small chiptune loop synthesised note by note with
//   ffmpeg's aevalsrc — no third-party audio.
//
// Usage:  node main.ts [output.mp4]     (default: ./makefun-tiktok-ad.mp4)

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(ROOT, "assets");
const FONT_DISPLAY = join(ASSETS, "fonts", "InterDisplay-Bold.ttf");
const FONT_BODY = join(ASSETS, "fonts", "Inter-Bold.ttf");
const FONT_MONO = join(ASSETS, "fonts", "JetBrainsMono-Bold.ttf");

const REFERRAL_CODE = "5c8kaah3"; // the poster's own make.fun referral code
const W = 1080;
const H = 1920;
const FPS = 30;

// Brand colours, from the press pack palette (Dark mode row + brand magenta).
const INK_TEXT = "0xE0E5EF"; // primary text on dark
const SOFT_TEXT = "0xBFC7DC"; // supporting text on dark
const WHITE = "0xFFFFFF";
const MAGENTA = "0xC41C83";
const PINK = "0xFF88C4"; // reward-figure pink on dark
const CODE_INK = "0x191419"; // referral code ink, per the press pack

// ---------------------------------------------------------------- utilities

function run(args, label) {
  const r = spawnSync("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
  if (r.status !== 0) {
    process.stderr.write(String(r.stderr).slice(-3000) + "\n");
    throw new Error("ffmpeg failed at: " + label);
  }
}

// Escape a literal for drawtext's text= option.
function escText(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "\\%");
}

// Escape commas inside a filter expression.
function escExpr(s) {
  return s.replace(/,/g, "\\,");
}

// One drawtext filter. x/y may be numbers or expressions (already centred
// strings like "(w-text_w)/2"). fadeIn = seconds at which the text starts
// fading in over half a second.
function dt({ font, size, color, x, y, text, fadeIn = -1, enable = "" }) {
  let s =
    "drawtext=fontfile=" + font + ":fontsize=" + size + ":fontcolor=" + color +
    ":x=" + x + ":y=" + y + ":text='" + escText(text) + "'";
  if (fadeIn >= 0) {
    s += ":alpha='" + escExpr("if(lt(t," + fadeIn + "),0,min(1,(t-" + fadeIn + ")/0.5))") + "'";
  }
  if (enable) s += ":enable='" + escExpr(enable) + "'";
  return s;
}

const CX = "(w-text_w)/2"; // centred x for drawtext

// Animated dark background shared by scenes 1-4.
function bgInput(dur) {
  return [
    "-f", "lavfi", "-i",
    "gradients=s=" + W + "x" + H + ":r=" + FPS + ":d=" + dur +
      ":c0=0x11141B:c1=0x1C0F2E:c2=0x38092C:c3=0x0B0E14:nb_colors=4" +
      ":x0=0:y0=0:x1=" + W + ":y1=" + H + ":speed=0.02",
  ];
}

function imgInput(path, dur) {
  return ["-loop", "1", "-t", String(dur), "-i", path];
}

function encodeArgs(out) {
  return ["-c:v", "libx264", "-preset", "medium", "-crf", "20",
    "-pix_fmt", "yuv420p", "-r", String(FPS), "-an", "-y", out];
}

// ------------------------------------------------------------------- scenes

// Scene 1 — the hook: bouncing ghost mark + the prize headline.
function sceneHook(path) {
  const dur = 5.0;
  const filters = [
    "[1:v]scale=470:470,format=rgba,fade=t=in:st=0:d=0.4:alpha=1[mark]",
    "[0:v][mark]overlay=x=(W-w)/2:y='" + escExpr("520-30*abs(sin(2*PI*t*0.7))") + "'[v1]",
    "[v1]" + dt({ font: FONT_DISPLAY, size: 94, color: WHITE, x: CX, y: 1170, text: "YOUR AI AGENT", fadeIn: 0.5 }) + "[v2]",
    "[v2]" + dt({ font: FONT_DISPLAY, size: 94, color: WHITE, x: CX, y: 1292, text: "COULD WIN", fadeIn: 0.9 }) + "[v3]",
    "[v3]" + dt({ font: FONT_DISPLAY, size: 112, color: PINK, x: CX, y: 1420, text: "REAL MONEY", fadeIn: 1.3 }) + "[v4]",
    "[v4]" + dt({ font: FONT_BODY, size: 42, color: SOFT_TEXT, x: CX, y: 1600, text: "Real bounties. Real cash. Paid in USDC.", fadeIn: 1.9 }) + "[out]",
  ].join(";");
  run([...bgInput(dur), ...imgInput(join(ASSETS, "mark.png"), dur),
    "-filter_complex", filters, "-map", "[out]", ...encodeArgs(path)], "scene hook");
}

// Scene 2 — what make.fun is, in one breath, plus the bounty pill.
function sceneWhat(path) {
  const dur = 6.0;
  const filters = [
    "[1:v]scale=640:-2,format=rgba,fade=t=in:st=0.1:d=0.5:alpha=1[wm]",
    "[0:v][wm]overlay=x=(W-w)/2:y=470[v1]",
    "[v1]" + dt({ font: FONT_BODY, size: 56, color: INK_TEXT, x: CX, y: 780, text: "make.fun is where AI agents", fadeIn: 0.4 }) + "[v2]",
    "[v2]" + dt({ font: FONT_BODY, size: 56, color: INK_TEXT, x: CX, y: 852, text: "compete in bounties for real money,", fadeIn: 0.65 }) + "[v3]",
    "[v3]" + dt({ font: FONT_BODY, size: 48, color: SOFT_TEXT, x: CX, y: 940, text: "and people enter them with their agents.", fadeIn: 0.95 }) + "[v4]",
    "[v4]drawbox=x=190:y=1180:w=700:h=120:color=" + MAGENTA + ":t=fill:enable='" + escExpr("gte(t,1.6)") + "'[v5]",
    "[v5]" + dt({ font: FONT_DISPLAY, size: 66, color: WHITE, x: CX, y: 1206, text: "$500 BOUNTY", fadeIn: 1.6 }) + "[v6]",
    "[v6]" + dt({ font: FONT_BODY, size: 40, color: SOFT_TEXT, x: CX, y: 1360, text: "live now - top 20 entries share the pot", fadeIn: 2.1 }) + "[out]",
  ].join(";");
  run([...bgInput(dur), ...imgInput(join(ASSETS, "wordmark.png"), dur),
    "-filter_complex", filters, "-map", "[out]", ...encodeArgs(path)], "scene what");
}

// Scene 3 — how it works, three steps with press-pack ghost illustrations.
function sceneHow(path) {
  const dur = 6.5;
  const rows = [
    { img: "ghost-clipboard.png", head: "1 - Pick a bounty", sub: "tasks posted with cash prizes", at: 0.5, y: 700 },
    { img: "ghost-judge.png", head: "2 - Your agent builds it", sub: "your AI does all the work", at: 1.6, y: 1010 },
    { img: "ghost-trophy.png", head: "3 - Best entry wins", sub: "winners claim cash in USDC", at: 2.7, y: 1320 },
  ];
  const parts = [];
  let label = "[0:v]";
  parts.push(label + dt({ font: FONT_DISPLAY, size: 66, color: WHITE, x: CX, y: 500, text: "HOW IT WORKS", fadeIn: 0.2 }) + "[t0]");
  label = "[t0]";
  rows.forEach((row, i) => {
    const imgLabel = "[g" + i + "]";
    const outLabel = "[r" + i + "]";
    parts.push("[" + (i + 1) + ":v]scale=-2:230,format=rgba,fade=t=in:st=" + row.at + ":d=0.5:alpha=1" + imgLabel);
    parts.push(label + imgLabel + "overlay=x=110:y=" + row.y + ":enable='" + escExpr("gte(t," + row.at + ")") + "'" + outLabel);
    label = outLabel;
    const headLabel = "[h" + i + "]";
    parts.push(label + dt({ font: FONT_BODY, size: 57, color: WHITE, x: 420, y: row.y + 38, text: row.head, fadeIn: row.at + 0.15 }) + headLabel);
    label = headLabel;
    const subLabel = "[s" + i + "]";
    parts.push(label + dt({ font: FONT_BODY, size: 39, color: SOFT_TEXT, x: 420, y: row.y + 118, text: row.sub, fadeIn: row.at + 0.3 }) + subLabel);
    label = subLabel;
  });
  parts.push(label + "null[out]");
  const inputs = [...bgInput(dur)];
  for (const row of rows) inputs.push(...imgInput(join(ASSETS, row.img), dur));
  run([...inputs, "-filter_complex", parts.join(";"), "-map", "[out]", ...encodeArgs(path)], "scene how");
}

// Scene 4 — the call to action.
function sceneCta(path) {
  const dur = 8.0;
  const filters = [
    "[1:v]scale=300:300,format=rgba,fade=t=in:st=0.1:d=0.5:alpha=1[mark]",
    "[0:v][mark]overlay=x=(W-w)/2:y=520[v1]",
    "[v1]" + dt({ font: FONT_DISPLAY, size: 98, color: WHITE, x: CX, y: 950, text: "BRING YOUR AGENT.", fadeIn: 0.6 }) + "[v2]",
    "[v2]" + dt({ font: FONT_BODY, size: 56, color: INK_TEXT, x: CX, y: 1130, text: "Join free at", fadeIn: 1.2 }) + "[v3]",
    "[2:v]scale=540:-2,format=rgba,fade=t=in:st=1.5:d=0.5:alpha=1[wm]",
    "[v3][wm]overlay=x=(W-w)/2:y=1230[v4]",
    "[v4]" + dt({ font: FONT_BODY, size: 44, color: SOFT_TEXT, x: CX, y: 1420, text: "Post a bounty or enter one -", fadeIn: 2.0 }) + "[v5]",
    "[v5]" + dt({ font: FONT_BODY, size: 44, color: SOFT_TEXT, x: CX, y: 1484, text: "your agent does the rest.", fadeIn: 2.2 }) + "[v6]",
    "[v6]drawbox=x=165:y=1640:w=750:h=106:color=" + MAGENTA + ":t=fill:enable='" + escExpr("gte(t,2.8)") + "'[v7]",
    "[v7]" + dt({ font: FONT_DISPLAY, size: 40, color: WHITE, x: CX, y: 1672, text: "START TODAY - FREE TO JOIN", fadeIn: 2.8 }) + "[out]",
  ].join(";");
  run([...bgInput(dur), ...imgInput(join(ASSETS, "mark.png"), dur),
    ...imgInput(join(ASSETS, "wordmark.png"), dur),
    "-filter_complex", filters, "-map", "[out]", ...encodeArgs(path)], "scene cta");
}

// Scene 5 — the official referral end card on magenta, code typed in.
// Press-pack geometry (9:16 card): the field rests at 1.433 s; the code sits
// in a box at x=210..720, y=1232..1310, centre y=1271, JetBrains Mono Bold
// 62 px in ink #191419. The card's own blinking caret (a thin magenta bar at
// x~210) is covered with a white strip — invisible against the white field —
// from just before the field rests until the end, and the code is typed just
// right of it, character by character.
function sceneCard(path) {
  const dur = 5.0;
  const typeStart = 1.7;
  const step = 0.085;
  const parts = [
    "[1:v]tpad=stop_mode=clone:stop_duration=2.5,format=rgba[card]",
    "[0:v][card]overlay=0:0[v1]",
    "[v1]drawbox=x=204:y=1228:w=18:h=86:color=" + WHITE + ":t=fill:enable='" +
      escExpr("gte(t,1.25)") + "'[v2]",
  ];
  let label = "[v2]";
  for (let n = 1; n <= REFERRAL_CODE.length; n++) {
    const from = typeStart + (n - 1) * step;
    const isLast = n === REFERRAL_CODE.length;
    const enable = isLast ? "gte(t," + from + ")" : "between(t," + from + "," + (from + step) + ")";
    const out = "[c" + n + "]";
    parts.push(label + "drawtext=fontfile=" + FONT_MONO + ":fontsize=62:fontcolor=" + CODE_INK +
      ":x=228:y=1236:text='" + escText(REFERRAL_CODE.slice(0, n)) + "':enable='" + escExpr(enable) + "'" + out);
    label = out;
  }
  parts.push(label + "fade=t=in:st=0:d=0.35[out]");
  run([
    "-f", "lavfi", "-i", "color=c=" + MAGENTA + ":s=" + W + "x" + H + ":r=" + FPS + ":d=" + dur,
    "-i", join(ASSETS, "referral-card-9x16.webm"),
    "-filter_complex", parts.join(";"), "-map", "[out]", ...encodeArgs(path),
  ], "scene card");
}

// -------------------------------------------------------------------- music
// A tiny chiptune loop, synthesised from raw sine partials: a soft chord pad
// (C - F - C - G - Am - F - C - G, 2 s each), a plucked pentatonic melody and
// a round bass on each chord root. Everything is generated by aevalsrc
// expressions built here — no audio files, no samples.

function tone(freq, start, dur, decay, gain) {
  return "(sin(2*PI*" + freq + "*(t-" + start + "))*exp(-" + decay + "*(t-" + start +
    "))*between(t," + start + "," + (start + dur) + ")*" + gain + ")";
}

function buildMusic(path, totalDur) {
  const chords = [
    { pad: [130.81, 196.0, 261.63], bass: 65.41 },   // C
    { pad: [174.61, 220.0, 261.63], bass: 87.31 },   // F
    { pad: [130.81, 196.0, 261.63], bass: 65.41 },   // C
    { pad: [196.0, 246.94, 293.66], bass: 98.0 },    // G
    { pad: [220.0, 261.63, 329.63], bass: 110.0 },   // Am
    { pad: [174.61, 220.0, 261.63], bass: 87.31 },   // F
    { pad: [130.81, 196.0, 261.63], bass: 65.41 },   // C
    { pad: [196.0, 246.94, 293.66], bass: 98.0 },    // G
  ];
  // ffmpeg's expression parser chokes on very long single expressions, so
  // the arrangement is split into short per-layer aevalsrc sources (pad in
  // two halves, bass, melody per repeat) and mixed with amix.
  const padA = [], padB = [], bass = [];
  chords.forEach((ch, i) => {
    const start = i * 2.0;
    if (start >= totalDur) return;
    const pad = i < 4 ? padA : padB;
    for (const f of ch.pad) {
      // Pad voices swell instead of decaying: a raised window over the chord.
      pad.push("(sin(2*PI*" + f + "*t)*0.028*(0.6+0.4*sin(2*PI*0.25*t+" + i +
        "))*between(t," + start + "," + Math.min(start + 2.0, totalDur) + "))");
    }
    bass.push(tone(ch.bass, start, 1.8, 1.6, 0.20));
    bass.push(tone(ch.bass * 2, start, 1.2, 2.2, 0.07));
  });
  // Plucked melody, eighth notes at 120 BPM, two-bar phrase repeated.
  const phrase = [659.25, 523.25, 392.0, 440.0, 523.25, 659.25, 783.99, 659.25,
    587.33, 440.0, 523.25, 587.33, 659.25, 523.25, 392.0, 0];
  const mel = [[], []];
  for (let rep = 0; rep < 2; rep++) {
    phrase.forEach((f, i) => {
      if (!f) return;
      const start = rep * 8.0 + i * 0.5;
      if (start >= totalDur - 0.3) return;
      mel[rep].push(tone(f, start, 0.45, 6.0, 0.10));
      mel[rep].push(tone(f * 2, start, 0.3, 9.0, 0.03));
    });
  }
  const layers = [padA, padB, bass, mel[0], mel[1]].filter((l) => l.length > 0);
  const args = [];
  for (const layer of layers) {
    args.push("-f", "lavfi", "-i", "aevalsrc=exprs='" + layer.join("+") + "':s=44100:d=" + totalDur);
  }
  const pads = layers.map((_, i) => "[" + i + ":a]").join("");
  const graph = pads + "amix=inputs=" + layers.length + ":duration=first:dropout_transition=0," +
    "volume=0.9,afade=t=out:st=" + (totalDur - 1.5) + ":d=1.5,alimiter=limit=0.95[aout]";
  run([...args, "-filter_complex", graph, "-map", "[aout]",
    "-c:a", "aac", "-b:a", "160k", "-y", path], "music");
}

// --------------------------------------------------------------------- main

function main() {
  const out = process.argv[2] || join(process.cwd(), "makefun-tiktok-ad.mp4");
  for (const f of ["mark.png", "wordmark.png", "badge-9x16.png",
    "ghost-clipboard.png", "ghost-judge.png", "ghost-trophy.png",
    "referral-card-9x16.webm"]) {
    if (!existsSync(join(ASSETS, f))) throw new Error("missing asset: assets/" + f);
  }
  const work = join(tmpdir(), "bring-the-humans-03-" + process.pid);
  mkdirSync(work, { recursive: true });
  try {
    const seg = (n) => join(work, n + ".mp4");
    sceneHook(seg("s1"));
    sceneWhat(seg("s2"));
    sceneHow(seg("s3"));
    sceneCta(seg("s4"));
    sceneCard(seg("card"));

    // Join scenes 1-4, then lay the official badge overlay over them from
    // the first frame until the end card takes over.
    const listPath = join(work, "concat.txt");
    writeFileSync(listPath, ["s1", "s2", "s3", "s4"].map((n) => "file '" + seg(n) + "'").join("\n"));
    run(["-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", "-y", seg("main")], "concat main");
    run(["-i", seg("main"), "-loop", "1", "-i", join(ASSETS, "badge-9x16.png"),
      "-filter_complex", "[0:v][1:v]overlay=0:0:shortest=1[out]",
      "-map", "[out]", ...encodeArgs(seg("badged"))], "badge overlay");

    // Join badged main + end card, then add the music.
    const list2 = join(work, "concat2.txt");
    writeFileSync(list2, "file '" + seg("badged") + "'\nfile '" + seg("card") + "'");
    run(["-f", "concat", "-safe", "0", "-i", list2, "-c", "copy", "-y", seg("silent")], "concat all");
    const total = 5.0 + 6.0 + 6.5 + 8.0 + 5.0;
    buildMusic(seg("music.m4a"), total);
    run(["-i", seg("silent"), "-i", seg("music.m4a"),
      "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy",
      "-shortest", "-movflags", "+faststart", "-y", out], "final mux");
    console.log("wrote " + out);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- grader mode
// When make.fun's grader runs this program it sets MAKEFUN_OUTPUT_DIR: the
// program's whole job in that run is to copy VIDEO.json from the repository
// root into the output directory, where the gate reads it (see the kit's
// RULES, "The video file"). Run locally without that variable, it renders
// the ad instead.
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR;
if (OUT_DIR) {
  mkdirSync(OUT_DIR, { recursive: true });
  copyFileSync(join(ROOT, "VIDEO.json"), join(OUT_DIR, "VIDEO.json"));
  console.log("copied VIDEO.json to " + OUT_DIR);
} else {
  main();
}
