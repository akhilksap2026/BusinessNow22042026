# Developer Environment Setup Guide

| | |
|---|---|
| **Title** | Developer Environment Setup — [PRODUCT NAME] |
| **Audience** | Engineering Team |
| **Last Updated** | [DATE] |
| **Status** | Draft |

> Welcome aboard! Follow this guide top-to-bottom on a clean machine. By the end you should have the frontend, backend, and database all running locally and the test suite passing.

---

## 1. Prerequisites

Install the following tools before you start. Versions listed are the minimum supported.

| Tool | Version | Download Link | Notes |
|---|---|---|---|
| Node.js | [≥ 20.x LTS] | https://nodejs.org/ | Use [`nvm`](https://github.com/nvm-sh/nvm) or [`fnm`](https://github.com/Schniz/fnm) to match the project's `.nvmrc`. |
| [BACKEND LANG] (e.g. Python / Go) | [≥ X.Y] | [BACKEND LANG DOWNLOAD URL] | Required only if you'll work on the backend service. |
| Docker Desktop | [≥ 24.x] | https://www.docker.com/products/docker-desktop | Used to run Postgres/Redis locally via `docker compose`. |
| Git | [≥ 2.40] | https://git-scm.com/downloads | Configure `user.name` and `user.email` before your first commit. |
| [IDE] (e.g. VS Code / JetBrains) | latest | [IDE DOWNLOAD URL] | Install the recommended workspace extensions on first open. |
| Postman (or Insomnia / Bruno) | latest | https://www.postman.com/downloads/ | Used to exercise the REST API; shared collection lives in `docs/postman/`. |

Verify each install:

```bash
node --version
[BACKEND LANG] --version
docker --version
git --version
```

---

## 2. Repository Setup

1. Clone the repository:

   ```bash
   git clone [REPO_URL]
   cd [REPO_NAME]
   ```

2. Install the Git hooks (lint + commit-message format):

   ```bash
   npm run prepare
   ```

3. Branch strategy:

   - `main` — production-ready, always deployable. Direct pushes are blocked.
   - `develop` — integration branch for the next release.
   - `feature/<short-description>` — branched from `develop`, merged back via pull request.
   - `fix/<short-description>` — bug fixes; same flow as `feature/*`.
   - `hotfix/<short-description>` — branched from `main` for urgent production fixes; merged back into both `main` and `develop`.

4. Pull requests require: green CI, at least one approving review, and a linked ticket.

---

## 3. Environment Variables

1. Copy the example file and fill in any missing values:

   ```bash
   cp .env.example .env
   ```

2. Required variables:

   | Variable | Description | Example Value | Required |
   |---|---|---|---|
   | `NODE_ENV` | Runtime mode for the Node services. | `development` | yes |
   | `PORT` | Port the backend listens on. | `8080` | yes |
   | `DATABASE_URL` | Connection string for the primary database. | `postgres://app:app@localhost:5432/[product]_dev` | yes |
   | `JWT_SECRET` | Symmetric secret used to sign access tokens. | `change-me-in-prod-please` | yes |
   | `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens. | `another-strong-secret` | yes |
   | `API_KEY` | Internal service-to-service API key. | `sk_local_xxxxxxxxxxxx` | yes |
   | `[SERVICE]_API_KEY` | Credentials for [SERVICE] (e.g. email, payments). | `[SERVICE_KEY_VALUE]` | yes |
   | `REDIS_URL` | Cache/queue connection string. | `redis://localhost:6379/0` | yes |
   | `LOG_LEVEL` | Pino/Winston level. | `debug` | no |
   | `FRONTEND_URL` | Public URL of the web client (CORS allow-list). | `http://localhost:[FRONTEND_PORT]` | yes |

3. **Never commit `.env` to version control.** It is already listed in `.gitignore`. Secrets are managed in [SECRET MANAGER] for shared and deployed environments — request access from the platform team.

---

## 4. Frontend Setup

1. Move into the frontend workspace:

   ```bash
   cd [frontend-folder]
   ```

2. Install dependencies (use the package manager committed to the repo):

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Expected output:

   ```
   VITE vX.Y.Z  ready in XXX ms
   ➜  Local:   http://localhost:[FRONTEND_PORT]/
   ➜  Network: http://0.0.0.0:[FRONTEND_PORT]/
   ```

5. Open <http://localhost:[FRONTEND_PORT]> in your browser. Hot-reload is enabled — edits to source files refresh the page automatically.

---

## 5. Backend Setup

1. Move into the backend workspace:

   ```bash
   cd [backend-folder]
   ```

2. Install dependencies:

   ```bash
   npm install
   # or, for [BACKEND LANG]:
   # [BACKEND LANG INSTALL COMMAND]
   ```

3. Run database migrations:

   ```bash
   npm run migrate
   ```

