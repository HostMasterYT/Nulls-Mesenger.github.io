# Nulls Messenger (UI MVP)

Локальный прототип мессенджера без сервера: чаты, сообщения, звонки, регистрация через Facebook (demo) и настройки профиля.

## Запуск

```bash
python3 -m http.server 4173
```

Откройте в браузере: <http://localhost:4173>

## Что уже можно настроить

- Ник и аватар профиля.
- Тема интерфейса: **черная** / **белая**.
- Язык интерфейса: **русский**, **английский**, **португальский**.

## Регистрация / вход

Сейчас в MVP включена только регистрация через **Facebook** в demo-режиме (без backend): ввод имени через prompt и сохранение локально в `localStorage`.

## Как добавить реальную регистрацию через Facebook (с сервером)

1. Создайте backend (например Node.js + Express) и базу (PostgreSQL).
2. В [Meta for Developers](https://developers.facebook.com/) создайте приложение и получите:
   - `FACEBOOK_APP_ID`
   - `FACEBOOK_APP_SECRET`
3. На backend реализуйте OAuth callback:
   - фронт отправляет пользователя на Facebook OAuth URL,
   - Facebook возвращает `code` в `redirect_uri`,
   - backend обменивает `code` на access token,
   - backend получает профиль пользователя и создаёт/находит его в БД.
4. Backend выдаёт сессию/JWT и возвращает пользователя на фронт.
5. На фронте замените demo `prompt` на редирект к backend (`/auth/facebook/start`).

Минимальные backend endpoints:
- `GET /auth/facebook/start`
- `GET /auth/facebook/callback`
- `POST /auth/logout`
- `GET /me`