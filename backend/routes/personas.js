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
const personaVoiceProfiles = {
  ramah: { voiceId: 'id-ID-GadisNeural', voiceName: 'Gadis (Microsoft Indonesia)' },
  formal: { voiceId: 'id-ID-ArdiNeural', voiceName: 'Ardi (Microsoft Indonesia)' },
  energik: { voiceId: 'id-ID-GadisNeural', voiceName: 'Gadis (Microsoft Indonesia)' },
};
const supportedLearningStyles = new Set(['visual', 'auditory', 'kinesthetic', 'reading']);

const serializePersona = (persona) => ({
  id: String(persona.id),
  name: persona.name,
  learningStyle: persona.learningStyle,
  avatarId: persona.avatarId,
  avatarName: persona.avatarName,
  voiceId: persona.voiceId,
  voiceName: persona.voiceName,
  level: persona.level,
  tone: persona.tone,
  notes: persona.notes || '',
  createdAt: persona.createdAt,
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const personas = await prisma.persona.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      personas: personas.map(serializePersona),
    });
  } catch (error) {
    console.error('Get personas error:', error);
    return res.status(500).json({ error: 'Gagal mengambil daftar persona.' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      name,
      learningStyle,
      level,
      tone,
      notes,
    } = req.body;

    if (typeof name !== 'string' || !name.trim() || !learningStyle) {
      return res.status(400).json({ error: 'Nama persona dan gaya belajar wajib diisi.' });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Nama persona harus berupa teks maksimal 100 karakter.' });
    }
    if (!supportedLearningStyles.has(learningStyle)) {
      return res.status(400).json({ error: 'Gaya belajar tidak valid.' });
    }
    if (tone !== undefined && !Object.hasOwn(personaVoiceProfiles, tone)) {
      return res.status(400).json({ error: 'Nada persona tidak valid.' });
    }

    const resolvedTone = tone || 'ramah';
    const voiceProfile = personaVoiceProfiles[resolvedTone];
    const resolvedVoiceId = voiceProfile.voiceId;
    const resolvedVoiceName = voiceProfile.voiceName;
    const resolvedAvatarId = `did-${resolvedVoiceId}`;
    const resolvedAvatarName = `Avatar ${resolvedTone}`;

    const persona = await prisma.persona.create({
      data: {
        userId: req.user.id,
        name: name.trim(),
        learningStyle,
        avatarId: resolvedAvatarId,
        avatarName: resolvedAvatarName,
        voiceId: resolvedVoiceId,
        voiceName: resolvedVoiceName,
        level: level || 'pemula',
        tone: resolvedTone,
        notes: notes || '',
      },
    });

    return res.status(201).json({
      success: true,
      persona: serializePersona(persona),
    });
  } catch (error) {
    console.error('Create persona error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan persona.' });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const personaId = Number(req.params.id);

    if (!Number.isInteger(personaId)) {
      return res.status(400).json({ error: 'ID persona tidak valid.' });
    }

    const persona = await prisma.persona.findFirst({
      where: { id: personaId, userId: req.user.id },
    });

    if (!persona) {
      return res.status(404).json({ error: 'Persona tidak ditemukan.' });
    }

    await prisma.persona.delete({ where: { id: personaId } });

    return res.status(200).json({ success: true, message: 'Persona berhasil dihapus.' });
  } catch (error) {
    console.error('Delete persona error:', error);
    return res.status(500).json({ error: 'Gagal menghapus persona.' });
  }
});

export default router;
