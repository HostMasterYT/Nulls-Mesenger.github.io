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
npm start
```

## Что теперь работает

- Реальный вход через сайт Facebook OAuth (`/auth/facebook/start` -> callback).
- Вход/регистрация по пользователю в вашем backend:
  - `POST /auth/register` (`username`, `phone`, `password`)
  - `POST /auth/login` (`username`, `phone`, `password`)
- Поиск пользователя по телефону для старта чата:
  - `GET /users/by-phone?phone=...` (требует активную сессию)

## Важно про "друзей Facebook по номеру"

Напрямую получить список друзей Facebook и писать им "по номеру телефона" через обычный Login API нельзя: это ограничено политиками Meta и требует отдельных разрешений/продуктов. В этом MVP реализован корректный путь для **вашего** сервера и **ваших** пользователей (зарегистрированных в приложении по номеру).
