// preview.mjs — Vorschau des Suite-Launchers in einem realistischen Studio-Header.
import { writeFileSync } from 'node:fs';
import { baseCss, suiteLauncher } from '../src/index.mjs';

const statusUrl = 'http://sfb9da0vaien08of59th70v7.178.104.27.120.sslip.io/business/api/status';

const page = `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Suite-Launcher Vorschau</title><style>${baseCss()}
.top{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}
.top .wrap{display:flex;align-items:center;gap:14px;max-width:1180px;margin:0 auto;padding:13px 24px}
.logo{font-weight:600;font-size:18px;color:var(--brand)}
.titel{font-weight:600;font-size:15px;color:var(--fg1)}
.tabs{margin-left:auto;display:flex;gap:18px;color:var(--fg2);font-size:14px}
.tabs .on{color:var(--fg1);font-weight:500}
</style></head>
<body>
<header class="top"><div class="wrap">
  ${suiteLauncher({ active: 'finance', statusUrl })}
  <span class="logo">KI Impact</span>
  <span class="titel">Finance Studio</span>
  <nav class="tabs"><span>Dashboard</span><span>Buchhaltung</span><span>Plan &amp; Forecast</span><span class="on">System</span></nav>
</div></header>
<main style="max-width:1180px;margin:0 auto;padding:28px 24px">
  <h1>Überblick</h1>
  <p class="muted">Studio-Inhalt. Der Header ist eine Reihe: Menü-Icon, KI-Impact-Logo, Studio-Name, Reiter.</p>
</main>
</body></html>`;

writeFileSync(new URL('../index.html', import.meta.url), page);
console.log('index.html geschrieben (' + page.length + ' Zeichen)');
