# Nulls Messenger (UI MVP+)

Обновлённый локальный прототип мессенджера с **огромным разделом настроек** и расширенным backend API.

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
FACEBOOK_REDIRECT_URI=http://localhost:8080/auth/facebook/callback \
VK_CLIENT_ID=... \
VK_CLIENT_SECRET=... \
VK_REDIRECT_URI=http://localhost:8080/auth/vk/callback \
FRONTEND_ORIGIN=http://localhost:4173 \
FRONTEND_ORIGINS=http://localhost:4173,http://127.0.0.1:4173,http://0.0.0.0:4173 \
SESSION_SECRET=replace_me \
npm start
```

## Что переписано

- Настройки разделены на крупные секции и вынесены в отдельное модальное окно:
  - профиль,
  - внешний вид,
  - приватность,
  - уведомления,
  - защита,
  - чаты и сообщения.
- Настройки теперь синхронизируются через backend API (`GET/PUT /settings`), а не только в localStorage.
- Добавлены API-эндпоинты для метаданных и безопасности сессии.
- Расширена API-модель чатов:
  - `GET /chats/:chatId/messages?limit&before`
  - `GET /chats/:chatId/stats`

## OAuth Facebook/VK

- Facebook: `/auth/facebook/start` → официальный `facebook.com`
- VK: `/auth/vk/start` → официальный `oauth.vk.com`
- Статус провайдеров: `GET /auth/providers/status`

> Важно: зарегистрировать Facebook App может только владелец аккаунта в Meta Developers: <https://developers.facebook.com/>.

## API

### Системные
- `GET /api/meta`
- `GET /auth/providers/status`

### Авторизация
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /me`
- `GET /auth/facebook/start`
- `GET /auth/facebook/callback`
- `GET /auth/vk/start`
- `GET /auth/vk/callback`

### Настройки и безопасность
- `GET /settings`
- `PUT /settings`
- `GET /security/sessions`
- `POST /security/sessions/refresh`

### Чаты
- `POST /chats/by-phone`
- `GET /chats`
- `GET /chats/:chatId/messages`
- `POST /chats/:chatId/messages`
- `GET /chats/:chatId/stats`