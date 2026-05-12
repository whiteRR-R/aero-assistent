ALTER TABLE habits
ALTER COLUMN target_per_week TYPE integer
USING target_per_week::integer;