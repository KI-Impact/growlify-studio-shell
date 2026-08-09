// build-logo.mjs — erzeugt die beiden Wortmarken-Assets der Suite aus der
// verbindlichen Design-Quelle und schreibt sie nach src/assets/.
//
// Quelle: ~/Developer/ki-impact-lp/public/logo-white.png (1000x300, transparent).
// Die LP liefert NUR eine weisse Wortmarke fuer dunkle Flaechen. Da das
// System-Branding laut Hell-Regel hell ist, wird die Variante fuer helle
// Flaechen hier MECHANISCH abgeleitet, nicht gestalterisch neu gezeichnet:
//
//   - Das Mark (Mint-Kreis mit weissem KI-Glyph, x < 300) bleibt exakt wie in der LP.
//   - Nur die Wortmarke rechts davon wird von Weiss auf --ki-dark (#10221a) gesetzt.
//
// Ausfuehren mit:  node tools/build-logo.mjs
// Benoetigt sharp (devDependency). Ohne sharp: das eingecheckte Ergebnis in
// src/assets/ ist massgeblich, dieses Skript dokumentiert nur die Ableitung.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HIER = dirname(fileURLToPath(import.meta.url));
const QUELLE = join(process.env.HOME, 'Developer/ki-impact-lp/public/logo-white.png');
const ZIEL = join(HIER, '..', 'src', 'assets');

const DARK = { r: 0x10, g: 0x22, b: 0x1a };  // --ki-dark
const SPLIT = 300;   // rechte Kante des Mint-Kreises im Original (Mint endet bei x=294)
const HOEHE = 64;    // 2x der groessten Render-Hoehe (32px) — reicht fuer Retina

const sharp = (await import('sharp')).default;

const roh = sharp(readFileSync(QUELLE)).trim();  // transparenten Rand abschneiden
const { data, info } = await roh.raw().toBuffer({ resolveWithObject: true });

// Weiss -> DARK, aber nur rechts vom Mark. Alpha bleibt unangetastet.
for (let y = 0; y < info.height; y++) {
  for (let x = SPLIT; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels;
    if (data[i + 3] && data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) {
      data[i] = DARK.r; data[i + 1] = DARK.g; data[i + 2] = DARK.b;
    }
  }
}

const breite = Math.round((info.width * HOEHE) / info.height);
const opts = { width: breite, height: HOEHE };

await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
  .resize(opts).png({ palette: true, colours: 32 })
  .toFile(join(ZIEL, 'logo-ki-impact-dark.png'));

await sharp(readFileSync(QUELLE)).trim().resize(opts).png({ palette: true, colours: 32 })
  .toFile(join(ZIEL, 'logo-ki-impact-white.png'));

console.log(`geschrieben: ${breite}x${HOEHE} nach ${ZIEL}`);
