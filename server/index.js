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
const VK_CLIENT_ID = process.env.VK_CLIENT_ID || '';
const VK_CLIENT_SECRET = process.env.VK_CLIENT_SECRET || '';
const VK_REDIRECT_URI = process.env.VK_REDIRECT_URI || `http://localhost:${PORT}/auth/vk/callback`;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:4173';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 30);

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));

const dataDir = path.join(process.cwd(), 'data');
const usersPath = path.join(dataDir, 'users.json');
const chatsPath = path.join(dataDir, 'chats.json');
const oauthStates = new Map();
const pendingCodes = new Map();

function hashPassword(password) { return crypto.createHash('sha256').update(password).digest('hex'); }

async function ensureStorage() {
  await fs.mkdir(dataDir, { recursive: true });
  try { await fs.access(usersPath); } catch {
    const seedUsers = [
      { id: 'seed-1', username: 'friend1', name: 'Friend One', phone: '+79990000001', email: 'friend1@example.com', passwordHash: hashPassword('123456'), verified: true, provider: 'Local' },
      { id: 'seed-2', username: 'friend2', name: 'Friend Two', phone: '+79990000002', email: 'friend2@example.com', passwordHash: hashPassword('123456'), verified: true, provider: 'Local' },
    ];
    await fs.writeFile(usersPath, JSON.stringify(seedUsers, null, 2));
  }
  try { await fs.access(chatsPath); } catch {
    await fs.writeFile(chatsPath, JSON.stringify([], null, 2));
  }
}

async function readUsers() { await ensureStorage(); return JSON.parse(await fs.readFile(usersPath, 'utf8')); }
async function writeUsers(users) { await fs.writeFile(usersPath, JSON.stringify(users, null, 2)); }
async function readChats() { await ensureStorage(); return JSON.parse(await fs.readFile(chatsPath, 'utf8')); }
async function writeChats(chats) { await fs.writeFile(chatsPath, JSON.stringify(chats, null, 2)); }

