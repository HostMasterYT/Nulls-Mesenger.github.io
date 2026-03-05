const AUTH_API_BASE = window.__AUTH_API_BASE__ || `${window.location.origin}`;

const chats = [
  { id: 1, name: 'Alice', avatar: '🦊', messages: [{ from: 'them', text: 'Привет! Давай вечером созвон?' }] },
  { id: 2, name: 'Dev Chat', avatar: '💻', messages: [{ from: 'them', text: 'Готовим MVP без сервера.' }] },
];

const i18n = {
  ru: { sidebarSubtitle: 'Ваши чаты', search: 'Поиск...', send: 'Отправить', settingsTitle: 'Настройки профиля', nickname: 'Ник', status: 'Статус', avatar: 'Аватар (эмодзи)', theme: 'Тема', language: 'Язык', cancel: 'Отмена', save: 'Сохранить', dark: 'Черная', light: 'Белая', voice: 'Голосовой звонок', video: 'Видеозвонок', profile: 'Профиль', notAuth: 'Не авторизованы', logout: 'Выйти', authHint: 'Локальный вход + Facebook OAuth.', writeMessage: 'Напишите сообщение...', newChat: 'Новый чат (по номеру)', endCall: 'Завершить', call: 'Звонок', connecting: 'Соединение...', accepted: 'Понял, принято ✅', online: 'Онлайн', noMessages: 'Нет сообщений', authError: 'Ошибка авторизации.', phonePrompt: 'Введите номер друга:' },
  en: { sidebarSubtitle: 'Your chats', search: 'Search...', send: 'Send', settingsTitle: 'Profile settings', nickname: 'Nickname', status: 'Status', avatar: 'Avatar (emoji)', theme: 'Theme', language: 'Language', cancel: 'Cancel', save: 'Save', dark: 'Dark', light: 'Light', voice: 'Voice call', video: 'Video call', profile: 'Profile', notAuth: 'Not signed in', logout: 'Logout', authHint: 'Local auth + Facebook OAuth.', writeMessage: 'Type a message...', newChat: 'New chat (by phone)', endCall: 'End call', call: 'Call', connecting: 'Connecting...', accepted: 'Got it ✅', online: 'Online', noMessages: 'No messages', authError: 'Authorization error.', phonePrompt: 'Enter friend phone:' },
  pt: { sidebarSubtitle: 'Seus chats', search: 'Pesquisar...', send: 'Enviar', settingsTitle: 'Configurações', nickname: 'Apelido', status: 'Status', avatar: 'Avatar (emoji)', theme: 'Tema', language: 'Idioma', cancel: 'Cancelar', save: 'Salvar', dark: 'Escuro', light: 'Claro', voice: 'Chamada de voz', video: 'Chamada de vídeo', profile: 'Perfil', notAuth: 'Não autenticado', logout: 'Sair', authHint: 'Auth local + Facebook OAuth.', writeMessage: 'Digite uma mensagem...', newChat: 'Novo chat (por telefone)', endCall: 'Encerrar', call: 'Chamada', connecting: 'Conectando...', accepted: 'Entendido ✅', online: 'Online', noMessages: 'Sem mensagens', authError: 'Erro de autorização.', phonePrompt: 'Digite o telefone do amigo:' },
};

const profile = { nickname: 'Вы', status: 'Онлайн', avatar: '😎', theme: 'dark', language: 'ru', ...(JSON.parse(localStorage.getItem('nm-profile') || 'null') || {}) };
const state = { activeChatId: chats[0].id, filter: '', user: null };
const $ = (id) => document.getElementById(id);
const el = ['chatList','chatUser','messages','messageForm','messageInput','chatSearch','openProfileBtn','profileDialog','profileForm','profileNickname','profileStatus','profileAvatar','themeMode','languageSelect','voiceCallBtn','videoCallBtn','callDialog','callTitle','callText','callAvatar','newChatBtn','authState','facebookLoginBtn','socialLogoutBtn','sidebarSubtitle','authHint','sendBtn','settingsTitle','labelNickname','labelStatus','labelAvatar','labelTheme','labelLanguage','cancelBtn','saveProfileBtn','endCallBtn','localUsername','localPhone','localPassword','registerBtn','loginBtn','localEmail','localCode','requestCodeBtn','confirmCodeBtn'].reduce((a,k)=> (a[k]=$(k),a),{});

