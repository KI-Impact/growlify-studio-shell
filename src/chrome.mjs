// chrome.mjs — das komplette Suite-Chrome (v0.13): EINE Komponente statt zwei konkurrierender
// Header. Anatomie: schlanke Suite-Leiste oben (KI-Impact-Wortmarke, Modul-Pills mit Live-Dots,
// Gradient-Signatur) + Studio-Seitenleiste links (Studio-Identität, Arbeitsnavigation, System
// unten angepinnt). Mobil klappt die Seitenleiste als Drawer über den Burger in der Leiste.
//
// Drop-in: suiteChrome({ active, studio, nav, statusUrl, content }) gibt das komplette
// <body>-Innere zurück. Das Studio entfernt seinen eigenen Header und legt seinen Seiteninhalt
// als content hinein. Selbst-enthalten: eigenes CSS (gsc-Präfix, Hex-Tokens, keine Abhängigkeit
// von Studio-:root-Variablen).
import { MODULES, TOKENS, sichtbarkeitScript, suiteUrl, withBasePath } from './tokens.mjs';
import { ICONS } from './components.mjs';
import { wordmarkSvg } from './logo.mjs';

const T = TOKENS;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FONT = "'Figtree',system-ui,-apple-system,'Segoe UI',sans-serif";
const STILL = '#C7C9C2';
const GRAD = `linear-gradient(135deg,${T.brand},${T.accent})`;

const ic = (name, size = 16) => ICONS[name]
  ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none">${ICONS[name]}</svg>`
  : '';

