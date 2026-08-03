// components.mjs — geteilte Suite-Designsprache: Icon-System + Aufklapp-Helfer.
// Framework-frei, token-agnostisch (gibt nur Markup + Klassennamen aus, kein CSS).
// Das studio-eigene CSS (Tokens) bringt jedes Studio selbst mit; die Klassen sind:
// .ic / .nav-ic / .sec-ic (Icons) und .fold / .fold-x / .fs-title / .fold-body (Aufklapper).

const escTxt = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Kuratierte Tabler-Outline-SVGs (stroke=currentColor). Union aller in der Suite genutzten Icons.
export const ICONS = {
  grid: '<path d="M4 4h7v7H4z"/><path d="M13 4h7v7h-7z"/><path d="M4 13h7v7H4z"/><path d="M13 13h7v7h-7z"/>',
  orb: '<circle cx="12" cy="12" r="5"/><path d="M12 3v2"/><path d="M12 19v2"/><path d="M3 12h2"/><path d="M19 12h2"/><path d="M5.9 5.9l1.4 1.4"/><path d="M16.7 16.7l1.4 1.4"/><path d="M16.7 7.3l1.4-1.4"/><path d="M5.9 18.1l1.4-1.4"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
  settings: '<path d="M10.3 4.3a1.7 1.7 0 0 1 3.4 0a1.7 1.7 0 0 0 2.6 1.1a1.7 1.7 0 0 1 2.3 2.3a1.7 1.7 0 0 0 1.1 2.6a1.7 1.7 0 0 1 0 3.4a1.7 1.7 0 0 0-1.1 2.6a1.7 1.7 0 0 1-2.3 2.3a1.7 1.7 0 0 0-2.6 1.1a1.7 1.7 0 0 1-3.4 0a1.7 1.7 0 0 0-2.6-1.1a1.7 1.7 0 0 1-2.3-2.3a1.7 1.7 0 0 0-1.1-2.6a1.7 1.7 0 0 1 0-3.4a1.7 1.7 0 0 0 1.1-2.6a1.7 1.7 0 0 1 2.3-2.3a1.7 1.7 0 0 0 2.6-1.1z"/><circle cx="12" cy="12" r="3"/>',
  sliders: '<path d="M4 8h10"/><path d="M18 8h2"/><circle cx="16" cy="8" r="2"/><path d="M4 16h2"/><path d="M10 16h10"/><circle cx="8" cy="16" r="2"/>',
  stack: '<path d="M12 4l8 4l-8 4l-8-4z"/><path d="M4 12l8 4l8-4"/>',
  layers: '<path d="M12 4l8 4l-8 4l-8-4z"/><path d="M4 12l8 4l8-4"/><path d="M4 16l8 4l8-4"/>',
  heart: '<path d="M12 20l-7-7a4 4 0 0 1 6-5l1 1l1-1a4 4 0 0 1 6 5z"/>',
  tag: '<path d="M11 4H6a2 2 0 0 0-2 2v5l9 9l7-7l-9-9z"/><circle cx="8.5" cy="8.5" r="1"/>',
  columns: '<path d="M6 4v16"/><path d="M12 4v16"/><path d="M18 4v16"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5"/><path d="M19 20a6 6 0 0 0-3-5"/>',
  message: '<path d="M4 5h16v11H9l-5 4z"/>',
  chart: '<path d="M4 4v16h16"/><path d="M8 14l3-3l3 3l4-5"/>',
  route: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h6a4 4 0 0 1 0 8h-4a4 4 0 0 0 0 8"/>',
  flag: '<path d="M5 4v16"/><path d="M5 4h11l-2 4l2 4H5"/>',
  inbox: '<path d="M5 13l2-7h10l2 7v5H5z"/><path d="M4 13h4l2 3h4l2-3h4"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12l2.5 2.5l4.5-5"/>',
  bulb: '<path d="M9.5 18h5"/><path d="M10 21h4"/><path d="M8 12a4 4 0 1 1 8 0c0 1.6-1 2.6-1.6 3.6H9.6C9 14.6 8 13.6 8 12z"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
  map: '<path d="M9 5L4 7v12l5-2l6 2l5-2V5l-5 2z"/><path d="M9 5v12"/><path d="M15 7v12"/>',
  activity: '<path d="M4 12h4l2 6l4-12l2 6h4"/>',
  share: '<circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 11l8-4"/><path d="M8 13l8 4"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/>',
  progress: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18"/>',
  book: '<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 0-2 2z"/><path d="M5 16h13"/>',
  external: '<path d="M14 5h5v5"/><path d="M19 5l-8 8"/><path d="M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>',
  wallet: '<path d="M4 7a2 2 0 0 1 2-2h11v4"/><path d="M4 7v10a2 2 0 0 0 2 2h13V9H6a2 2 0 0 1-2-2z"/><circle cx="16" cy="14" r="1.2"/>',
  receipt: '<path d="M6 3l1.5 1.5L9 3l1.5 1.5L12 3l1.5 1.5L15 3l1.5 1.5L18 3v18l-1.5-1.5L15 21l-1.5-1.5L12 21l-1.5-1.5L9 21l-1.5-1.5L6 21z"/><path d="M9 8h6"/><path d="M9 12h6"/>',
  building: '<path d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16"/><path d="M15 9h3a1 1 0 0 1 1 1v11"/><path d="M8 8h2M8 12h2M8 16h2"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5l-5-5"/><path d="M21 12H9"/>',
};

// icon('users') → Inline-SVG. cls steuert die Größe (.ic Standard, .ic nav-ic, .ic sec-ic).
export const icon = (name, cls = 'ic') => ICONS[name]
  ? `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`
  : '';

// Generischer Aufklapper (Kopf = Schalter). summary ist reiner Text.
export const fold = (summary, body, open = false) =>
  `<details class="fold"${open ? ' open' : ''}><summary>${escTxt(summary)}<span class="fold-x" aria-hidden="true">+</span></summary><div class="fold-body">${body}</div></details>`;

// Aufklappbare Sektion mit optionalem Icon, für Nachschlage-Inhalte.
export const foldSec = (title, body, ic = '', open = false) =>
  `<details class="fold"${open ? ' open' : ''}><summary>${ic ? icon(ic, 'ic sec-ic') : ''}<span class="fs-title">${escTxt(title)}</span><span class="fold-x" aria-hidden="true">+</span></summary><div class="fold-body">${body}</div></details>`;
