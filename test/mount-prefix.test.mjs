// Regressionstest für den live reproduzierten Bug: eine per root.use('/demo', app)
// gemountete App leitete Unangemeldete mit falscher next-URL zum Login — Mount-Präfix
// fehlte (req.url/req.path statt req.originalUrl) und das Protokoll war fest http statt
// aus x-forwarded-proto gelesen (hinter Traefik immer https).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, 'fixtures', 'mount-app.mjs');

function startApp() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fixture], { stdio: ['ignore', 'pipe', 'inherit'] });
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d.toString();
      const m = buf.match(/PORT (\d+)/);
      if (m) resolve({ child, port: Number(m[1]), base: `http://127.0.0.1:${m[1]}` });
    });
    child.on('error', reject);
    child.on('exit', (code) => { if (code) reject(new Error('mount-app beendet mit Code ' + code)); });
  });
}

async function stopApp(child) {
  child.kill();
  await new Promise((r) => child.once('exit', r));
}

test('gemountete App unter /demo: next-URL trägt Präfix + Protokoll aus x-forwarded-proto', async () => {
  const { child, base } = await startApp();
  try {
    const res = await fetch(base + '/demo/tiefer/pfad', {
      redirect: 'manual',
      headers: { 'x-forwarded-proto': 'https' },
    });
    assert.equal(res.status, 302);
    const location = res.headers.get('location') || '';
    // Der lokale Login selbst liegt unter /login (SUITE_BASE_PATH ist im Doppel-Mount-Muster
    // bewusst leer, siehe tokens.mjs) — Gegenstand dieses Tests ist allein die next-URL.
    assert.match(location, /^\/login\?next=/);
    const next = new URL(location, base).searchParams.get('next');
    assert.match(next, /^https:\/\/127\.0\.0\.1:\d+\/demo\/tiefer\/pfad$/);
  } finally {
    await stopApp(child);
  }
});
