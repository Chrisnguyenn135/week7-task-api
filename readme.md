# Week 7 Task API (SENG3080 Lab 6)

A Task API built with Express, using Sequelize (SQLite) for storage, express-validator for input
validation, Helmet, CORS, rate limiting and compression for hardening, Passport Local with bcrypt
for authentication, and Redis for response caching and session storage.

## Requirements

- Node.js 18 or newer
- Docker Desktop (used only to run Redis)

## Installation

```powershell
git clone https://github.com/Chrisnguyenn135/week7-task-api.git
cd week7-task-api
npm install
copy .env.example .env
```

Then set `SESSION_SECRET` in `.env` to a long random value:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Start Redis

```powershell
docker run -d --name week7-redis -p 6379:6379 redis:7-alpine
docker ps
```

Later sessions: `docker start week7-redis`. To stop it: `docker stop week7-redis`.

## Run the server

```powershell
npm run dev    # development, restarts on file changes (nodemon)
npm start      # plain node
```

The API listens on `http://localhost:3000`. `database.sqlite` is created on first run.
The server will not start if Redis is unreachable, because sessions and caching depend on it.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | /api/tasks/health | Health check |
| GET | /api/tasks | List tasks (Redis cached, 60 s TTL) |
| GET | /api/tasks/:id | Read one task |
| POST | /api/tasks | Create; `title` 3–120 chars, `priority` 1–3, `completed` boolean |
| PUT | /api/tasks/:id | Partial update; same rules, all fields optional |
| DELETE | /api/tasks/:id | Delete a task |
| POST | /api/auth/register | `{ email, password }` (password at least 8 chars) |
| POST | /api/auth/login | `{ email, password }`, sets a session cookie |
| GET | /api/auth/me | Current user, 401 if not signed in |

## Test record

Tested with Postman.

| Test | Expected | Status | Response excerpt | Matched |
|---|---|---|---|---|
| GET /api/tasks/health | 200 JSON, logger output | 200 | `{"status":"ok","service":"task-api"}`; terminal logs `GET /api/tasks/health` | Yes |
| POST invalid task `{"title":"x","priority":99}` | 400 with errors | 400 | `title must be 3-120 characters`, `Invalid value` for priority | Yes |
| POST valid task | 201 with id | 201 | `{"id":3,"title":"Finish Week 7 lab","priority":1,"completed":false}` | Yes |
| GET missing task /api/tasks/1 | 404 | 404 | `{"error":"Task not found"}` | Yes |
| Security header check | Helmet header present | 200 | `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN` | Yes |
| GET /api/auth/me before login | 401 | 401 | `{"error":"Sign in required"}` | Yes |
| Register, login, GET /me | 201, 200, 200 | 201, 200, 200 | `{"id":1,"email":"chris@ex.com"}` | Yes |
| Two GET /api/tasks calls | database then cache | 200, 200 | `"source":"database"` (36 ms), then `"source":"cache"` (5 ms) | Yes |
| Create task, then GET /api/tasks | database, fresh data | 201, 200 | `"source":"database"`, new task id 4 listed first | Yes |

## npm audit

`npm audit` reports 2 moderate vulnerabilities, both from `uuid` < 11.1.1
(GHSA-w5hq-g745-h8pq), a dependency of Sequelize. The only automatic fix is
`npm audit fix --force`, which would install sequelize@3.30.0, a breaking downgrade,
so it was not applied. The app does not call `uuid` directly or pass it user input.

## Why each package is used

- **Sequelize (ORM):** maps the `Task` and `User` models to tables and builds parameterized SQL, so user input is never concatenated into queries.
- **express-validator:** rejects malformed input (wrong types, out-of-range priority, short titles) before it reaches the database.
- **Helmet:** sets defensive HTTP headers (CSP, `X-Content-Type-Options`, HSTS, frame protection).
- **CORS:** only the trusted front-end origin (`http://localhost:5173`) may make credentialed requests.
- **express-rate-limit:** caps each IP at 100 requests per 15 minutes to slow brute-force and DoS attempts.
- **Passport + bcrypt:** Passport authenticates users with the local strategy; bcrypt stores only salted password hashes (cost 12). The session stores just the user id.
- **express-session + connect-redis:** session cookies are `httpOnly` and `sameSite: lax`, and session data lives in Redis instead of process memory.
- **compression:** gzips responses to reduce payload size.
- **Redis cache:** `GET /api/tasks` is cached under `tasks:all` for 60 seconds; every POST, PUT and DELETE deletes the key so the next read is fresh.

## Project structure

```
src/
  config/      database.js, redis.js, passport.js
  middleware/  validate.js
  models/      Task.js, User.js
  routes/      tasks.js, auth.js
  server.js
.env.example
```