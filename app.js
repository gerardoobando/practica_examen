const API_BASE = "https://censopoblacion.azurewebsites.net/API/indicadores/2/"; // 2 = El Progreso

const selMunicipio = document.getElementById('selMunicipio');
const txtFiltro     = document.getElementById('txtFiltro');
const btnCargar     = document.getElementById('btnCargar');
const btnDescargar  = document.getElementById('btnDescargar');
const tbody         = document.getElementById('tbody');
const lblTotal      = document.getElementById('lblTotal');
const cards         = document.getElementById('cards');
const highlights    = document.getElementById('highlights');

let currentJSON = {};

// Utilidad: mostrar toast
const showToast = (msg = 'Listo') => {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 1600);
}

async function fetchData() {
  const code = selMunicipio.value;
  const url = API_BASE + code;
  tbody.innerHTML = `<tr><td class='px-3 py-2 text-slate-500' colspan='2'>Cargando…</td></tr>`;
  cards.innerHTML = ""; highlights.innerHTML = "";
  try {
    const resp = await fetch(url, {cache:'no-store'});
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    // La API responde un objeto JSON. Si viniera como string JSON, lo parseamos.
    let data = await resp.json();
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { /* ignore */ }
    }
    currentJSON = data || {};
    renderAll();
  } catch (err) {
    tbody.innerHTML = `<tr><td class='px-3 py-2 text-red-600' colspan='2'>Error al cargar: ${err.message}</td></tr>`;
  }
}

function renderAll(){
  renderTable();
  renderKnownCards();
  renderHighlights();
}

function renderTable(){
  const q = (txtFiltro?.value || '').trim().toLowerCase();
  const rows = Object.entries(currentJSON)
    .filter(([k,v]) => !q || k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q))
    .sort(([a],[b]) => a.localeCompare(b));
  lblTotal.textContent = `${rows.length} ítems`;
  tbody.innerHTML = rows.map(([k,v]) => `
    <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
      <td class="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">${esc(k)}</td>
      <td class="px-3 py-2 text-slate-700 dark:text-slate-300">${formatValue(v)}</td>
    </tr>
  `).join('');
}

// Tarjetas a partir de las claves exactas del JSON de ejemplo enviado por el usuario
function renderKnownCards(){
  const J = currentJSON;
  cards.innerHTML = '';

  // 1) Población por sexo
  if (J.total_sexo_hombre != null && J.total_sexo_mujeres != null){
    const H = num(J.total_sexo_hombre), M = num(J.total_sexo_mujeres);
    const total = H + M;
    cards.appendChild(card('Población por sexo', `
      <div class="space-y-3">
        ${bar(`Hombres (${fmt(H)})`, pct(H,total))}
        ${bar(`Mujeres (${fmt(M)})`, pct(M,total))}
        <p class="text-xs text-slate-500">Índice de masculinidad: ${formatValue(J.indice_masculinidad)} (H/100M)</p>
      </div>
    `));
  }

  // 2) Población por área
  if (J.total_sector_urbano != null && J.total_sector_rural != null){
    const U = num(J.total_sector_urbano), R = num(J.total_sector_rural);
    const total = U + R;
    cards.appendChild(card('Población por área', `
      <div class="space-y-3">
        ${bar(`Urbana (${fmt(U)})`, pct(U,total))}
        ${bar(`Rural (${fmt(R)})`, pct(R,total))}
      </div>
    `));
  }

  // 3) Población por grandes grupos de edad
  if (J.pob_edad_014 != null || J.pob_edad_1564 != null || J.pob_edad_65 != null){
    const E0 = num(J.pob_edad_014), E1 = num(J.pob_edad_1564), E2 = num(J.pob_edad_65);
    const total = E0 + E1 + E2;
    cards.appendChild(card('Población por grandes grupos de edad', `
      <div class="space-y-3">
        ${bar(`0–14 (${fmt(E0)})`, pct(E0,total))}
        ${bar(`15–64 (${fmt(E1)})`, pct(E1,total))}
        ${bar(`65+ (${fmt(E2)})`, pct(E2,total))}
      </div>
    `));
  }

  // 4) Población por pueblos
  const pueblos = [
    ['pob_pueblo_maya','Maya'],
    ['pob_pueblo_garifuna','Garífuna'],
    ['pob_pueblo_xinca','Xinca'],
    ['pob_pueblo_afrodescendiente','Afrodescendiente/Creole'],
    ['pob_pueblo_ladino','Ladino'],
    ['pob_pueblo_extranjero','Extranjero']
  ].filter(([k]) => currentJSON[k] != null);

  if (pueblos.length){
    const total = pueblos.reduce((s,[k]) => s + num(currentJSON[k]), 0);
    const html = pueblos.map(([k,label]) => bar(`${label} (${fmt(num(currentJSON[k]))})`, pct(num(currentJSON[k]), total))).join('');
    cards.appendChild(card('Población por pueblos', `<div class='space-y-3'>${html}</div>`));
  }
}

