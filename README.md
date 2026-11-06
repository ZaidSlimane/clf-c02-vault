# CLF-C02 Study Dashboard

React website for the AWS Certified Cloud Practitioner CLF-C02 exam study dashboard, with Vercel functions in `api/` and a Neon Postgres database.

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the [environment variables](#environment-variables).
3. Create the tables, see [Database](#database).
4. Start the app, see [Local development](#local-development).

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `JWT_SECRET` | Yes | Signs and verifies session tokens |
| `AI_KEY_ENCRYPTION_SECRET` | Yes | Encrypts saved AI provider keys. Base64 that decodes to exactly 32 bytes |

Set the same variables in the Vercel project for deployed environments.

Generate `AI_KEY_ENCRYPTION_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Warning:** changing or losing this secret makes every saved API key unreadable. Each user then has to enter their key again in Settings. It must stay separate from `JWT_SECRET`.

## Database

`db/init.sql` is the only schema source. The app does not create tables at runtime, so this step is mandatory before the first deploy and after any schema change. The script is safe to run repeatedly and keeps existing rows.

```bash
psql "$DATABASE_URL" -f db/init.sql
```

Or paste the file into the Neon SQL editor.

**Upgrading to username sign up:** run `db/init.sql` before deploying. It adds the `username`, `first_name` and `last_name` columns; existing accounts leave them empty and keep signing in by email.

**Upgrading an existing deployment:** run `db/init.sql` on the deployed database and set `AI_KEY_ENCRYPTION_SECRET` in Vercel before deploying this release.

## Local Development

`npm run dev` starts Vite on http://localhost:5173 but does not serve `/api`, so sign-in, sync and AI do not work with it.

For the full stack, link the project and use the Vercel CLI:

```bash
npx vercel link
npx vercel dev
```

This command was not verified during the current release; `vercel` is not a project dependency.

## API

All routes are same-origin; no CORS headers are sent. "Bearer" means the route needs an `Authorization: Bearer <token>` header and returns 401 without a valid one.

| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/auth/register` | POST | None | Create an account and return a token |
| `/api/auth/login` | POST | None | Sign in and return a token |
| `/api/auth/me` | GET | Bearer | Return the current user |
| `/api/progress` | GET, POST | Bearer | Read or replace exam progress |
| `/api/tracker` | GET, POST | Bearer | Read or replace study tracker data |
| `/api/tracker-logs` | GET, POST | Bearer | Read or replace tracker activity logs |
| `/api/study-sessions` | GET, POST | Bearer | Read the last 84 days of study sessions or add one |
| `/api/conversations` | GET, POST, DELETE | Bearer | List, add or clear saved AI conversations |
| `/api/ai-settings` | GET, PUT, DELETE | Bearer | Read, save or remove your AI provider. Never returns the key |
| `/api/chat` | POST | Bearer | Send a prompt to your saved AI provider |

Shared helpers live in `api/_lib/`, which is not routed.

## AI Provider

Each user sets their own provider in **Settings**: base URL, model and API key. The key is sent to the server, stored AES-256-GCM encrypted, and never returned to the browser.

The provider must:

- Expose an OpenAI-compatible `POST <base URL>/chat/completions` endpoint that answers with `choices[0].message.content`.
- Be publicly reachable over HTTPS on port 443. Private addresses, IP-literal hosts, `localhost` and redirects are refused, so self-hosted or LAN providers such as Ollama do not work.
- Answer within 25 seconds, with a response under 1 MiB.

Changing the base URL to a different host requires entering the API key again.

## Tests

```bash
npm test
```

## Build

```bash
npm run build
npm run preview
```

The `dist/` folder contains the production build. `npm run preview` serves static files only, not `/api`.
