ALTER TABLE "Kelas"
ADD COLUMN "dosenId" INTEGER;

CREATE INDEX "Kelas_dosenId_idx" ON "Kelas"("dosenId");

ALTER TABLE "Kelas"
ADD CONSTRAINT "Kelas_dosenId_fkey"
FOREIGN KEY ("dosenId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "_KelasToMateri" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

CREATE UNIQUE INDEX "_KelasToMateri_AB_unique" ON "_KelasToMateri"("A", "B");
CREATE INDEX "_KelasToMateri_B_index" ON "_KelasToMateri"("B");

ALTER TABLE "_KelasToMateri"
ADD CONSTRAINT "_KelasToMateri_A_fkey"
FOREIGN KEY ("A") REFERENCES "Kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_KelasToMateri"
ADD CONSTRAINT "_KelasToMateri_B_fkey"
FOREIGN KEY ("B") REFERENCES "Materi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "_KelasMahasiswa" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

CREATE UNIQUE INDEX "_KelasMahasiswa_AB_unique" ON "_KelasMahasiswa"("A", "B");
CREATE INDEX "_KelasMahasiswa_B_index" ON "_KelasMahasiswa"("B");

ALTER TABLE "_KelasMahasiswa"
ADD CONSTRAINT "_KelasMahasiswa_A_fkey"
FOREIGN KEY ("A") REFERENCES "Kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_KelasMahasiswa"
ADD CONSTRAINT "_KelasMahasiswa_B_fkey"
FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
