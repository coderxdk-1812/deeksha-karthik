/**
 * Regenerates the favicon set and the nav mark from branding/site-logo.png.
 *
 *   node scripts/make-brand-assets.mjs
 *
 * Uses `sharp` from server/node_modules (the frontend doesn't depend on it),
 * so run `npm run install:server` first if that folder is missing.
 *
 * Outputs
 *   public/favicon.ico, favicon-32x32.png, favicon-16x16.png
 *       tight keyhole crop on the logo's own cream — a solid background so
 *       the mark stays visible on dark browser tab bars
 *   public/apple-touch-icon.png
 *       the full illustration, padded square, 180x180
 *   src/assets/logo-mark.png
 *       the keyhole on a transparent background, for the nav
 *
 * The keyhole crop paints out the orbit line that cuts across the base (it
 * turns to noise at small sizes) and the neighbouring motifs.
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("../server/node_modules/sharp");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(root, "branding/site-logo.png");

// Sampled from the logo's corners.
const BG = { r: 247, g: 238, b: 220 };

// Keyhole bounding area in the source image, with a little slack on each side.
const BOX = { left: 152, top: 147, width: 160, height: 257 };

async function loadRaw(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: Buffer.from(data), width: info.width, height: info.height };
}

/** Paints a rectangle with the background colour. */
function paintBg(img, x0, y0, x1, y1) {
  for (let y = Math.max(0, y0); y < Math.min(img.height, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(img.width, x1); x++) {
      const i = (y * img.width + x) * 4;
      img.data[i] = BG.r;
      img.data[i + 1] = BG.g;
      img.data[i + 2] = BG.b;
    }
  }
}

/**
 * The orbit is gray-green (r ≈ g) while the keyhole ink is warm brown
 * (r clearly above g), so it can be isolated by hue and filled back in from
 * its neighbours.
 */
function removeOrbit(img) {
  const { data, width, height } = img;
  const mask = new Uint8Array(width * height);

  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mean = (r + g + b) / 3;
    if (r - g < 10 && mean < 185) mask[p] = 1;
  }

  // Grow the mask to swallow the anti-aliased fringe.
  const grown = new Uint8Array(mask);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height) grown[ny * width + nx] = 1;
        }
      }
    }
  }

  // Fill masked pixels from the *median* (by brightness) of nearby unmasked
  // ones, a ring at a time. A median snaps to the majority colour — brown
  // inside the body, cream outside — instead of smearing a pale scar the way
  // an average would.
  for (let pass = 0; pass < 10; pass++) {
    const fills = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!grown[y * width + x]) continue;
        const near = [];
        for (let dy = -4; dy <= 4; dy++) {
          for (let dx = -4; dx <= 4; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            if (grown[ny * width + nx]) continue;
            const j = (ny * width + nx) * 4;
            near.push([data[j] + data[j + 1] + data[j + 2], data[j], data[j + 1], data[j + 2]]);
          }
        }
        if (near.length === 0) continue;
        near.sort((a, b) => a[0] - b[0]);
        const mid = near[near.length >> 1];
        fills.push([y * width + x, mid[1], mid[2], mid[3]]);
      }
    }
    if (fills.length === 0) break;
    for (const [p, r, g, b] of fills) {
      const i = p * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b;
      grown[p] = 0;
    }
  }
}

/** Keyhole only, orbit removed, on a square cream canvas with `margin` (0–1) breathing room. */
async function keyholeSquare(side) {
  const full = await loadRaw(SOURCE);
  const crop = await sharp(full.data, { raw: { width: full.width, height: full.height, channels: 4 } })
    .extract(BOX)
    .raw()
    .toBuffer();
  const img = { data: Buffer.from(crop), width: BOX.width, height: BOX.height };

  // Neighbouring motifs that creep into the box corners (books, bottom right).
  paintBg(img, 148, 235, BOX.width, BOX.height);
  removeOrbit(img);

  const inner = Math.round(side * 0.9);
  const scale = inner / Math.max(BOX.width, BOX.height);
  const w = Math.round(BOX.width * scale);
  const h = Math.round(BOX.height * scale);
  const resized = await sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } })
    .resize(w, h, { kernel: "lanczos3" })
    .png()
    .toBuffer();

  return sharp({ create: { width: side, height: side, channels: 4, background: { ...BG, alpha: 1 } } })
    .composite([{ input: resized, left: Math.round((side - w) / 2), top: Math.round((side - h) / 2) }])
    .png();
}

/** GIMP-style "color to alpha": the cream background becomes transparent, ink stays. */
async function toTransparent(pngBuffer) {
  const { data, info } = await sharp(pngBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const a = Math.min(1, Math.max(0, 1 - Math.min(r / BG.r, g / BG.g, b / BG.b)));
    if (a < 0.02) continue; // leave fully transparent
    out[i] = Math.max(0, Math.min(255, (r - BG.r * (1 - a)) / a));
    out[i + 1] = Math.max(0, Math.min(255, (g - BG.g * (1 - a)) / a));
    out[i + 2] = Math.max(0, Math.min(255, (b - BG.b * (1 - a)) / a));
    out[i + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** Packs PNG buffers into a .ico container (PNG-in-ICO is supported by every current browser). */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + entries.length * 16;
  const dir = [];
  for (const { size, png } of entries) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    dir.push(e);
  }
  return Buffer.concat([header, ...dir, ...entries.map((e) => e.png)]);
}

async function main() {
  // Favicons: render big once, then downscale, so all sizes share the same framing.
  const master = await (await keyholeSquare(512)).toBuffer();
  const sized = {};
  for (const size of [16, 32, 48]) {
    sized[size] = await sharp(master).resize(size, size, { kernel: "lanczos3" }).png().toBuffer();
  }
  writeFileSync(path.join(root, "public/favicon-16x16.png"), sized[16]);
  writeFileSync(path.join(root, "public/favicon-32x32.png"), sized[32]);
  writeFileSync(
    path.join(root, "public/favicon.ico"),
    buildIco([16, 32, 48].map((size) => ({ size, png: sized[size] }))),
  );

  // Apple touch icon: the whole illustration, padded to a square. `extend`
  // and `resize` are separate steps because sharp always runs resize first
  // within one pipeline.
  const full = await sharp(SOURCE).metadata();
  const side = Math.max(full.width, full.height);
  const squared = await sharp(SOURCE)
    .extend({
      top: Math.floor((side - full.height) / 2),
      bottom: Math.ceil((side - full.height) / 2),
      left: Math.floor((side - full.width) / 2),
      right: Math.ceil((side - full.width) / 2),
      background: { ...BG, alpha: 1 },
    })
    .png()
    .toBuffer();
  await sharp(squared)
    .resize(180, 180, { kernel: "lanczos3" })
    .flatten({ background: BG })
    .png()
    .toFile(path.join(root, "public/apple-touch-icon.png"));

  // Nav mark: transparent keyhole, 2x for a ~34px display size.
  const navMaster = await (await keyholeSquare(256)).toBuffer();
  const navTransparent = await toTransparent(navMaster);
  await sharp(navTransparent)
    .resize(96, 96, { kernel: "lanczos3" })
    .png()
    .toFile(path.join(root, "src/assets/logo-mark.png"));

  console.log("Brand assets written.");
}

main();
