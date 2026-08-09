// shell.mjs — die sichtbaren Suite-Komponenten. Framework-frei, geben HTML-Strings zurück.
// suiteTopbar ist SELBST-ENTHALTEN (Inline-Styles), passt ohne CSS-Import in jedes Studio.
// systemSection nutzt die baseCss-Klassen (für Studios, die das Fundament adoptieren).
import { MODULES, TOKENS, sichtbarkeitScript } from './tokens.mjs';
import { wordmarkSvg } from './logo.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const T = TOKENS;
const FONT = "'Figtree',system-ui,-apple-system,'Segoe UI',sans-serif";
const STILL = '#C7C9C2';
const dotBg = (s) => (s === 'ok' ? T.ok : s === 'warn' ? T.warn : s === 'fail' ? T.fail : STILL);

// Persistente, selbst-enthaltene Suite-Topbar mit Modul-Switcher + Live-Status.
// Drop-in: ${suiteTopbar({ active, statusUrl })} ganz oben in den <body> jedes Studios.
//   active   : key des aktiven Moduls ('brain'|'crm'|'sales'|'finance'|'marketing')
//   statusUrl: URL von /business/api/status — färbt die Punkte clientseitig live
//   health   : optionaler Server-seitiger Startwert { <key>: 'ok'|'warn'|'fail'|'still' }
//   links    : { <key>: 'https://…' } überschreibt die Default-Modul-URLs
//   homeHref : Ziel der Wortmarke. Default: die Brain-Übersicht.
// sichtbarkeitUrl: Same-Origin-Proxy aus mountSuiteAuth. Auch die Drop-in-Komponenten hängen
// das Filter-Skript selbst an, damit die Kopplung auch ohne suiteChrome greift.
export function suiteTopbar({ active = '', health = {}, links = {}, homeHref = '', statusUrl = '', modules = MODULES, sichtbarkeitUrl = '/suite/sichtbarkeit' } = {}) {
  const home = homeHref || (modules.find((m) => m.key === 'brain') || {}).href || '/';
  const dot = (key, st) => `<span data-mod="${esc(key)}" style="width:7px;height:7px;border-radius:999px;background:${dotBg(st)};display:inline-block"></span>`;
  const pills = modules.map((m) => {
    const cur = m.key === active;
    const st = health[m.key] || 'still';
    const href = links[m.key] || m.href;
    const base = 'display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 11px;font-size:13px;text-decoration:none;white-space:nowrap;';
    const style = cur ? base + `background:${T.fg1};color:${T.onDark};font-weight:500;` : base + `color:${T.fg2};`;
    return `<a data-modlink="${esc(m.key)}" href="${esc(href)}" style="${style}"${cur ? ' aria-current="page"' : ''}>${esc(m.label)}${dot(m.key, st)}</a>`;
  }).join('');
  const summary = modules.map((m) => dot(m.key, health[m.key] || 'still')).join('');
  const live = statusUrl
    ? `<script>(function(){var C={ok:${JSON.stringify(T.ok)},warn:${JSON.stringify(T.warn)},fail:${JSON.stringify(T.fail)}};fetch(${JSON.stringify(statusUrl)}).then(function(r){return r.json()}).then(function(d){if(!d||!d.modules)return;document.querySelectorAll('[data-mod]').forEach(function(e){var s=d.modules[e.getAttribute('data-mod')];e.style.background=C[s]||${JSON.stringify(STILL)}})}).catch(function(){})})();</script>`
    : '';
  return `<header style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:10px 16px;background:${T.surface};border-bottom:1px solid ${T.border};font-family:${FONT}">
  <a href="${esc(home)}" style="display:flex;align-items:center;gap:10px;text-decoration:none">
    ${wordmarkSvg(18)}
    <span style="font-size:11px;color:${T.fg2};border:1px solid ${T.border};border-radius:999px;padding:1px 8px">Business Studio</span>
  </a>
  <nav aria-label="Module" style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">${pills}</nav>
  <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:${T.fg2}">
    <span>Gesundheit</span><span style="display:inline-flex;gap:3px">${summary}</span>
  </div>
</header>${live}${sichtbarkeitScript(sichtbarkeitUrl)}`;
}

