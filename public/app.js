'use strict';

const $ = (id) => document.getElementById(id);
const telas = ['telaQuem', 'telaCaptura', 'telaLendo', 'telaConferir', 'telaLista', 'telaOk'];
const MAX_FOTOS = 5;

let fotos = [];        // File[] da captura atual
let lista = [];        // comprovantes prontos p/ enviar: {id, campos, thumb, count}
let idPendente = null; // id do comprovante em conferencia
let editIndex = -1;    // -1 = novo; >=0 = editando item da lista
let currentThumb = null;
let currentCount = 0;

function mostrar(tela) {
  for (const t of telas) $(t).hidden = t !== tela;
}

function toast(msg, ok = false) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.toggle('ok', ok);
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 4000);
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
  renderLista();
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

// --- Captura de multiplas fotos (do comprovante atual) ---
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
  e.target.value = '';
  if (f) { fotos.push(f); renderFotos(); }
});

$('btnLer').addEventListener('click', async () => {
  if (!fotos.length) return;
  currentThumb = URL.createObjectURL(fotos[0]);
  currentCount = fotos.length;
  $('preview').src = currentThumb;
  mostrar('telaLendo');
  try {
    const fd = new FormData();
    fotos.forEach((f) => fd.append('photos', f));
    const resp = await fetch('/api/extract', { method: 'POST', body: fd });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Falha ao ler as fotos.');

    idPendente = data.id;
    editIndex = -1;
    preencherCampos(data.fields || {});
    $('fotoCount').textContent = fotoCountTxt(currentCount);
    $('btnAdicionar').textContent = 'Adicionar';
    mostrar('telaConferir');
  } catch (err) {
    toast(err.message);
    mostrar('telaCaptura');
  }
});

$('btnVerLista').addEventListener('click', () => mostrar('telaLista'));

function fotoCountTxt(n) { return n > 1 ? `📎 ${n} fotos anexadas` : '📎 1 foto anexada'; }

function preencherCampos(f) {
  $('cData').value = f.data || '';
  $('cHora').value = f.hora || '';
  $('cNome').value = f.nome || '';
  $('cValor').value = f.valor || '';
  $('cBanco').value = f.banco || '';
  $('cE2e').value = f.e2e || '';
  $('cObs').value = f.obs || '';
}

function coletarCampos() {
  return {
    data: $('cData').value,
    hora: $('cHora').value,
    nome: $('cNome').value.trim(),
    valor: $('cValor').value.trim(),
    banco: $('cBanco').value.trim(),
    e2e: $('cE2e').value.trim(),
    obs: $('cObs').value.trim(),
    registrante: getQuem(),
  };
}

// --- Conferir -> adiciona (ou salva) na lista ---
$('formConferir').addEventListener('submit', (e) => {
  e.preventDefault();
  const campos = coletarCampos();
  if (!campos.nome || !campos.data || !campos.hora) return toast('Preencha nome, data e hora.');

  const item = { id: idPendente, campos, thumb: currentThumb, count: currentCount };
  if (editIndex >= 0) lista[editIndex] = item;
  else lista.push(item);

  editIndex = -1;
  fotos = [];
  renderFotos();
  renderLista();
  mostrar('telaLista');
});

$('btnCancelar').addEventListener('click', () => {
  const voltaLista = editIndex >= 0 || lista.length > 0;
  editIndex = -1;
  fotos = [];
  renderFotos();
  mostrar(voltaLista ? 'telaLista' : 'telaCaptura');
});

// --- Lista de comprovantes ---
function renderLista() {
  const cont = $('listaItens');
  cont.innerHTML = '';
  lista.forEach((it, idx) => {
    const card = document.createElement('div');
    card.className = 'lista-item';
    const img = document.createElement('img');
    img.className = 'lista-thumb';
    img.src = it.thumb || '/icons/icon-192.png';
    const info = document.createElement('div');
    info.className = 'lista-info';
    const dataBR = it.campos.data ? it.campos.data.split('-').reverse().join('/') : '';
    const nome = document.createElement('strong');
    nome.textContent = it.campos.nome || '(sem nome)';
    const linha = document.createElement('span');
    linha.textContent = `${dataBR} ${it.campos.hora || ''} · ${it.campos.valor ? 'R$ ' + it.campos.valor : '—'}`;
    const meta = document.createElement('span');
    meta.className = 'lista-meta';
    meta.textContent = `📎 ${it.count} foto(s)`;
    info.append(nome, linha, meta);
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'lista-rm';
    rm.textContent = '🗑️';
    rm.setAttribute('aria-label', 'Remover');
    rm.addEventListener('click', (ev) => {
      ev.stopPropagation();
      lista.splice(idx, 1);
      renderLista();
      if (!lista.length) { fotos = []; renderFotos(); mostrar('telaCaptura'); }
    });
    card.addEventListener('click', () => editarItem(idx));
    card.append(img, info, rm);
    cont.appendChild(card);
  });
  $('btnEnviarTodos').textContent = `Enviar todos (${lista.length})`;
  $('btnVerLista').textContent = `Ver comprovantes (${lista.length})`;
  $('btnVerLista').hidden = lista.length === 0;
}

function editarItem(idx) {
  const it = lista[idx];
  idPendente = it.id;
  currentThumb = it.thumb;
  currentCount = it.count;
  editIndex = idx;
  $('preview').src = it.thumb || '/icons/icon-192.png';
  $('fotoCount').textContent = fotoCountTxt(it.count);
  preencherCampos(it.campos);
  $('btnAdicionar').textContent = 'Salvar';
  mostrar('telaConferir');
}

$('btnAddOutro').addEventListener('click', () => {
  editIndex = -1;
  fotos = [];
  renderFotos();
  mostrar('telaCaptura');
});

// --- Enviar todos ---
$('btnEnviarTodos').addEventListener('click', async () => {
  if (!lista.length) return;
  const btn = $('btnEnviarTodos');
  btn.disabled = true;
  btn.textContent = 'Enviando…';
  const falhas = [];
  for (const it of lista) {
    try {
      const resp = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: it.id, ...it.campos }),
      });
      const d = await resp.json();
      if (!resp.ok) throw new Error(d.error || 'falha');
    } catch (_) {
      falhas.push(it);
    }
  }
  btn.disabled = false;
  const enviados = lista.length - falhas.length;
  if (falhas.length === 0) {
    lista = [];
    renderLista();
    $('okTitulo').textContent = enviados > 1 ? `${enviados} comprovantes enviados!` : 'Enviado!';
    mostrar('telaOk');
  } else {
    lista = falhas;
    renderLista();
    btn.textContent = `Enviar todos (${lista.length})`;
    toast(`${enviados} enviado(s), ${falhas.length} falhou(aram). Tente de novo.`);
  }
});

$('btnNovo').addEventListener('click', () => {
  fotos = [];
  renderFotos();
  mostrar('telaCaptura');
});

// --- PWA: service worker (com auto-atualizacao) + instalacao ---
if ('serviceWorker' in navigator) {
  let recarregou = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recarregou) return;
    recarregou = true;
    location.reload(); // nova versao assumiu -> recarrega pra pegar os arquivos novos
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((r) => r.update()).catch(() => {});
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
