# AERO Personal Assistant

AERO is a full-stack personal productivity app with tasks, habits, notes, calendar, reminders, AI features, and OAuth login.

## Stack

- Backend: Java 21, Spring Boot 3, Spring Security, JWT, OAuth2 Client, JPA, Flyway, PostgreSQL
- Frontend: React 18, TypeScript, Vite, React Query, Zustand, TailwindCSS
- Docs: Swagger / OpenAPI

## Monorepo structure

- `aero-backend` - REST API and business logic
- `aero-frontend` - Web client

## Features

- Authentication: email/password + Google OAuth2
- Tasks: CRUD, filters, stats
- Habits: streak tracking and check-ins
- Notes: categories and search
- Calendar & events
- Reminders with email notifications
- Profile and preferences
- AI chat and AI brief modules

## Requirements

- Node.js 18+
- Java 21+
- Maven 3.9+
- Docker (optional)

## Backend setup

1. Go to backend:

```bash
cd aero-backend
```

2. Create env file from example:

```bash
copy .env.example .env
```

3. Configure at least:

- `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `DB_PORT`
- `JWT_SECRET`
- `FRONTEND_URL=http://localhost:3000`
- `BACKEND_URL=http://localhost:8080/api`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (for Google OAuth)

4. Run with Docker:

```bash
docker compose up --build
```

Backend will be available at `http://localhost:8080/api`.

## Frontend setup

1. Go to frontend:

```bash
cd aero-frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start dev server:

```bash
npm run dev
```

Frontend will be available at `http://localhost:3000`.

## Swagger

When backend is running:

- Swagger UI: `http://localhost:8080/api/swagger-ui/index.html`
- OpenAPI JSON: `http://localhost:8080/api/v3/api-docs`

## Google OAuth2

Set in backend env:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

In Google Cloud Console, use redirect URI:

- `http://localhost:8080/api/login/oauth2/code/google`

## Notes

- History was rewritten to Conventional Commits format.
- After history rewrite, push uses `--force`.
