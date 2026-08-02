// auth.mjs — Suite-Auth (Stufe 1: zentraler Login).
//
// EIN kombiniertes Express-Middleware-Modul, das zwei Modi kennt:
//   - AUTH_SECRET gesetzt  → Suite-Session: signiertes Cookie auf .growlify.de, eine Login-Maske,
//     nahtloser Modulwechsel ohne erneuten Prompt.
//   - AUTH_SECRET NICHT gesetzt → exakt das bisherige Verhalten: Basic-Auth via password (ADMIN_PASSWORD),
//     bzw. offen, wenn auch kein password gesetzt ist.
// Dadurch ist der Code gefahrlos vorab deploybar (schläft, bis AUTH_SECRET gesetzt wird).
//
// Session-Token = base64url(JSON{uid,tenant,role,exp}) + '.' + HMAC-SHA256(secret). Stateless, kein Store.
// Trägt ab Tag 1 {uid,tenant,role} → Stufe 2 (Marcus/Rollen) und Stufe 3 (Mandanten) ohne Auth-Umbau.

import crypto from 'node:crypto';

const COOKIE = 'gf_session';
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const safeEqual = (a, b) => {
  const ab = Buffer.from(String(a)), bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

export function signSession(payload, secret) {
  const body = b64u(JSON.stringify(payload));
  const mac = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${mac}`;
}

export function verifySession(token, secret) {
  if (!token || !secret || token.indexOf('.') < 0) return null;
  const i = token.lastIndexOf('.');
  const body = token.slice(0, i), mac = token.slice(i + 1);
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (p.exp && Date.now() > p.exp) return null;
    return p;
  } catch { return null; }
}

function readCookie(req, name = COOKIE) {
  const m = (req.headers.cookie || '').match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}
function cookieHeader(token, { domain, maxAge = 60 * 60 * 24 * 30, clear = false } = {}) {
  let c = `${COOKIE}=${clear ? '' : token}; Path=/; HttpOnly; SameSite=Lax`;
  c += clear ? '; Max-Age=0' : `; Max-Age=${maxAge}`;
  if (domain) c += `; Domain=${domain}`;
  c += '; Secure';
  return c;
}
// Body eines Form-Posts selbst parsen (unabhängig davon, ob die App urlencoded gemountet hat).
function readBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let s = '';
    req.on('data', (d) => { s += d; if (s.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const out = {};
      for (const part of s.split('&')) { const [k, v] = part.split('='); if (k) out[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' ')); }
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}

// Passwort-Hashing (scrypt, eingebaut, kein Dependency). Format: scrypt$<salt-hex>$<hash-hex>.
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(pw), salt, 32);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
export function verifyPassword(pw, stored) {
  if (!stored || !String(stored).startsWith('scrypt$')) return false;
  const [, saltHex, hashHex] = String(stored).split('$');
  try {
    const hash = crypto.scryptSync(String(pw), Buffer.from(saltHex, 'hex'), 32);
    const expected = Buffer.from(hashHex, 'hex');
    return hash.length === expected.length && crypto.timingSafeEqual(hash, expected);
  } catch { return false; }
}

export function loginPage({ title = 'Growlify Suite', next = '', error = false, action = '/login', withEmail = false } = {}) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Anmelden · ${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box} body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#FAFAF9;color:#18221B;font-family:'Plus Jakarta Sans',system-ui,sans-serif}
.card{background:#fff;border:1px solid rgba(24,34,27,.07);border-radius:20px;box-shadow:0 1px 3px rgba(24,34,27,.05),0 18px 44px rgba(24,34,27,.06);padding:34px 32px;width:min(380px,92vw)}
.wm{font-size:26px;font-weight:700;letter-spacing:-.02em;background:linear-gradient(135deg,#13E489,#23B2CF);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{font-size:13px;color:#6C756D;margin:2px 0 22px}
label{display:block;font-size:12.5px;font-weight:600;color:#3C463E;margin:0 0 6px}
input{width:100%;font:inherit;font-size:15px;padding:11px 13px;border:1px solid rgba(24,34,27,.12);border-radius:12px;background:#FAFAF9}
input:focus{outline:none;border-color:#23B2CF;background:#fff}
button{width:100%;margin-top:16px;background:linear-gradient(135deg,#13E489,#23B2CF);color:#fff;border:0;border-radius:12px;padding:12px;font:inherit;font-size:15px;font-weight:700;cursor:pointer}
.err{font-size:12.5px;color:#B4231F;margin-top:10px;min-height:1em}
</style></head><body>
<form class="card" method="post" action="${action}">
  <div class="wm">growlify</div><div class="sub">Suite-Anmeldung</div>
  <input type="hidden" name="next" value="${String(next).replace(/"/g, '&quot;')}">
  ${withEmail ? `<label for="em">E-Mail</label>
  <input id="em" name="email" type="email" autocomplete="username" autofocus style="margin-bottom:14px">` : ''}
  <label for="pw">Passwort</label>
  <input id="pw" name="password" type="password" autocomplete="current-password"${withEmail ? '' : ' autofocus'}>
  <button type="submit">Anmelden</button>
  <div class="err">${error ? 'Anmeldung fehlgeschlagen.' : ''}</div>
</form></body></html>`;
}

// Hängt Login-Routen + Gate-Middleware an die App. Aufruf FRÜH (vor den eigentlichen Routen).
// opts: { authSecret, cookieDomain, password, realm, title, open=[], openPrefix=[], bypass, loginPath='/login' }
export function mountSuiteAuth(app, opts = {}) {
  const {
    authSecret, cookieDomain, password, realm = 'growlify', title = 'Growlify Suite',
    open = [], openPrefix = [], bypass, loginPath = '/login',
    validate, loginUrl,
  } = opts;
  // validate(email, password) → Session-Payload {uid,tenant,role,name} | null  (echte Nutzerverwaltung, im Brain)
  // loginUrl: externe Login-URL (z.B. das Brain), wohin nicht-autoritative Apps unangemeldet umleiten.
  //
  // MANDANTEN-SCHRANKE (v0.17.0): Der Passwort-Login ohne validate-Hook mintete früher eine
  // Session mit fest verdrahtetem tenant 'mavisio'. In einer mandantenfähigen Suite ist das
  // falsch: eine App würde einen Mandanten behaupten, den ihre Datenbank gar nicht kennt, und
  // unter Row Level Security still leer laufen. Deshalb gilt jetzt:
  //   authSecret gesetzt  → NUR validate darf eine Session minten. Apps ohne validate sind
  //                         nicht-autoritativ und schicken ihre Nutzer über loginUrl zum Brain.
  //   authSecret NICHT gesetzt → unverändert das alte Basic-Auth-Verhalten über `password`.
  // Damit bleibt der Rückfallweg für den Betrieb ohne Session vollständig erhalten, und es
  // gibt keinen Pfad mehr, der einen Mandanten errät.
  const passwortLoginErlaubt = !authSecret;
  if (authSecret && !validate && !loginUrl) {
    // Diese Kombination sperrt jeden aus: Session-Betrieb, keine eigene Nutzerprüfung und kein
    // Ort, an den umgeleitet werden könnte. Laut statt still, sonst sucht man lange.
    console.warn('[suite-auth] AUTH_SECRET gesetzt, aber weder validate noch loginUrl: niemand kann sich anmelden.');
  }
  const logoutPath = loginPath + '/logout';
  // /suite/sichtbarkeit prüft sich selbst: ohne Cookie antwortet es "nichts ausblenden".
  // Es MUSS offen sein, sonst liefert die Auth-Umleitung dem fetch HTML statt JSON.
  const openSet = new Set([...open, loginPath, logoutPath, '/suite/sichtbarkeit']);
  const isOpen = (p) => openSet.has(p) || openPrefix.some((pre) => p.startsWith(pre));

  app.get(loginPath, (req, res) => {
    if (authSecret && verifySession(readCookie(req), authSecret)) return res.redirect(302, req.query.next || '/');
    if (loginUrl) return res.redirect(302, loginUrl + (req.query.next ? '?next=' + encodeURIComponent(req.query.next) : ''));
    // Ohne validate und ohne erlaubten Passwort-Login gäbe die Maske ein Feld aus, das nichts
    // mehr bewirkt. Dann lieber eine ehrliche Ansage als ein Formular, das immer fehlschlägt.
    if (authSecret && !validate) {
      return res.status(503).type('html').send(loginPage({ title, next: '', error: true, action: loginPath, withEmail: false }));
    }
    res.type('html').send(loginPage({ title, next: req.query.next || '', error: req.query.e === '1', action: loginPath, withEmail: !!validate }));
  });
  app.post(loginPath, async (req, res) => {
    const body = await readBody(req);
    const next = body.next || req.query.next || '/';
    let payload = null;
    if (validate) {
      try { payload = await validate(body.email, body.password); } catch { payload = null; }
    } else if (passwortLoginErlaubt && password && body.password && safeEqual(body.password, password)) {
      payload = { uid: 'admin', tenant: 'mavisio', role: 'owner' };
    }
    if (authSecret && payload) {
      const token = signSession({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 }, authSecret);
      res.set('Set-Cookie', cookieHeader(token, { domain: cookieDomain }));
      return res.redirect(302, next);
    }
    res.redirect(302, `${loginPath}?e=1${next ? '&next=' + encodeURIComponent(next) : ''}`);
  });
  // Same-Origin-Proxy für die Modul-Sichtbarkeit (v0.18.0).
  //
  // Warum ein Proxy und nicht ein direkter Aufruf des Brains aus dem Browser: das
  // Session-Cookie trägt SameSite=Lax und würde bei einem Cross-Origin-fetch gar nicht
  // mitgeschickt. Der Studio-Server hat es dagegen ohnehin in der Hand und reicht es weiter.
  // Damit autorisiert das Brain den echten Nutzer, nicht das Studio, und es braucht kein
  // zusätzliches Vertrauensverhältnis zwischen den Apps.
  //
  // Liegt hier in mountSuiteAuth, damit jedes Studio die Route allein durch den
  // Versionssprung bekommt und keine eigene Zeile Code braucht.
  const brainUrl = (opts.brainUrl || (loginUrl ? loginUrl.replace(/\/login\/?$/, '') : '')).replace(/\/$/, '');
  // Der restriktive Rückfall nimmt einem angemeldeten Nutzer sichtbar Module weg. Das darf
  // nicht still passieren, sonst sucht bei einem fehlenden SUITE_LOGIN_URL oder einem
  // Brain-Ausfall niemand an der richtigen Stelle. Gedrosselt auf eine Meldung je Minute,
  // damit ein längerer Ausfall das Log nicht flutet.
  let letzteWarnung = 0;
  const warnUndRestriktiv = (grund, antwort) => {
    const jetzt = Date.now();
    if (jetzt - letzteWarnung > 60000) {
      letzteWarnung = jetzt;
      console.warn(`[suite-sichtbarkeit] Rückfall auf eigenes Studio + Brain: ${grund || 'unbekannt'}`);
    }
    return antwort;
  };
  app.get('/suite/sichtbarkeit', async (req, res) => {
    // Zwei unterschiedliche Fehlerfälle: fehlt das Session-Cookie ganz, ist der Nutzer noch
    // gar nicht angemeldet, dann bleibt es beim alten "nichts ausblenden" (alle: true).
    // Ist eine Session da, aber die Brain-Antwort kommt nicht zustande (kein brainUrl,
    // !r.ok, Timeout, Exception, kein Objekt), fällt es restriktiv zurück (streng: true,
    // leeres module). Zusammen mit der Client-Regel bleiben dann nur das eigene Studio und
    // Brain stehen statt der vollen Liste, das ist für einen Fremdmandanten das sicherere
    // Verhalten als "alles anzeigen".
    const offen = { ok: false, alle: true, module: {} };
    const restriktiv = { ok: false, alle: false, streng: true, module: {} };
    const cookie = req.headers.cookie || '';
    if (!cookie.includes(COOKIE + '=')) return res.json(offen);
    if (!brainUrl) return res.json(warnUndRestriktiv('kein brainUrl (SUITE_LOGIN_URL fehlt)', restriktiv));
    try {
      const r = await fetch(brainUrl + '/business/api/sichtbarkeit', {
        headers: { cookie }, redirect: 'manual', signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) return res.json(warnUndRestriktiv('Brain antwortet ' + r.status, restriktiv));
      const j = await r.json();
      res.set('cache-control', 'private, max-age=60');
      if (!j || typeof j !== 'object') return res.json(warnUndRestriktiv('Antwort ist kein Objekt', restriktiv));
      return res.json(j);
    } catch (err) { return res.json(warnUndRestriktiv(err && err.message, restriktiv)); }
  });

  const doLogout = (req, res) => { res.set('Set-Cookie', cookieHeader('', { domain: cookieDomain, clear: true })); res.redirect(302, loginPath); };
  app.get(logoutPath, doLogout);
  app.post(logoutPath, doLogout);

  app.use((req, res, next) => {
    const p = req.path;
    if (p === loginPath || p === logoutPath || isOpen(p)) return next();
    if (bypass && bypass(req)) return next();
    if (authSecret) { // Suite-Session-Modus
      const sess = verifySession(readCookie(req), authSecret);
      if (sess) { req.suiteUser = sess; return next(); }
      const target = loginUrl || loginPath; // externe Login-URL (Brain) oder lokale Maske
      if (req.method === 'GET') return res.redirect(302, target + '?next=' + encodeURIComponent(loginUrl ? (req.protocol + '://' + req.get('host') + req.originalUrl) : req.originalUrl));
      return res.status(401).end('Anmeldung erforderlich');
    }
    if (password) { // Fallback: bisheriges Basic-Auth (exakt wie zuvor)
      const [, b64] = (req.headers.authorization || '').split(' ');
      const decoded = b64 ? Buffer.from(b64, 'base64').toString() : '';
      const pass = decoded.slice(decoded.indexOf(':') + 1);
      if (pass && safeEqual(pass, password)) return next();
      return res.set('WWW-Authenticate', `Basic realm="${realm}"`).status(401).end('Auth erforderlich');
    }
    return next(); // weder Secret noch Passwort → offen (heutiges Verhalten von content)
  });
}
