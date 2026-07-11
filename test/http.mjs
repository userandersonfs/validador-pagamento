// Sobe o server no mesmo processo e bate nos endpoints via fetch.
import sharp from 'sharp';

process.env.PORT = process.env.PORT || '3100';
await import('../src/server.js'); // dispara app.listen()
await new Promise((r) => setTimeout(r, 800));

const base = `http://localhost:${process.env.PORT}`;

// health
const h = await fetch(base + '/api/health').then((r) => r.json());
console.log('health:', h);

// gera imagem e chama /api/extract
const svg = `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <text x="30" y="80" font-size="26" font-family="Arial">Data do pagamento</text>
  <text x="30" y="120" font-size="30" font-family="Arial">05/03/2026 as 09:07</text>
  <text x="30" y="200" font-size="26" font-family="Arial">Pagador</text>
  <text x="30" y="240" font-size="30" font-family="Arial">Maria Aparecida Lima</text>
  <text x="30" y="320" font-size="30" font-family="Arial">R$ 50,00 - PicPay</text>
</svg>`;
const png = await sharp(Buffer.from(svg)).png().toBuffer();

const fd = new FormData();
fd.append('photo', new Blob([png], { type: 'image/png' }), 'c.png');
const ex = await fetch(base + '/api/extract', { method: 'POST', body: fd }).then((r) => r.json());
console.log('extract.id:', ex.id ? 'ok' : 'FALTOU');
console.log('extract.fields:', JSON.stringify(ex.fields));

// /api/send sem telegram configurado -> deve dar 503 controlado
const snd = await fetch(base + '/api/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: ex.id, nome: 'X', data: '2026-03-05', hora: '09:07' }),
});
console.log('send status (esperado 503 sem telegram):', snd.status, await snd.json());

process.exit(0);
