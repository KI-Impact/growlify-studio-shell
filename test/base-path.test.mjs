// Selbstcheck SUITE_BASE_PATH (vNext): startet das Dummy-Studio (test/fixtures/dummy-app.mjs)
// einmal ohne und einmal mit SUITE_BASE_PATH=/demo und prüft:
//   - ohne Präfix: Login-Route unter /login erreichbar, Redirect nach Login-POST auf '/'
//     (byte-identisches Alt-Verhalten)
//   - mit Präfix: Login-Route unter /demo/login erreichbar, Redirect trägt das Präfix
//     (/demo/…), /login (ohne Präfix) ist NICHT mehr die aktive Route
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, 'fixtures', 'dummy-app.mjs');

function startApp(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fixture], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'inherit'] });
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d.toString();
      const m = buf.match(/PORT (\d+)/);
      if (m) resolve({ child, port: Number(m[1]), base: `http://127.0.0.1:${m[1]}` });
    });
    child.on('error', reject);
    child.on('exit', (code) => { if (code) reject(new Error('dummy-app beendet mit Code ' + code)); });
  });
}

async function stopApp(child) {
  child.kill();
  await new Promise((r) => child.once('exit', r));
}

test('ohne SUITE_BASE_PATH: Login unter /login, Redirect auf /', async () => {
  const { child, base } = await startApp({ SUITE_BASE_PATH: '' });
  try {
    const loginGet = await fetch(base + '/login', { redirect: 'manual' });
    assert.equal(loginGet.status, 200);

    const loginPost = await fetch(base + '/login', {
      method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'email=a@b.de&password=geheim',
    });
    assert.equal(loginPost.status, 302);
    assert.equal(loginPost.headers.get('location'), '/');
    assert.match(loginPost.headers.get('set-cookie') || '', /gf_session=/);

    const sicht = await fetch(base + '/suite/sichtbarkeit');
    assert.equal(sicht.status, 200);
  } finally {
    await stopApp(child);
  }
});

test('mit SUITE_BASE_PATH=/demo: Login unter /demo/login, Redirect trägt Präfix', async () => {
  const { child, base } = await startApp({ SUITE_BASE_PATH: '/demo' });
  try {
    const loginGet = await fetch(base + '/demo/login', { redirect: 'manual' });
    assert.equal(loginGet.status, 200);

    // Die unprefixte Route existiert unter reinem Präfix-Betrieb nicht mehr als aktive
    // Login-Seite — das Gate greift und schickt sie zur echten (prefixed) Login-Seite.
    const loginGetUnprefixed = await fetch(base + '/login', { redirect: 'manual' });
    assert.equal(loginGetUnprefixed.status, 302);
    assert.match(loginGetUnprefixed.headers.get('location') || '', /^\/demo\/login/);

    const loginPost = await fetch(base + '/demo/login', {
      method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'email=a@b.de&password=geheim',
    });
    assert.equal(loginPost.status, 302);
    assert.equal(loginPost.headers.get('location'), '/demo');
    assert.match(loginPost.headers.get('set-cookie') || '', /gf_session=/);

    const sicht = await fetch(base + '/demo/suite/sichtbarkeit');
    assert.equal(sicht.status, 200);
  } finally {
    await stopApp(child);
  }
});