function renderHighlights(){
  const J = currentJSON;
  const list = [
    ['nombre', 'Lugar'],
    ['pob_total', 'Población total'],
    ['viviendas_part', 'Viviendas particulares'],
    ['total_hogares', 'Total hogares'],
    ['prom_personas_hogar', 'Personas por hogar'],
    ['anios_prom_estudio', 'Años prom. estudio'],
    ['edad_promedio', 'Edad promedio']
  ];
  const found = list.filter(([k]) => J[k] != null).slice(0,4);
  highlights.innerHTML = found.map(([k,label]) => `
    <div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
      <p class="text-xs uppercase tracking-wide text-slate-500">${label}</p>
      <p class="mt-1 text-2xl font-semibold">${formatValue(J[k])}</p>
    </div>
  `).join('');
}

// Helpers UI
function card(title, html){
  const el = document.createElement('article');
  el.className = "rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm";
  el.innerHTML = `<h3 class="text-base font-semibold mb-3">${title}</h3>${html}`;
  return el;
}
function bar(label, pct){
  return `<div>
    <div class="flex items-center justify-between text-sm mb-1">
      <span class="font-medium">${label}</span>
      <span class="tabular-nums">${pct.toFixed(1)}%</span>
    </div>
    <div class="w-full bg-slate-200 dark:bg-slate-700" style="height:10px;border-radius:9999px">
      <div style="height:10px;border-radius:9999px;width:${Math.max(0, Math.min(100, pct))}%;background:#4f46e5"></div>
    </div>
  </div>`;
}

// Utils
function esc(s){ return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])) }
function fmt(n){ const x = Number(n); return isFinite(x) ? x.toLocaleString('es-GT') : esc(n) }
function pct(n, d){ return (!d || !isFinite(n/d)) ? 0 : (n*100/d) }
function num(n){ const x = Number(n); return isFinite(x) ? x : 0 }
function formatValue(v){
  if (typeof v === 'number') return fmt(v);
  if (typeof v === 'string' && /^\d+(?:\.\d+)?$/.test(v)) return fmt(Number(v));
  return esc(v);
}

// Eventos
btnCargar?.addEventListener('click', fetchData);
selMunicipio?.addEventListener('change', fetchData);
txtFiltro?.addEventListener('input', renderTable);
btnDescargar?.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(currentJSON, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `censo_el_progreso_${selMunicipio.value}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('btnShare')?.addEventListener('click', async () => {
  const url = new URL(location.href);
  url.searchParams.set('m', selMunicipio.value);
  try{
    await navigator.clipboard.writeText(url.toString());
    showToast('Enlace copiado');
  }catch{ showToast('No se pudo copiar'); }
});

// Deep-link (?m=201)
(function init(){
  const url = new URL(location.href);
  const m = url.searchParams.get('m');
  if (m && document.querySelector(`#selMunicipio option[value="${m}"]`)) {
    selMunicipio.value = m;
  }
  fetchData();
})();
