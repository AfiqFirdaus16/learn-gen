ALTER TABLE "Kelas"
ADD COLUMN "deskripsi" TEXT;

ALTER TABLE "User"
ADD COLUMN "nim" TEXT;

CREATE UNIQUE INDEX "User_nim_key" ON "User"("nim");
CREATE UNIQUE INDEX "Kelas_namaKelas_key" ON "Kelas"("namaKelas");
