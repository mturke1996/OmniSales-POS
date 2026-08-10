#!/usr/bin/env node
/**
 * Generate iOS PWA splash screens (apple-touch-startup-image).
 * Pure Node — no dependencies.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../public/splash");
fs.mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function splashPng(w, h) {
  const rows = [];
  const bg = [11, 18, 32]; // sidebar tone
  const accent = [99, 102, 241];

  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 4);
    for (let x = 0; x < w; x++) {
      const i = 1 + x * 4;
      const cx = w / 2;
      const cy = h * 0.42;
      const dx = (x - cx) / (w * 0.12);
      const dy = (y - cy) / (w * 0.12);
      const inLogo = dx * dx + dy * dy <= 1;

      if (inLogo) {
        row[i] = accent[0];
        row[i + 1] = accent[1];
        row[i + 2] = accent[2];
        row[i + 3] = 255;
      } else {
        row[i] = bg[0];
        row[i + 1] = bg[1];
        row[i + 2] = bg[2];
        row[i + 3] = 255;
      }
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** width × height @ scale → media query portrait */
const SPLASHES = [
  { file: "iphone-se.png", w: 750, h: 1334, media: "(device-width: 375px) and (device-height: 667px)" },
  { file: "iphone-xr.png", w: 828, h: 1792, media: "(device-width: 414px) and (device-height: 896px)" },
  { file: "iphone-12.png", w: 1170, h: 2532, media: "(device-width: 390px) and (device-height: 844px)" },
  { file: "iphone-14-pro.png", w: 1179, h: 2556, media: "(device-width: 393px) and (device-height: 852px)" },
  { file: "iphone-15-pro-max.png", w: 1290, h: 2796, media: "(device-width: 430px) and (device-height: 932px)" },
  { file: "ipad.png", w: 1536, h: 2048, media: "(device-width: 768px) and (device-height: 1024px)" },
];

const manifest = [];

for (const s of SPLASHES) {
  const filePath = path.join(outDir, s.file);
  fs.writeFileSync(filePath, splashPng(s.w, s.h));
  manifest.push({ ...s, href: `/splash/${s.file}` });
}

fs.writeFileSync(
  path.join(outDir, "manifest.json"),
  JSON.stringify(manifest, null, 2)
);

console.log(`Wrote ${SPLASHES.length} iOS splash screens to ${outDir}`);
