const DEFAULT_LOCAL_API = 'http://localhost:8080';
const AUTH_API_BASE = window.__AUTH_API_BASE__ || DEFAULT_LOCAL_API;

const FACEBOOK_OAUTH_HINT = {
  appId: 'SET_IN_SERVER_ENV_FACEBOOK_APP_ID',
  redirectUri: 'SET_IN_SERVER_ENV_FACEBOOK_REDIRECT_URI',
};

const profile = {
  nickname: 'Вы',
  status: 'Онлайн',
  avatar: '😎',
  theme: 'dark',
  accent: 'blue',
  density: 'comfortable',
  language: 'ru',
  security: {
    pinEnabled: false,
    hidePhone: false,
    loginAlerts: true,
    biometricPrompt: false,
    blurPreviews: false,
    sessionTtlDays: 30,
  },
  ...(JSON.parse(localStorage.getItem('nm-profile') || 'null') || {}),
};
profile.security = {
  pinEnabled: false,
  hidePhone: false,
  loginAlerts: true,
  biometricPrompt: false,
  blurPreviews: false,
  sessionTtlDays: 30,
  ...(profile.security || {}),
};

const state = {
  activeChatId: null,
  filter: '',
  user: null,
  chats: [],
  messagesByChat: {},
  providers: { facebookConfigured: true, vkConfigured: true },
};

const accentMap = { blue: '#4a8cff', purple: '#8b5cf6', pink: '#ec4899', red: '#ef4444', orange: '#f97316', green: '#22c55e' };
const i18n = {
  ru: { sidebarSubtitle: 'Ваши чаты', search: 'Поиск...', send: 'Отправить', settingsTitle: 'Настройки', nickname: 'Ник', status: 'Статус', avatar: 'Аватар (эмодзи)', theme: 'Тема', accent: 'Акцент', language: 'Язык', cancel: 'Отмена', save: 'Сохранить', dark: 'Тёмная', light: 'Светлая', system: 'Как в системе', voice: 'Голосовой звонок', video: 'Видеозвонок', notAuth: 'Не авторизованы', logout: 'Выйти', authHint: 'Локальный вход + Facebook OAuth + VK OAuth.', writeMessage: 'Напишите сообщение...', newChat: 'Новый чат по номеру', endCall: 'Завершить', call: 'Звонок', connecting: 'Соединение...', online: 'Онлайн', noMessages: 'Нет сообщений', authError: 'Ошибка авторизации.', phonePrompt: 'Введите номер друга:' },
  en: { sidebarSubtitle: 'Your chats', search: 'Search...', send: 'Send', settingsTitle: 'Settings', nickname: 'Nickname', status: 'Status', avatar: 'Avatar (emoji)', theme: 'Theme', accent: 'Accent', language: 'Language', cancel: 'Cancel', save: 'Save', dark: 'Dark', light: 'Light', system: 'System', voice: 'Voice call', video: 'Video call', notAuth: 'Not signed in', logout: 'Logout', authHint: 'Local auth + Facebook OAuth + VK OAuth.', writeMessage: 'Type a message...', newChat: 'New chat by phone', endCall: 'End call', call: 'Call', connecting: 'Connecting...', online: 'Online', noMessages: 'No messages', authError: 'Authorization error.', phonePrompt: 'Enter friend phone:' },
  pt: { sidebarSubtitle: 'Seus chats', search: 'Pesquisar...', send: 'Enviar', settingsTitle: 'Configurações', nickname: 'Apelido', status: 'Status', avatar: 'Avatar (emoji)', theme: 'Tema', accent: 'Cor', language: 'Idioma', cancel: 'Cancelar', save: 'Salvar', dark: 'Escuro', light: 'Claro', system: 'Sistema', voice: 'Chamada de voz', video: 'Chamada de vídeo', notAuth: 'Não autenticado', logout: 'Sair', authHint: 'Auth local + Facebook OAuth + VK OAuth.', writeMessage: 'Digite uma mensagem...', newChat: 'Novo chat por telefone', endCall: 'Encerrar', call: 'Chamada', connecting: 'Conectando...', online: 'Online', noMessages: 'Sem mensagens', authError: 'Erro de autorização.', phonePrompt: 'Digite o telefone do amigo:' },
};

