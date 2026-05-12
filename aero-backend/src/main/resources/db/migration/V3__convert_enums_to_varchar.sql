-- ============================================================
--  V3 — Convert PostgreSQL native enum types → VARCHAR(20)
-- ============================================================

-- ── 1. Drop partial indexes that use enum literals in WHERE ──
--    These block ALTER COLUMN because the WHERE clause is typed
--    against the old enum and can't compare varchar = enum.
DROP INDEX IF EXISTS idx_reminders_pending;
DROP INDEX IF EXISTS idx_refresh_tokens_user;   -- uses revoked boolean, safe to drop

-- ── 2. Drop column defaults that reference enum types ────────
ALTER TABLE tasks      ALTER COLUMN status    DROP DEFAULT;
ALTER TABLE tasks      ALTER COLUMN priority  DROP DEFAULT;
ALTER TABLE habits     ALTER COLUMN frequency DROP DEFAULT;
ALTER TABLE reminders  ALTER COLUMN ref_type  DROP DEFAULT;
ALTER TABLE reminders  ALTER COLUMN status    DROP DEFAULT;

-- ── 3. Convert each column individually ─────────────────────
ALTER TABLE tasks ALTER COLUMN status    TYPE VARCHAR(20) USING status::text;
ALTER TABLE tasks ALTER COLUMN priority  TYPE VARCHAR(20) USING priority::text;

ALTER TABLE habits ALTER COLUMN frequency TYPE VARCHAR(20) USING frequency::text;

ALTER TABLE reminders ALTER COLUMN ref_type TYPE VARCHAR(20) USING ref_type::text;
ALTER TABLE reminders ALTER COLUMN status   TYPE VARCHAR(20) USING status::text;

-- ── 4. Drop the now-unused enum types ────────────────────────
DROP TYPE IF EXISTS task_status;
DROP TYPE IF EXISTS task_priority;
DROP TYPE IF EXISTS habit_frequency;
DROP TYPE IF EXISTS reminder_ref_type;
DROP TYPE IF EXISTS reminder_status;

-- ── 5. Recreate indexes (now with plain varchar literals) ─────
CREATE INDEX idx_reminders_pending   ON reminders(remind_at, status) WHERE status = 'PENDING';
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id)       WHERE revoked = FALSE;
