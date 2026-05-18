# AERO Жеке Көмекшісі

AERO — тапсырмалар, әдеттер, жазбалар, күнтізбе, еске салғыштар, AI мүмкіндіктері және OAuth авторизациясы бар толыққанды өнімділік платформасы.

## Технологиялық стек

- Backend: Java 21, Spring Boot 3, Spring Security, JWT, OAuth2 Client, JPA, Flyway, PostgreSQL
- Frontend: React 18, TypeScript, Vite, React Query, Zustand, TailwindCSS
- Құжаттама: Swagger / OpenAPI

## Репозиторий құрылымы

- `aero-backend` — REST API және бизнес-логика
- `aero-frontend` — веб-клиент

## Негізгі мүмкіндіктер

- Авторизация: email/password + Google OAuth2
- Тапсырмалар: CRUD, фильтрлер, статистика
- Әдеттер: streak (күн тізбегі) және белгілеу
- Жазбалар: санаттар және іздеу
- Күнтізбе және оқиғалар
- Email еске салғыштар
- Профиль және баптаулар
- AI чат және AI шолу модульдері

## Талаптар

- Node.js 18+
- Java 21+
- Maven 3.9+
- Docker (міндетті емес)

## Backend іске қосу

1. Backend бумасына өтіңіз:

```bash
cd aero-backend
```

2. `.env` файлын мысалдан жасаңыз:

```bash
copy .env.example .env
```

3. Кемінде мына айнымалыларды толтырыңыз:

- `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `DB_PORT`
- `JWT_SECRET`
- `FRONTEND_URL=http://localhost:3000`
- `BACKEND_URL=http://localhost:8080/api`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Google OAuth үшін)

4. Docker арқылы іске қосу:

```bash
docker compose up --build
```

Backend мекенжайы: `http://localhost:8080/api`

## Frontend іске қосу

1. Frontend бумасына өтіңіз:

```bash
cd aero-frontend
```

2. Тәуелділіктерді орнатыңыз:

```bash
npm install
```

3. Дамыту режимін іске қосыңыз:

```bash
npm run dev
```

Frontend мекенжайы: `http://localhost:3000`

## Swagger

Backend іске қосылғаннан кейін:

- Swagger UI: `http://localhost:8080/api/swagger-ui/index.html`
- OpenAPI JSON: `http://localhost:8080/api/v3/api-docs`

## Google OAuth2 баптау

Backend `.env` ішінде:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Google Cloud Console ішінде Redirect URI:

- `http://localhost:8080/api/login/oauth2/code/google`

## Ескертпелер

- Коммит тарихы Conventional Commits форматына келтірілді.
- Тарих қайта жазылғаннан кейін push `--force` арқылы жасалады.
