const DEFAULT_LOCAL_API = 'http://localhost:8080';
const AUTH_API_BASE_SEED = window.__AUTH_API_BASE__ || DEFAULT_LOCAL_API;
const FACEBOOK_APP_ID = '1437460264576640';

const state = {
  user: null,
  chats: [],
  activeChatId: null,
  messagesByChat: {},
  filter: '',
  providers: { facebookConfigured: false, appId: FACEBOOK_APP_ID },
  settings: null,
  apiBase: AUTH_API_BASE_SEED,
  apiCandidatesTried: [],
};

const defaultSettings = {
  profile: { nickname: 'Вы', status: 'Онлайн', avatar: '😎', language: 'ru' },
  appearance: { theme: 'dark', accent: 'blue', density: 'comfortable', fontScale: 100, animations: true },
  privacy: { hidePhone: false, readReceipts: true, lastSeenVisible: true, messagePreviewVisible: true },
  notifications: { sound: true, desktop: false, vibrate: false, quietHoursEnabled: false, quietFrom: '23:00', quietTo: '08:00' },
  security: { pinEnabled: false, biometricPrompt: false, loginAlerts: true, blurPreviews: false, twoFactorDemo: false, autoLockMinutes: 0, sessionTtlDays: 30 },
  chat: { enterToSend: true, autoDownloadMedia: true, stickers: true, reactions: true, spellcheck: true },
};

const accentMap = { blue: '#4a8cff', purple: '#8b5cf6', pink: '#ec4899', red: '#ef4444', orange: '#f97316', green: '#22c55e' };
const $ = (id) => document.getElementById(id);
const el = [
  'chatList','chatUser','messages','messageForm','messageInput','chatSearch','openSettingsBtn','settingsDialog','settingsForm',
  'profileNickname','profileStatus','profileAvatar','themeMode','accentColor','uiDensity','fontScale','animationsEnabled','languageSelect',
  'privacyHidePhone','privacyReadReceipts','privacyLastSeen','privacyPreview',
  'notifSound','notifDesktop','notifVibrate','notifQuietEnabled','notifQuietFrom','notifQuietTo',
  'securityPinEnabled','securityBiometric','securityLoginAlerts','securityBlurPreviews','security2faDemo','securityAutoLock','securitySessionTtl',
  'chatEnterToSend','chatAutoMedia','chatStickers','chatReactions','chatSpellcheck',
  'voiceCallBtn','videoCallBtn','showStatsBtn','statsDialog','chatStatsOutput','refreshSessionBtn',
  'callDialog','callTitle','callText','callAvatar','newChatBtn','authState','facebookLoginBtn','socialLogoutBtn',
  'sendBtn','cancelBtn','localUsername','localPhone','localPassword','registerBtn','loginBtn','localEmail','oauthProviderStatus','apiMetaStatus','authHint','fbStatus'
].reduce((a, k) => (a[k] = $(k), a), {});

const clone = (v) => JSON.parse(JSON.stringify(v));
const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const mergeSettings = (base, incoming) => {
  const result = clone(base);
  if (!incoming || typeof incoming !== 'object') return result;
  Object.keys(result).forEach((section) => {
    if (!incoming[section] || typeof incoming[section] !== 'object') return;
    Object.keys(result[section]).forEach((field) => {
      if (field in incoming[section]) result[section][field] = incoming[section][field];
    });
  });
  return result;
};

function toast(message) {
  const node = document.createElement('div');
  node.className = 'toast-msg';
  node.textContent = message;
  document.body.appendChild(node);
  requestAnimationFrame(() => node.classList.add('show'));
  setTimeout(() => { node.classList.remove('show'); setTimeout(() => node.remove(), 220); }, 2200);
}

function currentChat() { return state.chats.find((c) => c.id === state.activeChatId) || null; }
function getSettings() {
  if (state.settings) return state.settings;
  const local = JSON.parse(localStorage.getItem('nm-settings') || 'null');
  state.settings = mergeSettings(defaultSettings, local || {});
  return state.settings;
}
function saveSettingsLocal() { localStorage.setItem('nm-settings', JSON.stringify(getSettings())); }

const backendCandidates = (() => {
  const host = window.location.hostname || 'localhost';
  const set = new Set([
    AUTH_API_BASE_SEED,
    DEFAULT_LOCAL_API,
    'http://127.0.0.1:8080',
    'http://localhost:8080',
    `http://${host}:8080`,
  ]);
  return [...set].filter(Boolean);
})();

