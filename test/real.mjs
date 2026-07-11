// OCR + parser num arquivo real. Uso: node test/real.mjs "caminho/da/foto.jpg"
import sharp from 'sharp';
import { extract } from '../src/extractor.js';

const caminho = process.argv[2];
if (!caminho) { console.error('informe o caminho da imagem'); process.exit(1); }

const tratada = await sharp(caminho)
  .rotate()
  .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 82 })
  .toBuffer();

const { fields, ocrText } = await extract(tratada);
console.log('===== TEXTO OCR =====\n' + ocrText.trim());
console.log('\n===== CAMPOS =====');
console.log(JSON.stringify(fields, null, 2));
process.exit(0);
