// Modulo de extracao (OCR). Isolado de proposito: se um dia quiser trocar
// Tesseract por Gemini/Claude/Google Vision, mexe so aqui.
import { createWorker } from 'tesseract.js';
import { parseReceipt } from './parser.js';

const LANG = process.env.OCR_LANG || 'por';

let workerPromise = null;

// Cria (uma unica vez) e reaproveita o worker do Tesseract.
function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker(LANG).catch((err) => {
      workerPromise = null; // permite retry se a criacao falhar
      throw err;
    });
  }
  return workerPromise;
}

// Pre-aquece o OCR no boot (baixa o traineddata/wasm antes do 1o usuario).
export async function warmup() {
  try {
    await getWorker();
    console.log(`[ocr] Tesseract pronto (lang=${LANG})`);
  } catch (err) {
    console.warn('[ocr] falha ao pre-aquecer:', err.message);
  }
}

// Recebe um Buffer OU um array de Buffers (varias fotos do mesmo comprovante).
// Roda OCR em cada uma e junta o texto antes de extrair -> pega ate o que
// nao coube numa foto so (ex: o "Quem pagou" no rodape). Devolve { fields, ocrText }.
export async function extract(buffers) {
  const lista = Array.isArray(buffers) ? buffers : [buffers];
  const worker = await getWorker();
  let texto = '';
  for (const b of lista) {
    const { data: { text } } = await worker.recognize(b);
    texto += text + '\n';
  }
  return { fields: parseReceipt(texto), ocrText: texto };
}
