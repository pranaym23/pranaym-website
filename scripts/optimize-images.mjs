// One-off image pass. Run from pranaym-website/:  node scripts/optimize-images.mjs
//
// 1. Downsizes the travel reel photos. They were stored at 800x1000 but the
//    .photo-card slot is a fixed 260px (220px under 600px wide), so 520px is
//    already 2x for the largest rendering. Cuts the reel from ~23MB to ~9MB.
// 2. Rebuilds the 400x400 portrait at a sane file size.
// 3. Generates a 1200x630 Open Graph card, which the old square portrait
//    could not serve as.
//
// Originals are committed, so `git checkout -- public/images` reverts this.
import sharp from 'sharp';
import { readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const IMAGES = 'public/images';
const REEL_WIDTH = 520;

const BG = '#1f1e1d';
const INK = '#faf9f5';
const DIM = '#b0aea5';
const RULE = '#3d3d3a';

const kb = (n) => `${Math.round(n / 1024)}KB`;

async function resizeReel() {
  const files = (await readdir(IMAGES)).filter(
    (f) => f.startsWith('pranay-m-travel-photography-') && f.endsWith('.webp')
  );

  let before = 0;
  let after = 0;

  let done = 0;
  let skipped = 0;

  for (const file of files) {
    const full = path.join(IMAGES, file);
    const size = (await stat(full)).size;

    // Idempotent: re-encoding an already-downsized file is pure quality loss.
    const { width } = await sharp(full).metadata();
    if (width <= REEL_WIDTH) {
      skipped += 1;
      before += size;
      after += size;
      continue;
    }

    // Decode to a buffer first: sharp cannot stream a file onto itself.
    const out = await sharp(full)
      .resize({ width: REEL_WIDTH, withoutEnlargement: true })
      .webp({ quality: 78, effort: 6 })
      .toBuffer();

    await writeFile(full, out);
    before += size;
    after += out.length;
    done += 1;
  }

  console.log(
    `reel: ${done} resized, ${skipped} already optimized  ` +
      `${kb(before)} -> ${kb(after)}` +
      (done ? ` (${Math.round((1 - after / before) * 100)}% smaller)` : '')
  );
}

async function rebuildPortrait() {
  const src = path.join(IMAGES, 'portrait.png');
  const before = (await stat(src)).size;

  // Already processed on an earlier run - leave it alone.
  if (before < 80 * 1024) {
    console.log(`portrait.png: already optimized (${kb(before)})`);
    return;
  }

  const out = await sharp(src)
    .resize(400, 400, { fit: 'cover' })
    .png({ quality: 82, compressionLevel: 9, palette: true })
    .toBuffer();

  await writeFile(src, out);
  console.log(`portrait.png: ${kb(before)} -> ${kb(out.length)}`);
}

async function buildOgCard() {
  // 400x400 source, inset on the right of a 1200x630 card. The text column is
  // kept under ~640px wide so it never runs into the portrait.
  const AVATAR = 280;
  const AVATAR_LEFT = 820;
  const avatar = await sharp(path.join(IMAGES, 'portrait.png'))
    .resize(AVATAR, AVATAR, { fit: 'cover' })
    .toBuffer();

  const svg = Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="${BG}"/>
      <rect x="0" y="0" width="1200" height="8" fill="${INK}"/>
      <text x="80" y="248" font-family="Georgia, 'Times New Roman', serif"
            font-size="66" font-weight="700" fill="${INK}">Pranay Mehrotra</text>
      <text x="80" y="304" font-family="Georgia, 'Times New Roman', serif"
            font-size="34" fill="${DIM}">Tech founder and writer</text>
      <line x1="80" y1="356" x2="280" y2="356" stroke="${RULE}" stroke-width="2"/>
      <text x="80" y="414" font-family="Georgia, 'Times New Roman', serif"
            font-size="28" fill="${DIM}">Essays, recommended reading, and</text>
      <text x="80" y="452" font-family="Georgia, 'Times New Roman', serif"
            font-size="28" fill="${DIM}">notes from Sao Paulo, Brazil</text>
      <text x="80" y="540" font-family="Georgia, 'Times New Roman', serif"
            font-size="26" fill="${INK}">pranaym.com</text>
    </svg>
  `);

  const out = await sharp(svg)
    .composite([{ input: avatar, top: (630 - AVATAR) / 2, left: AVATAR_LEFT }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  const dest = path.join(IMAGES, 'og-default.png');
  await writeFile(dest, out);
  console.log(`og-default.png: 1200x630, ${kb(out.length)}`);
}

// Named steps so the OG card can be re-rendered without touching the photos.
//   node scripts/optimize-images.mjs           -> all steps
//   node scripts/optimize-images.mjs og        -> just the social card
const steps = { reel: resizeReel, portrait: rebuildPortrait, og: buildOgCard };
const requested = process.argv.slice(2);
const toRun = requested.length ? requested : Object.keys(steps);

for (const name of toRun) {
  const step = steps[name];
  if (!step) {
    console.error(`unknown step "${name}" - expected one of: ${Object.keys(steps).join(', ')}`);
    process.exit(1);
  }
  await step();
}
