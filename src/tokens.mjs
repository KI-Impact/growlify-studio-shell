// tokens.mjs — die einzige Quelle der Design-Tokens für alle Studios.
// Studios binden NICHT eigene Hex-Werte ein, sondern ziehen baseCss() aus index.mjs
// (das diese Tokens als :root setzt).
//
// KI-IMPACT-BRANDING (09.08.2026). Jeder Wert stammt aus der verbindlichen
// Design-Quelle `~/Developer/ki-impact-lp/design/tokens.css`. Nichts frei erfunden;
// in Klammern der Name des LP-Tokens, aus dem der Wert kommt.
//
// HELL-REGEL (Manuel, verbindlich): Das System-Branding ist HELL. Die dunklen
// LP-Töne (--ki-dark* #10221a/#0e1a15) sind ausschliesslich Akzent (Text auf Mint,
// vereinzelte Kopf-/Fussflaechen), NIE Flaechen-Default und kein Dark-Mode-Look.

export const TOKENS = {
  bg: '#f7f9f8',        // Canvas            (--ki-bg-soft)
  surface: '#ffffff',   // Karte / Flaeche   (--ki-bg)
  surface2: '#f0faf4',  // Subtile Flaeche, Hover, aktive Auswahl (--ki-mint-tint)
  fg1: '#1c2422',       // Text primaer      (--ki-text)
  fg2: '#41544b',       // Text sekundaer    (--ki-mint-tint-text)
  fg3: '#5b6a64',       // Text gedaempft    (--ki-text-muted)
  border: '#e3eae6',    // Linie / Border    (--ki-border)
  brand: '#65fbb8',     // Primaer-CTA, Marken-Flaeche (--ki-mint)
  brandInk: '#10221a',  // Text auf brand    (--ki-dark)
  accent: '#2c9a69',    // Links, Text-Akzente, Fokus (--ki-green)
  onDark: '#f7f9f8',    // Text auf dunklen Akzentflaechen (--ki-bg-soft)
  ok: '#2c9a69',        // Status ok         (--ki-green)
  warn: '#EF9F27',      // Status warn — die LP definiert keinen Warn-Ton, daher
                        // bewusst unveraendert aus dem Vorgaenger-Set uebernommen.
  fail: '#b3423a',      // Status fail       (--ki-error)
};

// Als CSS-Custom-Properties (kurze Aliasse, wie in den bestehenden Studios genutzt).
// --grad ersetzt den alten Signatur-Gradienten gruen->cyan: KI Impact hat kein Cyan,
// der Verlauf laeuft jetzt Mint -> Gruen (beide aus der LP-Palette).
export function tokenVars() {
  const t = TOKENS;
  return `
    --bg:${t.bg}; --surface:${t.surface}; --surface2:${t.surface2};
    --fg1:${t.fg1}; --fg2:${t.fg2}; --fg3:${t.fg3}; --border:${t.border};
    --brand:${t.brand}; --brandInk:${t.brandInk}; --accent:${t.accent}; --onDark:${t.onDark};
    --ok:${t.ok}; --warn:${t.warn}; --fail:${t.fail};
    --grad:linear-gradient(135deg,${t.brand},${t.accent});
    --radius:14px; --radius-sm:10px;
    --font:'Figtree',system-ui,-apple-system,'Segoe UI',sans-serif;
    --font-head:'Sora',system-ui,-apple-system,'Segoe UI',sans-serif;
    --font-mono:'Spline Sans Mono',ui-monospace,'SF Mono',Menlo,monospace;`;
}

// Der Google-Fonts-Link der Suite. Studios, die eine eigene Seite ausserhalb von
// baseCss() bauen (Login, Leerseiten, generierte Cockpits), binden diesen String ein,
// statt eine eigene Font-URL zu pflegen. Sora = Headlines, Figtree = Text (LP-Vorgabe).
export const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Figtree:wght@400;500;600;700&family=Spline+Sans+Mono:wght@400;500&display=swap';

export function fontLink() {
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${FONT_HREF}">`;
}

// Domain-Schicht (v0.27.0): die Studio-URLs werden nicht mehr hartkodiert, sondern aus einer
// Basis-Domain plus Subdomain je Modul gebaut. Der Default bleibt exakt der bisherige Stand
// (*.growlify.de), ein Domain-Wechsel ist damit eine reine Env-Änderung — Voraussetzung für die
// eigene Instanz auf dev.ki-impact.de und später für Kunden-Instanzen aus denselben Repos.
//
//   SUITE_DOMAIN=dev.ki-impact.de
//   SUITE_SUBS={"prozesse":"prozess"}      // nur nötig, wo die Subdomain abweicht
//
// Einzelne Module lassen sich weiterhin pro Studio via suiteTopbar({ links }) überschreiben.
export const SUITE_DOMAIN = process.env.SUITE_DOMAIN || 'growlify.de';

// SUB_DEFAULTS ist zugleich die Lesehilfe für die ALTEN Adressen: dort hieß die Subdomain
// genau wie der Modul-Key. Deshalb bleibt die Tabelle als eigene Konstante stehen und wird
// nicht in SUBS hineinmutiert — legacyZiel() braucht beide Stände (alt und neu).
const SUB_DEFAULTS = {
  brain: 'brain', eingang: 'eingang', crm: 'crm', sales: 'sales', marketing: 'marketing',
  finance: 'finance', prozesse: 'prozesse', portal: 'portal', transkripte: 'transkripte',
};
const SUBS = { ...SUB_DEFAULTS };
try { Object.assign(SUBS, JSON.parse(process.env.SUITE_SUBS || '{}')); } catch { /* fehlerhaftes JSON ignorieren, Defaults bleiben */ }

