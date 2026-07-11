'use strict';

const $ = (id) => document.getElementById(id);
const telas = ['telaQuem', 'telaCaptura', 'telaLendo', 'telaConferir', 'telaOk'];
const MAX_FOTOS = 5;
let fotos = [];         // File[] do comprovante atual
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
  renderFotos();
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

// --- Captura de multiplas fotos ---
function renderFotos() {
  const cont = $('fotos');
  cont.innerHTML = '';
  fotos.forEach((f, i) => {
    const item = document.createElement('div');
    item.className = 'foto-item';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(f);
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'foto-rm';
    rm.textContent = '✕';
    rm.setAttribute('aria-label', 'Remover foto');
    rm.addEventListener('click', () => { fotos.splice(i, 1); renderFotos(); });
    item.appendChild(img);
    item.appendChild(rm);
    cont.appendChild(item);
  });
  if (fotos.length < MAX_FOTOS) {
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'foto-add';
    add.innerHTML = `<span class="foto-add-ico">📸</span><span>Foto ${fotos.length + 1}</span>`;
    add.addEventListener('click', () => $('foto').click());
    cont.appendChild(add);
  }
  $('btnLer').disabled = fotos.length === 0;
  $('btnLer').textContent = fotos.length ? `Ler comprovante (${fotos.length})` : 'Ler comprovante';
}

$('foto').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  e.target.value = ''; // permite bater a proxima foto
  if (f) { fotos.push(f); renderFotos(); }
});

$('btnLer').addEventListener('click', async () => {
  if (!fotos.length) return;
  $('preview').src = URL.createObjectURL(fotos[0]);
  mostrar('telaLendo');
  try {
    const fd = new FormData();
    fotos.forEach((f) => fd.append('photos', f));
    const resp = await fetch('/api/extract', { method: 'POST', body: fd });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Falha ao ler as fotos.');

    idPendente = data.id;
    preencher(data.fields || {});
    $('fotoCount').textContent = fotos.length > 1 ? `📎 ${fotos.length} fotos anexadas` : '📎 1 foto anexada';
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

function limparFotos() { fotos = []; idPendente = null; renderFotos(); }

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
    limparFotos();
    mostrar('telaOk');
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar';
  }
});

$('btnCancelar').addEventListener('click', () => { limparFotos(); mostrar('telaCaptura'); });
$('btnNovo').addEventListener('click', () => { limparFotos(); mostrar('telaCaptura'); });

// --- PWA: service worker + instalacao ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

const ehIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const jaInstalado = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const dispensou = localStorage.getItem('instalar_dispensado') === '1';
let promptInstalar = null;

function mostrarBanner() {
  if (jaInstalado || dispensou) return;
  $('instalarBanner').hidden = false;
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  promptInstalar = e;
  $('btnInstalar').hidden = false;
  $('instalarTxt').textContent = '📲 Instale na tela inicial pra usar como app.';
  mostrarBanner();
});

$('btnInstalar').addEventListener('click', async () => {
  if (!promptInstalar) return;
  promptInstalar.prompt();
  await promptInstalar.userChoice;
  promptInstalar = null;
  $('instalarBanner').hidden = true;
});

$('fecharInstalar').addEventListener('click', () => {
  $('instalarBanner').hidden = true;
  localStorage.setItem('instalar_dispensado', '1');
});

window.addEventListener('appinstalled', () => { $('instalarBanner').hidden = true; });

if (ehIOS && !jaInstalado) {
  $('btnInstalar').hidden = true;
  $('instalarTxt').innerHTML = '📲 Pra instalar: toque em <b>Compartilhar</b> ⬆️ e depois <b>Adicionar à Tela de Início</b>.';
  mostrarBanner();
}

iniciar();