function createSessionToken(userId) {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}
function verifySessionToken(token) {
  if (!token) return null;
  const [userId, expStr, sig] = token.split('.');
  if (!userId || !expStr || !sig) return null;
  const payload = `${userId}.${expStr}`;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  if (sig !== expected) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  return { userId };
}
function setSessionCookie(res, userId) {
  res.cookie('nm_auth', createSessionToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

async function getCurrentUser(req) {
  const parsed = verifySessionToken(req.cookies.nm_auth);
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

function createOauthState(returnTo) {
  const st = crypto.randomBytes(16).toString('hex');
  oauthStates.set(st, { returnTo, createdAt: Date.now() });
  return JSON.stringify({ st, ds: Date.now() });
}
function consumeOauthState(stateParam) {
  let parsed;
  try { parsed = JSON.parse(String(stateParam || '{}')); } catch { return null; }
  if (!parsed?.st || !oauthStates.has(parsed.st)) return null;
  const state = oauthStates.get(parsed.st);
  oauthStates.delete(parsed.st);
  return state;
}

app.post('/auth/register/request-code', async (req, res) => {
  const { username, phone, email, password, channel } = req.body || {};
  if (!username || !phone || !password) return res.status(400).json({ error: 'username, phone, password required' });

  const users = await readUsers();
  if (users.some((u) => u.phone === phone)) return res.status(409).json({ error: 'phone already registered' });
  if (email && users.some((u) => u.email === email)) return res.status(409).json({ error: 'email already registered' });

  const selectedChannel = channel === 'email' && email ? 'email' : 'phone';
  const target = selectedChannel === 'email' ? email : phone;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  pendingCodes.set(`${selectedChannel}:${target}`, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
    payload: { username, phone, email: email || '', passwordHash: hashPassword(password) },
  });
  sendVerificationCode(selectedChannel, target, code);
  res.json({ ok: true, channel: selectedChannel, target, expiresIn: 300, dev_code: code });
});

app.post('/auth/register/confirm', async (req, res) => {
  const { channel, target, code } = req.body || {};
  const selectedChannel = channel === 'email' ? 'email' : 'phone';
  const key = `${selectedChannel}:${target || ''}`;
  const pending = pendingCodes.get(key);
  if (!pending) return res.status(400).json({ error: 'code_not_found' });
  if (Date.now() > pending.expiresAt) { pendingCodes.delete(key); return res.status(400).json({ error: 'code_expired' }); }
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
  res.json({ user: { id: user.id, provider: 'Local', name: user.name, phone: user.phone, email: user.email } });
});

app.post('/auth/login', async (req, res) => {
  const { username, phone, email, password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'password required' });

  const users = await readUsers();
  const user = users.find((u) => (phone && u.phone === phone) || (email && u.email === email) || (username && u.username === username));
  if (!user || user.passwordHash !== hashPassword(password)) return res.status(401).json({ error: 'invalid_credentials' });
  if (!user.verified) return res.status(403).json({ error: 'user_not_verified' });

  setSessionCookie(res, user.id);
  res.json({ user: { id: user.id, provider: user.provider || 'Local', name: user.name, phone: user.phone, email: user.email } });
});

app.get('/auth/facebook/start', (req, res) => {
  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) return res.status(500).send('Configure FACEBOOK_APP_ID and FACEBOOK_APP_SECRET first.');

  const oauthUrl = new URL('https://www.facebook.com/v25.0/dialog/oauth');
  oauthUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
  oauthUrl.searchParams.set('redirect_uri', FACEBOOK_REDIRECT_URI);
  oauthUrl.searchParams.set('response_type', 'code');
  oauthUrl.searchParams.set('scope', 'email,public_profile');
  oauthUrl.searchParams.set('state', createOauthState(req.query.return_to || FRONTEND_ORIGIN));
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

  const state = consumeOauthState(req.query.state);
  if (!state) return res.status(400).send('Invalid OAuth state.');

  const tokenUrl = new URL('https://graph.facebook.com/v25.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
  tokenUrl.searchParams.set('redirect_uri', FACEBOOK_REDIRECT_URI);
  tokenUrl.searchParams.set('client_secret', FACEBOOK_APP_SECRET);
  tokenUrl.searchParams.set('code', String(code || ''));

  const tokenResponse = await fetch(tokenUrl);
  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenPayload.access_token) return res.status(400).json({ error: 'facebook_exchange_failed', details: tokenPayload });

  const profileUrl = new URL('https://graph.facebook.com/me');
  profileUrl.searchParams.set('fields', 'id,name,email,picture');
  profileUrl.searchParams.set('access_token', tokenPayload.access_token);

  const profileResponse = await fetch(profileUrl);
  const me = await profileResponse.json();
  if (!profileResponse.ok || !me?.id) return res.status(400).json({ error: 'facebook_profile_failed', details: me });

  const users = await readUsers();
  let user = users.find((u) => u.provider === 'Facebook' && u.facebookId === me.id);
  if (!user) {
    user = {
      id: crypto.randomUUID(), username: `fb_${me.id}`, name: me.name, phone: '', email: me.email || '', passwordHash: '', verified: true, provider: 'Facebook', facebookId: me.id,
    };
    users.push(user);
    await writeUsers(users);
  }

  setSessionCookie(res, user.id);
  res.redirect(state.returnTo || FRONTEND_ORIGIN);
});

app.get('/auth/vk/start', (req, res) => {
  if (!VK_CLIENT_ID || !VK_CLIENT_SECRET) return res.status(500).send('Configure VK_CLIENT_ID and VK_CLIENT_SECRET first.');

  const oauthUrl = new URL('https://oauth.vk.com/authorize');
  oauthUrl.searchParams.set('client_id', VK_CLIENT_ID);
  oauthUrl.searchParams.set('redirect_uri', VK_REDIRECT_URI);
  oauthUrl.searchParams.set('response_type', 'code');
  oauthUrl.searchParams.set('scope', 'email');
  oauthUrl.searchParams.set('v', '5.199');
  oauthUrl.searchParams.set('state', createOauthState(req.query.return_to || FRONTEND_ORIGIN));
  res.redirect(oauthUrl.toString());
});

