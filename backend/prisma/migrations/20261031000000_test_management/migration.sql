ALTER TABLE "Test"
  ADD COLUMN "deskripsi" TEXT,
  ADD COLUMN "mulaiAt" TIMESTAMP(3),
  ADD COLUMN "selesaiAt" TIMESTAMP(3),
  ADD COLUMN "durasiMenit" INTEGER,
  ADD COLUMN "kelasId" INTEGER;

-- Existing tests are assigned to the author's first class to preserve valid data.
UPDATE "Test" AS t SET "kelasId" = (
  SELECT k.id FROM "Kelas" AS k WHERE k."dosenId" = t."authorId" ORDER BY k.id LIMIT 1
);
-- Keep legacy tests even if their author has no class by creating a nullable relationship.
ALTER TABLE "Test" ALTER COLUMN "kelasId" DROP NOT NULL;
UPDATE "Test" SET "status" = 'AKTIF' WHERE "status" = 'DIBAGIKAN';
ALTER TABLE "Test" ADD CONSTRAINT "Test_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Test_kelasId_status_idx" ON "Test"("kelasId", "status");
CREATE INDEX "Test_authorId_idx" ON "Test"("authorId");

CREATE TABLE "TestResult" (
  "id" SERIAL NOT NULL,
  "testId" INTEGER NOT NULL,
  "mahasiswaId" INTEGER NOT NULL,
  "nilai" DOUBLE PRECISION,
  "jawaban" JSONB,
  "mulaiAt" TIMESTAMP(3),
  "selesaiAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TestResult_testId_mahasiswaId_key" ON "TestResult"("testId", "mahasiswaId");
CREATE INDEX "TestResult_mahasiswaId_idx" ON "TestResult"("mahasiswaId");
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
