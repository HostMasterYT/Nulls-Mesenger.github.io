{
  "name": "nulls-messenger-auth-server",
  "version": "1.0.1",
  "private": true,
  "description": "Backend OAuth service for Nulls Messenger (Facebook login)",
  "type": "module",
  "main": "index.js",
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js",
    "check": "node --check index.js"
  },
  "dependencies": {
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "express": "^4.21.2"
  }
}