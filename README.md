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
FACEBOOK_REDIRECT_URI=http://localhost:8080/auth/facebook/callback \
FRONTEND_ORIGIN=http://localhost:4173 \
SESSION_SECRET=replace_me \
npm start
```

## Что исправлено

- Регистрация теперь рабочая: сначала отправка кода подтверждения (`/auth/register/request-code`), потом подтверждение (`/auth/register/confirm`).
- Код подтверждения можно отправлять на телефон или email (в демо выводится в лог сервера и возвращается как `dev_code`).
- Вход сделан не "на один раз": используется долгоживущая signed cookie (`nm_auth`, по умолчанию 30 дней).
- Реальный вход через сайт Facebook OAuth сохранён.
- Добавлен поиск пользователя по номеру (`/users/by-phone`) для старта чата с реальными зарегистрированными пользователями вашего сервиса.

## API

- `POST /auth/register/request-code`
  - body: `username`, `phone`, `email?`, `password`, `channel` (`phone|email`)
- `POST /auth/register/confirm`
  - body: `channel`, `target`, `code`
- `POST /auth/login`
  - body: `username?`, `phone?`, `email?`, `password`
- `GET /auth/facebook/start`
- `GET /auth/facebook/callback`
- `GET /me`
- `POST /auth/logout`
- `GET /users/by-phone?phone=...`

## Важно

Через обычный Facebook Login API нельзя легально получить произвольных "друзей по номеру телефона". В этом MVP корректно реализовано общение между пользователями, зарегистрированными в вашем приложении по номеру телефона.
