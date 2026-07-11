// Envia um comprovante de teste real pro grupo (usa o telegram.js de producao).
import sharp from 'sharp';
import { enviarComprovante, isConfigured } from '../src/telegram.js';

console.log('telegram configurado?', isConfigured());

const svg = `<svg width="620" height="520" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <g font-family="Arial" fill="#111">
    <text x="40" y="70" font-size="30" font-weight="bold">Comprovante de Pix</text>
    <text x="40" y="150" font-size="30" font-weight="bold">R$ 150,00</text>
    <text x="40" y="230" font-size="26">11/07/2026 as 14:32</text>
    <text x="40" y="310" font-size="28">Anderson Farias Souza</text>
    <text x="40" y="390" font-size="26">Nubank</text>
  </g>
</svg>`;
const jpg = await sharp(Buffer.from(svg)).jpeg().toBuffer();

const campos = {
  data: '2026-07-11',
  hora: '14:32',
  nome: 'Anderson Farias Souza',
  valor: '150,00',
  banco: 'Nubank',
  e2e: 'E18236120202607111432TESTE',
  obs: 'TESTE do sistema - pode ignorar',
  registrante: 'Anderson',
};

const res = await enviarComprovante(jpg, 'image/jpeg', campos);
console.log('ENVIADO! message_id =', res.message_id);
process.exit(0);
