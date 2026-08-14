// zentralZiel (v0.30.0): Alt-Hosts (Subdomains der SUITE_DOMAIN wie der SUITE_LEGACY_DOMAIN)
// werden auf dieselbe Route unter SUITE_ZENTRAL_URL umgeleitet; SUITE_BASE_PATH wird
// davorgehängt. Zentral-Host selbst, localhost und Fremd-Hosts bleiben unangetastet.
// Da die Konstanten beim Import aus process.env gelesen werden, läuft jede Konstellation
// in einem eigenen Node-Subprozess.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const tokens = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'tokens.mjs');

function ziel(env, host, pfad) {
  const out = execFileSync(process.execPath, [
    '--input-type=module', '-e',
    `import('${tokens}').then((m) => console.log(JSON.stringify(m.zentralZiel(${JSON.stringify(host)}, ${JSON.stringify(pfad)}))));`,
  ], { env: { ...process.env, SUITE_ZENTRAL_URL: '', SUITE_BASE_PATH: '', ...env } });
  return JSON.parse(out.toString().trim());
}

const ENV = {
  SUITE_ZENTRAL_URL: 'https://studio.ki-impact.de',
  SUITE_DOMAIN: 'dev.ki-impact.de',
  SUITE_LEGACY_DOMAIN: 'growlify.de',
};

test('Alt-Host der Legacy-Domain geht auf den Suite-Pfad', () => {
  assert.equal(ziel(ENV, 'crm.growlify.de', '/crm/kunden'), 'https://studio.ki-impact.de/crm/kunden');
});

test('Alt-Host der aktuellen SUITE_DOMAIN geht ebenfalls zentral', () => {
  assert.equal(ziel(ENV, 'finance.dev.ki-impact.de', '/finance/studio/'), 'https://studio.ki-impact.de/finance/studio/');
});

test('SUITE_BASE_PATH wird davorgehängt (Marketing-Muster)', () => {
  assert.equal(
    ziel({ ...ENV, SUITE_BASE_PATH: '/marketing' }, 'marketing.growlify.de', '/content/studio/'),
    'https://studio.ki-impact.de/marketing/content/studio/',
  );
});

test('Zentral-Host, localhost und Fremd-Hosts: kein Redirect', () => {
  assert.equal(ziel(ENV, 'studio.ki-impact.de', '/crm'), null);
  assert.equal(ziel(ENV, 'localhost', '/crm'), null);
  assert.equal(ziel(ENV, 'beispiel.de', '/crm'), null);
});

test('Ohne SUITE_ZENTRAL_URL ein No-op', () => {
  assert.equal(ziel({ ...ENV, SUITE_ZENTRAL_URL: '' }, 'crm.growlify.de', '/crm'), null);
});
