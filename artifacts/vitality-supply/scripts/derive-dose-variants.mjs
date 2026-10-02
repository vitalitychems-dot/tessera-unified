#!/usr/bin/env node
/**
 * Derive missing strength renders from a verified sibling of the same compound.
 *
 * Several catalog strengths never received a correct render (the uploaded
 * files for them carried a different compound or strength on the printed
 * label and were rejected during the visual audit). Rather than show a wrong
 * vial or a placeholder, we take the verified render of the *same compound*
 * and replace only the strength text in the two places it is printed:
 *   1. the rotated strength column on the label (right of the compound name)
 *   2. the strength on the purple strip ("NAME - 10MG")
 * Everything else — bottle, cap, compound name, logo, disclaimers — is the
 * original pixels. Every output is listed in DERIVED below and must be
 * visually re-checked (see docs/product-images.md) before it is mapped.
 *
 * Usage: node scripts/derive-dose-variants.mjs [--check]
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, "../public/product-images");
const FONT = "DejaVu-Sans-Bold";
const INK = "#ededed";

/** target → { from: verified sibling, dose: text printed on the label } */
export const DERIVED = {
  "semaglutide-15mg": { from: "semaglutide-10mg", dose: "15MG" },
  "semaglutide-20mg": { from: "semaglutide-10mg", dose: "20MG" },
  "tirzepatide-15mg": { from: "tirzepatide-10mg", dose: "15MG" },
  "ipamorelin-5mg": { from: "ipamorelin-10mg", dose: "5MG" },
  "ghrp-2-5mg": { from: "ghrp-2-10mg", dose: "5MG" },
  "cjc-1295-no-dac-5mg": { from: "cjc-1295-no-dac-10mg", dose: "5MG" },
  "retatrutide-10mg": { from: "retatrutide-20mg", dose: "10MG" },
  // Single-strength blend with no sibling: re-letter the compound column and
  // strip of the other two-compound blend render (same bottle, same layout).
  "cjc-1295-w-o-dac-ipamorelin-5mg-5mg": {
    from: "bpc-tb-blend-10mg-10mg",
    dose: "5/5MG",
    name: "CJC/IPA",
    strip: "CJC/IPA - 5/5MG",
  },
};

function magick(args, opts = {}) {
  return execFileSync("magick", args, { maxBuffer: 64 * 1024 * 1024, ...opts }).toString();
}