const t = (k) => (i18n[profile.language]||i18n.ru)[k] || k;
const activeChat = () => chats.find((c)=>c.id===state.activeChatId);
const saveProfile = ()=> localStorage.setItem('nm-profile', JSON.stringify(profile));

function applyTheme(){ document.documentElement.setAttribute('data-theme',profile.theme); document.body.setAttribute('data-theme',profile.theme); }
function renderAuth(){ el.authState.textContent = state.user ? `${state.user.provider||'Local'}: ${state.user.name}` : t('notAuth'); el.socialLogoutBtn.disabled=!state.user; }
function applyTranslations(){ el.sidebarSubtitle.textContent=t('sidebarSubtitle'); el.chatSearch.placeholder=t('search'); el.messageInput.placeholder=t('writeMessage'); el.sendBtn.textContent=t('send'); el.settingsTitle.textContent=t('settingsTitle'); el.labelNickname.textContent=t('nickname'); el.labelStatus.textContent=t('status'); el.labelAvatar.textContent=t('avatar'); el.labelTheme.textContent=t('theme'); el.labelLanguage.textContent=t('language'); el.cancelBtn.textContent=t('cancel'); el.saveProfileBtn.textContent=t('save'); el.endCallBtn.textContent=t('endCall'); el.newChatBtn.title=t('newChat'); el.voiceCallBtn.title=t('voice'); el.videoCallBtn.title=t('video'); el.openProfileBtn.title=t('profile'); el.socialLogoutBtn.textContent=t('logout'); el.authHint.textContent=t('authHint'); el.callTitle.textContent=t('call'); el.themeMode.options[0].textContent=t('dark'); el.themeMode.options[1].textContent=t('light'); }

function renderChats(){ const f=state.filter.toLowerCase(); el.chatList.innerHTML=chats.filter(c=>c.name.toLowerCase().includes(f)).map(c=>`<button class="chat-item ${c.id===state.activeChatId?'active':''}" data-id="${c.id}"><span class="avatar">${c.avatar}</span><span><span class="name">${c.name}</span><span class="preview">${c.messages.at(-1)?.text||t('noMessages')}</span></span></button>`).join(''); }
function renderHeader(){ const c=activeChat(); el.chatUser.innerHTML=`<span class="avatar">${profile.avatar||c.avatar}</span><span><strong>${c.name}</strong><p>${profile.status||t('online')}</p></span>`; }
function renderMessages(){ const c=activeChat(); el.messages.innerHTML=c.messages.map(m=>`<article class="msg ${m.from}">${m.text}</article>`).join(''); el.messages.scrollTop=el.messages.scrollHeight; }
function renderAll(){ applyTheme(); applyTranslations(); renderAuth(); renderChats(); renderHeader(); renderMessages(); }

async function fetchSessionUser(){ try{ const r=await fetch(`${AUTH_API_BASE}/me`,{credentials:'include'}); if(!r.ok) return; const d=await r.json(); state.user=d.user||null; if(state.user?.name){ profile.nickname=state.user.name; saveProfile(); } renderAll(); }catch{} }
function handleOauthErrorsInUrl(){ const u=new URL(window.location.href); const err=u.searchParams.get('error'); if(err){ alert(`${t('authError')} ${u.searchParams.get('error_description')||err}`); ['error','error_description','error_reason'].forEach(k=>u.searchParams.delete(k)); history.replaceState({},'',u.toString()); }}
function startFacebookOAuth(){ const returnTo=`${window.location.origin}${window.location.pathname}`; window.location.href=`${AUTH_API_BASE}/auth/facebook/start?return_to=${encodeURIComponent(returnTo)}`; }

function readAuthFields(){
  return {
    username: el.localUsername.value.trim(),
    phone: el.localPhone.value.trim(),
    email: el.localEmail.value.trim(),
    password: el.localPassword.value.trim(),
    code: el.localCode.value.trim(),
  };
}