app.get('/auth/vk/callback', async (req, res) => {
  const { code, error, error_description } = req.query;
  if (error) {
    const url = new URL(FRONTEND_ORIGIN);
    url.searchParams.set('error', String(error));
    if (error_description) url.searchParams.set('error_description', String(error_description));
    return res.redirect(url.toString());
  }

  const state = consumeOauthState(req.query.state);
  if (!state) return res.status(400).send('Invalid OAuth state.');

  const tokenUrl = new URL('https://oauth.vk.com/access_token');
  tokenUrl.searchParams.set('client_id', VK_CLIENT_ID);
  tokenUrl.searchParams.set('client_secret', VK_CLIENT_SECRET);
  tokenUrl.searchParams.set('redirect_uri', VK_REDIRECT_URI);
  tokenUrl.searchParams.set('code', String(code || ''));

  const tokenResponse = await fetch(tokenUrl);
  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenPayload.access_token || !tokenPayload.user_id) return res.status(400).json({ error: 'vk_exchange_failed', details: tokenPayload });

  const usersUrl = new URL('https://api.vk.com/method/users.get');
  usersUrl.searchParams.set('user_ids', String(tokenPayload.user_id));
  usersUrl.searchParams.set('fields', 'photo_200');
  usersUrl.searchParams.set('access_token', tokenPayload.access_token);
  usersUrl.searchParams.set('v', '5.199');

  const profileResponse = await fetch(usersUrl);
  const profilePayload = await profileResponse.json();
  const vkUser = profilePayload?.response?.[0];
  if (!profileResponse.ok || !vkUser?.id) return res.status(400).json({ error: 'vk_profile_failed', details: profilePayload });

  const users = await readUsers();
  let user = users.find((u) => u.provider === 'VK' && u.vkId === String(vkUser.id));
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      username: `vk_${vkUser.id}`,
      name: `${vkUser.first_name || ''} ${vkUser.last_name || ''}`.trim() || `vk_${vkUser.id}`,
      phone: '',
      email: tokenPayload.email || '',
      passwordHash: '',
      verified: true,
      provider: 'VK',
      vkId: String(vkUser.id),
    };
    users.push(user);
    await writeUsers(users);
  }

  setSessionCookie(res, user.id);
  res.redirect(state.returnTo || FRONTEND_ORIGIN);
});

app.get('/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user.id, provider: req.user.provider, name: req.user.name, phone: req.user.phone, email: req.user.email } });
});

app.post('/auth/logout', (req, res) => {
  res.clearCookie('nm_auth');
  res.status(204).end();
});

app.post('/chats/by-phone', requireAuth, async (req, res) => {
  const phone = String(req.body?.phone || '');
  if (!phone) return res.status(400).json({ error: 'phone required' });

  const users = await readUsers();
  const other = users.find((u) => u.phone === phone && u.verified);
  if (!other) return res.status(404).json({ error: 'user_not_found' });
  if (other.id === req.user.id) return res.status(400).json({ error: 'cannot_chat_with_self' });

  const chats = await readChats();
  let chat = chats.find((c) => c.participants.includes(req.user.id) && c.participants.includes(other.id));
  if (!chat) {
    chat = {
      id: crypto.randomUUID(),
      participants: [req.user.id, other.id],
      messages: [],
      createdAt: Date.now(),
    };
    chats.push(chat);
    await writeChats(chats);
  }

  return res.json({ chat: { id: chat.id, name: other.name, avatar: '👤', lastMessage: chat.messages.at(-1)?.text || '' } });
});

app.get('/chats', requireAuth, async (req, res) => {
  const users = await readUsers();
  const userMap = new Map(users.map((u) => [u.id, u]));
  const chats = await readChats();

  const result = chats
    .filter((c) => c.participants.includes(req.user.id))
    .map((chat) => {
      const otherId = chat.participants.find((id) => id !== req.user.id);
      const other = userMap.get(otherId);
      return {
        id: chat.id,
        name: other?.name || 'Unknown',
        avatar: '👤',
        lastMessage: chat.messages.at(-1)?.text || '',
        updatedAt: chat.messages.at(-1)?.createdAt || chat.createdAt,
      };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return res.json({ chats: result });
});

app.get('/chats/:chatId/messages', requireAuth, async (req, res) => {
  const chats = await readChats();
  const chat = chats.find((c) => c.id === req.params.chatId);
  if (!chat || !chat.participants.includes(req.user.id)) return res.status(404).json({ error: 'chat_not_found' });

  const messages = chat.messages.map((m) => ({
    id: m.id,
    text: m.text,
    createdAt: m.createdAt,
    from: m.userId === req.user.id ? 'me' : 'them',
  }));

  return res.json({ messages });
});

app.post('/chats/:chatId/messages', requireAuth, async (req, res) => {
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text_required' });

  const chats = await readChats();
  const chat = chats.find((c) => c.id === req.params.chatId);
  if (!chat || !chat.participants.includes(req.user.id)) return res.status(404).json({ error: 'chat_not_found' });

  chat.messages.push({ id: crypto.randomUUID(), userId: req.user.id, text, createdAt: Date.now() });
  await writeChats(chats);

  return res.status(201).json({ ok: true });
});

ensureStorage().then(() => {
  app.listen(PORT, () => {
    console.log(`Auth server listening on http://localhost:${PORT}`);
  });
});
