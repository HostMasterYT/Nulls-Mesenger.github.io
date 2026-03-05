# Nulls Messenger (UI MVP)

Локальный прототип мессенджера: чаты, сообщения, звонки, настройки профиля (ник, аватар, тема, язык) и **реальный Facebook OAuth flow через backend**.

## Запуск фронтенда

```bash
python3 -m http.server 4173
```

Откройте: <http://localhost:4173>

## Запуск backend для Facebook OAuth

```bash
cd server
npm install
FACEBOOK_APP_ID=... \
FACEBOOK_APP_SECRET=... \
FACEBOOK_REDIRECT_URI=http://localhost:8080/auth/facebook/callback \
FRONTEND_ORIGIN=http://localhost:4173 \
npm start
```

Backend поднимается на `http://localhost:8080`.

## Что реализовано правильно по OAuth (Facebook v25.0)

1. Редирект на:
   - `https://www.facebook.com/v25.0/dialog/oauth`
   - параметры: `client_id`, `redirect_uri`, `state`, `response_type=code`, `scope=email,public_profile`
2. Обработка ошибок callback:
   - `error_reason=user_denied`
   - `error=access_denied`
   - `error_description=...`
3. Обмен `code` на токен:
   - `GET https://graph.facebook.com/v25.0/oauth/access_token?...`
4. Валидация токена:
   - `GET https://graph.facebook.com/debug_token?...`
5. Получение профиля:
   - `GET https://graph.facebook.com/me?fields=id,name,email,picture...`
6. Создание серверной сессии и `httpOnly` cookie.

## Endpoints backend

- `GET /auth/facebook/start`
- `GET /auth/facebook/callback`
- `GET /me`
- `POST /auth/logout`

## Важно

- Для production поставьте `secure: true` cookie и HTTPS.
- Храните `FACEBOOK_APP_SECRET` только на сервере.
