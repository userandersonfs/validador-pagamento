// Testa a PRODUCAO: manda 2 recortes SEM cabecalho (reproduz o caso real)
// pro /api/extract e mostra o nome que a producao extrai.
import sharp from 'sharp';

const URL = 'https://validador-pagamento.fly.dev/api/extract';
const caminho = process.argv[2];

const m = await sharp(caminho).metadata();
const h = m.height, w = m.width;

async function recorte(top, altura) {
  const buf = await sharp(caminho).extract({ left: 0, top, width: w, height: altura }).toBuffer();
  return sharp(buf).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
}

// Blocos SEM os cabecalhos "Quem recebeu"/"Quem pagou":
const bloco1 = await recorte(Math.round(h * 0.615), Math.round(h * 0.12)); // Marlon + CPF mascarado
const bloco2 = await recorte(Math.round(h * 0.835), Math.round(h * 0.145)); // SILMARA + CNPJ completo

const fd = new FormData();
fd.append('photos', new Blob([bloco1], { type: 'image/jpeg' }), 'a.jpg');
fd.append('photos', new Blob([bloco2], { type: 'image/jpeg' }), 'b.jpg');

const r = await fetch(URL, { method: 'POST', body: fd });
const data = await r.json();
console.log('===== OCR (producao) =====\n' + (data.ocrText || '').trim());
console.log('\n===== CAMPOS (producao) =====');
console.log('fotos:', data.fotos);
console.log('nome :', JSON.stringify(data.fields?.nome));
console.log('data :', data.fields?.data, '| hora:', data.fields?.hora, '| valor:', data.fields?.valor);
process.exit(0);
