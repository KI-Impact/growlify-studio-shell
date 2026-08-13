// Regressionstest für die Suite-Domain studio.ki-impact.de: Traefik routet dort per
// Host+PathPrefix(/marketing) MIT StripPrefix — die App sieht Pfade OHNE /marketing, bekommt
// aber X-Forwarded-Prefix: /marketing mitgeteilt. Die next-URL und die Login-/Logout-Redirects
// müssen das Präfix selbst wieder vorsetzen, sonst zeigt der 302 hinter dem StripPrefix ins
// Leere (Location ohne führendes Präfix wird vom Browser ab der Domain-Wurzel aufgelöst).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, 'fixtures', 'forwarded-prefix-app.mjs');

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
    child.on('exit', (code) => { if (code) reject(new Error('forwarded-prefix-app beendet mit Code ' + code)); });
  });
}

async function stopApp(child) {
  child.kill();
  await new Promise((r) => child.once('exit', r));
}

test('X-Forwarded-Prefix gesetzt: next-URL trägt /marketing/tiefer/pfad, Login-Redirect bleibt unter /marketing/login', async () => {
  const { child, base } = await startApp();
  try {
    const res = await fetch(base + '/tiefer/pfad', {
      redirect: 'manual',
      headers: { 'x-forwarded-proto': 'https', 'x-forwarded-prefix': '/marketing' },
    });
    assert.equal(res.status, 302);
    const location = res.headers.get('location') || '';
    assert.match(location, /^\/marketing\/login\?next=/);
    const next = new URL(location, base).searchParams.get('next');
    assert.equal(next, `https://127.0.0.1:${new URL(base).port}/marketing/tiefer/pfad`);
  } finally {
    await stopApp(child);
  }
});

test('ohne X-Forwarded-Prefix: Login-Route bleibt unverändert unter /login erreichbar', async () => {
  const { child, base } = await startApp();
  try {
    const res = await fetch(base + '/tiefer/pfad', { redirect: 'manual', headers: { 'x-forwarded-proto': 'https' } });
    assert.equal(res.status, 302);
    const location = res.headers.get('location') || '';
    assert.match(location, /^\/login\?next=/);
    const next = new URL(location, base).searchParams.get('next');
    assert.equal(next, `https://127.0.0.1:${new URL(base).port}/tiefer/pfad`);

    const loginRes = await fetch(base + '/login', { redirect: 'manual' });
    assert.equal(loginRes.status, 200);
  } finally {
    await stopApp(child);
  }
});
