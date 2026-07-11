// Simula "2 fotos" (topo + rodape) do mesmo comprovante e roda OCR combinado.
import sharp from 'sharp';
import { extract } from '../src/extractor.js';

const caminho = process.argv[2];
const meta = await sharp(caminho).metadata();
const w = meta.width, h = meta.height;
console.log('imagem', w + 'x' + h);

async function recorte(top, altura) {
  const buf = await sharp(caminho).extract({ left: 0, top, width: w, height: altura }).toBuffer();
  return sharp(buf).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
}

const topo = await recorte(0, Math.round(h * 0.58));
const rodape = await recorte(Math.round(h * 0.42), h - Math.round(h * 0.42));

const { fields, ocrText } = await extract([topo, rodape]);
console.log('\n===== TEXTO OCR COMBINADO =====\n' + ocrText.trim());
console.log('\n===== CAMPOS =====\n' + JSON.stringify(fields, null, 2));
process.exit(0);
