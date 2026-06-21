// optimize-images.mjs
// Generates responsive sized variants AND a full-resolution version for every image.
// Responsive sizes use efficient lossy compression; full-res uses lossless for pixel-perfect quality.
// Run with:  node optimize-images.mjs
// Requires:  Node.js + sharp  (install once with: npm install sharp)

import sharp from "sharp";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import { join, parse } from "node:path";

// ---- CONFIG ----
const SRC_DIR  = "image-source";
const OUT_DIR  = "images-optimized";
const WIDTHS   = [640, 1280, 1920, 2560, 3840]; // responsive sizes; never upscales
const FALLBACK_WIDTH = 1280;                     // plain <img> src width
const MAX_EDGE = 5000;                           // no output edge may exceed this

// Responsive variants — efficient lossy for fast delivery at smaller sizes
const AVIF_RESPONSIVE = { quality: 50, effort: 6 };
const WEBP_RESPONSIVE = { quality: 80 };
const JPEG_RESPONSIVE = { quality: 80, mozjpeg: true };

// Full-resolution variants — lossless so full-screen display is pixel-perfect
const AVIF_FULL = { lossless: true };
const WEBP_FULL = { lossless: true };
const JPEG_FULL = { quality: 100, mozjpeg: true };

const SIZES_ATTR = "(max-width: 768px) 100vw, 1200px";
// ----------------

const IMG_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]);

await mkdir(OUT_DIR, { recursive: true });

const files = (await readdir(SRC_DIR))
  .filter((f) => IMG_EXT.has(parse(f).ext.toLowerCase()));

if (files.length === 0) {
  console.log(`No images found in ./${SRC_DIR}. Drop your full-res images there and re-run.`);
  process.exit(0);
}

const snippets = [];

for (const file of files) {
  const { name } = parse(file);
  const input = join(SRC_DIR, file);
  const meta  = await sharp(input).metadata();
  const srcW  = meta.width  ?? Math.max(...WIDTHS);
  const srcH  = meta.height ?? null;
  const aspect = srcH && srcW ? srcH / srcW : null;

  // Effective full-res width after applying MAX_EDGE cap on the longest edge
  const fullW = srcH && srcH > srcW
    ? Math.min(srcW, Math.floor(MAX_EDGE * srcW / srcH))  // portrait: height is longest
    : Math.min(srcW, MAX_EDGE);                            // landscape/square: width is longest

  // Responsive sizes — never upscale, stay within MAX_EDGE cap
  let targets = WIDTHS.filter((w) => w < fullW);
  if (targets.length === 0) targets = [fullW];
  targets = [...new Set(targets)].sort((a, b) => a - b);

  const made = { avif: [], webp: [], jpg: [] };

  for (const w of targets) {
    const base = sharp(input).resize({ width: w, withoutEnlargement: true });
    const stem = `${name}-${w}w`;
    await base.clone().avif(AVIF_RESPONSIVE).toFile(join(OUT_DIR, `${stem}.avif`));
    await base.clone().webp(WEBP_RESPONSIVE).toFile(join(OUT_DIR, `${stem}.webp`));
    await base.clone().jpeg(JPEG_RESPONSIVE).toFile(join(OUT_DIR, `${stem}.jpg`));
    made.avif.push(`${OUT_DIR}/${stem}.avif ${w}w`);
    made.webp.push(`${OUT_DIR}/${stem}.webp ${w}w`);
    made.jpg.push( `${OUT_DIR}/${stem}.jpg ${w}w`);
  }

  // Full-resolution variant — lossless, pixel-perfect, capped at MAX_EDGE on longest edge
  const fullResize = sharp(input).resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
  await fullResize.clone().avif(AVIF_FULL).toFile(join(OUT_DIR, `${name}-full.avif`));
  await fullResize.clone().webp(WEBP_FULL).toFile(join(OUT_DIR, `${name}-full.webp`));
  await fullResize.clone().jpeg(JPEG_FULL).toFile(join(OUT_DIR, `${name}-full.jpg`));
  made.avif.push(`${OUT_DIR}/${name}-full.avif ${fullW}w`);
  made.webp.push(`${OUT_DIR}/${name}-full.webp ${fullW}w`);
  made.jpg.push( `${OUT_DIR}/${name}-full.jpg ${fullW}w`);

  const fbW = targets.includes(FALLBACK_WIDTH) ? FALLBACK_WIDTH : targets[targets.length - 1];
  const fbH = aspect ? Math.round(fbW * aspect) : "";

  snippets.push(
`<picture>
  <source type="image/avif" srcset="${made.avif.join(", ")}" sizes="${SIZES_ATTR}">
  <source type="image/webp" srcset="${made.webp.join(", ")}" sizes="${SIZES_ATTR}">
  <img src="${OUT_DIR}/${name}-${fbW}w.jpg" width="${fbW}" height="${fbH}" alt="" loading="lazy" decoding="async">
</picture>`
  );

  const fullDesc = srcH ? `${fullW}×${Math.round(fullW * aspect)}` : `${fullW}×?`;
  console.log(`✓ ${file} → ${targets.length} responsive sizes + full-res (${fullDesc}, capped from ${srcW}×${srcH ?? "?"}) × 3 formats`);
}

await writeFile(join(OUT_DIR, "_picture-snippets.html"), snippets.join("\n\n"), "utf8");
console.log(`\nDone. ${files.length} image(s) processed into ./${OUT_DIR}`);
console.log(`Ready-to-paste <picture> markup is in ./${OUT_DIR}/_picture-snippets.html`);