4. (Optional) Seed the database with sample data:

   ```bash
   npm run seed
   ```

5. Start the API server:

   ```bash
   npm run dev
   ```

6. Expected output:

   ```
   [HH:MM:SS] INFO  Server listening on http://localhost:[BACKEND_PORT]
   [HH:MM:SS] INFO  Connected to database
   ```

7. Smoke-test the health endpoint:

   ```bash
   curl http://localhost:[BACKEND_PORT]/health
   # → {"status":"ok"}
   ```

---

## 6. Database Setup

1. Bring up the local database (Postgres) and supporting services with Docker Compose:

   ```bash
   docker compose up -d
   ```

2. Confirm the containers are healthy:

   ```bash
   docker compose ps
   ```

3. Connection string format:

   ```
   postgres://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
   ```

   Default local value (also the default for `DATABASE_URL`):

   ```
   postgres://app:app@localhost:5432/[product]_dev
   ```

4. Apply migrations:

   ```bash
   npm run migrate
   ```

5. Verify the connection:

   ```bash
   psql "$DATABASE_URL" -c "select now();"
   ```

   You should see a single row with the current timestamp.

6. To stop and remove containers (data persists in a named volume):

   ```bash
   docker compose down
   ```

---

## 7. Running Tests

Run the test suites from the repository root.

1. Unit tests:

   ```bash
   npm run test
   ```

2. Integration tests (requires Docker services to be up):

   ```bash
   npm run test:integration
   ```

3. End-to-end tests (Playwright/Cypress):

   ```bash
   npm run test:e2e
   ```

4. Expected output when all suites pass:

   ```
   Test Suites: X passed, X total
   Tests:       Y passed, Y total
   Snapshots:   0 total
   Time:        Z s
   Ran all test suites.
   ```

5. Generate a coverage report:

   ```bash
   npm run test:coverage
   ```

   The HTML report opens at `coverage/lcov-report/index.html`.

---

## 8. Common Issues & Fixes

| Issue | Likely Cause | Fix |
|---|---|---|
| `EADDRINUSE: address already in use :::[PORT]` | Another process (often a previous dev server) is bound to the port. | `lsof -i :[PORT]` then `kill -9 <PID>`, or change `PORT` in `.env`. |
| `ECONNREFUSED 127.0.0.1:5432` when starting the API | Postgres container is not running. | `docker compose up -d` and re-check with `docker compose ps`. |
| Migration fails with `relation "X" does not exist` | Migrations were not applied against the active database. | Confirm `DATABASE_URL` points to the local DB, then `npm run migrate`. |
| Frontend cannot reach the API (CORS error in browser) | `FRONTEND_URL` not added to the API's allow-list. | Set `FRONTEND_URL=http://localhost:[FRONTEND_PORT]` in `.env`, restart the API. |
| `Module not found` after pulling latest `main` | New dependency added; local `node_modules` is stale. | `rm -rf node_modules package-lock.json && npm install`. |
| `JWT malformed` / `invalid signature` on every request | `JWT_SECRET` differs between the API and the token issuer (or was rotated). | Re-copy `.env.example`, restart all services, sign in again. |

---

## 9. Useful Commands Reference

| Command | Description |
|---|---|
| `npm run dev` | Start the local dev server with hot-reload. |
| `npm run build` | Produce a production build. |
| `npm run start` | Run the production build locally. |
| `npm run test` | Run unit tests. |
| `npm run test:integration` | Run integration tests against the local stack. |
| `npm run test:e2e` | Run end-to-end browser tests. |
| `npm run lint` | Run the linter (`eslint` / `ruff` / equivalent). |
| `npm run lint:fix` | Auto-fix lint issues where possible. |
| `npm run format` | Apply code formatter (`prettier` / `black` / equivalent). |
| `npm run migrate` | Apply pending database migrations. |
| `npm run migrate:rollback` | Roll back the most recent migration. |
| `npm run seed` | Load sample/seed data into the database. |
| `docker compose up -d` | Start local Postgres, Redis, and supporting services. |
| `docker compose down` | Stop and remove the local service containers. |
| `docker compose logs -f` | Tail logs from all local service containers. |

---

## 10. Contacts

| Question About | Contact | Slack Channel |
|---|---|---|
| Onboarding / access | [PLATFORM LEAD] | `#eng-onboarding` |
| Frontend codebase | [FRONTEND LEAD] | `#eng-frontend` |
| Backend / API | [BACKEND LEAD] | `#eng-backend` |
| Database & migrations | [DATA / PLATFORM LEAD] | `#eng-data` |
| CI / CD pipelines | [DEVOPS LEAD] | `#eng-devops` |
| Security & secrets | [SECURITY LEAD] | `#eng-security` |
| Anything else | [ENGINEERING MANAGER] | `#eng-general` |
