const AUTH_API_BASE = 'http://localhost:8080';

const chats = [
  {
    id: 1,
    name: 'Alice',
    avatar: '🦊',
    messages: [
      { from: 'them', text: 'Привет! Давай вечером созвон?' },
      { from: 'me', text: 'Да, в 20:00 удобно 👌' },
    ],
  },
  {
    id: 2,
    name: 'Design Team',
    avatar: '🎨',
    messages: [
      { from: 'them', text: 'Нужен новый экран профиля.' },
      { from: 'me', text: 'Сделаю стеклянный стиль 😎' },
    ],
  },
  {
    id: 3,
    name: 'Dev Chat',
    avatar: '💻',
    messages: [{ from: 'them', text: 'Готовим MVP без сервера.' }],
  },
];

const i18n = {
  ru: {
    sidebarSubtitle: 'Ваши чаты', search: 'Поиск...', send: 'Отправить',
    settingsTitle: 'Настройки профиля', nickname: 'Ник', status: 'Статус', avatar: 'Аватар (эмодзи)',
    theme: 'Тема', language: 'Язык', cancel: 'Отмена', save: 'Сохранить',
    dark: 'Черная', light: 'Белая', voice: 'Голосовой звонок', video: 'Видеозвонок', profile: 'Профиль',
    notAuth: 'Не авторизованы', logout: 'Выйти', authHint: 'Реальный вход через Facebook OAuth (backend на :8080).',
    writeMessage: 'Напишите сообщение...', newChat: 'Новый чат',
    endCall: 'Завершить', call: 'Звонок', connecting: 'Соединение...',
    enterChatName: 'Имя нового чата:', accepted: 'Понял, принято ✅',
    online: 'Онлайн', noMessages: 'Нет сообщений',
    authError: 'Ошибка авторизации Facebook.',
  },
  en: {
    sidebarSubtitle: 'Your chats', search: 'Search...', send: 'Send',
    settingsTitle: 'Profile settings', nickname: 'Nickname', status: 'Status', avatar: 'Avatar (emoji)',
    theme: 'Theme', language: 'Language', cancel: 'Cancel', save: 'Save',
    dark: 'Dark', light: 'Light', voice: 'Voice call', video: 'Video call', profile: 'Profile',
    notAuth: 'Not signed in', logout: 'Logout', authHint: 'Real Facebook OAuth login (backend at :8080).',
    writeMessage: 'Type a message...', newChat: 'New chat',
    endCall: 'End call', call: 'Call', connecting: 'Connecting...',
    enterChatName: 'New chat name:', accepted: 'Got it ✅',
    online: 'Online', noMessages: 'No messages',
    authError: 'Facebook authorization error.',
  },
  pt: {
    sidebarSubtitle: 'Seus chats', search: 'Pesquisar...', send: 'Enviar',
    settingsTitle: 'Configurações de perfil', nickname: 'Apelido', status: 'Status', avatar: 'Avatar (emoji)',
    theme: 'Tema', language: 'Idioma', cancel: 'Cancelar', save: 'Salvar',
    dark: 'Escuro', light: 'Claro', voice: 'Chamada de voz', video: 'Chamada de vídeo', profile: 'Perfil',
    notAuth: 'Não autenticado', logout: 'Sair', authHint: 'Login real via Facebook OAuth (backend em :8080).',
    writeMessage: 'Digite uma mensagem...', newChat: 'Novo chat',
    endCall: 'Encerrar', call: 'Chamada', connecting: 'Conectando...',
    enterChatName: 'Nome do novo chat:', accepted: 'Entendido ✅',
    online: 'Online', noMessages: 'Sem mensagens',
    authError: 'Erro de autorização do Facebook.',
  },
};

const defaultProfile = {
  nickname: 'Вы',
  status: 'Онлайн',
  avatar: '😎',
  theme: 'dark',
  language: 'ru',
};

const savedProfile = JSON.parse(localStorage.getItem('nm-profile') || 'null');
const profile = { ...defaultProfile, ...(savedProfile || {}) };

const state = { activeChatId: chats[0].id, filter: '', user: null };

const el = {
  chatList: document.getElementById('chatList'), chatUser: document.getElementById('chatUser'),
  messages: document.getElementById('messages'), messageForm: document.getElementById('messageForm'),
  messageInput: document.getElementById('messageInput'), chatSearch: document.getElementById('chatSearch'),
  openProfileBtn: document.getElementById('openProfileBtn'), profileDialog: document.getElementById('profileDialog'),
  profileForm: document.getElementById('profileForm'), profileNickname: document.getElementById('profileNickname'),
  profileStatus: document.getElementById('profileStatus'), profileAvatar: document.getElementById('profileAvatar'),
  themeMode: document.getElementById('themeMode'), languageSelect: document.getElementById('languageSelect'),
  voiceCallBtn: document.getElementById('voiceCallBtn'), videoCallBtn: document.getElementById('videoCallBtn'),
  callDialog: document.getElementById('callDialog'), callTitle: document.getElementById('callTitle'),
  callText: document.getElementById('callText'), callAvatar: document.getElementById('callAvatar'),
  newChatBtn: document.getElementById('newChatBtn'), authState: document.getElementById('authState'),
  facebookLoginBtn: document.getElementById('facebookLoginBtn'), socialLogoutBtn: document.getElementById('socialLogoutBtn'),
  sidebarSubtitle: document.getElementById('sidebarSubtitle'), authHint: document.getElementById('authHint'),
  sendBtn: document.getElementById('sendBtn'), settingsTitle: document.getElementById('settingsTitle'),
  labelNickname: document.getElementById('labelNickname'), labelStatus: document.getElementById('labelStatus'),
  labelAvatar: document.getElementById('labelAvatar'), labelTheme: document.getElementById('labelTheme'),
  labelLanguage: document.getElementById('labelLanguage'), cancelBtn: document.getElementById('cancelBtn'),
  saveProfileBtn: document.getElementById('saveProfileBtn'), endCallBtn: document.getElementById('endCallBtn'),
};

