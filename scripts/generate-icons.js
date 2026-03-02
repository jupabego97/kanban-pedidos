/**
 * Genera los iconos PNG necesarios para la PWA usando solo Node.js built-ins.
 * Color: #1e40af (azul corporativo)
 */
import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';

// ─── CRC32 (requerido por el formato PNG) ──────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const tb = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([len, tb, data, crcBuf]);
}

// ─── Genera un PNG cuadrado de color sólido ─────────────────────
function createSolidPNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB

  // Datos de imagen: byte de filtro (0) + píxeles RGB por fila
  const row = Buffer.alloc(1 + size * 3);
  row[0] = 0; // filter: None
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r;
    row[1 + x * 3 + 1] = g;
    row[1 + x * 3 + 2] = b;
  }
  const raw = Buffer.concat(Array(size).fill(row));

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

// ─── Crear iconos ───────────────────────────────────────────────
mkdirSync('static', { recursive: true });

const BLUE = [30, 64, 175]; // #1e40af

const icons = [
  ['static/pwa-192x192.png', 192],
  ['static/pwa-512x512.png', 512],
  ['static/apple-touch-icon.png', 180],
  ['static/apple-touch-icon-120x120.png', 120],
  ['static/apple-touch-icon-120x120-precomposed.png', 120]
];

for (const [path, size] of icons) {
  writeFileSync(path, createSolidPNG(size, ...BLUE));
  console.log(`✓ ${path} (${size}×${size})`);
}
