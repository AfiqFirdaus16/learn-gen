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

router.get('/stats', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.admin.id } });
    if (!user) return res.status(401).json({ error: 'Pengguna tidak ditemukan.' });

    const [activeUsers, availableMaterials, createdMaterials, registeredStudents] = await Promise.all([
      prisma.user.count(),
      prisma.video.count({ where: { status: { not: 'failed' } } }),
      prisma.video.count({ where: { userId: user.id, status: { not: 'failed' } } }),
      prisma.user.count({ where: { role: 'MAHASISWA' } }),
    ]);

    const stats = {
      activeUsers,
      materials: availableMaterials,
      activeTests: 0,
      registeredClasses: 0,
      createdMaterials,
      activeClasses: 0,
      scheduledTests: 0,
      registeredStudents,
      availableMaterials,
      completedMaterials: 0,
      availableTests: 0,
      averageScore: 0,
    };

    return res.json({ success: true, role: user.role, stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ error: 'Gagal memuat statistik dashboard.' });
  }
});

export default router;
