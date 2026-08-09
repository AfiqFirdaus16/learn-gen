import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';

const { Pool } = pg;
const { PrismaClient } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const demoUsers = [
  { nama: 'Dosen 1', email: 'dosen1@gmail.com', password: '12345678', role: 'dosen' },
  { nama: 'Mahasiswa 1', email: 'mahasiswa1@gmail.com', password: '12345678', role: 'mahasiswa' },
];

async function main() {
  for (const user of demoUsers) {
    const password = await bcrypt.hash(user.password, 10);
    await prisma.admin.upsert({
      where: { email: user.email },
      update: { nama: user.nama, password, role: user.role },
      create: { ...user, password },
    });
  }
  console.log('Akun demo dosen dan mahasiswa berhasil disiapkan.');
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