const $ = (id) => document.getElementById(id);
const el = ['chatList','chatUser','messages','messageForm','messageInput','chatSearch','openSettingsBtn','settingsDialog','settingsForm','profileNickname','profileStatus','profileAvatar','themeMode','accentColor','uiDensity','languageSelect','securityPinEnabled','securityHidePhone','securityLoginAlerts','securityBiometric','securityBlurPreviews','securitySessionTtl','voiceCallBtn','videoCallBtn','callDialog','callTitle','callText','callAvatar','newChatBtn','authState','facebookLoginBtn','vkLoginBtn','socialLogoutBtn','sidebarSubtitle','authHint','sendBtn','settingsTitle','labelNickname','labelStatus','labelAvatar','labelTheme','labelAccent','labelLanguage','cancelBtn','saveSettingsBtn','endCallBtn','localUsername','localPhone','localPassword','registerBtn','loginBtn','localEmail','oauthProviderStatus'].reduce((a,k)=>(a[k]=$(k),a),{});

const t = (k) => (i18n[profile.language] || i18n.ru)[k] || k;
const saveProfile = () => localStorage.setItem('nm-profile', JSON.stringify(profile));
const currentChat = () => state.chats.find((c) => c.id === state.activeChatId) || null;
const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function applyTheme() {
  const selectedTheme = profile.theme === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : profile.theme;
  document.documentElement.setAttribute('data-theme', selectedTheme);
  document.body.setAttribute('data-theme', selectedTheme);
  document.body.setAttribute('data-density', profile.density || 'comfortable');
  document.body.classList.toggle('blur-previews', !!profile.security.blurPreviews);
  const accent = accentMap[profile.accent] || accentMap.blue;
  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--bubble-me', accent);
}

function renderProviderStatus() {
  const parts = [];
  parts.push(state.providers.facebookConfigured ? 'Facebook OAuth: OK' : 'Facebook OAuth: не настроен');
  parts.push(state.providers.vkConfigured ? 'VK OAuth: OK' : 'VK OAuth: не настроен');
  el.oauthProviderStatus.textContent = parts.join(' · ');
  el.facebookLoginBtn.disabled = !state.providers.facebookConfigured;
  el.vkLoginBtn.disabled = !state.providers.vkConfigured;
}

function applyTranslations() {
  el.sidebarSubtitle.textContent = t('sidebarSubtitle');
  el.chatSearch.placeholder = t('search');
  el.messageInput.placeholder = t('writeMessage');
  el.sendBtn.textContent = t('send');
  el.settingsTitle.textContent = t('settingsTitle');
  el.labelNickname.textContent = t('nickname');
  el.labelStatus.textContent = t('status');
  el.labelAvatar.textContent = t('avatar');
  el.labelTheme.textContent = t('theme');
  el.labelAccent.textContent = t('accent');
  el.labelLanguage.textContent = t('language');
  el.cancelBtn.textContent = t('cancel');
  el.saveSettingsBtn.textContent = t('save');
  el.endCallBtn.textContent = t('endCall');
  el.newChatBtn.title = t('newChat');
  el.voiceCallBtn.title = t('voice');
  el.videoCallBtn.title = t('video');
  el.openSettingsBtn.title = t('settingsTitle');
  el.socialLogoutBtn.textContent = t('logout');
  el.authHint.textContent = t('authHint');
  el.callTitle.textContent = t('call');
  el.themeMode.options[0].textContent = t('dark');
  el.themeMode.options[1].textContent = t('light');
  el.themeMode.options[2].textContent = t('system');
}

function renderAuth() {
  let label = t('notAuth');
  if (state.user) {
    label = `${state.user.provider || 'Local'}: ${state.user.name}`;
    if (profile.security.hidePhone) label += ' · phone hidden';
    else if (state.user.phone) label += ` · ${state.user.phone}`;
  }
  el.authState.textContent = label;
  el.socialLogoutBtn.disabled = !state.user;
}

function renderChats() {
  const filter = state.filter.toLowerCase();
  const visible = state.chats.filter((c) => c.name.toLowerCase().includes(filter));
  el.chatList.innerHTML = visible.map((chat) => {
    const name = escapeHtml(chat.name || '');
    const avatar = escapeHtml(chat.avatar || '👤');
    const preview = escapeHtml(chat.lastMessage || t('noMessages'));
    return `<button class="chat-item ${chat.id === state.activeChatId ? 'active' : ''}" data-id="${chat.id}"><span class="avatar">${avatar}</span><span><span class="name">${name}</span><span class="preview">${preview}</span></span></button>`;
  }).join('');
}