// Basis-URL eines Moduls (ohne Pfad). Unbekannte Keys werden als eigene Subdomain gelesen.
export function suiteUrl(key, pfad = '') {
  return `https://${SUBS[key] || key}.${SUITE_DOMAIN}${pfad}`;
}

// Alt-Domain-Weiche (v0.28.0). Nach dem Umzug auf eine neue SUITE_DOMAIN bleiben die alten
// Adressen aufgeschaltet, weil in verschickten Mails alte Links stecken. Für die App-Strecke
// ist das aber eine Falle: das Session-Cookie gilt nur unter EINER Domain, ein Aufruf einer
// geschützten Seite auf der Alt-Domain lief deshalb in eine Endlos-Schleife
// (alt → neuer Login → next=alt → wieder Login). Mit SUITE_LEGACY_DOMAIN gesetzt wird daraus
// ein sauberer 301 auf dieselbe Route unter der neuen Domain.
//
//   SUITE_LEGACY_DOMAIN=growlify.de
//
// Ohne die Env passiert nichts (bitgenau das bisherige Verhalten). Die öffentlichen Routen
// einer App sind ausgenommen, das entscheidet der Aufrufer in auth.mjs — hier wird nur die
// Host-Frage beantwortet.
export const SUITE_LEGACY_DOMAIN = process.env.SUITE_LEGACY_DOMAIN || '';

// Ziel-URL für einen Aufruf auf einer Alt-Domain, oder null wenn nicht umzuleiten ist.
// Bewusst konservativ: umgeleitet wird NUR, wenn die erste Host-Ebene einem bekannten
// Suite-Modul entspricht. Fremde Hosts derselben Alt-Domain (admin., www., ad., app.) bleiben
// unangetastet, statt auf eine Adresse zu zeigen, die es unter der neuen Domain nicht gibt.
export function legacyZiel(host, pfad = '/') {
  // Gleiche Domain alt wie neu hieße Selbst-Redirect. Lieber gar nichts tun.
  if (!SUITE_LEGACY_DOMAIN || SUITE_LEGACY_DOMAIN === SUITE_DOMAIN || !host) return null;
  const h = String(host).toLowerCase().split(':')[0];
  const suffix = '.' + SUITE_LEGACY_DOMAIN.toLowerCase();
  if (!h.endsWith(suffix)) return null;
  const label = h.slice(0, -suffix.length);
  if (!label || label.includes('.')) return null; // mehrstufige Alt-Hosts nicht raten
  const key = Object.keys(SUB_DEFAULTS).find((k) => SUB_DEFAULTS[k] === label);
  if (!key) return null;
  return `https://${SUBS[key] || key}.${SUITE_DOMAIN}${pfad}`;
}

// Pfad-Präfix (vNext): ein Studio zusätzlich zur Wurzel unter einem Pfad derselben
// Suite-Domain betreiben (z.B. https://studio.ki-impact.de/marketing statt einer eigenen
// Subdomain). Default leer = heutiges Verhalten byte-identisch. Für Reverse-Proxy-Setups
// OHNE Pfad-Stripping (der Server sieht den vollen Pfad inkl. Präfix) registriert die Shell
// ihre eigenen Routen und selbst erzeugten Redirects/Links/Cookie-Pfade damit unter dem
// Präfix. Ein Studio, das stattdessen per Express doppelt mountet (root.use(prefix, app)
// UND root.use('/', app)), lässt SUITE_BASE_PATH unverändert leer und nutzt req.baseUrl für
// eigene Links (siehe README) — beide Muster sind gültig, siehe README.
const rawSuiteBasePath = (process.env.SUITE_BASE_PATH || '').trim();
export const SUITE_BASE_PATH = rawSuiteBasePath && rawSuiteBasePath !== '/'
  ? '/' + rawSuiteBasePath.replace(/^\/+|\/+$/g, '')
  : '';

// Hängt SUITE_BASE_PATH vor einen absoluten Pfad. Ohne Präfix ein No-op, damit jede
// bestehende Aufrufstelle ohne SUITE_BASE_PATH byte-identisch bleibt.
export function withBasePath(pfad = '/') {
  if (!SUITE_BASE_PATH) return pfad;
  if (!pfad || pfad === '/') return SUITE_BASE_PATH;
  return SUITE_BASE_PATH + pfad;
}

// Die Module der Suite in fester Reihenfolge. Brain ist das Herz (erste Position).
export const MODULES = [
  { key: 'brain',       label: 'Brain',       href: suiteUrl('brain', '/business'), heart: true },
  { key: 'eingang',     label: 'Eingang',     href: suiteUrl('eingang', '/eingang') },
  { key: 'crm',         label: 'CRM',         href: suiteUrl('crm', '/crm') },
  { key: 'sales',       label: 'Sales',       href: suiteUrl('sales', '/sales') },
  { key: 'marketing',   label: 'Marketing',   href: suiteUrl('marketing', '/content/studio/') },
  { key: 'finance',     label: 'Finance',     href: suiteUrl('finance', '/finance/studio/') },
  { key: 'prozesse',    label: 'Prozesse',    href: suiteUrl('prozesse', '/prozess') },
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