// Modul-Icons (dieselben wie im bisherigen Launcher).
const MOD_ICON = {
  brain: '<path d="M9.5 17h5"/><path d="M10 20h4"/><path d="M12 3a5 5 0 0 1 3 9c-.5.4-1 1-1 2h-4c0-1-.5-1.6-1-2a5 5 0 0 1 3-9z"/>',
  crm: '<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
  sales: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
  finance: '<circle cx="12" cy="12" r="8"/><path d="M12 7v10"/><path d="M14.6 9.4a2.6 2 0 0 0-2.6-1.4 2.6 2 0 0 0 0 5 2.6 2 0 0 1 0 5 2.6 2 0 0 1-2.6-1.4"/>',
  marketing: '<path d="M4 9.5v5a1 1 0 0 0 1 1h2l8 4V4.5L7 8.5H5a1 1 0 0 0-1 1z"/><path d="M17.5 9a3.5 3.5 0 0 1 0 6"/>',
  transkripte: '<path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M9 13h6"/><path d="M9 17h6"/>',
  eingang: '<path d="M4 5h16v14H4z"/><path d="M4 13h5a3 3 0 0 0 6 0h5"/><path d="M8 5l-4 8"/><path d="M16 5l4 8"/>',
};
const modIc = (key, size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none">${MOD_ICON[key] || ''}</svg>`;


export function chromeCss() {
  return `<style>
.gsc-body{margin:0;font-family:${FONT};background:${T.bg};color:${T.fg1}}
/* ---- Suite-Leiste ---- */
.gsc-top{position:sticky;top:0;z-index:60;background:rgba(255,255,255,.92);backdrop-filter:blur(12px)}
.gsc-top::after{content:"";display:block;height:2px;background:${GRAD};opacity:.75}
.gsc-top-in{display:flex;align-items:center;gap:14px;padding:9px 18px}
.gsc-burger{display:none;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9px;border:1px solid ${T.border};background:${T.surface2};cursor:pointer;color:${T.fg1};padding:0}
/* Mittelachse statt Baseline: die Wortmarke ist eine Grafik, der Chip daneben Text —
   auf einer gemeinsamen Baseline laufen die beiden zwangslaeufig auseinander. */
.gsc-brand{display:flex;align-items:center;gap:9px;text-decoration:none}
.gsc-wm{display:inline-flex;align-items:center;height:22px;line-height:0}
.gsc-wm-img{display:block;height:100%;width:auto}
.gsc-tag{font-size:10.5px;color:${T.fg2};border:1px solid ${T.border};border-radius:999px;padding:1px 8px}
.gsc-mods{display:flex;align-items:center;gap:3px;margin-left:auto;flex-wrap:wrap}
.gsc-mod{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 11px;font-size:12.5px;font-weight:500;color:${T.fg2};text-decoration:none;white-space:nowrap}
.gsc-mod:hover{background:${T.surface2};text-decoration:none}
.gsc-mod[aria-current=page]{background:${T.brand};color:${T.brandInk};font-weight:600}
.gsc-dot{width:7px;height:7px;border-radius:999px;background:${STILL};display:inline-block;flex:none}
/* ---- Layout: Seitenleiste + Inhalt ---- */
.gsc-shell{display:flex;min-height:calc(100vh - 46px);align-items:stretch}
.gsc-side{width:212px;flex:none;border-right:1px solid ${T.border};padding:18px 12px 14px;display:flex;flex-direction:column;gap:2px;position:sticky;top:46px;align-self:flex-start;height:calc(100vh - 46px);overflow-y:auto;background:${T.bg}}
.gsc-studio{display:flex;align-items:center;gap:10px;padding:4px 8px 14px}
.gsc-studio-ic{width:30px;height:30px;border-radius:9px;background:${GRAD};color:#fff;display:inline-flex;align-items:center;justify-content:center;flex:none}
.gsc-studio-name{font-weight:600;font-size:14.5px;letter-spacing:-.01em;line-height:1.2}
.gsc-studio-sub{font-size:11px;color:${T.fg3};margin-top:1px}
.gsc-nav{display:flex;flex-direction:column;gap:2px}
.gsc-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;font-size:13.5px;font-weight:500;color:${T.fg2};text-decoration:none;cursor:pointer;border:0;background:none;font-family:inherit;text-align:left;width:100%}
.gsc-item svg{opacity:.8}
.gsc-item:hover{background:${T.surface2};text-decoration:none;color:${T.fg1}}
.gsc-item.on{color:#1f7a52;background:linear-gradient(135deg,rgba(101,251,184,.28),rgba(44,154,105,.14));font-weight:600}
.gsc-item.on svg{opacity:1}
.gsc-side-foot{margin-top:auto;padding-top:12px;border-top:1px solid ${T.border};display:flex;flex-direction:column;gap:2px}
.gsc-account{padding-top:10px;margin-top:10px;border-top:1px solid ${T.border};display:flex;flex-direction:column;gap:3px}
.gsc-account-mail{padding:0 10px;font-size:11.5px;color:${T.fg3};overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gsc-account .gsc-item{color:${T.fg3};font-size:12.5px;padding:6px 10px}
.gsc-account .gsc-item:hover{color:${T.fg1}}
.gsc-main{flex:1;min-width:0}
.gsc-backdrop{display:none}
/* ---- Mobil: Drawer ---- */
@media(max-width:980px){
  .gsc-burger{display:inline-flex}
  .gsc-mods{display:none}
  .gsc-side{position:fixed;left:0;top:0;height:100vh;z-index:80;background:${T.bg};box-shadow:0 0 40px rgba(24,34,27,.18);transform:translateX(-105%);transition:transform .22s ease;width:250px;padding-top:16px}
  .gsc-side.open{transform:translateX(0)}
  .gsc-backdrop.open{display:block;position:fixed;inset:0;background:rgba(24,34,27,.32);z-index:70}
  .gsc-side-mods{display:flex!important}
}
.gsc-side-mods{display:none;flex-direction:column;gap:2px;padding-top:12px;margin-top:12px;border-top:1px solid ${T.border}}
.gsc-side-mods .gsc-lbl{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:${T.fg3};padding:0 10px 6px}
@media (prefers-reduced-motion:reduce){.gsc-side{transition:none}}
</style>`;
}

// Das komplette Chrome. content = fertiges Seiten-HTML des Studios.
//   active   : Modul-Key ('brain'|'crm'|'sales'|'finance'|'marketing'|'transkripte')
//   studio   : Anzeigename in der Seitenleiste (z.B. 'Business Brain')
//   subtitle : kleine Zeile darunter (optional)
//   nav      : [{ href, label, icon, active, attrs }] — attrs = roher Attribut-String
//              (z.B. onclick) für statische Studios mit Tab-Buttons; dann button statt <a>.
//   footerNav: wie nav, unten angepinnt (System, Handbuch …)
//   statusUrl: same-origin-Proxy von /business/api/status für die Live-Dots
//   homeHref : Ziel der Wortmarke (Default: Brain-Übersicht)
export function suiteChrome({
  active = '', studio = '', subtitle = '', studioHref = '', nav = [], footerNav = [],
  statusUrl = '', homeHref = '', links = {}, modules = MODULES, content = '',
  jarvis = true, jarvisUrl = suiteUrl('brain', '/business/jarvis'),
  // Same-Origin-Proxy, den mountSuiteAuth in jedem Studio mitbringt. Leerer String schaltet
  // die Kopplung ab (z.B. für Seiten ohne Suite-Session).
  sichtbarkeitUrl = withBasePath('/suite/sichtbarkeit'),
  // Konto-Fuß (03.08.): angemeldetes Konto + Abmelden-Link, unten in der Seitenleiste, auf JEDER
  // Seite sichtbar (Befund Manuel: es gab nirgends einen sichtbaren Abmelden-Weg). { email,
  // logoutHref } — null lässt den Block weg (z.B. Seiten ohne Suite-Session).
  account = null,
} = {}) {
  const home = homeHref || (modules.find((m) => m.key === 'brain') || {}).href || '/';

  const pill = (m) => {
    const cur = m.key === active;
    return `<a class="gsc-mod" data-modlink="${esc(m.key)}" href="${esc(links[m.key] || m.href)}"${cur ? ' aria-current="page"' : ''}>${esc(m.label)}<span class="gsc-dot" data-mod="${esc(m.key)}"></span></a>`;
  };
  const sideMod = (m) => {
    const cur = m.key === active;
    return `<a class="gsc-item${cur ? ' on' : ''}" data-modlink="${esc(m.key)}" href="${esc(links[m.key] || m.href)}">${modIc(m.key)}<span>${esc(m.label)}</span><span class="gsc-dot" data-mod="${esc(m.key)}" style="margin-left:auto"></span></a>`;
  };
  const navItem = (n) => {
    const inner = `${n.icon ? ic(n.icon) : ''}<span>${esc(n.label)}</span>`;
    const cls = `gsc-item${n.active ? ' on' : ''}`;
    return n.attrs
      ? `<button type="button" class="${cls}" ${n.attrs}>${inner}</button>`
      : `<a class="${cls}" href="${esc(n.href || '#')}"${n.active ? ' aria-current="page"' : ''}>${inner}</a>`;
  };

  const topbar = `<div class="gsc-top"><div class="gsc-top-in">
    <button type="button" class="gsc-burger" aria-label="Menü" onclick="document.querySelector('.gsc-side').classList.toggle('open');document.querySelector('.gsc-backdrop').classList.toggle('open')">${ic('grid', 17)}</button>
    <a class="gsc-brand" href="${esc(home)}"><span class="gsc-wm">${wordmarkSvg(22)}</span><span class="gsc-tag">Business Studio</span></a>
    <nav class="gsc-mods" aria-label="Module">${modules.map(pill).join('')}</nav>
  </div></div>`;

  // Studio-Kopf: klickbar = Studio-Home (z.B. der Finance-Überblick — „Logo = Home" bleibt erhalten).
  const studioHead = `<span class="gsc-studio-ic">${modIc(active, 16)}</span><div><div class="gsc-studio-name">${esc(studio)}</div>${subtitle ? `<div class="gsc-studio-sub">${esc(subtitle)}</div>` : ''}</div>`;
  const sidebar = `<aside class="gsc-side">
    ${studioHref ? `<a class="gsc-studio" href="${esc(studioHref)}" style="text-decoration:none;color:inherit" title="${esc(studio)} · Start">${studioHead}</a>` : `<div class="gsc-studio">${studioHead}</div>`}
    <nav class="gsc-nav" aria-label="${esc(studio)}">${nav.map(navItem).join('')}</nav>
    ${footerNav.length ? `<div class="gsc-side-foot">${footerNav.map(navItem).join('')}</div>` : ''}
    ${account ? `<div class="gsc-account">${account.email ? `<div class="gsc-account-mail" title="${esc(account.email)}">${esc(account.email)}</div>` : ''}<a class="gsc-item" href="${esc(account.logoutHref || withBasePath('/login/logout'))}" target="_top">${ic('logout')}<span>Abmelden</span></a></div>` : ''}
    <div class="gsc-side-mods"><span class="gsc-lbl">KI Impact</span>${modules.map(sideMod).join('')}</div>
  </aside>`;

  const live = statusUrl
    ? `<script>(function(){var C={ok:${JSON.stringify(T.ok)},warn:${JSON.stringify(T.warn)},fail:${JSON.stringify(T.fail)}};fetch(${JSON.stringify(statusUrl)}).then(function(r){return r.json()}).then(function(d){if(!d||!d.modules)return;document.querySelectorAll('.gsc-dot[data-mod]').forEach(function(e){var s=d.modules[e.getAttribute('data-mod')];e.style.background=C[s]||${JSON.stringify(STILL)}})}).catch(function(){})})();</script>`
    : '';

  return `${chromeCss()}${topbar}<div class="gsc-shell">${sidebar}<div class="gsc-backdrop" onclick="document.querySelector('.gsc-side').classList.remove('open');this.classList.remove('open')"></div><main class="gsc-main">${content}</main></div>${live}${sichtbarkeitScript(sichtbarkeitUrl, active)}${jarvis ? jarvisOrb(jarvisUrl) : ''}`;
}

// Jarvis-Orb (v0.16): schwebender „Datenball" rechts unten in jedem Studio. Klick öffnet einen
// Drawer mit dem eingebetteten Jarvis (Brain). Selbst-enthalten: eigenes CSS/JS, kein Framework.
// Das iframe lädt erst beim ersten Öffnen (data-src), damit der Orb keine Last erzeugt.
// allow="microphone" ist Pflicht, seit Jarvis ein Mikrofon hat: Ohne diese Delegation lehnt der
// Browser getUserMedia im iframe SOFORT ab und fragt den Nutzer gar nicht erst. Das sieht dann
// aus, als hätte er die Freigabe verweigert, obwohl er nie gefragt wurde (31.07.2026 gemessen).
export function jarvisOrb(url = suiteUrl('brain', '/business/jarvis')) {
  const dots = [
    // [Ring-Radius, Winkel°, Punktgröße, Farbe, Pulsverzögerung s] — bewusst unregelmäßig, „Datenfluss".
    [26, 10, 2.4, T.brand, 0], [26, 95, 1.7, T.accent, 0.7], [26, 150, 2.1, T.brand, 1.4], [26, 215, 1.5, '#8FF3C8', 0.3], [26, 300, 2.2, T.accent, 1.9],
    [18, 40, 1.9, T.accent, 1.1], [18, 130, 2.5, T.brand, 0.5], [18, 250, 1.6, '#8FF3C8', 1.6], [18, 330, 2.0, T.brand, 0.9],
    [10, 70, 1.8, '#B7F7DD', 0.2], [10, 190, 2.2, T.brand, 1.2], [10, 310, 1.5, T.accent, 0.6],
  ].map(([r, a, s, f, d]) => {
    const x = 32 + r * Math.cos((a * Math.PI) / 180);
    const y = 32 + r * Math.sin((a * Math.PI) / 180);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s}" fill="${f}" class="gsc-jvs-dot" style="animation-delay:${d}s"/>`;
  }).join('');
  return `<style>
.gsc-jvs{position:fixed;right:20px;bottom:20px;z-index:1200;width:56px;height:56px;border:none;border-radius:50%;cursor:pointer;padding:0;background:radial-gradient(circle at 34% 30%,#1f7a52 0%,${T.brandInk} 55%,#0e1a15 100%);box-shadow:0 6px 24px rgba(4,52,44,.35),0 0 0 0 rgba(101,251,184,.35);animation:gsc-jvs-halo 3.2s ease-in-out infinite;transition:transform .18s ease}
.gsc-jvs:hover{transform:scale(1.07)}
.gsc-jvs svg{display:block;width:56px;height:56px}
.gsc-jvs .gsc-jvs-ring{transform-origin:32px 32px;animation:gsc-jvs-spin 26s linear infinite}
.gsc-jvs .gsc-jvs-ring2{transform-origin:32px 32px;animation:gsc-jvs-spin 17s linear infinite reverse}
.gsc-jvs .gsc-jvs-dot{animation:gsc-jvs-pulse 2.6s ease-in-out infinite}
.gsc-jvs .gsc-jvs-core{transform-origin:32px 32px;animation:gsc-jvs-core 2.6s ease-in-out infinite}
@keyframes gsc-jvs-halo{0%,100%{box-shadow:0 6px 24px rgba(4,52,44,.35),0 0 0 0 rgba(101,251,184,.30)}50%{box-shadow:0 6px 24px rgba(4,52,44,.35),0 0 0 11px rgba(101,251,184,0)}}
@keyframes gsc-jvs-spin{to{transform:rotate(360deg)}}
@keyframes gsc-jvs-pulse{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes gsc-jvs-core{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.18);opacity:1}}
@media (prefers-reduced-motion:reduce){.gsc-jvs,.gsc-jvs *{animation:none !important}}
.gsc-jvs-drawer{position:fixed;top:0;right:0;bottom:0;z-index:1210;width:min(440px,100vw);background:${T.surface};border-left:1px solid ${T.border};box-shadow:-18px 0 40px rgba(24,34,27,.14);transform:translateX(105%);transition:transform .24s ease;display:flex;flex-direction:column}
.gsc-jvs-drawer.open{transform:none}
.gsc-jvs-head{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid ${T.border};font-family:${FONT};color:${T.fg1};font-weight:700}
.gsc-jvs-head .dot{width:8px;height:8px;border-radius:50%;background:${GRAD};box-shadow:0 0 8px ${T.brand}}
.gsc-jvs-head a{margin-left:auto;font-size:12px;font-weight:600;color:${T.fg2};text-decoration:none}
.gsc-jvs-head button{border:none;background:none;cursor:pointer;color:${T.fg2};font-size:16px;line-height:1;padding:4px 6px}
.gsc-jvs-frame{flex:1;border:none;width:100%}
</style>
<button type="button" class="gsc-jvs" aria-label="Jarvis öffnen" onclick="(function(d){d.classList.toggle('open');var f=d.querySelector('iframe');if(d.classList.contains('open')&&f&&!f.src)f.src=f.getAttribute('data-src')})(document.querySelector('.gsc-jvs-drawer'))">
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="4.6" fill="${T.brand}" class="gsc-jvs-core"/>
    <circle cx="32" cy="32" r="10" fill="none" stroke="rgba(101,251,184,.25)" stroke-width=".7"/>
    <circle cx="32" cy="32" r="18" fill="none" stroke="rgba(44,154,105,.22)" stroke-width=".7" stroke-dasharray="2 5"/>
    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(101,251,184,.18)" stroke-width=".7" stroke-dasharray="1.5 6"/>
    <g class="gsc-jvs-ring">${dots}</g>
    <g class="gsc-jvs-ring2"><circle cx="50" cy="32" r="1.6" fill="${T.accent}" class="gsc-jvs-dot" style="animation-delay:.4s"/><circle cx="14" cy="32" r="1.9" fill="${T.brand}" class="gsc-jvs-dot" style="animation-delay:1.5s"/><circle cx="32" cy="12" r="1.4" fill="#B7F7DD" class="gsc-jvs-dot" style="animation-delay:.9s"/></g>
  </svg>
</button>
<aside class="gsc-jvs-drawer" aria-label="Jarvis">
  <div class="gsc-jvs-head"><span class="dot"></span>Jarvis<a href="${esc(url)}" target="_blank" rel="noopener">im Brain öffnen ↗</a><button type="button" aria-label="Schließen" onclick="this.closest('.gsc-jvs-drawer').classList.remove('open')">✕</button></div>
  <iframe class="gsc-jvs-frame" allow="microphone" data-src="${esc(url)}${url.includes('?') ? '&' : '?'}embed=1" title="Jarvis"></iframe>
</aside>
<script>document.addEventListener('keydown',function(e){if(e.key==='Escape'){var d=document.querySelector('.gsc-jvs-drawer');if(d)d.classList.remove('open')}})</script>`;
}


