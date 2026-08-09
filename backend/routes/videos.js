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

router.post('/', verifyToken, async (req, res) => {
  try {
    const { learnerName, topic, learningStyle, persona, duration, accentType, generatedPrompt, heygenVideoId, status = 'processing' } = req.body;
    if (!topic || !learningStyle || !persona || !duration || !accentType) {
      return res.status(400).json({ error: 'Data materi video belum lengkap.' });
    }

    const video = await prisma.video.create({
      data: {
        adminId: req.admin.id,
        learnerName: learnerName || 'Murid',
        topic,
        learningStyle,
        persona,
        duration: Number(duration),
        accentType,
        generatedPrompt,
        heygenVideoId,
        status,
      },
    });

    return res.status(201).json({ success: true, data: { id: video.id } });
  } catch (error) {
    console.error('Create video record error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan materi video.' });
  }
});

export default router;
