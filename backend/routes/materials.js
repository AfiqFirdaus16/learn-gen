import 'dotenv/config';
import express from 'express';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
import { requireAdmin, verifyToken } from './auth.js';

const { Pool } = pg;
const { PrismaClient } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const router = express.Router();

router.use(verifyToken, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const materials = await prisma.materi.findMany({
      include: { author: { select: { nama: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, materials });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ error: 'Gagal mengambil data materi.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const judul = typeof req.body.judul === 'string' ? req.body.judul.trim() : '';
    const deskripsi = typeof req.body.deskripsi === 'string' ? req.body.deskripsi.trim() : '';
    if (!judul) return res.status(400).json({ error: 'Judul materi wajib diisi.' });

    const material = await prisma.materi.create({
      data: { judul, deskripsi: deskripsi || null, authorId: req.user.id },
      include: { author: { select: { nama: true } } },
    });
    res.status(201).json({ success: true, material });
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ error: 'Gagal menambahkan materi.' });
  }
});

export default router;