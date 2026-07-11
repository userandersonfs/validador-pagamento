// Extrai campos de um comprovante PIX a partir do texto cru do OCR.
// Tudo aqui e "melhor esforco": o que nao vier confiante, o usuario corrige na tela.

const MESES = {
  jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
  jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
};

// Lista de bancos / instituicoes de pagamento comuns no Brasil (PIX).
const BANCOS = [
  'Nubank', 'Nu Pagamentos', 'Itau', 'Itaú', 'Bradesco', 'Banco do Brasil',
  'Caixa', 'Santander', 'Banco Inter', 'Inter', 'C6 Bank', 'C6', 'PicPay',
  'Mercado Pago', 'PagBank', 'PagSeguro', 'Sicoob', 'Sicredi', 'BTG',
  'Will Bank', 'Neon', 'Banco Original', 'Original', 'Next', 'Ame Digital',
  'Banrisul', 'Safra', 'BMG', 'Pan', 'Digio', 'Stone', 'Cora', 'Efi', 'Gerencianet',
];

function normalizar(texto) {
  return (texto || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

// --- DATA (retorna yyyy-mm-dd, formato do <input type="date">) ---
function extrairData(texto) {
  // dd/mm/yyyy  ou  dd-mm-yyyy  ou dd.mm.yyyy
  let m = texto.match(/\b(\d{2})[\/.\-](\d{2})[\/.\-](\d{4})\b/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  // yyyy-mm-dd (ISO)
  m = texto.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // "11 de julho de 2026"
  m = texto.match(/\b(\d{1,2})\s+de\s+([a-zç]+)\.?\s+de\s+(\d{4})/i);
  if (m) {
    const mes = MESES[m[2].slice(0, 3).toLowerCase()];
    if (mes) {
      const dia = m[1].padStart(2, '0');
      return `${m[3]}-${mes}-${dia}`;
    }
  }
  return '';
}

// --- HORA (retorna HH:mm, formato do <input type="time">) ---
function extrairHora(texto) {
  // Prioriza hora perto de "hora"/"às"
  let m = texto.match(/(?:hora|às|as)\D{0,6}(\d{1,2})[:hH](\d{2})/i);
  if (!m) m = texto.match(/\b(\d{1,2})[:hH](\d{2})(?::\d{2})?\b/);
  if (m) {
    const h = m[1].padStart(2, '0');
    if (Number(h) <= 23 && Number(m[2]) <= 59) return `${h}:${m[2]}`;
  }
  return '';
}

// --- VALOR (retorna string "1.234,56") ---
function extrairValor(texto) {
  const m = texto.match(/R\$\s*([\d.]{1,12},\d{2})/);
  if (m) return m[1];
  // fallback: qualquer numero no formato brasileiro com centavos
  const m2 = texto.match(/\b(\d{1,3}(?:\.\d{3})*,\d{2})\b/);
  return m2 ? m2[1] : '';
}

// --- ID / E2E da transacao ---
function extrairE2E(texto) {
  // EndToEndId: "E" + 31 alfanumericos (32 no total)
  const m = texto.match(/\bE[0-9A-Za-z]{31}\b/);
  if (m) return m[0];
  // fallback: linha rotulada
  const m2 = texto.match(/(?:ID|autentica[cç][aã]o|transa[cç][aã]o|controle)[:\s]+([A-Za-z0-9.\-]{10,})/i);
  return m2 ? m2[1] : '';
}

// --- BANCO ---
function extrairBanco(texto) {
  for (const banco of BANCOS) {
    const re = new RegExp(`\\b${banco.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(texto)) return banco;
  }
  return '';
}

// --- NOME (do pagador / origem, com heuristica) ---
const RE_ROTULO_NOME = /^(nome(?:\s+completo)?|pagador|origem|de|quem pagou|remetente)\s*[:\-]?\s*(.*)$/i;
const RE_NOME_VALIDO = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'\-]+(?:\s+[A-Za-zÀ-ÿ.'\-]+){1,5}$/;

function pareceNome(linha) {
  if (!RE_NOME_VALIDO.test(linha)) return false;
  if (/\d/.test(linha)) return false;
  if (/(banco|pix|comprovante|valor|data|hora|conta|agencia|ag[eê]ncia|cpf|cnpj|chave|institui|pagamento|transfer)/i.test(linha)) return false;
  return true;
}

function extrairNome(linhas) {
  for (let i = 0; i < linhas.length; i++) {
    const m = linhas[i].match(RE_ROTULO_NOME);
    if (m) {
      const inline = (m[2] || '').trim();
      if (inline && pareceNome(inline)) return inline;
      // pega a proxima linha nao vazia que pareca nome
      for (let j = i + 1; j < Math.min(i + 3, linhas.length); j++) {
        if (pareceNome(linhas[j])) return linhas[j];
      }
    }
  }
  // ultimo recurso: primeira linha "que parece nome" no texto
  for (const l of linhas) {
    if (pareceNome(l)) return l;
  }
  return '';
}

export function parseReceipt(texto) {
  const linhas = normalizar(texto);
  const flat = linhas.join('\n');
  return {
    data: extrairData(flat),
    hora: extrairHora(flat),
    nome: extrairNome(linhas),
    valor: extrairValor(flat),
    banco: extrairBanco(flat),
    e2e: extrairE2E(flat),
  };
}
