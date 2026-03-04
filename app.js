const chats = [
  {
    id: 1,
    name: 'Алиса',
    avatar: '🦊',
    messages: [
      { from: 'them', text: 'Привет! Давай вечером созвон?' },
      { from: 'me', text: 'Да, в 20:00 удобно 👌' },
    ],
  },
  {
    id: 2,
    name: 'Команда дизайна',
    avatar: '🎨',
    messages: [
      { from: 'them', text: 'Нужен новый экран профиля.' },
      { from: 'me', text: 'Сделаю стеклянный стиль как в Telegram Premium 😎' },
    ],
  },
  {
    id: 3,
    name: 'Dev Chat',
    avatar: '💻',
    messages: [{ from: 'them', text: 'Готовим MVP без сервера.' }],
  },
];

const wallpaperThemes = {
  aurora: 'radial-gradient(circle at 20% 20%, #1f355f, #0b1020 60%)',
  midnight: 'linear-gradient(150deg, #0c1230, #0a0f1a 60%, #16213f)',
  sunset: 'linear-gradient(150deg, #3f214b, #8f4359 45%, #f2a65a)',
};

const defaultProfile = {
  name: 'Вы',
  status: 'Онлайн',
  avatar: '😎',
  color: '#4a8cff',
  wallpaper: 'aurora',
};

const savedProfile = JSON.parse(localStorage.getItem('nm-profile') || 'null');
const profile = { ...defaultProfile, ...(savedProfile || {}) };

const state = {
  activeChatId: chats[0].id,
  filter: '',
};

const el = {
  app: document.getElementById('app'),
  chatList: document.getElementById('chatList'),
  chatUser: document.getElementById('chatUser'),
  messages: document.getElementById('messages'),
  messageForm: document.getElementById('messageForm'),
  messageInput: document.getElementById('messageInput'),
  chatSearch: document.getElementById('chatSearch'),
  openProfileBtn: document.getElementById('openProfileBtn'),
  profileDialog: document.getElementById('profileDialog'),
  profileForm: document.getElementById('profileForm'),
  profileName: document.getElementById('profileName'),
  profileStatus: document.getElementById('profileStatus'),
  profileAvatar: document.getElementById('profileAvatar'),
  themeColor: document.getElementById('themeColor'),
  wallpaperSelect: document.getElementById('wallpaperSelect'),
  voiceCallBtn: document.getElementById('voiceCallBtn'),
  videoCallBtn: document.getElementById('videoCallBtn'),
  callDialog: document.getElementById('callDialog'),
  callTitle: document.getElementById('callTitle'),
  callText: document.getElementById('callText'),
  callAvatar: document.getElementById('callAvatar'),
  newChatBtn: document.getElementById('newChatBtn'),
};

function activeChat() {
  return chats.find((chat) => chat.id === state.activeChatId);
}

function applyProfile() {
  document.documentElement.style.setProperty('--accent', profile.color);
  document.documentElement.style.setProperty('--bubble-me', profile.color);
  document.documentElement.style.setProperty('--wallpaper', wallpaperThemes[profile.wallpaper]);
}

function renderChats() {
  const filter = state.filter.toLowerCase();
  const visibleChats = chats.filter((chat) => chat.name.toLowerCase().includes(filter));

  el.chatList.innerHTML = visibleChats
    .map((chat) => {
      const last = chat.messages.at(-1)?.text || 'Нет сообщений';
      return `
        <button class="chat-item ${chat.id === state.activeChatId ? 'active' : ''}" data-id="${chat.id}">
          <span class="avatar">${chat.avatar}</span>
          <span>
            <span class="name">${chat.name}</span>
            <span class="preview">${last}</span>
          </span>
        </button>
      `;
    })
    .join('');
}

function renderHeader() {
  const chat = activeChat();
  el.chatUser.innerHTML = `
    <span class="avatar">${chat.avatar}</span>
    <span>
      <strong>${chat.name}</strong>
      <p>${profile.status}</p>
    </span>
  `;
}

function renderMessages() {
  const chat = activeChat();
  el.messages.innerHTML = chat.messages
    .map((msg) => `<article class="msg ${msg.from}">${msg.text}</article>`)
    .join('');
  el.messages.scrollTop = el.messages.scrollHeight;
}

function renderAll() {
  applyProfile();
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
    activeChat().messages.push({ from: 'them', text: 'Понял, принято ✅' });
    renderAll();
  }, 700);
});

el.openProfileBtn.addEventListener('click', () => {
  el.profileName.value = profile.name;
  el.profileStatus.value = profile.status;
  el.profileAvatar.value = profile.avatar;
  el.themeColor.value = profile.color;
  el.wallpaperSelect.value = profile.wallpaper;
  el.profileDialog.showModal();
});

el.profileForm.addEventListener('submit', () => {
  profile.name = el.profileName.value.trim() || defaultProfile.name;
  profile.status = el.profileStatus.value.trim() || defaultProfile.status;
  profile.avatar = el.profileAvatar.value.trim() || defaultProfile.avatar;
  profile.color = el.themeColor.value;
  profile.wallpaper = el.wallpaperSelect.value;

  localStorage.setItem('nm-profile', JSON.stringify(profile));
  renderAll();
});

function startCall(type) {
  const chat = activeChat();
  el.callTitle.textContent = type === 'video' ? 'Видеозвонок' : 'Голосовой звонок';
  el.callText.textContent = `${chat.name} · Соединение...`;
  el.callAvatar.textContent = chat.avatar;
  el.callDialog.showModal();
}

el.voiceCallBtn.addEventListener('click', () => startCall('voice'));
el.videoCallBtn.addEventListener('click', () => startCall('video'));

el.newChatBtn.addEventListener('click', () => {
  const name = prompt('Имя нового чата:');
  if (!name) return;
  const chat = {
    id: Date.now(),
    name,
    avatar: '✨',
    messages: [{ from: 'them', text: `Чат «${name}» создан.` }],
  };
  chats.unshift(chat);
  state.activeChatId = chat.id;
  renderAll();
});

renderAll();
