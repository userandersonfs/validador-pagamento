// Envia um comprovante de teste real (ALBUM de 2 fotos) pro grupo.
import sharp from 'sharp';
import { enviarComprovante, isConfigured } from '../src/telegram.js';

console.log('telegram configurado?', isConfigured());

function foto(titulo, cor) {
  const svg = `<svg width="620" height="420" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${cor}"/>
    <text x="40" y="80" font-size="30" font-family="Arial" font-weight="bold">${titulo}</text>
    <text x="40" y="160" font-size="26" font-family="Arial">11/07/2026 as 14:32</text>
    <text x="40" y="230" font-size="26" font-family="Arial">R$ 150,00 - Nubank</text>
    <text x="40" y="320" font-size="26" font-family="Arial">Quem pagou: Silmara de Freitas</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg().toBuffer();
}

const f1 = await foto('Comprovante (topo) - TESTE', '#eef3ff');
const f2 = await foto('Comprovante (rodape) - TESTE', '#fff6ee');

const campos = {
  data: '2026-07-11', hora: '14:32', nome: 'Silmara de Freitas',
  valor: '150,00', banco: 'Nubank', e2e: 'E1823612...TESTE',
  obs: 'TESTE album 2 fotos - pode ignorar', registrante: 'Anderson',
};

const res = await enviarComprovante([f1, f2], campos);
console.log('ENVIADO! itens no album =', Array.isArray(res) ? res.length : 1);
process.exit(0);