async function requestCode(){
  const f=readAuthFields();
  if(!f.username||!f.phone||!f.password) return alert('Заполни username, phone, password');
  const channel = f.email ? 'email' : 'phone';
  const r=await fetch(`${AUTH_API_BASE}/auth/register/request-code`,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({username:f.username,phone:f.phone,email:f.email,password:f.password,channel})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) return alert(d.error||'request code error');
  alert(`Код отправлен на ${d.target}. Demo code: ${d.dev_code}`);
}

async function confirmCode(){
  const f=readAuthFields();
  if(!f.code) return alert('Введи код подтверждения');
  const channel = f.email ? 'email' : 'phone';
  const target = f.email || f.phone;
  const r=await fetch(`${AUTH_API_BASE}/auth/register/confirm`,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({channel,target,code:f.code})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) return alert(d.error||'confirm code error');
  state.user=d.user; profile.nickname=d.user.name; saveProfile(); renderAll();
}

async function loginLocal(){
  const f=readAuthFields();
  if(!f.password || (!f.phone && !f.email && !f.username)) return alert('Нужны login и password');
  const r=await fetch(`${AUTH_API_BASE}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({username:f.username,phone:f.phone,email:f.email,password:f.password})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) return alert(d.error||'login error');
  state.user=d.user; profile.nickname=d.user.name; saveProfile(); renderAll();
}

async function startChatByPhone(){ const phone=prompt(t('phonePrompt')); if(!phone) return; const r=await fetch(`${AUTH_API_BASE}/users/by-phone?phone=${encodeURIComponent(phone)}`,{credentials:'include'}); const d=await r.json().catch(()=>({})); if(!r.ok||!d.user) return alert('Пользователь не найден'); const chat={id:Date.now(),name:d.user.name,avatar:'👤',messages:[{from:'them',text:`Чат с ${d.user.name} (${d.user.phone})`}]}; chats.unshift(chat); state.activeChatId=chat.id; renderAll(); }

el.chatList.addEventListener('click',(e)=>{ const b=e.target.closest('.chat-item'); if(!b) return; state.activeChatId=Number(b.dataset.id); renderAll(); });
el.chatSearch.addEventListener('input',(e)=>{ state.filter=e.target.value; renderChats(); });
el.messageForm.addEventListener('submit',(e)=>{ e.preventDefault(); const text=el.messageInput.value.trim(); if(!text) return; activeChat().messages.push({from:'me',text}); el.messageInput.value=''; renderAll(); setTimeout(()=>{activeChat().messages.push({from:'them',text:t('accepted')}); renderAll();},600); });
el.openProfileBtn.addEventListener('click',()=>{ el.profileNickname.value=profile.nickname; el.profileStatus.value=profile.status; el.profileAvatar.value=profile.avatar; el.themeMode.value=profile.theme; el.languageSelect.value=profile.language; el.profileDialog.showModal(); });
el.profileForm.addEventListener('submit',()=>{ profile.nickname=el.profileNickname.value.trim()||profile.nickname; profile.status=el.profileStatus.value.trim()||t('online'); profile.avatar=el.profileAvatar.value.trim()||profile.avatar; profile.theme=el.themeMode.value; profile.language=el.languageSelect.value; saveProfile(); renderAll(); });
const startCall=(type)=>{ const c=activeChat(); el.callTitle.textContent=type==='video'?t('video'):t('voice'); el.callText.textContent=`${c.name} · ${t('connecting')}`; el.callAvatar.textContent=c.avatar; el.callDialog.showModal(); };
el.voiceCallBtn.addEventListener('click',()=>startCall('voice')); el.videoCallBtn.addEventListener('click',()=>startCall('video'));
el.newChatBtn.addEventListener('click',startChatByPhone);
el.facebookLoginBtn.addEventListener('click',startFacebookOAuth);
el.requestCodeBtn.addEventListener('click',requestCode);
el.confirmCodeBtn.addEventListener('click',confirmCode);
el.registerBtn.addEventListener('click',confirmCode);
el.loginBtn.addEventListener('click',loginLocal);
el.socialLogoutBtn.addEventListener('click',async()=>{ try{await fetch(`${AUTH_API_BASE}/auth/logout`,{method:'POST',credentials:'include'});}catch{} state.user=null; renderAuth(); });

handleOauthErrorsInUrl(); renderAll(); fetchSessionUser();
