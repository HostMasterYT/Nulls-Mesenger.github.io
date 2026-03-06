const DEFAULT_LOCAL_API = 'http://localhost:8080';
const AUTH_API_BASE =
  window.__AUTH_API_BASE__ ||
  ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? DEFAULT_LOCAL_API
    : window.location.origin);

const profile = {
  nickname: 'Вы',
  status: 'Онлайн',
  avatar: '😎',
  theme: 'dark',
  accent: 'blue',
  language: 'ru',
  ...(JSON.parse(localStorage.getItem('nm-profile') || 'null') || {}),
};

const state = {
  activeChatId: null,
  filter: '',
  user: null,
  chats: [],
  messagesByChat: {},
};

const accentMap = {
  blue: '#4a8cff',
  purple: '#8b5cf6',
  pink: '#ec4899',
  red: '#ef4444',
  orange: '#f97316',
  green: '#22c55e',
};

const i18n = {
  ru: { sidebarSubtitle: 'Ваши чаты', search: 'Поиск...', send: 'Отправить', settingsTitle: 'Настройки профиля', nickname: 'Ник', status: 'Статус', avatar: 'Аватар (эмодзи)', theme: 'Тема', accent: 'Акцент', language: 'Язык', cancel: 'Отмена', save: 'Сохранить', dark: 'Черная', light: 'Белая', voice: 'Голосовой звонок', video: 'Видеозвонок', profile: 'Профиль', notAuth: 'Не авторизованы', logout: 'Выйти', authHint: 'Локальный вход + Facebook OAuth + VK OAuth.', writeMessage: 'Напишите сообщение...', newChat: 'Новый чат по номеру', endCall: 'Завершить', call: 'Звонок', connecting: 'Соединение...', online: 'Онлайн', noMessages: 'Нет сообщений', authError: 'Ошибка авторизации.', phonePrompt: 'Введите номер друга:' },
  en: { sidebarSubtitle: 'Your chats', search: 'Search...', send: 'Send', settingsTitle: 'Profile settings', nickname: 'Nickname', status: 'Status', avatar: 'Avatar (emoji)', theme: 'Theme', accent: 'Accent', language: 'Language', cancel: 'Cancel', save: 'Save', dark: 'Dark', light: 'Light', voice: 'Voice call', video: 'Video call', profile: 'Profile', notAuth: 'Not signed in', logout: 'Logout', authHint: 'Local auth + Facebook OAuth + VK OAuth.', writeMessage: 'Type a message...', newChat: 'New chat by phone', endCall: 'End call', call: 'Call', connecting: 'Connecting...', online: 'Online', noMessages: 'No messages', authError: 'Authorization error.', phonePrompt: 'Enter friend phone:' },
  pt: { sidebarSubtitle: 'Seus chats', search: 'Pesquisar...', send: 'Enviar', settingsTitle: 'Configurações', nickname: 'Apelido', status: 'Status', avatar: 'Avatar (emoji)', theme: 'Tema', accent: 'Cor', language: 'Idioma', cancel: 'Cancelar', save: 'Salvar', dark: 'Escuro', light: 'Claro', voice: 'Chamada de voz', video: 'Chamada de vídeo', profile: 'Perfil', notAuth: 'Não autenticado', logout: 'Sair', authHint: 'Auth local + Facebook OAuth + VK OAuth.', writeMessage: 'Digite uma mensagem...', newChat: 'Novo chat por telefone', endCall: 'Encerrar', call: 'Chamada', connecting: 'Conectando...', online: 'Online', noMessages: 'Sem mensagens', authError: 'Erro de autorização.', phonePrompt: 'Digite o telefone do amigo:' },
};

const $ = (id) => document.getElementById(id);
const el = ['chatList', 'chatUser', 'messages', 'messageForm', 'messageInput', 'chatSearch', 'openProfileBtn', 'profileDialog', 'profileForm', 'profileNickname', 'profileStatus', 'profileAvatar', 'themeMode', 'accentColor', 'languageSelect', 'voiceCallBtn', 'videoCallBtn', 'callDialog', 'callTitle', 'callText', 'callAvatar', 'newChatBtn', 'authState', 'facebookLoginBtn', 'vkLoginBtn', 'socialLogoutBtn', 'sidebarSubtitle', 'authHint', 'sendBtn', 'settingsTitle', 'labelNickname', 'labelStatus', 'labelAvatar', 'labelTheme', 'labelAccent', 'labelLanguage', 'cancelBtn', 'saveProfileBtn', 'endCallBtn', 'localUsername', 'localPhone', 'localPassword', 'registerBtn', 'loginBtn', 'localEmail', 'localCode', 'requestCodeBtn', 'confirmCodeBtn'].reduce((a, k) => ((a[k] = $(k)), a), {});

const t = (k) => (i18n[profile.language] || i18n.ru)[k] || k;

