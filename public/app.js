'use strict';

const $ = (id) => document.getElementById(id);
const telas = ['telaQuem', 'telaCaptura', 'telaLendo', 'telaConferir', 'telaOk'];
let idPendente = null;

function mostrar(tela) {
  for (const t of telas) $(t).hidden = t !== tela;
}

function toast(msg, ok = false) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.toggle('ok', ok);
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 3500);
}

// --- Identificacao (localStorage) ---
function getQuem() { return localStorage.getItem('registrante') || ''; }
function setQuem(nome) {
  localStorage.setItem('registrante', nome);
  $('quemNome').textContent = '👤 ' + nome;
  $('quemBox').hidden = false;
}

function iniciar() {
  const quem = getQuem();
  if (quem) { setQuem(quem); mostrar('telaCaptura'); }
  else { mostrar('telaQuem'); }
}

$('salvarQuem').addEventListener('click', () => {
  const nome = $('inputQuem').value.trim();
  if (nome.length < 2) return toast('Digite seu nome.');
  setQuem(nome);
  mostrar('telaCaptura');
});
$('inputQuem').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('salvarQuem').click(); });

$('trocarQuem').addEventListener('click', () => {
  $('inputQuem').value = getQuem();
  mostrar('telaQuem');
});

// --- Captura + OCR ---
$('foto').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = ''; // permite re-selecionar a mesma foto
  if (!file) return;

  $('preview').src = URL.createObjectURL(file);
  mostrar('telaLendo');

  try {
    const fd = new FormData();
    fd.append('photo', file);
    const resp = await fetch('/api/extract', { method: 'POST', body: fd });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Falha ao ler a foto.');

    idPendente = data.id;
    preencher(data.fields || {});
    mostrar('telaConferir');
  } catch (err) {
    toast(err.message);
    mostrar('telaCaptura');
  }
});

function preencher(f) {
  $('cData').value = f.data || '';
  $('cHora').value = f.hora || '';
  $('cNome').value = f.nome || '';
  $('cValor').value = f.valor || '';
  $('cBanco').value = f.banco || '';
  $('cE2e').value = f.e2e || '';
  $('cObs').value = '';
}

// --- Enviar ---
$('formConferir').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('btnEnviar');
  const campos = {
    id: idPendente,
    data: $('cData').value,
    hora: $('cHora').value,
    nome: $('cNome').value.trim(),
    valor: $('cValor').value.trim(),
    banco: $('cBanco').value.trim(),
    e2e: $('cE2e').value.trim(),
    obs: $('cObs').value.trim(),
    registrante: getQuem(),
  };
  if (!campos.nome || !campos.data || !campos.hora) return toast('Preencha nome, data e hora.');

  btn.disabled = true;
  btn.textContent = 'Enviando…';
  try {
    const resp = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campos),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Falha ao enviar.');
    idPendente = null;
    mostrar('telaOk');
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar pro Telegram';
  }
});

$('btnCancelar').addEventListener('click', () => { idPendente = null; mostrar('telaCaptura'); });
$('btnNovo').addEventListener('click', () => mostrar('telaCaptura'));

iniciar();