function renderHeader() {
  const chat = currentChat();
  if (!chat) {
    el.chatUser.innerHTML = `<span><strong>Nulls</strong><p>${t('notAuth')}</p></span>`;
    return;
  }
  const avatar = escapeHtml(profile.avatar || chat.avatar || '👤');
  const name = escapeHtml(chat.name || '');
  const status = escapeHtml(profile.status || t('online'));
  el.chatUser.innerHTML = `<span class="avatar">${avatar}</span><span><strong>${name}</strong><p>${status}</p></span>`;
}

function renderMessages() {
  const chat = currentChat();
  if (!chat) return (el.messages.innerHTML = '');
  const messages = state.messagesByChat[chat.id] || [];
  el.messages.innerHTML = messages.map((m) => `<article class="msg ${m.from === 'me' ? 'me' : 'them'}">${escapeHtml(m.text)}</article>`).join('');
  el.messages.scrollTop = el.messages.scrollHeight;
}

function renderAll() { applyTheme(); applyTranslations(); renderProviderStatus(); renderAuth(); renderChats(); renderHeader(); renderMessages(); }

async function api(url, options = {}) {
  const response = await fetch(`${AUTH_API_BASE}${url}`, { credentials: 'include', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || 'api_error');
  return json;
}

async function fetchProviderStatus() {
  try {
    const data = await api('/auth/providers/status', { method: 'GET' });
    state.providers = {
      facebookConfigured: !!data.facebook?.configured,
      vkConfigured: !!data.vk?.configured,
    };
  } catch {
    state.providers = { facebookConfigured: true, vkConfigured: true };
  }
}

async function fetchSessionUser() {
  try {
    const me = await api('/me', { method: 'GET' });
    state.user = me.user || null;
    await loadChats();
  } catch {
    state.user = null;
    state.chats = [];
    state.messagesByChat = {};
  }
  renderAll();
}

function handleOauthErrorsInUrl() {
  const u = new URL(window.location.href);
  const err = u.searchParams.get('error');
  if (!err) return;
  alert(`${t('authError')} ${u.searchParams.get('error_description') || err}`);
  ['error', 'error_description', 'error_reason'].forEach((k) => u.searchParams.delete(k));
  history.replaceState({}, '', u.toString());
}

function startFacebookOAuth() {
  const returnTo = `${window.location.origin}${window.location.pathname}`;
  console.info('Facebook OAuth hint', FACEBOOK_OAUTH_HINT);
  window.location.href = `${AUTH_API_BASE}/auth/facebook/start?return_to=${encodeURIComponent(returnTo)}`;
}

function startVkOAuth() {
  const returnTo = `${window.location.origin}${window.location.pathname}`;
  window.location.href = `${AUTH_API_BASE}/auth/vk/start?return_to=${encodeURIComponent(returnTo)}`;
}

function readAuthFields() {
  return {
    username: el.localUsername.value.trim(),
    phone: el.localPhone.value.trim(),
    email: el.localEmail.value.trim(),
    password: el.localPassword.value.trim(),
  };
}

async function registerLocal() {
  const f = readAuthFields();
  if (!f.username || !f.phone || !f.password) return alert('Заполни username, phone, password');
  const data = await api('/auth/register', { method: 'POST', body: JSON.stringify(f) });
  state.user = data.user;
  profile.nickname = data.user.name;
  saveProfile();
  await loadChats();
  renderAll();
}

async function loginLocal() {
  const f = readAuthFields();
  if (!f.password || (!f.phone && !f.email && !f.username)) return alert('Нужны login и password');
  const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(f) });
  state.user = data.user;
  profile.nickname = data.user.name;
  saveProfile();
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
  if (!chatId) return;
  const data = await api(`/chats/${chatId}/messages`, { method: 'GET' });
  state.messagesByChat[chatId] = data.messages || [];
}

