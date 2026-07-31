/**
 * Generate simple black/white PNG icons for Tauri using pure Node (no deps).
 * Minimal valid PNGs via uncompressed RGBA + CRC.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.resolve(__dirname, "../src-tauri/icons");
fs.mkdirSync(iconsDir, { recursive: true });

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

function png(size) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      const i = 1 + x * 4;
      const margin = Math.floor(size * 0.18);
      const inner = x >= margin && x < size - margin && y >= margin && y < size - margin;
      // black background, white inner square with slight inset
      if (inner) {
        const inset = Math.floor(size * 0.08);
        const in2 =
          x >= margin + inset &&
          x < size - margin - inset &&
          y >= margin + inset &&
          y < size - margin - inset;
        if (in2) {
          row[i] = 250;
          row[i + 1] = 250;
          row[i + 2] = 250;
          row[i + 3] = 255;
        } else {
          row[i] = 10;
          row[i + 1] = 10;
          row[i + 2] = 10;
          row[i + 3] = 255;
        }
      } else {
        row[i] = 10;
        row[i + 1] = 10;
        row[i + 2] = 10;
        row[i + 3] = 255;
      }
    }
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const sizes = {
  "32x32.png": 32,
  "128x128.png": 128,
  "henry.w@example.net": 256,
  "icon.png": 512,
  "Square30x30Logo.png": 30,
  "Square44x44Logo.png": 44,
  "Square71x71Logo.png": 71,
  "Square89x89Logo.png": 89,
  "Square107x107Logo.png": 107,
  "Square142x142Logo.png": 142,
  "Square150x150Logo.png": 150,
  "Square284x284Logo.png": 284,
  "Square310x310Logo.png": 310,
  "StoreLogo.png": 50,
};

for (const [name, size] of Object.entries(sizes)) {
  fs.writeFileSync(path.join(iconsDir, name), png(size));
}

// icns/ico placeholders not generated; Tauri on Windows mainly needs PNGs above.
console.log(`Icons written to ${iconsDir}`);
console.log("hash", createHash("sha1").update(png(512)).digest("hex").slice(0, 8));
