ALTER TABLE "Materi"
ADD COLUMN "publishAt" TIMESTAMP(3),
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "videoId" INTEGER;

CREATE INDEX "Materi_authorId_publishAt_idx" ON "Materi"("authorId", "publishAt");
CREATE INDEX "Materi_isActive_publishAt_idx" ON "Materi"("isActive", "publishAt");

ALTER TABLE "Materi"
ADD CONSTRAINT "Materi_videoId_fkey"
FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;
