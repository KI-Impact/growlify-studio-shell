// Dummy-Studio für den X-Forwarded-Prefix-Test (test/forwarded-prefix.test.mjs).
// Bildet das StripPrefix-Szenario nach: Traefik routet studio.ki-impact.de/marketing/* per
// Host+PathPrefix MIT StripPrefix auf diese App — die App sieht Pfade OHNE das Präfix (kein
// root.use('/marketing', app) wie beim Mount-Präfix-Test), bekommt es aber im Header
// X-Forwarded-Prefix mitgeteilt. Die App selbst kennt keinerlei Präfix (kein SUITE_BASE_PATH,
// kein Express-Mount) — läuft exakt wie heute unter marketing.growlify.de, nur der Header kommt
// on top.
import express from 'express';
import { mountSuiteAuth } from '../../src/auth.mjs';

const app = express();
mountSuiteAuth(app, {
  authSecret: 'test-secret',
  cookieDomain: '',
  validate: async (email, password) => (password === 'geheim' ? { uid: 'u1', tenant: 't1', role: 'owner' } : null),
});
app.get('/tiefer/pfad', (req, res) => res.type('text').send('geschuetzt'));

const server = app.listen(0, () => {
  console.log('PORT ' + server.address().port);
});
