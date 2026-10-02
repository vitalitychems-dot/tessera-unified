#!/usr/bin/env node
/**
 * Erase the printed caption block (compound name / CAS line) that sits under
 * the vial in every canonical product render.
 *
 * Why: the caption text baked into several renders carries a CAS number that
 * belongs to a different compound. The storefront prints the exact name,
 * strength and CAS from the catalog next to the photo, so the safest image is
 * "vial only". The vial itself — including its printed label — is untouched.
 *
 * How: the renders are a vial on a pure black background. Per image we build a
 * row brightness profile, walk down from the vial's top edge until a run of
 * black rows separates the vial from the caption, and paint everything below
 * that gap black. Files whose profile does not match the expected layout are
 * skipped and reported, never guessed.
 *
 * Usage: node scripts/strip-captions.mjs [--dry] [file.webp ...]
 */
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, "../public/product-images");
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const only = args.filter((a) => !a.startsWith("--"));

const HEIGHT = 1000;
const BRIGHT_THRESHOLD = 0; // any pixel above the 12% luminance threshold counts
const GAP_ROWS = 10; // black rows that separate vial from caption

function rowProfile(file) {
  // One pixel per row: the mean of a thresholded (bright vs. black) row.
  const out = execFileSync("magick", [
    file,
    "-colorspace",
    "gray",
    "-threshold",
    "12%",
    "-scale",
    `1x${HEIGHT}!`,
    "-depth",
    "8",
    "txt:-",
  ]).toString();
  const rows = new Array(HEIGHT).fill(0);
  for (const line of out.split("\n")) {
    const m = /^0,(\d+):\s*\((\d+)/.exec(line);
    if (m) rows[Number(m[1])] = Number(m[2]) / 255;
  }
  return rows;
}

/**
 * The render is a stack of bright row-segments: cap, label parts, the white
 * powder block (the tallest segment near the bottom of the vial), then two or
 * three short caption lines. The vial bottom is the end of the last segment at
 * least MIN_BODY_ROWS tall; whatever follows is caption.
 */
const MIN_BODY_ROWS = 40;
const MAX_CAPTION_LINE_ROWS = 30;

function segments(rows) {
  const out = [];
  let start = -1;
  for (let y = 0; y <= HEIGHT; y++) {
    const on = y < HEIGHT && rows[y] > BRIGHT_THRESHOLD;
    if (on && start < 0) start = y;
    if (!on && start >= 0) {
      out.push({ start, end: y - 1, len: y - start });
      start = -1;
    }
  }
  return out;
}

function findCaptionStart(rows) {
  const segs = segments(rows);
  if (!segs.length) return { error: "no bright rows (blank image?)" };
  let bodyIndex = -1;
  for (let i = segs.length - 1; i >= 0; i--) {
    if (segs[i].len >= MIN_BODY_ROWS) {
      bodyIndex = i;
      break;
    }
  }
  if (bodyIndex < 0) return { error: "no vial body segment found" };
  const vialBottom = segs[bodyIndex].end;
  const caption = segs.slice(bodyIndex + 1);
  if (!caption.length) return { vialBottom, captionStart: null };
  const captionStart = caption[0].start;
  const gap = captionStart - vialBottom;
  if (
    vialBottom < 450 ||
    gap < GAP_ROWS ||
    gap > 80 ||
    caption.some((s) => s.len > MAX_CAPTION_LINE_ROWS) ||
    caption.length > 4
  ) {
    return {
      error: `unexpected layout (vialBottom=${vialBottom}, captionStart=${captionStart}, lines=${caption.map((s) => s.len).join("/")})`,
    };
  }
  return { vialBottom, captionStart };
}

const files = (only.length ? only : readdirSync(dir).filter((f) => f.endsWith(".webp")))
  .map((f) => (path.isAbsolute(f) ? f : path.join(dir, path.basename(f))))
  .filter((f) => !path.basename(f).startsWith("generic-"));

let changed = 0;
const skipped = [];
for (const file of files) {
  const name = path.basename(file);
  const rows = rowProfile(file);
  const res = findCaptionStart(rows);
  if (res.error) {
    skipped.push(`${name}: ${res.error}`);
    continue;
  }
  if (res.captionStart === null) {
    console.log(`= ${name}: no caption below vial (vial bottom ${res.vialBottom})`);
    continue;
  }
  const cut = res.vialBottom + Math.floor((res.captionStart - res.vialBottom) / 2);
  console.log(`${dry ? "~" : "-"} ${name}: vial bottom ${res.vialBottom}, caption from ${res.captionStart}, erasing from row ${cut}`);
  if (dry) continue;
  const before = statSync(file).size;
  execFileSync("magick", [
    file,
    "-fill",
    "black",
    "-draw",
    `rectangle 0,${cut} 799,${HEIGHT - 1}`,
    "-strip",
    "-quality",
    "90",
    "-define",
    "webp:method=6",
    file,
  ]);
  changed++;
  console.log(`  ${before} -> ${statSync(file).size} bytes`);
}
console.log(`\n${changed} file(s) rewritten, ${skipped.length} skipped.`);
for (const s of skipped) console.log(`  ! ${s}`);
if (skipped.length) process.exitCode = 2;
