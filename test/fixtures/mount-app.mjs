// Dummy-Studio für den Mount-Präfix-Test (test/mount-prefix.test.mjs).
// Bildet das reale Bug-Szenario nach: root.use('/demo', app) — die App selbst kennt
// SUITE_BASE_PATH nicht, sie wird per Express-Mount unter einem Präfix betrieben.
import express from 'express';
import { mountSuiteAuth } from '../../src/auth.mjs';

const inner = express();
mountSuiteAuth(inner, {
  authSecret: 'test-secret',
  cookieDomain: '',
  validate: async (email, password) => (password === 'geheim' ? { uid: 'u1', tenant: 't1', role: 'owner' } : null),
});
inner.get('/tiefer/pfad', (req, res) => res.type('text').send('geschuetzt'));

const root = express();
root.use('/demo', inner);

const server = root.listen(0, () => {
  console.log('PORT ' + server.address().port);
});
