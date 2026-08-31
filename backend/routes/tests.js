import 'dotenv/config';
import express from 'express';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
import { verifyToken } from './auth.js';

const { Pool } = pg;
const { PrismaClient } = pkg;
const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })) });
const router = express.Router();
const testSelect = { id: true, judul: true, status: true, createdAt: true, updatedAt: true, author: { select: { nama: true } } };

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const isStudent = req.user.role === 'MAHASISWA';
    const tests = await prisma.test.findMany({
      where: isStudent ? { status: 'DIBAGIKAN' } : req.user.role === 'ADMIN' ? undefined : { authorId: req.user.id },
      select: testSelect,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, tests });
  } catch (error) {
    console.error('Get tests error:', error);
    res.status(500).json({ error: 'Gagal mengambil data tes.' });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!['ADMIN', 'DOSEN'].includes(req.user.role)) return res.status(403).json({ error: 'Hanya guru yang dapat membuat tes.' });
    const judul = typeof req.body.judul === 'string' ? req.body.judul.trim() : '';
    const status = req.body.status === 'DIBAGIKAN' ? 'DIBAGIKAN' : 'DRAFT';
    if (!judul) return res.status(400).json({ error: 'Judul tes wajib diisi.' });
    const test = await prisma.test.create({ data: { judul, status, authorId: req.user.id }, select: testSelect });
    res.status(201).json({ success: true, test });
  } catch (error) {
    console.error('Create test error:', error);
    res.status(500).json({ error: 'Gagal membuat tes.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (!['ADMIN', 'DOSEN'].includes(req.user.role)) return res.status(403).json({ error: 'Akses hanya untuk guru.' });
    const id = Number(req.params.id);
    const status = req.body.status === 'DIBAGIKAN' ? 'DIBAGIKAN' : 'DRAFT';
    const existing = await prisma.test.findFirst({ where: { id, ...(req.user.role === 'ADMIN' ? {} : { authorId: req.user.id }) } });
    if (!existing) return res.status(404).json({ error: 'Tes tidak ditemukan.' });
    const test = await prisma.test.update({ where: { id }, data: { status }, select: testSelect });
    res.json({ success: true, test });
  } catch (error) {
    console.error('Update test error:', error);
    res.status(500).json({ error: 'Gagal memperbarui status tes.' });
  }
});

export default router;