async function startChatByPhone() {
  const phone = prompt(t('phonePrompt'));
  if (!phone) return;
  const data = await api('/chats/by-phone', { method: 'POST', body: JSON.stringify({ phone }) });
  await loadChats();
  state.activeChatId = data.chat.id;
  await loadMessages(data.chat.id);
  renderAll();
}

async function sendMessage() {
  const text = el.messageInput.value.trim();
  if (!text) return;
  const chat = currentChat();
  if (!chat) return;
  await api(`/chats/${chat.id}/messages`, { method: 'POST', body: JSON.stringify({ text }) });
  el.messageInput.value = '';
  await loadChats();
  await loadMessages(chat.id);
  renderAll();
}

el.chatList.addEventListener('click', async (e) => {
  const b = e.target.closest('.chat-item');
  if (!b) return;
  state.activeChatId = b.dataset.id;
  await loadMessages(state.activeChatId);
  renderAll();
});
el.chatSearch.addEventListener('input', (e) => { state.filter = e.target.value; renderChats(); });
el.messageForm.addEventListener('submit', async (e) => { e.preventDefault(); try { await sendMessage(); } catch (err) { alert(err.message); } });

el.openSettingsBtn.addEventListener('click', () => {
  el.profileNickname.value = profile.nickname;
  el.profileStatus.value = profile.status;
  el.profileAvatar.value = profile.avatar;
  el.themeMode.value = profile.theme;
  el.accentColor.value = profile.accent;
  el.uiDensity.value = profile.density || 'comfortable';
  el.languageSelect.value = profile.language;
  el.securityPinEnabled.checked = !!profile.security.pinEnabled;
  el.securityHidePhone.checked = !!profile.security.hidePhone;
  el.securityLoginAlerts.checked = !!profile.security.loginAlerts;
  el.securityBiometric.checked = !!profile.security.biometricPrompt;
  el.securityBlurPreviews.checked = !!profile.security.blurPreviews;
  el.securitySessionTtl.value = String(profile.security.sessionTtlDays || 30);
  el.settingsDialog.showModal();
});

el.settingsForm.addEventListener('submit', () => {
  profile.nickname = el.profileNickname.value.trim() || profile.nickname;
  profile.status = el.profileStatus.value.trim() || t('online');
  profile.avatar = el.profileAvatar.value.trim() || profile.avatar;
  profile.theme = el.themeMode.value;
  profile.accent = el.accentColor.value;
  profile.density = el.uiDensity.value;
  profile.language = el.languageSelect.value;
  profile.security.pinEnabled = el.securityPinEnabled.checked;
  profile.security.hidePhone = el.securityHidePhone.checked;
  profile.security.loginAlerts = el.securityLoginAlerts.checked;
  profile.security.biometricPrompt = el.securityBiometric.checked;
  profile.security.blurPreviews = el.securityBlurPreviews.checked;
  profile.security.sessionTtlDays = Number(el.securitySessionTtl.value || 30);
  saveProfile();
  renderAll();
});

const startCall = (type) => {
  const c = currentChat();
  if (!c) return;
  el.callTitle.textContent = type === 'video' ? t('video') : t('voice');
  el.callText.textContent = `${c.name} · ${t('connecting')}`;
  el.callAvatar.textContent = c.avatar || '👤';
  el.callDialog.showModal();
};

el.voiceCallBtn.addEventListener('click', () => startCall('voice'));
el.videoCallBtn.addEventListener('click', () => startCall('video'));
el.newChatBtn.addEventListener('click', () => startChatByPhone().catch((e) => alert(e.message)));
el.facebookLoginBtn.addEventListener('click', startFacebookOAuth);
el.vkLoginBtn.addEventListener('click', startVkOAuth);
el.registerBtn.addEventListener('click', () => registerLocal().catch((e) => alert(e.message)));
el.loginBtn.addEventListener('click', () => loginLocal().catch((e) => alert(e.message)));
el.socialLogoutBtn.addEventListener('click', async () => {
  try { await api('/auth/logout', { method: 'POST' }); } catch {}
  state.user = null;
  state.chats = [];
  state.messagesByChat = {};
  state.activeChatId = null;
  renderAll();
});

setInterval(async () => {
  if (!state.user) return;
  try { await loadChats(); renderAll(); } catch {}
}, 4000);

handleOauthErrorsInUrl();
renderAll();
fetchProviderStatus().finally(fetchSessionUser);
