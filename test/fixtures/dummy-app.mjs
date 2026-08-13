// Dummy-Studio für den SUITE_BASE_PATH-Selbstcheck (test/base-path.test.mjs).
// Startet einen Express-Server mit mountSuiteAuth und gibt "PORT <n>" auf stdout aus,
// sobald er lauscht — der Test-Prozess liest das ab, statt einen Port zu raten.
import express from 'express';
import { mountSuiteAuth } from '../../src/auth.mjs';

const app = express();
mountSuiteAuth(app, {
  authSecret: 'test-secret',
  cookieDomain: '',
  validate: async (email, password) => (password === 'geheim' ? { uid: 'u1', tenant: 't1', role: 'owner' } : null),
});
app.get('/', (req, res) => res.type('text').send('studio-home'));

const server = app.listen(0, () => {
  console.log('PORT ' + server.address().port);
});
