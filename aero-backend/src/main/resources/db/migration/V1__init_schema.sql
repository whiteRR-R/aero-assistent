-- ============================================================
--  AERO Personal Assistant — Initial Schema
--  V1__init_schema.sql
-- ============================================================

-- ── USERS ────────────────────────────────────────────────
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),                       -- NULL for OAuth-only accounts
    full_name     VARCHAR(255),
    avatar_url    VARCHAR(500),
    bio           TEXT,
    timezone      VARCHAR(100)  DEFAULT 'UTC',
    locale        VARCHAR(10)   DEFAULT 'en',
    provider      VARCHAR(50)   DEFAULT 'local',      -- local | google | github
    provider_id   VARCHAR(255),
    role          VARCHAR(20)   DEFAULT 'USER',
    enabled       BOOLEAN       DEFAULT TRUE,
    created_at    TIMESTAMPTZ   DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- ── REFRESH TOKENS ───────────────────────────────────────
CREATE TABLE refresh_tokens (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(512)  NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ   NOT NULL,
    revoked     BOOLEAN       DEFAULT FALSE,
    created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- ── TASKS ────────────────────────────────────────────────
CREATE TYPE task_status   AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TABLE tasks (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(500)   NOT NULL,
    description   TEXT,
    status        task_status    DEFAULT 'TODO',
    priority      task_priority  DEFAULT 'MEDIUM',
    deadline      TIMESTAMPTZ,
    image_url     VARCHAR(500),
    completed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ    DEFAULT NOW(),
    updated_at    TIMESTAMPTZ    DEFAULT NOW()
);

CREATE TABLE task_tags (
    task_id BIGINT      NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag     VARCHAR(100) NOT NULL,
    PRIMARY KEY (task_id, tag)
);

-- ── EVENTS ───────────────────────────────────────────────
CREATE TABLE events (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        VARCHAR(500) NOT NULL,
    description  TEXT,
    location     VARCHAR(500),
    start_time   TIMESTAMPTZ  NOT NULL,
    end_time     TIMESTAMPTZ,
    all_day      BOOLEAN      DEFAULT FALSE,
    image_url    VARCHAR(500),
    color        VARCHAR(20),
    recurrence   VARCHAR(100),                        -- RRULE string (iCal)
    external_id  VARCHAR(255),                        -- Google Calendar event id
    created_at   TIMESTAMPTZ  DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ── NOTES ────────────────────────────────────────────────
CREATE TABLE note_categories (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    color      VARCHAR(20),
    created_at TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (user_id, name)
);

CREATE TABLE notes (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id BIGINT       REFERENCES note_categories(id) ON DELETE SET NULL,
    title       VARCHAR(500) NOT NULL,
    content     TEXT,
    pinned      BOOLEAN      DEFAULT FALSE,
    created_at  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE note_tags (
    note_id BIGINT       NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag     VARCHAR(100) NOT NULL,
    PRIMARY KEY (note_id, tag)
);

-- Full-text search index for notes
CREATE INDEX idx_notes_fts ON notes USING GIN (to_tsvector('simple', title || ' ' || COALESCE(content, '')));

-- ── HABITS ───────────────────────────────────────────────
CREATE TYPE habit_frequency AS ENUM ('DAILY', 'WEEKLY', 'CUSTOM');

CREATE TABLE habits (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255)     NOT NULL,
    description     TEXT,
    frequency       habit_frequency  DEFAULT 'DAILY',
    target_per_week SMALLINT         DEFAULT 7,         -- for WEEKLY/CUSTOM
    color           VARCHAR(20),
    icon            VARCHAR(50),
    active          BOOLEAN          DEFAULT TRUE,
    created_at      TIMESTAMPTZ      DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      DEFAULT NOW()
);

CREATE TABLE habit_completions (
    id           BIGSERIAL PRIMARY KEY,
    habit_id     BIGINT       NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id      BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completed_on DATE         NOT NULL,
    note         TEXT,
    UNIQUE (habit_id, completed_on)
);

-- ── REMINDERS / NOTIFICATIONS ────────────────────────────
CREATE TYPE reminder_status  AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');
CREATE TYPE reminder_ref_type AS ENUM ('TASK', 'EVENT', 'HABIT', 'CUSTOM');

CREATE TABLE reminders (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ref_type   reminder_ref_type  NOT NULL,
    ref_id     BIGINT,
    title      VARCHAR(500)       NOT NULL,
    message    TEXT,
    remind_at  TIMESTAMPTZ        NOT NULL,
    status     reminder_status    DEFAULT 'PENDING',
    sent_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ        DEFAULT NOW()
);

-- ── NOTIFICATION PREFERENCES ─────────────────────────────
CREATE TABLE notification_preferences (
    user_id           BIGINT  PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_enabled     BOOLEAN DEFAULT TRUE,
    push_enabled      BOOLEAN DEFAULT FALSE,
    reminder_minutes  INT[]   DEFAULT '{15,60}',       -- minutes before event
    daily_digest      BOOLEAN DEFAULT FALSE,
    digest_time       TIME    DEFAULT '08:00:00'
);

-- ── CALENDAR INTEGRATIONS ────────────────────────────────
CREATE TABLE calendar_integrations (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider        VARCHAR(50)  NOT NULL,             -- google
    access_token    TEXT         NOT NULL,
    refresh_token   TEXT,
    token_expires   TIMESTAMPTZ,
    calendar_id     VARCHAR(255),
    last_synced_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (user_id, provider)
);

-- ── PROFILE HISTORY ──────────────────────────────────────
CREATE TABLE profile_history (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    old_value  TEXT,
    new_value  TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────────
CREATE INDEX idx_tasks_user_status   ON tasks(user_id, status);
CREATE INDEX idx_tasks_deadline      ON tasks(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX idx_events_user_start   ON events(user_id, start_time);
CREATE INDEX idx_notes_user_cat      ON notes(user_id, category_id);
CREATE INDEX idx_notes_pinned        ON notes(user_id, pinned) WHERE pinned = TRUE;
CREATE INDEX idx_habits_user_active  ON habits(user_id, active);
CREATE INDEX idx_completions_habit   ON habit_completions(habit_id, completed_on);
CREATE INDEX idx_reminders_pending   ON reminders(remind_at, status) WHERE status = 'PENDING';
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id) WHERE revoked = FALSE;