/** Bright-pixel mask of a crop as a 2D array (true = ink). */
function mask(file, x, y, w, h, threshold = "55%") {
  const out = magick([
    file,
    "-crop",
    `${w}x${h}+${x}+${y}`,
    "+repage",
    "-colorspace",
    "gray",
    "-threshold",
    threshold,
    "-depth",
    "8",
    "txt:-",
  ]);
  const rows = Array.from({ length: h }, () => new Array(w).fill(false));
  for (const line of out.split("\n")) {
    const m = /^(\d+),(\d+):\s*\((\d+)/.exec(line);
    if (m) rows[Number(m[2])][Number(m[1])] = Number(m[3]) > 127;
  }
  return rows;
}

/** Column segments (x ranges) that contain ink, split by gaps >= minGap. */
function columnSegments(rows, minGap) {
  const w = rows[0].length;
  const cols = new Array(w).fill(0);
  for (const r of rows) for (let x = 0; x < w; x++) if (r[x]) cols[x]++;
  const segs = [];
  let start = -1;
  let gap = 0;
  for (let x = 0; x <= w; x++) {
    const ink = x < w && cols[x] > 0;
    if (ink) {
      if (start < 0) start = x;
      gap = 0;
    } else if (start >= 0) {
      gap++;
      if (gap >= minGap || x === w) {
        segs.push({ x0: start, x1: x - gap });
        start = -1;
        gap = 0;
      }
    }
  }
  return segs;
}

function rowExtent(rows, x0, x1) {
  let top = -1;
  let bottom = -1;
  rows.forEach((r, y) => {
    for (let x = x0; x <= x1; x++) {
      if (r[x]) {
        if (top < 0) top = y;
        bottom = y;
        break;
      }
    }
  });
  return { top, bottom };
}

/** Rows of the purple strip along a vertical line through the label. */
function findStripBand(file, x) {
  const Y = 530;
  const H = 90;
  const out = magick([file, "-crop", `1x${H}+${x}+${Y}`, "+repage", "-depth", "8", "txt:-"]);
  const purple = [];
  for (const line of out.split("\n")) {
    const m = /^0,(\d+):\s*\((\d+),(\d+),(\d+)/.exec(line);
    if (!m) continue;
    const [r, g, b] = [Number(m[2]), Number(m[3]), Number(m[4])];
    if (b > 45 && r < 90 && g < 90 && b > r) purple.push(Number(m[1]));
  }
  if (purple.length < 15) throw new Error(`${path.basename(file)}: purple strip not found at x=${x}`);
  return { top: Y + purple[0], bottom: Y + purple[purple.length - 1] };
}

/** Locate the rotated compound-name and strength columns on the label. */
function findLabelColumns(file) {
  const X = 290;
  const W = 60;
  const Y = 422;
  const H = 110;
  const rows = mask(file, X, Y, W, H);
  const segs = columnSegments(rows, 3).filter((s) => s.x1 - s.x0 >= 5);
  if (segs.length < 2) throw new Error(`${path.basename(file)}: expected name + strength columns, found ${segs.length}`);
  const [name, dose] = segs;
  // Full vertical extent of each column, measured in a taller window that is
  // still left of the logo and wordmark.
  const TY = 430;
  const TH = 125;
  const tall = mask(file, X, TY, W, TH);
  const nameExt = rowExtent(tall, name.x0, name.x1);
  const doseExt = rowExtent(tall, dose.x0, dose.x1);
  return {
    name: { x0: X + name.x0, x1: X + name.x1, top: TY + nameExt.top, bottom: TY + nameExt.bottom },
    dose: { x0: X + dose.x0, x1: X + dose.x1, top: TY + doseExt.top, bottom: TY + doseExt.bottom },
  };
}

/** Locate the strength text on the purple strip: the segment after the dash. */
function findStripDose(file, band) {
  const X = 296;
  const Y = band.top + 2;
  const W = 190;
  const H = band.bottom - band.top - 3;
  const rows = mask(file, X, Y, W, H, "60%");
  const segs = columnSegments(rows, 4).map((s) => ({ ...s, ...rowExtent(rows, s.x0, s.x1) }));
  // "NAME - DOSE" is followed by a wide gap before "NOT FOR HUMAN". The dose is
  // the segment right after the dash, or — when the thin dash falls below the
  // ink threshold — the last segment before that wide gap.
  let doseIndex = segs.findIndex((s) => s.x1 - s.x0 <= 8 && s.bottom - s.top <= 4) + 1;
  if (doseIndex <= 0 || !segs[doseIndex]) {
    doseIndex = segs.findIndex((s, i) => segs[i + 1] && segs[i + 1].x0 - s.x1 >= 12 && X + s.x1 > 380);
  }
  if (doseIndex < 0 || !segs[doseIndex]) {
    throw new Error(`${path.basename(file)}: could not find "- DOSE" on the strip`);
  }
  const d = segs[doseIndex];
  const next = segs[doseIndex + 1];
  return {
    x0: X + d.x0,
    x1: X + d.x1,
    top: Y + d.top,
    bottom: Y + d.bottom,
    textStart: X + segs[0].x0,
    gapEnd: next ? X + next.x0 - 2 : X + W,
  };
}

function textSize(text, pointsize) {
  const [w, h] = magick([
    "-background",
    "none",
    "-font",
    FONT,
    "-pointsize",
    String(pointsize),
    "-kerning",
    "0.5",
    `label:${text}`,
    "-format",
    "%wx%h",
    "info:",
  ])
    .trim()
    .split("x")
    .map(Number);
  return { w, h };
}

function derive(target, { from, dose, name, strip: stripText }) {
  const src = path.join(dir, `${from}.webp`);
  const out = path.join(dir, `${target}.webp`);
  if (!existsSync(src)) throw new Error(`missing source ${src}`);
  const label = findLabelColumns(src);
  const band = findStripBand(src, label.dose.x0);
  const strip = findStripDose(src, band);

  // Vertical strength column: erase with the label black sampled just above
  // the printed text (keeps the horizontal glass gradient), then draw rotated.
  const colX = label.dose.x0 - 2;
  const colW = label.dose.x1 - label.dose.x0 + 5;
  const colY = label.dose.top - 4;
  const colH = label.dose.bottom - label.dose.top + 9;
  const sampleTop = label.dose.top - 12;
  const sampleH = 8;
  const vertical = textSize(dose, 10.5); // before rotation: w = text length
  const vX = Math.round((label.dose.x0 + label.dose.x1) / 2 - vertical.h / 2);
  const vY = Math.round((label.dose.top + label.dose.bottom) / 2 - vertical.w / 2);

  // Strip strength: erase with the strip colour sampled from the gap after the
  // text (keeps the vertical band gradient), then draw upright.
  const stripPad = 2;
  const sX = (stripText ? strip.textStart : strip.x0) - stripPad;
  const sW = strip.x1 - (stripText ? strip.textStart : strip.x0) + stripPad * 2 + 1;
  const sY = strip.top - 5;
  const sH = strip.bottom - strip.top + 11;
  const gapX = strip.x1 + 3;
  const gapW = Math.max(3, Math.min(6, strip.gapEnd - gapX));
  const uprightText = stripText ?? dose;
  const upright = textSize(uprightText, 10);
  const uX = stripText ? strip.textStart : strip.x0;
  const uY = Math.round((strip.top + strip.bottom) / 2 - upright.h / 2);

  // Optional compound-name column replacement (single-strength blends only).
  const nameOps = [];
  if (name) {
    const nX = label.name.x0 - 2;
    const nW = label.name.x1 - label.name.x0 + 5;
    const nY = label.name.top - 4;
    const nH = label.name.bottom - label.name.top + 9;
    const rotated = textSize(name, 10.5);
    const rX = Math.round((label.name.x0 + label.name.x1) / 2 - rotated.h / 2);
    const rY = Math.round((label.name.top + label.name.bottom) / 2 - rotated.w / 2);
    nameOps.push(
      "(", "-clone", "0", "-crop", `${nW}x8+${nX}+${label.name.top - 12}`, "+repage", "-resize", `${nW}x${nH}!`, ")",
      "-geometry", `+${nX}+${nY}`, "-composite",
      "(", "-background", "none", "-fill", INK, "-font", FONT, "-pointsize", "10.5", "-kerning", "0.5", `label:${name}`, "-rotate", "-90", ")",
      "-geometry", `+${rX}+${rY}`, "-composite",
    );
  }

  magick([
    src,
    "(",
    "-clone",
    "0",
    "-crop",
    `${colW}x${sampleH}+${colX}+${sampleTop}`,
    "+repage",
    "-resize",
    `${colW}x${colH}!`,
    ")",
    "-geometry",
    `+${colX}+${colY}`,
    "-composite",
    "(",
    "-clone",
    "0",
    "-crop",
    `${gapW}x${sH}+${gapX}+${sY}`,
    "+repage",
    "-resize",
    `${sW}x${sH}!`,
    ")",
    "-geometry",
    `+${sX}+${sY}`,
    "-composite",
    ...nameOps,
    "(",
    "-background",
    "none",
    "-fill",
    INK,
    "-font",
    FONT,
    "-pointsize",
    "10.5",
    "-kerning",
    "0.5",
    `label:${dose}`,
    "-rotate",
    "-90",
    ")",
    "-geometry",
    `+${vX}+${vY}`,
    "-composite",
    "(",
    "-background",
    "none",
    "-fill",
    INK,
    "-font",
    FONT,
    "-pointsize",
    "10",
    "-kerning",
    "0.5",
    `label:${uprightText}`,
    ")",
    "-geometry",
    `+${uX}+${uY}`,
    "-composite",
    "-strip",
    "-quality",
    "90",
    "-define",
    "webp:method=6",
    out,
  ]);
  console.log(
    `${target} <- ${from}: column x${label.dose.x0}-${label.dose.x1} y${label.dose.top}-${label.dose.bottom}; strip x${strip.x0}-${strip.x1} y${strip.top}-${strip.bottom}`,
  );
}

const check = process.argv.includes("--check");
let failures = 0;
for (const [target, spec] of Object.entries(DERIVED)) {
  try {
    if (check) {
      const src = path.join(dir, `${spec.from}.webp`);
      const label = findLabelColumns(src);
      const band = findStripBand(src, label.dose.x0);
      const strip = findStripDose(src, band);
      console.log(`ok ${target} <- ${spec.from}: name x${label.name.x0}-${label.name.x1} y${label.name.top}-${label.name.bottom}; dose x${label.dose.x0}-${label.dose.x1} y${label.dose.top}-${label.dose.bottom}; band y${band.top}-${band.bottom}; strip dose x${strip.x0}-${strip.x1} y${strip.top}-${strip.bottom} gapEnd ${strip.gapEnd}`);
    } else {
      derive(target, spec);
    }
  } catch (error) {
    failures++;
    console.error(`! ${target}: ${error.message}`);
  }
}
if (failures) process.exitCode = 1;