function saveProfile() {
  localStorage.setItem('nm-profile', JSON.stringify(profile));
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', profile.theme);
  document.body.setAttribute('data-theme', profile.theme);
  const accent = accentMap[profile.accent] || accentMap.blue;
  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--bubble-me', accent);
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
  el.saveProfileBtn.textContent = t('save');
  el.endCallBtn.textContent = t('endCall');
  el.newChatBtn.title = t('newChat');
  el.voiceCallBtn.title = t('voice');
  el.videoCallBtn.title = t('video');
  el.openProfileBtn.title = t('profile');
  el.socialLogoutBtn.textContent = t('logout');
  el.authHint.textContent = t('authHint');
  el.callTitle.textContent = t('call');
  el.themeMode.options[0].textContent = t('dark');
  el.themeMode.options[1].textContent = t('light');
}

function renderAuth() {
  el.authState.textContent = state.user ? `${state.user.provider || 'Local'}: ${state.user.name}` : t('notAuth');
  el.socialLogoutBtn.disabled = !state.user;
}

function currentChat() {
  return state.chats.find((c) => c.id === state.activeChatId) || null;
}

function renderChats() {
  const filter = state.filter.toLowerCase();
  const visible = state.chats.filter((c) => c.name.toLowerCase().includes(filter));
  el.chatList.innerHTML = visible.map((chat) => `
    <button class="chat-item ${chat.id === state.activeChatId ? 'active' : ''}" data-id="${chat.id}">
      <span class="avatar">${chat.avatar || '👤'}</span>
      <span><span class="name">${chat.name}</span><span class="preview">${chat.lastMessage || t('noMessages')}</span></span>
    </button>`).join('');
}

function renderHeader() {
  const chat = currentChat();
  if (!chat) {
    el.chatUser.innerHTML = `<span><strong>Nulls</strong><p>${t('notAuth')}</p></span>`;
    return;
  }
  el.chatUser.innerHTML = `<span class="avatar">${profile.avatar || chat.avatar || '👤'}</span><span><strong>${chat.name}</strong><p>${profile.status || t('online')}</p></span>`;
}

function renderMessages() {
  const chat = currentChat();
  if (!chat) {
    el.messages.innerHTML = '';
    return;
  }
  const messages = state.messagesByChat[chat.id] || [];
  el.messages.innerHTML = messages.map((m) => `<article class="msg ${m.from === 'me' ? 'me' : 'them'}">${m.text}</article>`).join('');
  el.messages.scrollTop = el.messages.scrollHeight;
}

function renderAll() {
  applyTheme();
  applyTranslations();
  renderAuth();
  renderChats();
  renderHeader();
  renderMessages();
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
    code: el.localCode.value.trim(),
  };
}

async function requestCode() {
  const f = readAuthFields();
  if (!f.username || !f.phone || !f.password) return alert('Заполни username, phone, password');
  const channel = f.email ? 'email' : 'phone';
  const data = await api('/auth/register/request-code', { method: 'POST', body: JSON.stringify({ ...f, channel }) });
  alert(`Код отправлен на ${data.target}. Demo code: ${data.dev_code}`);
}

async function confirmCode() {
  const f = readAuthFields();
  if (!f.code) return alert('Введи код подтверждения');
  const channel = f.email ? 'email' : 'phone';
  const target = f.email || f.phone;
  const data = await api('/auth/register/confirm', { method: 'POST', body: JSON.stringify({ channel, target, code: f.code }) });
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

el.chatSearch.addEventListener('input', (e) => {
  state.filter = e.target.value;
  renderChats();
});

el.messageForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try { await sendMessage(); } catch (err) { alert(err.message); }
});

el.openProfileBtn.addEventListener('click', () => {
  el.profileNickname.value = profile.nickname;
  el.profileStatus.value = profile.status;
  el.profileAvatar.value = profile.avatar;
  el.themeMode.value = profile.theme;
  el.accentColor.value = profile.accent;
  el.languageSelect.value = profile.language;
  el.profileDialog.showModal();
});

el.profileForm.addEventListener('submit', () => {
  profile.nickname = el.profileNickname.value.trim() || profile.nickname;
  profile.status = el.profileStatus.value.trim() || t('online');
  profile.avatar = el.profileAvatar.value.trim() || profile.avatar;
  profile.theme = el.themeMode.value;
  profile.accent = el.accentColor.value;
  profile.language = el.languageSelect.value;
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
el.requestCodeBtn.addEventListener('click', () => requestCode().catch((e) => alert(e.message)));
el.confirmCodeBtn.addEventListener('click', () => confirmCode().catch((e) => alert(e.message)));
el.registerBtn.addEventListener('click', () => confirmCode().catch((e) => alert(e.message)));
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
  try {
    await loadChats();
    renderAll();
  } catch {}
}, 4000);

handleOauthErrorsInUrl();
renderAll();
fetchSessionUser();
