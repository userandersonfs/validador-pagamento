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

// --- NOME (prioriza QUEM PAGOU; nunca devolve o recebedor como pagador) ---
const RE_SEC_PAGOU = /\b(quem\s+pagou|quem\s+paga|pagador|dados\s+do\s+pagador|dados\s+de\s+quem\s+pagou|conta\s+de\s+origem|origem)\b/i;
const RE_SEC_RECEBEU = /\b(quem\s+recebeu|quem\s+recebe|recebedor|benefici[aá]rio|favorecido|dados\s+do\s+recebedor|destinat[aá]rio|conta\s+de\s+destino|destino)\b/i;
const RE_NOME_LABEL = /^\s*nome(?:\s+completo)?\s*[:\-]?\s*(.*)$/i;
const RE_NOME_VALIDO = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'\-]+(?:\s+[A-Za-zÀ-ÿ.'\-]+){1,5}$/;

function pareceNome(linha) {
  const l = (linha || '').trim();
  if (!RE_NOME_VALIDO.test(l)) return false;
  if (/\d/.test(l)) return false;
  if (/(banco|pix|comprovante|valor|data|hora|conta|agencia|ag[eê]ncia|cpf|cnpj|chave|institui|pagamento|transfer|identificador|transa[cç]|quem|pagou|recebeu|origem|destino|enviado|recebido)/i.test(l)) return false;
  return true;
}

// Remove grupos numericos (CNPJ / base de MEI, ex: "43 229 226 SILMARA...") e limpa.
function limparNome(s) {
  return (s || '')
    .replace(/\b\d[\d.\-/]*\b/g, ' ') // 43, 229, 226, 43.229.226/0001-71
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Validacao relaxada: usada quando o valor veio logo apos o rotulo "Nome"
// (ali confiamos que e o nome, mesmo se for razao social de MEI).
function ehNomeRelaxado(s) {
  const t = (s || '').trim();
  if (t.length < 3) return false;
  const palavras = t.split(/\s+/).filter((p) => /[A-Za-zÀ-ÿ]{2,}/.test(p));
  if (palavras.length < 2) return false;
  if (/(cpf|cnpj|institui|banco|ag[eê]ncia|conta|chave|hora|data|valor|identificador)/i.test(t)) return false;
  return true;
}

// Procura "Nome ..." entre [inicio, fim) e devolve o nome (na mesma linha ou logo abaixo).
function nomeAposLabel(linhas, inicio, fim) {
  for (let i = inicio; i < fim; i++) {
    const m = linhas[i].match(RE_NOME_LABEL);
    if (m) {
      const inline = limparNome(m[1] || '');
      if (ehNomeRelaxado(inline)) return inline;
      for (let j = i + 1; j < Math.min(i + 3, fim); j++) {
        const cand = limparNome(linhas[j]);
        if (ehNomeRelaxado(cand)) return cand;
      }
    }
  }
  return '';
}

// Primeira linha que "parece nome" no intervalo.
function primeiroNome(linhas, inicio, fim) {
  for (let i = inicio; i < fim; i++) if (pareceNome(linhas[i])) return linhas[i].trim();
  return '';
}

// Nome dentro de uma secao: tenta o rotulo "Nome", senao a 1a linha que parece nome.
function nomeNaSecao(linhas, inicio, fim) {
  const inicioLabel = Math.max(0, inicio);
  const inicioNome = Math.max(0, inicio + 1);
  return nomeAposLabel(linhas, inicioLabel, fim) || primeiroNome(linhas, inicioNome, fim);
}

function indiceSecao(linhas, re) {
  for (let i = 0; i < linhas.length; i++) if (re.test(linhas[i])) return i;
  return -1;
}

// Todos os nomes rotulados por "Nome" (com o indice da linha do rotulo).
function candidatosNome(linhas) {
  const res = [];
  for (let i = 0; i < linhas.length; i++) {
    const m = linhas[i].match(RE_NOME_LABEL);
    if (!m) continue;
    let nome = limparNome(m[1] || '');
    if (!ehNomeRelaxado(nome)) {
      for (let j = i + 1; j < Math.min(i + 3, linhas.length); j++) {
        const c = limparNome(linhas[j]);
        if (ehNomeRelaxado(c)) { nome = c; break; }
      }
    }
    if (ehNomeRelaxado(nome)) res.push({ nome, i });
  }
  return res;
}

// CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) COMPLETO (sem mascara "*").
function docCompleto(linha) {
  return /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/.test(linha) || /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/.test(linha);
}

// Nome cujo documento (no proprio bloco) esta completo = pagador (no "Pix
// enviado" o recebedor aparece mascarado com "***"). A busca vai so ate o
// proximo "Nome", pra nao pegar o documento da outra pessoa.
function nomePorDoc(linhas, cands) {
  for (let k = 0; k < cands.length; k++) {
    const ini = cands[k].i + 1;
    const fim = k + 1 < cands.length ? cands[k + 1].i : Math.min(cands[k].i + 5, linhas.length);
    for (let j = ini; j < fim; j++) {
      if (docCompleto(linhas[j])) return cands[k].nome;
    }
  }
  return '';
}

function extrairNome(linhas) {
  const iPagou = indiceSecao(linhas, RE_SEC_PAGOU);
  const iRecebeu = indiceSecao(linhas, RE_SEC_RECEBEU);

  // 1) Secao "Quem pagou" explicita: pega o Nome dela (ate a proxima secao).
  if (iPagou >= 0) {
    const fim = iRecebeu > iPagou ? iRecebeu : linhas.length;
    return nomeNaSecao(linhas, iPagou, fim); // vazio se a foto cortou o nome (melhor que errado)
  }

  const cands = candidatosNome(linhas);

  // 2) Sem o cabecalho do pagador: usa o sinal do DOCUMENTO COMPLETO (pagador).
  const porDoc = nomePorDoc(linhas, cands);
  if (porDoc) return porDoc;

  // 3) So ha cabecalho de recebedor e nenhum sinal de pagador: em branco.
  if (iRecebeu >= 0) return '';

  // 4) Sem cabecalhos: 1 nome so -> usa; varios nomes ambiguos -> em branco.
  if (cands.length === 1) return cands[0].nome;
  if (cands.length === 0) {
    for (const l of linhas) {
      const c = limparNome(l);
      if (pareceNome(c)) return c;
    }
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
