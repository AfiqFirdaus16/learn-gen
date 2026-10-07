ALTER TABLE "Video"
ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'd-id';

UPDATE "Video"
SET "provider" = lower("accentType")
WHERE lower("accentType") IN ('heygen', 'elevenlabs');