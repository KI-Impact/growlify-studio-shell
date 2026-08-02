// tokens.mjs — die einzige Quelle der Design-Tokens für alle Studios.
// Werte sind in DESIGN.md begründet. Studios binden NICHT eigene Hex-Werte ein,
// sondern ziehen baseCss() aus index.mjs (das diese Tokens als :root setzt).

export const TOKENS = {
  bg: '#FAFAF9',
  surface: '#FFFFFF',
  surface2: '#F2F2EC',
  fg1: '#18221B',
  fg2: '#5B6660',
  fg3: '#8A938D',
  border: '#E7E7DF',
  brand: '#13E489',
  brandInk: '#04342C',
  accent: '#23B2CF',
  onDark: '#FAFAF9',
  ok: '#13E489',
  warn: '#EF9F27',
  fail: '#E24B4A',
};

// Als CSS-Custom-Properties (kurze Aliasse, wie in den bestehenden Studios genutzt).
export function tokenVars() {
  const t = TOKENS;
  return `
    --bg:${t.bg}; --surface:${t.surface}; --surface2:${t.surface2};
    --fg1:${t.fg1}; --fg2:${t.fg2}; --fg3:${t.fg3}; --border:${t.border};
    --brand:${t.brand}; --brandInk:${t.brandInk}; --accent:${t.accent}; --onDark:${t.onDark};
    --ok:${t.ok}; --warn:${t.warn}; --fail:${t.fail};
    --radius:10px; --radius-sm:8px;
    --font:'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',sans-serif;
    --font-mono:'Spline Sans Mono',ui-monospace,'SF Mono',Menlo,monospace;`;
}

// Die sechs Module der Suite in fester Reihenfolge. Brain ist das Herz (erste Position).
// Default-Links auf die echten Studio-URLs (Stand 2026-06-29: alle auf *.growlify.de). Pro
// Studio via suiteTopbar({ links }) überschreibbar.
export const MODULES = [
  { key: 'brain',       label: 'Brain',       href: 'https://brain.growlify.de/business', heart: true },
  { key: 'eingang',     label: 'Eingang',     href: 'https://eingang.growlify.de/eingang' },
  { key: 'crm',         label: 'CRM',         href: 'https://crm.growlify.de/crm' },
  { key: 'sales',       label: 'Sales',       href: 'https://sales.growlify.de/sales' },
  { key: 'marketing',   label: 'Marketing',   href: 'https://marketing.growlify.de/content/studio/' },
  { key: 'finance',     label: 'Finance',     href: 'https://finance.growlify.de/finance/studio/' },
  { key: 'prozesse',    label: 'Prozesse',    href: 'https://prozesse.growlify.de/prozess' },
];

// Modul-Leiste an Sichtbarkeit koppeln (v0.18.0, verschaerft v0.23.0).
//
// Der Endpunkt beantwortet zwei Fragen zugleich: hat das UNTERNEHMEN das Ressort gebucht
// (Entitlements), und darf DIESER NUTZER es sehen (user_bereiche). Nur wenn beides zutrifft,
// bleibt der Link stehen. Das eigene Studio (active) und Brain bleiben immer erreichbar,
// unabhaengig von der Antwort.
//
// Das ist ausdrücklich KOMFORT, keine Sicherheitsgrenze: ein ausgeblendeter Link hält
// niemanden auf, der die URL kennt. Die echte Grenze ist Auth und RLS des Studios.
// d.alle bedeutet weiterhin: nichts ausblenden. Bei d.streng listet d.module ALLE Module
// vollständig, ein dort fehlendes Modul gilt als nicht sichtbar und wird ausgeblendet
// (deckt u.a. neue Module ab, die der Server noch nicht kennt). Ohne streng bleibt das
// alte Verhalten: nur explizit false ausblenden.
export function sichtbarkeitScript(url, active) {
  if (!url) return '';
  return `<script>(function(){fetch(${JSON.stringify(url)},{credentials:'same-origin'}).then(function(r){return r.json()}).then(function(d){if(!d||d.alle)return;var a=${JSON.stringify(active)};document.querySelectorAll('[data-modlink]').forEach(function(e){var k=e.getAttribute('data-modlink');if(k==='brain'||k===a)return;var m=d.module||{};if(m[k]===false||(d.streng===true&&!(k in m)))e.style.display='none'})}).catch(function(){})})();</script>`;
}
