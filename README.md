# Nulls Messenger (UI MVP)

Локальный прототип мессенджера: чаты, сообщения, звонки, настройки профиля, локальная регистрация + OAuth (Facebook/VK).

## Запуск фронтенда

```bash
python3 -m http.server 4173
```

Откройте: <http://localhost:4173>

## Запуск backend

```bash
cd server
npm install
FACEBOOK_APP_ID=... \
FACEBOOK_APP_SECRET=... \
FACEBOOK_REDIRECT_URI=https://YOUR_API_DOMAIN/auth/facebook/callback \
VK_CLIENT_ID=... \
VK_CLIENT_SECRET=... \
VK_REDIRECT_URI=https://YOUR_API_DOMAIN/auth/vk/callback \
FRONTEND_ORIGIN=https://YOUR_FRONTEND_DOMAIN \
SESSION_SECRET=replace_me \
npm start
```

## Что исправлено

- **Facebook кнопка**: теперь всегда стартует OAuth через backend endpoint `/auth/facebook/start`, который редиректит на официальный `facebook.com`.
- **VK кнопка**: теперь рабочая, добавлен backend flow `/auth/vk/start` -> `/auth/vk/callback` через официальный `oauth.vk.com`.
- **Реальные чаты между пользователями сервиса**:
  - создание/поиск чата по номеру телефона (`POST /chats/by-phone`)
  - отправка сообщений (`POST /chats/:chatId/messages`)
  - получение чатов/сообщений (`GET /chats`, `GET /chats/:chatId/messages`)
  - убраны фейковые авто-ответы ботов
- Добавлена цветовая кастомизация интерфейса: blue/purple/pink/red/orange/green + светлая/темная тема.

## API

- `POST /auth/register/request-code`
- `POST /auth/register/confirm`
- `POST /auth/login`
- `GET /auth/facebook/start`
- `GET /auth/facebook/callback`
- `GET /auth/vk/start`
- `GET /auth/vk/callback`
- `GET /me`
- `POST /auth/logout`
- `POST /chats/by-phone`
- `GET /chats`
- `GET /chats/:chatId/messages`
- `POST /chats/:chatId/messages`

## Важно

Это отдельный мессенджер-сервис с OAuth-входом. Он не даёт доступ к произвольным личным перепискам пользователей Facebook/VK за пределами вашего приложения.


## GitHub Pages (важно)

Если сайт открыт с `https://hostmasteryt.github.io/...`, frontend по умолчанию не знает адрес вашего backend.
Обязательно добавьте в `index.html` перед `app.js`:

```html
<script>
  window.__AUTH_API_BASE__ = 'https://YOUR_API_DOMAIN';
</script>
```

Иначе кнопки OAuth будут пытаться идти не туда и вход не откроется корректно.
