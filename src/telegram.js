// Envio pro Telegram via Bot API. Stateless: manda a foto + legenda formatada.

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export function isConfigured() {
  return Boolean(TOKEN && CHAT_ID);
}

function fmtDataHora(dataISO, hora) {
  // dataISO = yyyy-mm-dd  ->  dd/mm/yyyy
  let data = dataISO || '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataISO || '');
  if (m) data = `${m[3]}/${m[2]}/${m[1]}`;
  return [data, hora].filter(Boolean).join(' ');
}

function agoraSaoPaulo() {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date());
}

function montarLegenda(campos) {
  const linhas = ['🧾 Comprovante PIX', ''];
  const dh = fmtDataHora(campos.data, campos.hora);
  if (dh) linhas.push(`📅 Data/hora: ${dh}`);
  if (campos.nome) linhas.push(`👤 Nome: ${campos.nome}`);
  if (campos.valor) linhas.push(`💰 Valor: R$ ${campos.valor}`);
  if (campos.banco) linhas.push(`🏦 Banco: ${campos.banco}`);
  if (campos.e2e) linhas.push(`🔖 ID: ${campos.e2e}`);
  if (campos.obs) linhas.push(`📝 Obs: ${campos.obs}`);
  linhas.push('');
  linhas.push(`Registrado por: ${campos.registrante || '—'} • ${agoraSaoPaulo()}`);
  // Telegram: legenda de foto tem limite de 1024 caracteres.
  return linhas.join('\n').slice(0, 1024);
}

// Envia a foto (Buffer) + legenda. Lanca erro se o Telegram recusar.
export async function enviarComprovante(imageBuffer, mime, campos) {
  if (!isConfigured()) {
    throw new Error('Telegram nao configurado (defina TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID).');
  }
  const form = new FormData();
  form.append('chat_id', CHAT_ID);
  form.append('caption', montarLegenda(campos));
  const ext = mime === 'image/png' ? 'png' : 'jpg';
  form.append('photo', new Blob([imageBuffer], { type: mime || 'image/jpeg' }), `comprovante.${ext}`);

  const resp = await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, {
    method: 'POST',
    body: form,
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || !json.ok) {
    throw new Error(`Telegram: ${json.description || resp.statusText || 'erro desconhecido'}`);
  }
  return json.result;
}
