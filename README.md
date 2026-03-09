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
FACEBOOK_APP_ID=1437460264576640 \
FACEBOOK_APP_SECRET=... \
FACEBOOK_REDIRECT_URI=http://localhost:8080/auth/facebook/callback \
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


## Работа только через backend (без demo-mode)

Теперь UI не переключается в оффлайн-демо автоматически.
Для регистрации/логина/чатов/синхронизации настроек backend должен быть запущен и доступен по `AUTH_API_BASE` (по умолчанию `http://localhost:8080`).

## OAuth Facebook

- Facebook: `/auth/facebook/start` → официальный `facebook.com`
- App ID по умолчанию в сервере: `1437460264576640`
- Статус Facebook провайдера: `GET /auth/providers/status`

> Важно: зарегистрировать Facebook App может только владелец аккаунта в Meta Developers: <https://developers.facebook.com/>.


### Facebook вход (без JSSDK кнопки)

В приложении используется серверный OAuth-редирект через кнопку `Facebook`:
- UI переводит на `GET /auth/facebook/start`,
- сервер перенаправляет на Facebook и после callback создаёт backend-сессию.

Если в кабинете Meta вы видите сообщение *"Вход через JSSDK отключен"*,
включите параметр **"Вход с SDK JavaScript"** в developers.facebook.com.
Это не требуется для текущего redirect-flow, но необходимо именно для `<fb:login-button>` сценариев.

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