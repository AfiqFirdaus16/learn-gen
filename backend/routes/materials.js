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

const materialInclude = {
  author: { select: { id: true, nama: true } },
  video: { select: { id: true, topic: true, videoUrl: true, status: true, createdAt: true } },
  kelas: { select: { id: true, namaKelas: true } },
};

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const where = req.user.role === 'MAHASISWA'
      ? {
          isActive: true,
          publishAt: { lte: new Date() },
          video: { is: { status: 'completed', videoUrl: { not: null } } },
          kelas: { some: { mahasiswa: { some: { id: req.user.id } } } },
        }
      : req.user.role === 'DOSEN'
        ? { authorId: req.user.id }
        : req.user.role === 'ADMIN'
          ? undefined
          : null;

    if (where === null) return res.status(403).json({ error: 'Akses hanya untuk pengguna terdaftar.' });

    const materials = await prisma.materi.findMany({
      where,
      include: materialInclude,
      orderBy: [{ publishAt: 'asc' }, { createdAt: 'desc' }],
    });
    return res.json({ success: true, materials });
  } catch (error) {
    console.error('Get materials error:', error);
    return res.status(500).json({ error: 'Gagal mengambil data materi.' });
  }
});

function parseMaterialInput(body) {
  const judul = typeof body.judul === 'string' ? body.judul.trim() : '';
  const deskripsi = typeof body.deskripsi === 'string' ? body.deskripsi.trim() : '';
  const videoId = Number(body.videoId);
  const publishAt = typeof body.publishAt === 'string' ? new Date(body.publishAt) : new Date(Number.NaN);
  const isActive = body.isActive === undefined ? true : body.isActive;
  const kelasIds = Array.isArray(body.kelasIds) ? [...new Set(body.kelasIds.map(Number))] : [];

  if (!judul) return { error: 'Judul materi wajib diisi.' };
  if (judul.length > 100) return { error: 'Judul materi maksimal 100 karakter.' };
  if (!Number.isInteger(videoId) || videoId < 1) return { error: 'Video materi wajib dipilih.' };
  if (Number.isNaN(publishAt.getTime())) return { error: 'Tanggal dan jam publikasi wajib diisi dengan benar.' };
  if (publishAt.getTime() <= Date.now()) return { error: 'Tanggal dan jam publikasi harus lebih besar dari waktu saat ini.' };
  if (typeof isActive !== 'boolean') return { error: 'Status materi tidak valid.' };
  if (!kelasIds.length || kelasIds.some((id) => !Number.isInteger(id) || id < 1)) return { error: 'Pilih minimal satu kelas yang dapat mengakses materi.' };

  return { data: { judul, deskripsi: deskripsi || null, videoId, publishAt, isActive, kelasIds } };
}

async function lecturerClassesExist(kelasIds, dosenId) {
  const count = await prisma.kelas.count({ where: { id: { in: kelasIds }, dosenId } });
  return count === kelasIds.length;
}

function materialWriteData(data) {
  const { kelasIds, ...fields } = data;
  return { ...fields, kelas: { set: kelasIds.map((id) => ({ id })) } };
}

async function findOwnedVideo(videoId, userId) {
  return prisma.video.findFirst({
    where: { id: videoId, userId, status: 'completed', videoUrl: { not: null } },
    select: { id: true },
  });
}

async function canManageMaterial(req, id) {
  if (req.user.role === 'ADMIN') return true;
  const material = await prisma.materi.findFirst({ where: { id, authorId: req.user.id }, select: { id: true } });
  return Boolean(material);
}

router.post('/', async (req, res) => {
  try {
    if (!['ADMIN', 'DOSEN'].includes(req.user.role)) return res.status(403).json({ error: 'Akses hanya untuk dosen.' });

    // Keep the existing admin-only legacy material form working.
    if (req.user.role === 'ADMIN' && req.body.videoId === undefined) {
      const judul = typeof req.body.judul === 'string' ? req.body.judul.trim() : '';
      const deskripsi = typeof req.body.deskripsi === 'string' ? req.body.deskripsi.trim() : '';
      if (!judul) return res.status(400).json({ error: 'Judul materi wajib diisi.' });
      if (judul.length > 100) return res.status(400).json({ error: 'Judul materi maksimal 100 karakter.' });
      const material = await prisma.materi.create({
        data: { judul, deskripsi: deskripsi || null, authorId: req.user.id },
        include: materialInclude,
      });
      return res.status(201).json({ success: true, material });
    }

    const parsed = parseMaterialInput(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const video = await findOwnedVideo(parsed.data.videoId, req.user.id);
    if (!video) return res.status(400).json({ error: 'Pilih video selesai yang dibuat oleh akun Anda.' });
    if (!await lecturerClassesExist(parsed.data.kelasIds, req.user.id)) return res.status(400).json({ error: 'Pilih hanya kelas yang Anda ampu.' });

    const material = await prisma.materi.create({
      data: { ...materialWriteData(parsed.data), authorId: req.user.id },
      include: materialInclude,
    });
    return res.status(201).json({ success: true, material });
  } catch (error) {
    console.error('Create material error:', error);
    return res.status(500).json({ error: 'Gagal menambahkan materi.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'DOSEN') return res.status(403).json({ error: 'Akses hanya untuk dosen.' });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID materi tidak valid.' });

    const parsed = parseMaterialInput(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const video = await findOwnedVideo(parsed.data.videoId, req.user.id);
    if (!video) return res.status(400).json({ error: 'Pilih video selesai yang dibuat oleh akun Anda.' });
    if (!await lecturerClassesExist(parsed.data.kelasIds, req.user.id)) return res.status(400).json({ error: 'Pilih hanya kelas yang Anda ampu.' });
    if (!await canManageMaterial(req, id)) return res.status(404).json({ error: 'Materi tidak ditemukan.' });

    const material = await prisma.materi.update({ where: { id }, data: materialWriteData(parsed.data), include: materialInclude });
    return res.json({ success: true, material });
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Materi tidak ditemukan.' });
    console.error('Update material error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui materi.' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    if (req.user.role !== 'DOSEN') return res.status(403).json({ error: 'Akses hanya untuk dosen.' });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID materi tidak valid.' });
    if (typeof req.body.isActive !== 'boolean') return res.status(400).json({ error: 'Status materi tidak valid.' });
    if (!await canManageMaterial(req, id)) return res.status(404).json({ error: 'Materi tidak ditemukan.' });

    const material = await prisma.materi.update({ where: { id }, data: { isActive: req.body.isActive }, include: materialInclude });
    return res.json({ success: true, material });
  } catch (error) {
    console.error('Update material status error:', error);
    return res.status(500).json({ error: 'Gagal mengubah status materi.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!['ADMIN', 'DOSEN'].includes(req.user.role)) return res.status(403).json({ error: 'Akses hanya untuk dosen.' });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID materi tidak valid.' });
    if (!await canManageMaterial(req, id)) return res.status(404).json({ error: 'Materi tidak ditemukan.' });
    await prisma.materi.delete({ where: { id } });
    return res.json({ success: true, message: 'Materi berhasil dihapus.' });
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Materi tidak ditemukan.' });
    console.error('Delete material error:', error);
    return res.status(500).json({ error: 'Gagal menghapus materi.' });
  }
});

export default router;
