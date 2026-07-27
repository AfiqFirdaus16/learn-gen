import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';

const { Pool } = pg;
const { PrismaClient } = pkg;

// 1. Buat koneksi pool ke Supabase menggunakan URL dari .env
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 2. Hubungkan pool tersebut ke adaptor Prisma
const adapter = new PrismaPg(pool);

// 3. Inisialisasi Prisma Client dengan adaptor tersebut
const prisma = new PrismaClient({ adapter });

// ... (Biarkan sisa kode Anda seperti fungsi async main() dan proses insert data tetap berada di bawah sini)