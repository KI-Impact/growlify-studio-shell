// index.mjs — öffentliche API der Suite-Shell.
// Framework-frei: jede Funktion gibt einen HTML-String zurück. Studios rendern server-seitig.
//
// Stand 0.1.0: Tokens + baseCss sind final (Design-Spec freigegeben-fähig).
// suiteTopbar() / systemSection() folgen nach Freigabe der visuellen Richtung (siehe DESIGN.md §5).

import { tokenVars, MODULES, FONT_HREF } from './tokens.mjs';

export { TOKENS, MODULES, tokenVars, FONT_HREF, fontLink, suiteUrl, SUITE_DOMAIN, SUITE_LEGACY_DOMAIN, legacyZiel, SUITE_BASE_PATH, withBasePath } from './tokens.mjs';

// Das gemeinsame CSS-Fundament: Tokens als :root + ruhiger Reset + Basistypo.
// Studios binden das EINMAL im <head> ein, statt eigene <style>-Blöcke zu pflegen.
export function baseCss() {
  return `@import url('${FONT_HREF}');
:root{${tokenVars()}}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--bg);color:var(--fg1);font-family:var(--font);font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
h1,h2,h3{font-family:var(--font-head);font-weight:600;letter-spacing:-0.02em;line-height:1.15;margin:0 0 .4em}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px}
.muted{color:var(--fg2)}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}
.num{font-family:var(--font-mono);font-variant-numeric:tabular-nums}
.dot{width:8px;height:8px;border-radius:999px;display:inline-block}
.dot-ok{background:var(--ok)} .dot-warn{background:var(--warn)} .dot-fail{background:var(--fail)} .dot-still{background:#cdd9d3}
table{width:100%;border-collapse:collapse;font-size:14px}
th{text-align:left;font-weight:500;color:var(--fg2);background:var(--surface2);padding:9px 12px}
td{padding:9px 12px;border-top:1px solid var(--border)}
tbody tr{transition:background .15s ease}
tbody tr:hover{background:var(--surface2)}
.pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 11px;font-size:13px;color:var(--fg2);cursor:pointer;transition:background .15s ease,color .15s ease}
.pill:hover{background:var(--surface2);text-decoration:none}
/* Aktiv = Mint-Pille mit dunkler Schrift (die Primaer-CTA der LP), NICHT die
   fast-schwarze Pille von frueher. Hell-Regel: keine dunklen Flaechen als Default. */
.pill[aria-current=page]{background:var(--brand);color:var(--brandInk);font-weight:600}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.suite-topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 16px;background:var(--surface);border-bottom:1px solid var(--border);flex-wrap:wrap}
.suite-brand{display:flex;align-items:center;gap:10px;font-weight:600;color:var(--fg1)}
.suite-brand .mark{width:22px;height:22px;border-radius:6px;background:var(--brand);color:var(--brandInk);display:inline-flex;align-items:center;justify-content:center;font-size:13px}
.suite-brand .tag{font-size:11px;color:var(--fg2);border:1px solid var(--border);border-radius:999px;padding:1px 8px;font-weight:400}
.suite-switch{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.suite-health{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--fg2)}
.sys-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.sys-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px}
.sys-head{display:flex;align-items:center;gap:8px;margin-bottom:12px;font-weight:600;font-size:14px;color:var(--fg1)}
.sys-row{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--surface2);font-size:13px;color:var(--fg2)}
.sys-row:last-child{border-bottom:0}
@media (max-width:760px){.sys-grid{grid-template-columns:1fr}.suite-switch{order:3;width:100%}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`;
}

export { suiteTopbar, suiteLauncher } from './shell.mjs';
export { suiteChrome, kundenChrome, chromeCss, jarvisOrb } from './chrome.mjs';
// Für Seiten, die eine eigene Kopfleiste bauen statt suiteChrome zu nehmen (z.B. das
// Anbieter-Portal /admin). Damit muss niemand die Wortmarke nachbauen.
export { wordmarkSvg } from './logo.mjs';
export { systemSection, systemCss, healthRows, feedRows, learningRows, fmtDe, ART_LABEL } from './system.mjs';
export { ensureSyslog, logEvent, readFeed } from './syslog.mjs';
export { MODULES as modules } from './tokens.mjs';
export { ICONS, icon, fold, foldSec } from './components.mjs';
export { mountSuiteAuth, signSession, verifySession, verifyAnySession, loginPage, hashPassword, verifyPassword } from './auth.mjs';
