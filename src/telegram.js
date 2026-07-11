// Envio pro Telegram via Bot API. Stateless.
// 1 foto  -> sendPhoto ; 2..10 fotos -> sendMediaGroup (album), legenda na 1a.

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export function isConfigured() {
  return Boolean(TOKEN && CHAT_ID);
}

function fmtDataHora(dataISO, hora) {
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
  return linhas.join('\n').slice(0, 1024);
}

async function chamar(metodo, form) {
  const resp = await fetch(`https://api.telegram.org/bot${TOKEN}/${metodo}`, { method: 'POST', body: form });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || !json.ok) {
    throw new Error(`Telegram: ${json.description || resp.statusText || 'erro desconhecido'}`);
  }
  return json.result;
}

function blobJpg(buffer, nome) {
  return [new Blob([buffer], { type: 'image/jpeg' }), nome];
}

// Envia 1..N fotos + os campos confirmados. Lanca erro se o Telegram recusar.
export async function enviarComprovante(buffers, campos) {
  if (!isConfigured()) {
    throw new Error('Telegram nao configurado (defina TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID).');
  }
  const fotos = (Array.isArray(buffers) ? buffers : [buffers]).slice(0, 10);
  const legenda = montarLegenda(campos);

  if (fotos.length <= 1) {
    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('caption', legenda);
    form.append('photo', ...blobJpg(fotos[0], 'comprovante.jpg'));
    return chamar('sendPhoto', form);
  }

  // Album: legenda so na primeira foto
  const media = fotos.map((_, i) => ({
    type: 'photo',
    media: `attach://f${i}`,
    ...(i === 0 ? { caption: legenda } : {}),
  }));
  const form = new FormData();
  form.append('chat_id', CHAT_ID);
  form.append('media', JSON.stringify(media));
  fotos.forEach((b, i) => form.append(`f${i}`, ...blobJpg(b, `comprovante${i + 1}.jpg`)));
  return chamar('sendMediaGroup', form);
}
