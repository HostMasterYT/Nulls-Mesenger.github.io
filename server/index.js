import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();
app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 8080;
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI || `http://localhost:${PORT}/auth/facebook/callback`;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:4173';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 30);

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));

const dataDir = path.join(process.cwd(), 'data');
const usersPath = path.join(dataDir, 'users.json');

const oauthStates = new Map();
const pendingCodes = new Map();

async function ensureStorage() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(usersPath);
  } catch {
    const seed = [
      {
        id: 'seed-1',
        username: 'friend1',
        phone: '+79990000001',
        email: 'friend1@example.com',
        passwordHash: hashPassword('123456'),
        verified: true,
        provider: 'Local',
      },
    ];
    await fs.writeFile(usersPath, JSON.stringify(seed, null, 2));
  }
}

async function readUsers() {
  await ensureStorage();
  const raw = await fs.readFile(usersPath, 'utf8');
  return JSON.parse(raw);
}

async function writeUsers(users) {
  await ensureStorage();
  await fs.writeFile(usersPath, JSON.stringify(users, null, 2));
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function createSessionToken(userId) {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifySessionToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  const payload = `${userId}.${expStr}`;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  if (expected !== sig) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  return { userId, exp };
}

function setSessionCookie(res, userId) {
  const token = createSessionToken(userId);
  res.cookie('nm_auth', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

async function getCurrentUser(req) {
  const token = req.cookies.nm_auth;
  const parsed = verifySessionToken(token);
  if (!parsed) return null;
  const users = await readUsers();
  return users.find((u) => u.id === parsed.userId && u.verified) || null;
}

function requireAuth(req, res, next) {
  getCurrentUser(req)
    .then((user) => {
      if (!user) return res.status(401).json({ error: 'unauthorized' });
      req.user = user;
      return next();
    })
    .catch(() => res.status(500).json({ error: 'internal_error' }));
}

function sendVerificationCode(channel, target, code) {
  console.log(`[VERIFICATION:${channel}] ${target} -> code: ${code}`);
}

app.post('/auth/register/request-code', async (req, res) => {
  const { username, phone, email, password, channel } = req.body || {};
  if (!username || !phone || !password) {
    return res.status(400).json({ error: 'username, phone, password required' });
  }

  const users = await readUsers();
  if (users.some((u) => u.phone === phone)) return res.status(409).json({ error: 'phone already registered' });
  if (email && users.some((u) => u.email === email)) return res.status(409).json({ error: 'email already registered' });

  const selectedChannel = channel === 'email' && email ? 'email' : 'phone';
  const target = selectedChannel === 'email' ? email : phone;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const key = `${selectedChannel}:${target}`;

  pendingCodes.set(key, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
    payload: { username, phone, email: email || '', passwordHash: hashPassword(password) },
  });

  sendVerificationCode(selectedChannel, target, code);
  return res.json({ ok: true, channel: selectedChannel, target, expiresIn: 300, dev_code: code });
});

app.post('/auth/register/confirm', async (req, res) => {
  const { channel, target, code } = req.body || {};
  const selectedChannel = channel === 'email' ? 'email' : 'phone';
  const key = `${selectedChannel}:${target || ''}`;
  const pending = pendingCodes.get(key);
  if (!pending) return res.status(400).json({ error: 'code_not_found' });
  if (Date.now() > pending.expiresAt) {
    pendingCodes.delete(key);
    return res.status(400).json({ error: 'code_expired' });
  }
  if (String(code || '') !== pending.code) return res.status(400).json({ error: 'invalid_code' });

  const users = await readUsers();
  if (users.some((u) => u.phone === pending.payload.phone)) return res.status(409).json({ error: 'phone already registered' });

  const user = {
    id: crypto.randomUUID(),
    username: pending.payload.username,
    name: pending.payload.username,
    phone: pending.payload.phone,
    email: pending.payload.email,
    passwordHash: pending.payload.passwordHash,
    verified: true,
    provider: 'Local',
  };
  users.push(user);
  await writeUsers(users);
  pendingCodes.delete(key);

  setSessionCookie(res, user.id);
  return res.json({ user: { id: user.id, provider: 'Local', name: user.name, phone: user.phone, email: user.email } });
});

app.post('/auth/login', async (req, res) => {
  const { username, phone, email, password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'password required' });

  const users = await readUsers();
  const user = users.find((u) => (phone && u.phone === phone) || (email && u.email === email) || (username && u.username === username));
  if (!user || user.passwordHash !== hashPassword(password)) return res.status(401).json({ error: 'invalid credentials' });
  if (!user.verified) return res.status(403).json({ error: 'user_not_verified' });

  setSessionCookie(res, user.id);
  return res.json({ user: { id: user.id, provider: user.provider || 'Local', name: user.name, phone: user.phone, email: user.email } });
});

app.get('/users/by-phone', requireAuth, async (req, res) => {
  const phone = String(req.query.phone || '');
  const users = await readUsers();
  const user = users.find((u) => u.phone === phone && u.verified);
  if (!user) return res.status(404).json({ error: 'not found' });
  return res.json({ user: { id: user.id, name: user.name, phone: user.phone, email: user.email } });
});

app.get('/auth/facebook/start', (req, res) => {
  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    return res.status(500).send('Configure FACEBOOK_APP_ID and FACEBOOK_APP_SECRET first.');
  }
  const nonce = crypto.randomBytes(16).toString('hex');
  const returnTo = req.query.return_to || FRONTEND_ORIGIN;
  oauthStates.set(nonce, { returnTo, createdAt: Date.now() });

  const oauthUrl = new URL('https://www.facebook.com/v25.0/dialog/oauth');
  oauthUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
  oauthUrl.searchParams.set('redirect_uri', FACEBOOK_REDIRECT_URI);
  oauthUrl.searchParams.set('state', JSON.stringify({ st: nonce, ds: Date.now() }));
  oauthUrl.searchParams.set('response_type', 'code');
  oauthUrl.searchParams.set('scope', 'email,public_profile');
  res.redirect(oauthUrl.toString());
});

