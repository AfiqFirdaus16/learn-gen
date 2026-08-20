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
  { nama: 'Admin', email: 'admin@gmail.com', password: 'password', role: 'ADMIN' },
  { nama: 'Dosen 1', email: 'dosen1@gmail.com', password: '12345678', role: 'DOSEN' },
  { nama: 'Mahasiswa 1', email: 'mahasiswa1@gmail.com', password: '12345678', role: 'MAHASISWA' },
];

async function main() {
  for (const user of demoUsers) {
    const password = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email.toLowerCase() },
      update: { nama: user.nama, password, role: user.role },
      create: { ...user, email: user.email.toLowerCase(), password },
    });
  }
  console.log('Akun admin, dosen, dan mahasiswa berhasil disiapkan.');
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
