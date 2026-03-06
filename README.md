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
FACEBOOK_REDIRECT_URI=http://localhost:8080/auth/facebook/callback \
VK_CLIENT_ID=... \
VK_CLIENT_SECRET=... \
VK_REDIRECT_URI=http://localhost:8080/auth/vk/callback \
FRONTEND_ORIGIN=http://localhost:4173 \
# опционально: несколько origin через запятую
FRONTEND_ORIGINS=http://localhost:4173,http://127.0.0.1:4173,http://0.0.0.0:4173 \
SESSION_SECRET=replace_me \
npm start
```


> Если при регистрации в браузере ошибка `NetworkError when attempting to fetch resource`,
> обычно это означает, что backend не запущен на `http://localhost:8080` или origin фронтенда не разрешён CORS.
> В этой версии сервер по умолчанию разрешает `localhost/127.0.0.1/0.0.0.0:4173`, и дополнительно можно задать `FRONTEND_ORIGINS`.
## Регистрация / вход

- Регистрация без кода подтверждения: `POST /auth/register`
- Вход: `POST /auth/login`
- Долгая сессия через cookie `nm_auth` (можно войти на другом устройстве тем же логином/паролем)
- Данные сохраняются в:
  - `server/data/users.json`
  - `server/data/chats.json`

## OAuth Facebook/VK

- Facebook: `/auth/facebook/start` -> официальный `facebook.com`
- VK: `/auth/vk/start` -> официальный `oauth.vk.com`
- Статус конфигурации провайдеров: `GET /auth/providers/status`

> Важно: я не могу физически зарегистрировать Facebook App за вас — это делается только владельцем аккаунта в Meta Developers.

### Как добавить Facebook API ключи

1. Зайдите в <https://developers.facebook.com/> под своим аккаунтом.
2. Создайте App (обычно тип **Consumer**).
3. Добавьте продукт **Facebook Login**.
4. В поле **Valid OAuth Redirect URIs** укажите ваш callback:
   - локально: `http://localhost:8080/auth/facebook/callback`
5. Возьмите `App ID` и `App Secret`.
6. Подставьте их в переменные окружения сервера:
   - `FACEBOOK_APP_ID`
   - `FACEBOOK_APP_SECRET`
   - `FACEBOOK_REDIRECT_URI`

После этого кнопка Facebook на UI станет рабочей (и в UI будет отображаться статус конфигурации OAuth-провайдеров).

## Окно настроек

Кнопка ⚙️ открывает отдельное модальное окно с блоками:
- профиль (ник, статус, аватар)
- внешний вид (тема: dark/light/system, акцент, плотность интерфейса)
- защита (PIN demo, скрытие телефона, login alerts demo, биометрия demo, blur превью, TTL сессии)

## API

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/providers/status`
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