// Kunden-Chrome: dieselbe Anatomie wie suiteChrome (Topbar + Seitenleiste + Drawer, identische
// gsc-Optik), aber OHNE die internen Modul-Pills/Status-Dots — Kunden sehen nie die Suite-Module.
// Für kundengerichtete Apps (Portal). topRight = optionaler HTML-String rechts in der Leiste
// (z.B. Abmelden-Link).
export function kundenChrome({
  studio = 'KI Impact', subtitle = '', studioHref = '/', nav = [], footerNav = [],
  homeHref = '/', topRight = '', content = '',
} = {}) {
  const navItem = (n) => {
    const inner = `${n.icon ? ic(n.icon) : ''}<span>${esc(n.label)}</span>`;
    const cls = `gsc-item${n.active ? ' on' : ''}`;
    return `<a class="${cls}" href="${esc(n.href || '#')}"${n.active ? ' aria-current="page"' : ''}>${inner}</a>`;
  };
  const topbar = `<div class="gsc-top"><div class="gsc-top-in">
    <button type="button" class="gsc-burger" aria-label="Menü" onclick="document.querySelector('.gsc-side').classList.toggle('open');document.querySelector('.gsc-backdrop').classList.toggle('open')">${ic('grid', 17)}</button>
    <a class="gsc-brand" href="${esc(homeHref)}"><span class="gsc-wm">${wordmarkSvg(22)}</span></a>
    <div style="margin-left:auto;display:flex;align-items:center;gap:10px;font-size:12.5px">${topRight}</div>
  </div></div>`;
  const studioHead = `<span class="gsc-studio-ic">${ic('heart', 16)}</span><div><div class="gsc-studio-name">${esc(studio)}</div>${subtitle ? `<div class="gsc-studio-sub">${esc(subtitle)}</div>` : ''}</div>`;
  const sidebar = `<aside class="gsc-side">
    <a class="gsc-studio" href="${esc(studioHref)}" style="text-decoration:none;color:inherit">${studioHead}</a>
    <nav class="gsc-nav" aria-label="${esc(studio)}">${nav.map(navItem).join('')}</nav>
    ${footerNav.length ? `<div class="gsc-side-foot">${footerNav.map(navItem).join('')}</div>` : ''}
  </aside>`;
  return `${chromeCss()}${topbar}<div class="gsc-shell">${sidebar}<div class="gsc-backdrop" onclick="document.querySelector('.gsc-side').classList.remove('open');this.classList.remove('open')"></div><main class="gsc-main">${content}</main></div>`;
}
