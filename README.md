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
FRONTEND_ORIGIN=https://YOUR_FRONTEND_DOMAIN \
SESSION_SECRET=replace_me \
npm start
```

## Facebook OAuth без localhost (production)

Чтобы вход открывался через официальный сайт Facebook (а не локальный callback), укажите в Meta Developers:

- **Valid OAuth Redirect URIs**: `https://YOUR_API_DOMAIN/auth/facebook/callback`
- **App Domains**: `YOUR_API_DOMAIN`, `YOUR_FRONTEND_DOMAIN`

И на фронтенде задайте `window.__AUTH_API_BASE__` (например, в `index.html` перед `app.js`) на ваш backend-домен.

Пример:

```html
<script>
  window.__AUTH_API_BASE__ = 'https://api.yourdomain.com';
</script>
<script src="app.js"></script>
```

## Что исправлено

- Регистрация рабочая: сначала отправка кода подтверждения (`/auth/register/request-code`), потом подтверждение (`/auth/register/confirm`).
- Код подтверждения можно отправлять на телефон или email (в демо выводится в лог сервера и возвращается как `dev_code`).
- Вход сделан не "на один раз": долгоживущая signed cookie (`nm_auth`, по умолчанию 30 дней).
- Реальный вход через официальный Facebook OAuth сохранён.
- Поиск пользователя по номеру (`/users/by-phone`) для старта чата между зарегистрированными пользователями вашего сервиса.

## API

- `POST /auth/register/request-code`
- `POST /auth/register/confirm`
- `POST /auth/login`
- `GET /auth/facebook/start`
- `GET /auth/facebook/callback`
- `GET /me`
- `POST /auth/logout`
- `GET /users/by-phone?phone=...`

## Важно

Через обычный Facebook Login API нельзя превратить это приложение в официальный Facebook Messenger и переписываться с произвольными пользователями Facebook. Этот MVP даёт корректный OAuth-вход через Facebook и общение между пользователями, зарегистрированными в вашем сервисе.
