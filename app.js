const DEFAULT_LOCAL_API = 'http://localhost:8080';
const AUTH_API_BASE = window.__AUTH_API_BASE__ || DEFAULT_LOCAL_API;

const state = {
  user: null,
  chats: [],
  activeChatId: null,
  messagesByChat: {},
  filter: '',
  providers: { facebookConfigured: true },
  settings: null,
  demoMode: false,
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
  'sendBtn','cancelBtn','localUsername','localPhone','localPassword','registerBtn','loginBtn','localEmail','oauthProviderStatus','apiMetaStatus','authHint'
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

function seedDemoData() {
  const existing = JSON.parse(localStorage.getItem('nm-demo-data') || 'null');
  if (existing) return existing;
  const now = Date.now();
  const seeded = {
    user: { id: 'demo-me', provider: 'Demo', name: 'Demo User', phone: '+70000000000', email: 'demo@local' },
    chats: [
      { id: 'demo-chat-1', name: 'Alice', avatar: '🧑‍💻', participants: ['demo-me', 'alice'], messages: [{ id: 'm1', userId: 'alice', text: 'Привет! Это оффлайн-демо.', createdAt: now - 60000 }] },
      { id: 'demo-chat-2', name: 'Bob', avatar: '🎨', participants: ['demo-me', 'bob'], messages: [{ id: 'm2', userId: 'demo-me', text: 'Тут всё работает без backend.', createdAt: now - 30000 }] },
    ],
  };
  localStorage.setItem('nm-demo-data', JSON.stringify(seeded));
  return seeded;
}
function readDemoData() { return seedDemoData(); }
function writeDemoData(data) { localStorage.setItem('nm-demo-data', JSON.stringify(data)); }

function enterDemoMode(reason = '') {
  if (!state.demoMode) toast(`Backend недоступен. Включен demo mode.${reason ? `\n${reason}` : ''}`);
  state.demoMode = true;
  el.apiMetaStatus.textContent = 'API metadata: demo mode';
  el.oauthProviderStatus.textContent = 'Facebook OAuth: unavailable in demo mode';
  const d = readDemoData();
  state.user = d.user;
  state.chats = d.chats.map((c) => ({ id: c.id, name: c.name, avatar: c.avatar, lastMessage: c.messages.at(-1)?.text || '', updatedAt: c.messages.at(-1)?.createdAt || Date.now(), unreadCount: 0 }));
  if (!state.activeChatId && state.chats.length) state.activeChatId = state.chats[0].id;
  state.messagesByChat = {};
  d.chats.forEach((chat) => {
    state.messagesByChat[chat.id] = chat.messages.map((m) => ({ id: m.id, text: m.text, createdAt: m.createdAt, from: m.userId === d.user.id ? 'me' : 'them' }));
  });
}

async function api(url, options = {}) {
  const response = await fetch(`${AUTH_API_BASE}${url}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || 'api_error');
  return json;
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
  let label = state.demoMode ? 'Demo mode (offline)' : 'Не авторизованы';
  if (state.user) {
    label = `${state.user.provider || 'Local'}: ${state.user.name}`;
    if (!s.privacy.hidePhone && state.user.phone) label += ` · ${state.user.phone}`;
  }
  el.authState.textContent = label;
  el.socialLogoutBtn.disabled = !state.user;
  el.authHint.textContent = state.demoMode
    ? 'Demo mode: кнопки работают локально, без backend.'
    : 'Локальный вход + Facebook OAuth.';
}

function renderProviderStatus() {
  if (state.demoMode) {
    el.oauthProviderStatus.textContent = 'Facebook OAuth: unavailable in demo mode';
    el.facebookLoginBtn.disabled = true;
        return;
  }
  el.oauthProviderStatus.textContent = `${state.providers.facebookConfigured ? 'Facebook OAuth: OK' : 'Facebook OAuth: OFF'}`;
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
  if (state.demoMode) return;
  try {
    const data = await api('/auth/providers/status', { method: 'GET' });
    state.providers = { facebookConfigured: !!data.facebook?.configured };
  } catch {
    enterDemoMode('Не удалось получить статус OAuth провайдеров.');
  }
}

async function fetchApiMeta() {
  if (state.demoMode) return;
  try {
    const meta = await api('/api/meta', { method: 'GET' });
    el.apiMetaStatus.textContent = `API ${meta.version}: ${meta.endpoints.length} endpoints`;
  } catch {
    enterDemoMode('Не удалось получить API metadata.');
  }
}

async function fetchSessionUser() {
  if (state.demoMode) return;
  try {
    const me = await api('/me', { method: 'GET' });
    state.user = me.user || null;
    state.settings = mergeSettings(defaultSettings, me.user?.settings || {});
    saveSettingsLocal();
    await loadChats();
  } catch (error) {
    if (String(error.message || '').includes('network')) enterDemoMode('Backend недоступен по сети.');
    else state.user = null;
  }
}

async function syncSettingsFromServer() {
  if (!state.user || state.demoMode) return;
  try {
    const data = await api('/settings', { method: 'GET' });
    state.settings = mergeSettings(defaultSettings, data.settings || {});
    saveSettingsLocal();
  } catch {}
}

async function saveSettings() {
  const newSettings = mergeSettings(defaultSettings, readSettingsForm());
  state.settings = newSettings;
  saveSettingsLocal();
  applyThemeFromSettings();
  renderAll();
  if (state.user && !state.demoMode) {
    const data = await api('/settings', { method: 'PUT', body: JSON.stringify({ settings: newSettings }) });
    state.user = data.user || state.user;
  }
}

function reloadDemoStateFromStorage() { enterDemoMode(); }

async function registerLocal() {
  const payload = { username: el.localUsername.value.trim(), phone: el.localPhone.value.trim(), email: el.localEmail.value.trim(), password: el.localPassword.value.trim() };
  if (!payload.username || !payload.phone || !payload.password) return toast('Заполни username, phone, password');
  if (state.demoMode) {
    const d = readDemoData();
    d.user = { id: 'demo-me', provider: 'Demo', name: payload.username, phone: payload.phone, email: payload.email || '' };
    writeDemoData(d);
    reloadDemoStateFromStorage();
    renderAll();
    return;
  }
  try {
    const data = await api('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    state.user = data.user;
    state.settings = mergeSettings(defaultSettings, data.user?.settings || {});
    await loadChats();
    renderAll();
  } catch (error) {
    if (String(error.message || '').includes('network')) {
      enterDemoMode('Регистрация переключена на оффлайн demo.');
      await registerLocal();
      return;
    }
    throw error;
  }
}

async function loginLocal() {
  const payload = { username: el.localUsername.value.trim(), phone: el.localPhone.value.trim(), email: el.localEmail.value.trim(), password: el.localPassword.value.trim() };
  if (!payload.password || (!payload.phone && !payload.email && !payload.username)) return toast('Нужны login и password');
  if (state.demoMode) {
    const d = readDemoData();
    if (payload.username) d.user.name = payload.username;
    if (payload.phone) d.user.phone = payload.phone;
    if (payload.email) d.user.email = payload.email;
    writeDemoData(d);
    reloadDemoStateFromStorage();
    renderAll();
    return;
  }
  try {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
    state.user = data.user;
    state.settings = mergeSettings(defaultSettings, data.user?.settings || {});
    await loadChats();
    renderAll();
  } catch (error) {
    if (String(error.message || '').includes('network')) {
      enterDemoMode('Логин переключен на оффлайн demo.');
      await loginLocal();
      return;
    }
    throw error;
  }
}

async function loadChats() {
  if (!state.user) return;
  if (state.demoMode) {
    const d = readDemoData();
    state.chats = d.chats.map((c) => ({ id: c.id, name: c.name, avatar: c.avatar, lastMessage: c.messages.at(-1)?.text || '', updatedAt: c.messages.at(-1)?.createdAt || Date.now(), unreadCount: 0 }));
    if (!state.activeChatId && state.chats.length) state.activeChatId = state.chats[0].id;
    if (state.activeChatId) await loadMessages(state.activeChatId);
    return;
  }
  const data = await api('/chats', { method: 'GET' });
  state.chats = data.chats || [];
  if (!state.activeChatId && state.chats.length) state.activeChatId = state.chats[0].id;
  if (state.activeChatId) await loadMessages(state.activeChatId);
}

async function loadMessages(chatId) {
  if (state.demoMode) {
    const d = readDemoData();
    const chat = d.chats.find((c) => c.id === chatId);
    state.messagesByChat[chatId] = (chat?.messages || []).map((m) => ({ id: m.id, text: m.text, createdAt: m.createdAt, from: m.userId === d.user.id ? 'me' : 'them' }));
    return;
  }
  const data = await api(`/chats/${chatId}/messages?limit=100`, { method: 'GET' });
  state.messagesByChat[chatId] = data.messages || [];
}

async function sendMessage() {
  const text = el.messageInput.value.trim();
  if (!text) return;
  const c = currentChat();
  if (!c) return;
  if (state.demoMode) {
    const d = readDemoData();
    const chat = d.chats.find((x) => x.id === c.id);
    if (!chat) return;
    chat.messages.push({ id: cryptoRandom(), userId: d.user.id, text, createdAt: Date.now() });
    writeDemoData(d);
    el.messageInput.value = '';
    await loadChats();
    await loadMessages(c.id);
    renderAll();
    return;
  }
  await api(`/chats/${c.id}/messages`, { method: 'POST', body: JSON.stringify({ text }) });
  el.messageInput.value = '';
  await loadChats();
  await loadMessages(c.id);
  renderAll();
}

function cryptoRandom() { return Math.random().toString(16).slice(2) + Date.now().toString(16); }

async function startChatByPhone() {
  const phone = prompt('Введите номер друга:');
  if (!phone) return;
  if (state.demoMode) {
    const d = readDemoData();
    const id = `demo-chat-${cryptoRandom()}`;
    d.chats.unshift({ id, name: `User ${phone.slice(-4)}`, avatar: '👤', participants: ['demo-me', phone], messages: [] });
    writeDemoData(d);
    await loadChats();
    state.activeChatId = id;
    await loadMessages(id);
    renderAll();
    return;
  }
  const data = await api('/chats/by-phone', { method: 'POST', body: JSON.stringify({ phone }) });
  await loadChats();
  state.activeChatId = data.chat.id;
  await loadMessages(data.chat.id);
  renderAll();
}

async function showChatStats() {
  const c = currentChat();
  if (!c) return toast('Сначала выберите чат');
  if (state.demoMode) {
    const messages = state.messagesByChat[c.id] || [];
    const myMessages = messages.filter((m) => m.from === 'me').length;
    const stats = {
      totalMessages: messages.length,
      myMessages,
      theirMessages: messages.length - myMessages,
      firstMessageAt: messages[0]?.createdAt || null,
      lastMessageAt: messages.at(-1)?.createdAt || null,
    };
    el.chatStatsOutput.textContent = JSON.stringify(stats, null, 2);
    el.statsDialog.showModal();
    return;
  }
  const data = await api(`/chats/${c.id}/stats`, { method: 'GET' });
  el.chatStatsOutput.textContent = JSON.stringify(data.stats || {}, null, 2);
  el.statsDialog.showModal();
}

async function refreshSession() {
  if (state.demoMode) return toast('Demo mode: сессия локальная, refresh не требуется.');
  await api('/security/sessions/refresh', { method: 'POST' });
  toast('Сессия обновлена');
}

function startFacebookOAuth() {
  if (state.demoMode) return toast('OAuth недоступен в demo mode');
  const returnTo = `${window.location.origin}${window.location.pathname}`;
  window.location.href = `${AUTH_API_BASE}/auth/facebook/start?return_to=${encodeURIComponent(returnTo)}`;
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
  if (!state.demoMode) {
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
  }
  state.user = null;
  state.chats = [];
  state.messagesByChat = {};
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
  await syncSettingsFromServer();
  renderAll();
})();