async function fetchJsonFromBase(base, url, options = {}) {
  const response = await fetch(`${base}${url}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || 'api_error');
  return json;
}

async function discoverBackendBase() {
  for (const candidate of backendCandidates) {
    try {
      const meta = await fetchJsonFromBase(candidate, '/api/meta', { method: 'GET' });
      state.apiBase = candidate;
      state.apiCandidatesTried = [candidate];
      el.apiMetaStatus.textContent = `API ${meta.version}: ${meta.endpoints.length} endpoints`;
      return candidate;
    } catch {
      state.apiCandidatesTried.push(candidate);
    }
  }
  throw new Error(`network_error: backend metadata недоступна (${backendCandidates.join(', ')})`);
}

async function api(url, options = {}) {
  try {
    const base = state.apiBase || await discoverBackendBase();
    return await fetchJsonFromBase(base, url, options);
  } catch (error) {
    if (error instanceof TypeError || String(error.message || '').includes('network_error')) {
      throw new Error(`network_error: backend недоступен (${state.apiBase || AUTH_API_BASE_SEED})`);
    }
    throw error;
  }
}

function applyThemeFromSettings() {
  const s = getSettings();
  const selectedTheme = s.appearance.theme === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : s.appearance.theme;
  document.documentElement.setAttribute('data-theme', selectedTheme);
  document.body.setAttribute('data-theme', selectedTheme);
  document.body.setAttribute('data-density', s.appearance.density || 'comfortable');
  document.body.classList.toggle('blur-previews', !!s.security.blurPreviews);
  document.body.style.fontSize = `${s.appearance.fontScale || 100}%`;
  document.body.classList.toggle('disable-animations', !s.appearance.animations);
  const accent = accentMap[s.appearance.accent] || accentMap.blue;
  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--bubble-me', accent);
}

function renderAuth() {
  const s = getSettings();
  let label = 'Не авторизованы';
  if (state.user) {
    label = `${state.user.provider || 'Local'}: ${state.user.name}`;
    if (!s.privacy.hidePhone && state.user.phone) label += ` · ${state.user.phone}`;
  }
  el.authState.textContent = label;
  el.socialLogoutBtn.disabled = !state.user;
  el.authHint.textContent = 'Локальный вход + Facebook OAuth.';
}

function renderProviderStatus() {
  const appId = state.providers.appId || FACEBOOK_APP_ID;
  el.oauthProviderStatus.textContent = state.providers.facebookConfigured
    ? `Facebook OAuth: OK (App ID: ${appId})`
    : `Facebook OAuth: OFF (App ID: ${appId})`;
  el.facebookLoginBtn.disabled = !state.providers.facebookConfigured;
}

function renderChats() {
  const s = getSettings();
  const filter = state.filter.toLowerCase();
  const visible = state.chats.filter((c) => c.name.toLowerCase().includes(filter));
  el.chatList.innerHTML = visible.map((chat) => {
    const preview = s.privacy.messagePreviewVisible ? (chat.lastMessage || 'Нет сообщений') : '••••••';
    return `<button class="chat-item ${chat.id === state.activeChatId ? 'active' : ''}" data-id="${chat.id}"><span class="avatar">${escapeHtml(chat.avatar || '👤')}</span><span><span class="name">${escapeHtml(chat.name || '')}</span><span class="preview">${escapeHtml(preview)}</span></span></button>`;
  }).join('');
}

function renderHeader() {
  const c = currentChat();
  const s = getSettings();
  if (!c) {
    el.chatUser.innerHTML = '<span><strong>Nulls</strong><p>Выберите чат</p></span>';
    return;
  }
  el.chatUser.innerHTML = `<span class="avatar">${escapeHtml(s.profile.avatar || c.avatar || '👤')}</span><span><strong>${escapeHtml(c.name)}</strong><p>${escapeHtml(s.profile.status)}</p></span>`;
}

function renderMessages() {
  const c = currentChat();
  if (!c) { el.messages.innerHTML = ''; return; }
  const messages = state.messagesByChat[c.id] || [];
  el.messages.innerHTML = messages.map((m) => `<article class="msg ${m.from === 'me' ? 'me' : 'them'}">${escapeHtml(m.text)}</article>`).join('');
  el.messages.scrollTop = el.messages.scrollHeight;
}

function fillSettingsForm() {
  const s = getSettings();
  el.profileNickname.value = s.profile.nickname;
  el.profileStatus.value = s.profile.status;
  el.profileAvatar.value = s.profile.avatar;
  el.languageSelect.value = s.profile.language;
  el.themeMode.value = s.appearance.theme;
  el.accentColor.value = s.appearance.accent;
  el.uiDensity.value = s.appearance.density;
  el.fontScale.value = String(s.appearance.fontScale);
  el.animationsEnabled.checked = !!s.appearance.animations;
  el.privacyHidePhone.checked = !!s.privacy.hidePhone;
  el.privacyReadReceipts.checked = !!s.privacy.readReceipts;
  el.privacyLastSeen.checked = !!s.privacy.lastSeenVisible;
  el.privacyPreview.checked = !!s.privacy.messagePreviewVisible;
  el.notifSound.checked = !!s.notifications.sound;
  el.notifDesktop.checked = !!s.notifications.desktop;
  el.notifVibrate.checked = !!s.notifications.vibrate;
  el.notifQuietEnabled.checked = !!s.notifications.quietHoursEnabled;
  el.notifQuietFrom.value = s.notifications.quietFrom;
  el.notifQuietTo.value = s.notifications.quietTo;
  el.securityPinEnabled.checked = !!s.security.pinEnabled;
  el.securityBiometric.checked = !!s.security.biometricPrompt;
  el.securityLoginAlerts.checked = !!s.security.loginAlerts;
  el.securityBlurPreviews.checked = !!s.security.blurPreviews;
  el.security2faDemo.checked = !!s.security.twoFactorDemo;
  el.securityAutoLock.value = String(s.security.autoLockMinutes);
  el.securitySessionTtl.value = String(s.security.sessionTtlDays);
  el.chatEnterToSend.checked = !!s.chat.enterToSend;
  el.chatAutoMedia.checked = !!s.chat.autoDownloadMedia;
  el.chatStickers.checked = !!s.chat.stickers;
  el.chatReactions.checked = !!s.chat.reactions;
  el.chatSpellcheck.checked = !!s.chat.spellcheck;
}

function readSettingsForm() {
  return {
    profile: { nickname: el.profileNickname.value.trim() || 'Вы', status: el.profileStatus.value.trim() || 'Онлайн', avatar: el.profileAvatar.value.trim() || '😎', language: el.languageSelect.value },
    appearance: { theme: el.themeMode.value, accent: el.accentColor.value, density: el.uiDensity.value, fontScale: Number(el.fontScale.value || 100), animations: el.animationsEnabled.checked },
    privacy: { hidePhone: el.privacyHidePhone.checked, readReceipts: el.privacyReadReceipts.checked, lastSeenVisible: el.privacyLastSeen.checked, messagePreviewVisible: el.privacyPreview.checked },
    notifications: { sound: el.notifSound.checked, desktop: el.notifDesktop.checked, vibrate: el.notifVibrate.checked, quietHoursEnabled: el.notifQuietEnabled.checked, quietFrom: el.notifQuietFrom.value || '23:00', quietTo: el.notifQuietTo.value || '08:00' },
    security: { pinEnabled: el.securityPinEnabled.checked, biometricPrompt: el.securityBiometric.checked, loginAlerts: el.securityLoginAlerts.checked, blurPreviews: el.securityBlurPreviews.checked, twoFactorDemo: el.security2faDemo.checked, autoLockMinutes: Number(el.securityAutoLock.value || 0), sessionTtlDays: Number(el.securitySessionTtl.value || 30) },
    chat: { enterToSend: el.chatEnterToSend.checked, autoDownloadMedia: el.chatAutoMedia.checked, stickers: el.chatStickers.checked, reactions: el.chatReactions.checked, spellcheck: el.chatSpellcheck.checked },
  };
}

async function fetchProviderStatus() {
  try {
    const data = await api('/auth/providers/status', { method: 'GET' });
    state.providers = {
      facebookConfigured: !!data.facebook?.configured,
      appId: data.facebook?.appId || FACEBOOK_APP_ID,
    };
  } catch {
    state.providers = { facebookConfigured: false, appId: FACEBOOK_APP_ID };
    toast(`Не удалось получить статус OAuth. Проверь backend: ${state.apiBase || AUTH_API_BASE_SEED}`);
  }
}

async function fetchApiMeta() {
  try {
    const base = state.apiBase || await discoverBackendBase();
    const meta = await fetchJsonFromBase(base, '/api/meta', { method: 'GET' });
    el.apiMetaStatus.textContent = `API ${meta.version}: ${meta.endpoints.length} endpoints · ${base}`;
  } catch {
    const tried = state.apiCandidatesTried.length ? state.apiCandidatesTried.join(', ') : backendCandidates.join(', ');
    el.apiMetaStatus.textContent = `API metadata: unavailable (tried: ${tried})`;
  }
}

async function fetchSessionUser() {
  try {
    const me = await api('/me', { method: 'GET' });
    state.user = me.user || null;
    state.settings = mergeSettings(defaultSettings, me.user?.settings || {});
    saveSettingsLocal();
    await loadChats();
  } catch {
    state.user = null;
    state.chats = [];
    state.messagesByChat = {};
    state.activeChatId = null;
  }
}

async function syncSettingsFromServer() {
  if (!state.user) return;
  const data = await api('/settings', { method: 'GET' });
  state.settings = mergeSettings(defaultSettings, data.settings || {});
  saveSettingsLocal();
}

async function saveSettings() {
  const newSettings = mergeSettings(defaultSettings, readSettingsForm());
  state.settings = newSettings;
  saveSettingsLocal();
  applyThemeFromSettings();
  renderAll();
  if (state.user) {
    const data = await api('/settings', { method: 'PUT', body: JSON.stringify({ settings: newSettings }) });
    state.user = data.user || state.user;
  }
}

async function registerLocal() {
  const payload = { username: el.localUsername.value.trim(), phone: el.localPhone.value.trim(), email: el.localEmail.value.trim(), password: el.localPassword.value.trim() };
  if (!payload.username || !payload.phone || !payload.password) return toast('Заполни username, phone, password');
  const data = await api('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  state.user = data.user;
  state.settings = mergeSettings(defaultSettings, data.user?.settings || {});
  await loadChats();
  renderAll();
}

async function loginLocal() {
  const payload = { username: el.localUsername.value.trim(), phone: el.localPhone.value.trim(), email: el.localEmail.value.trim(), password: el.localPassword.value.trim() };
  if (!payload.password || (!payload.phone && !payload.email && !payload.username)) return toast('Нужны login и password');
  const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
  state.user = data.user;
  state.settings = mergeSettings(defaultSettings, data.user?.settings || {});
  await loadChats();
  renderAll();
}

async function loadChats() {
  if (!state.user) return;
  const data = await api('/chats', { method: 'GET' });
  state.chats = data.chats || [];
  if (!state.activeChatId && state.chats.length) state.activeChatId = state.chats[0].id;
  if (state.activeChatId) await loadMessages(state.activeChatId);
}

async function loadMessages(chatId) {
  const data = await api(`/chats/${chatId}/messages?limit=100`, { method: 'GET' });
  state.messagesByChat[chatId] = data.messages || [];
}

async function sendMessage() {
  const text = el.messageInput.value.trim();
  if (!text) return;
  const c = currentChat();
  if (!c) return toast('Выберите чат');
  await api(`/chats/${c.id}/messages`, { method: 'POST', body: JSON.stringify({ text }) });
  el.messageInput.value = '';
  await loadChats();
  await loadMessages(c.id);
  renderAll();
}

async function startChatByPhone() {
  const phone = prompt('Введите номер друга:');
  if (!phone) return;
  const data = await api('/chats/by-phone', { method: 'POST', body: JSON.stringify({ phone }) });
  await loadChats();
  state.activeChatId = data.chat.id;
  await loadMessages(data.chat.id);
  renderAll();
}

async function showChatStats() {
  const c = currentChat();
  if (!c) return toast('Сначала выберите чат');
  const data = await api(`/chats/${c.id}/stats`, { method: 'GET' });
  el.chatStatsOutput.textContent = JSON.stringify(data.stats || {}, null, 2);
  el.statsDialog.showModal();
}

async function refreshSession() {
  await api('/security/sessions/refresh', { method: 'POST' });
  toast('Сессия обновлена');
}


window.__fbLoginTriggeredByButton = false;

window.statusChangeCallback = function statusChangeCallback(response, options = {}) {
  if (!el.fbStatus) return;
  if (!response || !response.status) {
    el.fbStatus.textContent = 'Facebook SDK: unknown status';
    return;
  }

  if (response.status === 'connected') {
    el.fbStatus.textContent = 'Facebook SDK: connected';
    if (window.FB) {
      window.FB.api('/me', { fields: 'name,email' }, function(profileResponse) {
        if (profileResponse && !profileResponse.error) {
          el.fbStatus.textContent = `Facebook SDK: connected as ${profileResponse.name}${profileResponse.email ? ` (${profileResponse.email})` : ''}`;
        }
      });
    }
    if (window.__fbLoginTriggeredByButton && !options.auto) {
      window.__fbLoginTriggeredByButton = false;
      startFacebookOAuth();
    }
    return;
  }

  if (response.status === 'not_authorized') {
    el.fbStatus.textContent = 'Facebook SDK: user logged in Facebook, but not authorized app';
    return;
  }

  el.fbStatus.textContent = 'Facebook SDK: user is not logged in Facebook';
};

window.checkLoginState = function checkLoginState() {
  window.__fbLoginTriggeredByButton = true;
  if (!window.FB) {
    toast('Facebook SDK не загрузился.');
    return;
  }
  window.FB.getLoginStatus(function(response) {
    window.statusChangeCallback(response);
    if (response.status !== 'connected') {
      window.FB.login(function(loginResponse) {
        window.statusChangeCallback(loginResponse);
      }, { scope: 'public_profile,email' });
    }
  });
};

function startFacebookOAuth() {
  if (!state.providers.facebookConfigured) return toast('Facebook OAuth не настроен на сервере');
  const returnTo = `${window.location.origin}${window.location.pathname}`;
  const base = state.apiBase || AUTH_API_BASE_SEED;
  window.location.href = `${base}/auth/facebook/start?return_to=${encodeURIComponent(returnTo)}`;
}

function renderAll() {
  applyThemeFromSettings();
  renderProviderStatus();
  renderAuth();
  renderChats();
  renderHeader();
  renderMessages();
}

el.chatList.addEventListener('click', async (e) => {
  const button = e.target.closest('.chat-item');
  if (!button) return;
  state.activeChatId = button.dataset.id;
  await loadMessages(state.activeChatId);
  renderAll();
});
el.chatSearch.addEventListener('input', (e) => { state.filter = e.target.value; renderChats(); });
el.newChatBtn.addEventListener('click', () => startChatByPhone().catch((e) => toast(e.message)));

el.messageForm.addEventListener('submit', async (e) => { e.preventDefault(); await sendMessage().catch((err) => toast(err.message)); });
el.messageInput.addEventListener('keydown', (e) => {
  const s = getSettings();
  if (s.chat.enterToSend && e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage().catch((err) => toast(err.message));
  }
});

el.openSettingsBtn.addEventListener('click', () => { fillSettingsForm(); el.settingsDialog.showModal(); });
el.settingsForm.addEventListener('submit', (e) => { e.preventDefault(); saveSettings().catch((err) => toast(err.message)); });
el.cancelBtn.addEventListener('click', (e) => { e.preventDefault(); el.settingsDialog.close(); });
el.refreshSessionBtn.addEventListener('click', () => refreshSession().catch((e) => toast(e.message)));

el.registerBtn.addEventListener('click', () => registerLocal().catch((e) => toast(e.message)));
el.loginBtn.addEventListener('click', () => loginLocal().catch((e) => toast(e.message)));
el.socialLogoutBtn.addEventListener('click', async () => {
  try { await api('/auth/logout', { method: 'POST' }); } catch {}
  state.user = null;
  state.chats = [];
  state.messagesByChat = {};
  state.activeChatId = null;
  renderAll();
});

el.facebookLoginBtn.addEventListener('click', startFacebookOAuth);
el.voiceCallBtn.addEventListener('click', () => { const c = currentChat(); if (!c) return toast('Выберите чат'); el.callTitle.textContent = 'Голосовой звонок'; el.callText.textContent = `${c.name} · Соединение...`; el.callAvatar.textContent = c.avatar || '👤'; el.callDialog.showModal(); });
el.videoCallBtn.addEventListener('click', () => { const c = currentChat(); if (!c) return toast('Выберите чат'); el.callTitle.textContent = 'Видеозвонок'; el.callText.textContent = `${c.name} · Соединение...`; el.callAvatar.textContent = c.avatar || '👤'; el.callDialog.showModal(); });
el.showStatsBtn.addEventListener('click', () => showChatStats().catch((e) => toast(e.message)));

(async function bootstrap() {
  state.settings = mergeSettings(defaultSettings, JSON.parse(localStorage.getItem('nm-settings') || 'null') || {});
  renderAll();
  await fetchProviderStatus();
  await fetchApiMeta();
  await fetchSessionUser();
  try { await syncSettingsFromServer(); } catch {}
  renderAll();
})();
