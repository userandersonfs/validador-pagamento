import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { extract, warmup } from './extractor.js';
import { enviarComprovante, isConfigured } from './telegram.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

// --- Armazenamento temporario em memoria (entre "ler" e "enviar") ---
// Guarda a imagem tratada por um id curto; expira sozinho. Nada persiste.
const PENDENTES = new Map(); // id -> { buffer, mime, criadoEm }
const TTL_MS = 15 * 60 * 1000;

setInterval(() => {
  const agora = Date.now();
  for (const [id, item] of PENDENTES) {
    if (agora - item.criadoEm > TTL_MS) PENDENTES.delete(id);
  }
}, 60 * 1000).unref();

// Reduz/orienta a foto: bom pra OCR e pra deixar o upload leve.
async function tratarImagem(buffer) {
  return sharp(buffer)
    .rotate() // auto-orienta pelo EXIF (foto de celular vem deitada)
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
}

// --- Rotas ---

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, telegram: isConfigured() });
});

// Recebe a foto, roda OCR, devolve campos + um id pra enviar depois.
app.post('/api/extract', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma foto enviada.' });

    const tratada = await tratarImagem(req.file.buffer);

    const id = crypto.randomUUID();
    PENDENTES.set(id, { buffer: tratada, mime: 'image/jpeg', criadoEm: Date.now() });

    let fields = { data: '', hora: '', nome: '', valor: '', banco: '', e2e: '' };
    let ocrText = '';
    try {
      const r = await extract(tratada);
      fields = r.fields;
      ocrText = r.ocrText;
    } catch (err) {
      // OCR pode falhar/estar baixando dados: segue com campos vazios pra preencher na mao.
      console.warn('[extract] OCR falhou:', err.message);
    }

    res.json({ id, fields, ocrText });
  } catch (err) {
    console.error('[extract] erro:', err);
    res.status(500).json({ error: 'Falha ao processar a imagem.' });
  }
});

// Envia a foto pendente + os campos confirmados pro Telegram.
app.post('/api/send', async (req, res) => {
  try {
    const { id, ...campos } = req.body || {};
    const pendente = id && PENDENTES.get(id);
    if (!pendente) {
      return res.status(410).json({ error: 'A foto expirou ou nao foi encontrada. Tire a foto de novo.' });
    }
    if (!campos.nome || !campos.data || !campos.hora) {
      return res.status(400).json({ error: 'Nome, data e hora sao obrigatorios.' });
    }
    if (!isConfigured()) {
      return res.status(503).json({ error: 'Telegram nao configurado no servidor.' });
    }

    await enviarComprovante(pendente.buffer, pendente.mime, campos);
    PENDENTES.delete(id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[send] erro:', err);
    res.status(502).json({ error: err.message || 'Falha ao enviar pro Telegram.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor em http://localhost:${PORT}  (telegram: ${isConfigured() ? 'ok' : 'NAO configurado'})`);
  warmup(); // baixa/prepara o Tesseract em background
});