app.get('/auth/facebook/callback', async (req, res) => {
  const { code, error, error_reason, error_description } = req.query;
  if (error || error_reason) {
    const url = new URL(FRONTEND_ORIGIN);
    url.searchParams.set('error', String(error || error_reason));
    if (error_description) url.searchParams.set('error_description', String(error_description));
    return res.redirect(url.toString());
  }

  let parsedState;
  try {
    parsedState = JSON.parse(String(req.query.state || '{}'));
  } catch {
    parsedState = null;
  }
  if (!parsedState?.st || !oauthStates.has(parsedState.st)) return res.status(400).send('Invalid OAuth state.');
  const stateInfo = oauthStates.get(parsedState.st);
  oauthStates.delete(parsedState.st);

  const tokenUrl = new URL('https://graph.facebook.com/v25.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
  tokenUrl.searchParams.set('redirect_uri', FACEBOOK_REDIRECT_URI);
  tokenUrl.searchParams.set('client_secret', FACEBOOK_APP_SECRET);
  tokenUrl.searchParams.set('code', String(code || ''));

  const tokenResponse = await fetch(tokenUrl);
  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenPayload.access_token) return res.status(400).json({ error: 'Failed to exchange code', details: tokenPayload });

  const appToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
  const debugUrl = new URL('https://graph.facebook.com/debug_token');
  debugUrl.searchParams.set('input_token', tokenPayload.access_token);
  debugUrl.searchParams.set('access_token', appToken);
  const debugResponse = await fetch(debugUrl);
  const debugPayload = await debugResponse.json();
  if (!debugResponse.ok || !debugPayload?.data?.is_valid) return res.status(400).json({ error: 'Token validation failed', details: debugPayload });

  const meUrl = new URL('https://graph.facebook.com/me');
  meUrl.searchParams.set('fields', 'id,name,email,picture');
  meUrl.searchParams.set('access_token', tokenPayload.access_token);
  const meResponse = await fetch(meUrl);
  const mePayload = await meResponse.json();
  if (!meResponse.ok || !mePayload?.id) return res.status(400).json({ error: 'Failed to read Facebook profile', details: mePayload });

  const users = await readUsers();
  let user = users.find((u) => u.provider === 'Facebook' && u.facebookId === mePayload.id);
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      username: `fb_${mePayload.id}`,
      name: mePayload.name,
      phone: '',
      email: mePayload.email || '',
      passwordHash: '',
      verified: true,
      provider: 'Facebook',
      facebookId: mePayload.id,
      picture: mePayload.picture?.data?.url || '',
    };
    users.push(user);
    await writeUsers(users);
  }

  setSessionCookie(res, user.id);
  return res.redirect(stateInfo.returnTo || FRONTEND_ORIGIN);
});

app.get('/me', async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ user: null });
  return res.json({ user: { id: user.id, provider: user.provider, name: user.name, phone: user.phone, email: user.email } });
});

app.post('/auth/logout', (req, res) => {
  res.clearCookie('nm_auth');
  res.status(204).end();
});

ensureStorage().then(() => {
  app.listen(PORT, () => {
    console.log(`Auth server listening on http://localhost:${PORT}`);
  });
});