// Inline-SVG-Icons, harte Strokes (unabhängig von Studio-CSS). svg(path, color, size).
const svg = (p, c, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="flex:none;display:block">${p}</svg>`;
const GRID_SVG = (c) => svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>', c, 18);
const MOD_ICON = {
  brain: '<path d="M9.5 17h5"/><path d="M10 20h4"/><path d="M12 3a5 5 0 0 1 3 9c-.5.4-1 1-1 2h-4c0-1-.5-1.6-1-2a5 5 0 0 1 3-9z"/>',
  crm: '<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
  sales: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
  finance: '<circle cx="12" cy="12" r="8"/><path d="M12 7v10"/><path d="M14.6 9.4a2.6 2 0 0 0-2.6-1.4 2.6 2 0 0 0 0 5 2.6 2 0 0 1 0 5 2.6 2 0 0 1-2.6-1.4"/>',
  marketing: '<path d="M4 9.5v5a1 1 0 0 0 1 1h2l8 4V4.5L7 8.5H5a1 1 0 0 0-1 1z"/><path d="M17.5 9a3.5 3.5 0 0 1 0 6"/>',
  transkripte: '<path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M9 13h6"/><path d="M9 17h6"/>',
};

// Suite-Launcher: ein kleines Menü-Icon, das ein Popover mit den fünf Modulen + Live-Gesundheit
// öffnet. Selbst-enthalten, dependency-frei, kugelsicher gegen globale Studio-Styles (alle Werte
// inline, Icons mit hartem Stroke). Drop-in: das ganze Stück an den Anfang des bestehenden Headers.
//   active : key des aktuellen Moduls   statusUrl: same-origin-Proxy für Live-Dots (kein Mixed-Content)
export function suiteLauncher({ active = '', links = {}, statusUrl = '', modules = MODULES, sichtbarkeitUrl = '/suite/sichtbarkeit' } = {}) {
  const rows = modules.map((m) => {
    const cur = m.key === active;
    const href = links[m.key] || m.href;
    const ic = svg(MOD_ICON[m.key] || '', cur ? T.brandInk : T.fg2, 17);
    return `<a data-modlink="${esc(m.key)}" href="${esc(href)}" style="display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:8px;text-decoration:none;${cur ? `background:${T.surface2};` : ''}">`
      + `${ic}<span style="flex:1;color:${T.fg1};font-size:14px;${cur ? 'font-weight:600;' : ''}">${esc(m.label)}</span>`
      + `${cur ? `<span style="font-size:11px;color:${T.fg3}">hier</span>` : ''}`
      + `<span data-mod="${esc(m.key)}" style="width:8px;height:8px;border-radius:999px;background:${STILL};display:inline-block;flex:none"></span></a>`;
  }).join('');
  const live = statusUrl
    ? `var C={ok:${JSON.stringify(T.ok)},warn:${JSON.stringify(T.warn)},fail:${JSON.stringify(T.fail)}};fetch(${JSON.stringify(statusUrl)}).then(function(r){return r.json()}).then(function(d){if(!d||!d.modules)return;var ok=0,t=0;document.querySelectorAll("#growlify-suite [data-mod]").forEach(function(e){var s=d.modules[e.getAttribute("data-mod")];e.style.background=C[s]||${JSON.stringify(STILL)};t++;if(s==="ok")ok++;});var h=document.querySelector("#growlify-suite [data-suite-health]");if(h)h.textContent=ok+"/"+t+" gesund";}).catch(function(){});`
    : '';
  const btn = 'margin:0;padding:0;line-height:0;box-sizing:border-box;-webkit-appearance:none;appearance:none;display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9px;border:1px solid ' + T.border + ';background:' + T.surface2 + ';cursor:pointer;flex:none';
  return `<div id="growlify-suite" style="position:relative;display:inline-flex;align-items:center;font-family:${FONT}">
  <button type="button" aria-label="Module wechseln" onclick="var p=document.querySelector('#growlify-suite [data-suite-pop]');p.style.display=(p.style.display==='block'?'none':'block');event.stopPropagation()" style="${btn}">${GRID_SVG(T.fg1)}</button>
  <div data-suite-pop style="display:none;position:absolute;top:44px;left:0;width:284px;background:${T.surface};border:1px solid ${T.border};border-radius:12px;box-shadow:0 12px 32px rgba(24,34,27,0.13);z-index:1000">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border-bottom:1px solid ${T.surface2}">
      <span style="display:flex;align-items:center;gap:7px;font-weight:600;color:${T.fg1};font-size:13.5px">${wordmarkSvg(16)}Business Studio</span>
      <span data-suite-health style="font-size:11.5px;color:${T.brandInk};background:#E1F5EE;border:1px solid #9FE1CB;border-radius:999px;padding:1px 8px">—</span>
    </div>
    <div style="padding:6px">${rows}</div>
  </div>
  <script>(function(){document.addEventListener('click',function(e){var p=document.querySelector('#growlify-suite [data-suite-pop]');if(p&&!e.target.closest('#growlify-suite'))p.style.display='none';});${live}})();</script>
  ${sichtbarkeitScript(sichtbarkeitUrl)}
</div>`;
}

// Die System-Sektion lebt seit 0.12.0 in system.mjs (systemSection v2, Vorlage: Sales Studio).
