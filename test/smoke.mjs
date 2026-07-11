// Teste de fumaca: gera um "comprovante" sintetico e roda OCR + parser.
import sharp from 'sharp';
import { parseReceipt } from '../src/parser.js';
import { extract } from '../src/extractor.js';

const svg = `
<svg width="620" height="720" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <g font-family="Arial, sans-serif" fill="#111">
    <text x="40" y="70" font-size="30" font-weight="bold">Comprovante de Pix</text>
    <text x="40" y="150" font-size="24">Valor</text>
    <text x="40" y="185" font-size="30" font-weight="bold">R$ 150,00</text>
    <text x="40" y="260" font-size="24">Data do pagamento</text>
    <text x="40" y="295" font-size="28">11/07/2026 as 14:32</text>
    <text x="40" y="380" font-size="24">Pagador</text>
    <text x="40" y="415" font-size="28">Anderson Farias Souza</text>
    <text x="40" y="480" font-size="24">Instituicao</text>
    <text x="40" y="515" font-size="28">Nubank</text>
    <text x="40" y="590" font-size="22">ID da transacao</text>
    <text x="40" y="620" font-size="20">E18236120202607111432abcdef1234567</text>
  </g>
</svg>`;

const img = await sharp(Buffer.from(svg)).png().toBuffer();

console.log('Rodando OCR (pode baixar o pacote "por" na 1a vez)...');
const { fields, ocrText } = await extract(img);

console.log('\n--- TEXTO OCR ---\n' + ocrText.trim());
console.log('\n--- CAMPOS EXTRAIDOS ---');
console.log(JSON.stringify(fields, null, 2));

// checagem rapida
const okData = fields.data === '2026-07-11';
const okHora = fields.hora === '14:32';
const okValor = fields.valor === '150,00';
const okBanco = /nubank/i.test(fields.banco);
const okNome = /anderson/i.test(fields.nome);
console.log('\n--- CHECAGEM ---');
console.log({ okData, okHora, okValor, okBanco, okNome });

process.exit(0);
