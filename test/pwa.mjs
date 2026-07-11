// Confere se todos os assets do PWA/visual sao servidos (status 200).
process.env.PORT = process.env.PORT || '3200';
await import('../src/server.js');
await new Promise((r) => setTimeout(r, 600));
const base = `http://localhost:${process.env.PORT}`;

const rotas = [
  '/', '/styles.css', '/app.js', '/manifest.webmanifest', '/sw.js',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png', '/icons/favicon-32.png', '/img/ofarias.png',
];

let falhas = 0;
for (const r of rotas) {
  try {
    const resp = await fetch(base + r);
    const ct = resp.headers.get('content-type') || '';
    const ok = resp.status === 200;
    if (!ok) falhas++;
    console.log(`${ok ? 'OK ' : 'ERRO'} ${resp.status}  ${r}  (${ct})`);
  } catch (e) {
    falhas++;
    console.log(`ERRO --  ${r}  (${e.message})`);
  }
}

// Confere que o HTML referencia o manifest e a logo
const html = await fetch(base + '/').then((r) => r.text());
console.log('\nHTML tem manifest:', html.includes('manifest.webmanifest'));
console.log('HTML tem apple-touch-icon:', html.includes('apple-touch-icon'));
console.log('HTML tem logo ofarias:', html.includes('/img/ofarias.png'));
console.log('HTML tem "Comunidade Santo Antônio":', html.includes('Comunidade Santo Antônio'));
console.log('\n' + (falhas === 0 ? 'TUDO OK ✓' : `${falhas} FALHA(S)`));
process.exit(falhas === 0 ? 0 : 1);
