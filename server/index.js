import crypto from 'node:crypto';
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

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));

const states = new Map();
const sessions = new Map();

function jsonState(payload) {
  return JSON.stringify(payload);
}

function parseState(input) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

app.get('/auth/facebook/start', (req, res) => {
  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    return res.status(500).send('Configure FACEBOOK_APP_ID and FACEBOOK_APP_SECRET first.');
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const returnTo = req.query.return_to || FRONTEND_ORIGIN;
  states.set(nonce, { returnTo, createdAt: Date.now() });

  const state = jsonState({ st: nonce, ds: Date.now() });
  const oauthUrl = new URL('https://www.facebook.com/v25.0/dialog/oauth');
  oauthUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
  oauthUrl.searchParams.set('redirect_uri', FACEBOOK_REDIRECT_URI);
  oauthUrl.searchParams.set('state', state);
  oauthUrl.searchParams.set('response_type', 'code');
  oauthUrl.searchParams.set('scope', 'email,public_profile');

  res.redirect(oauthUrl.toString());
});

app.get('/auth/facebook/callback', async (req, res) => {
  const { code, error, error_reason, error_description } = req.query;
  if (error || error_reason) {
    const url = new URL(FRONTEND_ORIGIN);
    url.searchParams.set('error', error || error_reason);
    if (error_description) url.searchParams.set('error_description', String(error_description));
    return res.redirect(url.toString());
  }

  const parsedState = parseState(String(req.query.state || ''));
  if (!parsedState?.st || !states.has(parsedState.st)) {
    return res.status(400).send('Invalid OAuth state.');
  }

  const stateInfo = states.get(parsedState.st);
  states.delete(parsedState.st);

  const tokenUrl = new URL('https://graph.facebook.com/v25.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
  tokenUrl.searchParams.set('redirect_uri', FACEBOOK_REDIRECT_URI);
  tokenUrl.searchParams.set('client_secret', FACEBOOK_APP_SECRET);
  tokenUrl.searchParams.set('code', String(code || ''));

  const tokenResponse = await fetch(tokenUrl);
  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    return res.status(400).json({ error: 'Failed to exchange code', details: tokenPayload });
  }

  const appToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
  const debugUrl = new URL('https://graph.facebook.com/debug_token');
  debugUrl.searchParams.set('input_token', tokenPayload.access_token);
  debugUrl.searchParams.set('access_token', appToken);
  const debugResponse = await fetch(debugUrl);
  const debugPayload = await debugResponse.json();

  if (!debugResponse.ok || !debugPayload?.data?.is_valid) {
    return res.status(400).json({ error: 'Token validation failed', details: debugPayload });
  }

  const meUrl = new URL('https://graph.facebook.com/me');
  meUrl.searchParams.set('fields', 'id,name,email,picture');
  meUrl.searchParams.set('access_token', tokenPayload.access_token);
  const meResponse = await fetch(meUrl);
  const mePayload = await meResponse.json();

  if (!meResponse.ok || !mePayload?.id) {
    return res.status(400).json({ error: 'Failed to read Facebook profile', details: mePayload });
  }

  const sid = crypto.randomBytes(24).toString('hex');
  sessions.set(sid, {
    user: {
      provider: 'Facebook',
      id: mePayload.id,
      name: mePayload.name,
      email: mePayload.email || '',
      picture: mePayload.picture?.data?.url || '',
    },
    token: tokenPayload.access_token,
    createdAt: Date.now(),
  });

  res.cookie('nm_sid', sid, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.redirect(stateInfo.returnTo || FRONTEND_ORIGIN);
});

app.get('/me', (req, res) => {
  const sid = req.cookies.nm_sid;
  if (!sid || !sessions.has(sid)) return res.status(401).json({ user: null });
  const session = sessions.get(sid);
  return res.json({ user: session.user });
});

app.post('/auth/logout', (req, res) => {
  const sid = req.cookies.nm_sid;
  if (sid) sessions.delete(sid);
  res.clearCookie('nm_sid');
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`Auth server listening on http://localhost:${PORT}`);
});
