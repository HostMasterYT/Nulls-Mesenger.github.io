# Nulls Messenger (UI MVP)

Локальный прототип мессенджера: чаты, сообщения, звонки, настройки профиля и авторизация.

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

## Facebook/VK OAuth через официальный сайт

Теперь кнопки **Facebook** и **VK** отправляют пользователя на официальные OAuth-страницы:
- Facebook: `https://www.facebook.com/v25.0/dialog/oauth`
- VK: `https://oauth.vk.com/authorize`

Если backend на другом домене, задайте на фронте:

```html
<script>
  window.__AUTH_API_BASE__ = 'https://api.yourdomain.com';
</script>
<script src="app.js"></script>
```

Опционально можно включить direct-mode с публичными client id:

```html
<script>
  window.__OAUTH_PUBLIC__ = {
    facebookClientId: '...'
    ,facebookRedirectUri: 'https://api.yourdomain.com/auth/facebook/callback'
    ,vkClientId: '...'
    ,vkRedirectUri: 'https://api.yourdomain.com/auth/vk/callback'
  };
</script>
```

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
- `GET /users/by-phone?phone=...`

## Важно

Этот MVP — отдельный мессенджер с OAuth-входом. Он не превращает приложение в официальный Facebook Messenger/VK Messenger с доступом к произвольным перепискам пользователей платформы.
