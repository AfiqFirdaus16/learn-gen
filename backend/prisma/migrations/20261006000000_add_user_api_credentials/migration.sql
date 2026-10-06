ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "promptProvider" TEXT NOT NULL DEFAULT 'gemini',
ADD COLUMN IF NOT EXISTS "videoProvider" TEXT NOT NULL DEFAULT 'd-id';

CREATE TABLE IF NOT EXISTS "ApiCredential" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "encryptedApiKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApiCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApiCredential_userId_category_provider_key"
ON "ApiCredential"("userId", "category", "provider");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ApiCredential_userId_fkey'
    ) THEN
        ALTER TABLE "ApiCredential"
        ADD CONSTRAINT "ApiCredential_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