function t(key) { return (i18n[profile.language] || i18n.ru)[key] || key; }
function activeChat() { return chats.find((chat) => chat.id === state.activeChatId); }

function applyTheme() {
  document.documentElement.setAttribute('data-theme', profile.theme);
  document.body.setAttribute('data-theme', profile.theme);
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

function saveProfile() {
  localStorage.setItem('nm-profile', JSON.stringify(profile));
}

async function fetchSessionUser() {
  try {
    const response = await fetch(`${AUTH_API_BASE}/me`, { credentials: 'include' });
    if (!response.ok) {
      state.user = null;
      renderAuth();
      return;
    }
    const payload = await response.json();
    state.user = payload.user || null;
    if (state.user?.name) {
      profile.nickname = state.user.name;
      saveProfile();
    }
    renderAll();
  } catch {
    state.user = null;
    renderAuth();
  }
}

function renderAuth() {
  if (state.user) {
    el.authState.textContent = `${state.user.provider || 'Facebook'}: ${state.user.name}`;
    el.socialLogoutBtn.disabled = false;
  } else {
    el.authState.textContent = t('notAuth');
    el.socialLogoutBtn.disabled = true;
  }
}

function handleOauthErrorsInUrl() {
  const url = new URL(window.location.href);
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');
  if (error) {
    alert(`${t('authError')} ${errorDescription || error}`);
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    url.searchParams.delete('error_reason');
    window.history.replaceState({}, '', url.toString());
  }
}

function startFacebookOAuth() {
  const returnTo = `${window.location.origin}${window.location.pathname}`;
  const loginUrl = `${AUTH_API_BASE}/auth/facebook/start?return_to=${encodeURIComponent(returnTo)}`;
  window.location.href = loginUrl;
}

function renderChats() {
  const filter = state.filter.toLowerCase();
  const visibleChats = chats.filter((chat) => chat.name.toLowerCase().includes(filter));
  el.chatList.innerHTML = visibleChats
    .map((chat) => {
      const last = chat.messages.at(-1)?.text || t('noMessages');
      return `<button class="chat-item ${chat.id === state.activeChatId ? 'active' : ''}" data-id="${chat.id}">
        <span class="avatar">${chat.avatar}</span>
        <span><span class="name">${chat.name}</span><span class="preview">${last}</span></span>
      </button>`;
    })
    .join('');
}

function renderHeader() {
  const chat = activeChat();
  el.chatUser.innerHTML = `<span class="avatar">${profile.avatar || chat.avatar}</span><span><strong>${chat.name}</strong><p>${profile.status || t('online')}</p></span>`;
}

function renderMessages() {
  const chat = activeChat();
  el.messages.innerHTML = chat.messages.map((msg) => `<article class="msg ${msg.from}">${msg.text}</article>`).join('');
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

el.chatList.addEventListener('click', (event) => {
  const btn = event.target.closest('.chat-item');
  if (!btn) return;
  state.activeChatId = Number(btn.dataset.id);
  renderAll();
});

el.chatSearch.addEventListener('input', (event) => {
  state.filter = event.target.value;
  renderChats();
});

el.messageForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = el.messageInput.value.trim();
  if (!text) return;

  activeChat().messages.push({ from: 'me', text });
  el.messageInput.value = '';
  renderAll();

  setTimeout(() => {
    activeChat().messages.push({ from: 'them', text: t('accepted') });
    renderAll();
  }, 700);
});

el.openProfileBtn.addEventListener('click', () => {
  el.profileNickname.value = profile.nickname;
  el.profileStatus.value = profile.status;
  el.profileAvatar.value = profile.avatar;
  el.themeMode.value = profile.theme;
  el.languageSelect.value = profile.language;
  el.profileDialog.showModal();
});

el.profileForm.addEventListener('submit', () => {
  profile.nickname = el.profileNickname.value.trim() || defaultProfile.nickname;
  profile.status = el.profileStatus.value.trim() || t('online');
  profile.avatar = el.profileAvatar.value.trim() || defaultProfile.avatar;
  profile.theme = el.themeMode.value;
  profile.language = el.languageSelect.value;
  saveProfile();
  renderAll();
});

function startCall(type) {
  const chat = activeChat();
  el.callTitle.textContent = type === 'video' ? t('video') : t('voice');
  el.callText.textContent = `${chat.name} · ${t('connecting')}`;
  el.callAvatar.textContent = chat.avatar;
  el.callDialog.showModal();
}

el.voiceCallBtn.addEventListener('click', () => startCall('voice'));
el.videoCallBtn.addEventListener('click', () => startCall('video'));

el.newChatBtn.addEventListener('click', () => {
  const name = prompt(t('enterChatName'));
  if (!name) return;
  const chat = { id: Date.now(), name, avatar: '✨', messages: [{ from: 'them', text: `Чат «${name}» создан.` }] };
  chats.unshift(chat);
  state.activeChatId = chat.id;
  renderAll();
});

el.facebookLoginBtn.addEventListener('click', startFacebookOAuth);
el.socialLogoutBtn.addEventListener('click', async () => {
  try {
    await fetch(`${AUTH_API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch {
    // ignore network errors on logout
  }
  state.user = null;
  renderAuth();
});

handleOauthErrorsInUrl();
renderAll();
fetchSessionUser();
