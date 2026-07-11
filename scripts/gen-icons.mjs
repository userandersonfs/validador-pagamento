// Gera os icones do PWA com a imagem do Santo Antonio, em estilo medalhao
// (fundo marrom + disco creme + moldura dourada). Uso: node scripts/gen-icons.mjs
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(RAIZ, 'public', 'icons');
const SANTO = path.join(RAIZ, 'assets', 'santo-antonio.png');

function svgBase({ maskable }) {
  const rDisco = maskable ? 196 : 210;
  const anel = maskable ? '' : '<circle cx="256" cy="256" r="238" fill="none" stroke="url(#gold)" stroke-width="7"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <radialGradient id="bg" cx="50%" cy="40%" r="75%">
        <stop offset="0%" stop-color="#8a5a30"/>
        <stop offset="62%" stop-color="#6b4523"/>
        <stop offset="100%" stop-color="#4a2f16"/>
      </radialGradient>
      <radialGradient id="cream" cx="50%" cy="42%" r="60%">
        <stop offset="0%" stop-color="#fbf3e2"/>
        <stop offset="100%" stop-color="#efdfbf"/>
      </radialGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f0d47a"/>
        <stop offset="100%" stop-color="#c9962a"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" fill="url(#bg)"/>
    <circle cx="256" cy="256" r="${rDisco}" fill="url(#cream)"/>
    ${anel}
  </svg>`;
}

function svgRoundMask() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="96" ry="96" fill="#fff"/></svg>`;
}

async function compor({ maskable }) {
  const base = await sharp(Buffer.from(svgBase({ maskable }))).png().toBuffer();
  const altura = maskable ? 320 : 372; // figura cabe dentro do disco creme
  const santo = await sharp(SANTO).resize({ height: altura, fit: 'inside' }).png().toBuffer();
  let img = await sharp(base).composite([{ input: santo, gravity: 'center' }]).png().toBuffer();
  if (!maskable) {
    // arredonda as quatro pontas
    img = await sharp(img).composite([{ input: Buffer.from(svgRoundMask()), blend: 'dest-in' }]).png().toBuffer();
  }
  return img;
}

async function salvar(buf, size, file) {
  await sharp(buf).resize(size, size).png().toFile(path.join(OUT, file));
  console.log('  ok', file, `${size}x${size}`);
}

await mkdir(OUT, { recursive: true });
console.log('Gerando icones do Santo Antonio ...');
const std = await compor({ maskable: false });
const msk = await compor({ maskable: true });
await salvar(std, 192, 'icon-192.png');
await salvar(std, 512, 'icon-512.png');
await salvar(msk, 512, 'icon-maskable-512.png');
await salvar(std, 180, 'apple-touch-icon.png');
await salvar(std, 64, 'favicon-32.png');
console.log('Pronto.');
