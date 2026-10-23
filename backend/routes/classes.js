import 'dotenv/config';
import express from 'express';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
import { verifyToken } from './auth.js';

const { Pool } = pg;
const { PrismaClient } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const router = express.Router();

router.use(verifyToken);

router.get('/', async (req, res) => {
  if (req.user.role !== 'DOSEN') return res.status(403).json({ error: 'Akses hanya untuk dosen.' });
  try {
    const classes = await prisma.kelas.findMany({
      where: { dosenId: req.user.id },
      select: { id: true, namaKelas: true },
      orderBy: { namaKelas: 'asc' },
    });
    return res.json({ success: true, classes });
  } catch (error) {
    console.error('Get lecturer classes error:', error);
    return res.status(500).json({ error: 'Gagal mengambil daftar kelas.' });
  }
});

export default router;
