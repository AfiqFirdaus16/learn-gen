import 'dotenv/config';
import express from 'express';
import bcrypt from 'bcrypt';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
import { requireAdmin, verifyToken } from './auth.js';

const { Pool } = pg;
const { PrismaClient } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const router = express.Router();
const validRoles = ['ADMIN', 'DOSEN', 'MAHASISWA'];
const publicUserSelect = {
  id: true, nama: true, email: true, nim: true, role: true, createdAt: true, updatedAt: true,
  kelasDiikuti: { select: { id: true, namaKelas: true } },
};

async function parseClassIds(value) {
  const kelasIds = Array.isArray(value) ? [...new Set(value.map(Number))] : [];
  if (kelasIds.some((id) => !Number.isInteger(id) || id < 1)) return { error: 'Pilihan kelas tidak valid.' };
  if (kelasIds.length) {
    const count = await prisma.kelas.count({ where: { id: { in: kelasIds } } });
    if (count !== kelasIds.length) return { error: 'Satu atau lebih kelas tidak ditemukan.' };
  }
  return { kelasIds };
}

const normalizeRole = (role) => {
  const normalized = String(role ?? '').trim().toUpperCase();
  if (validRoles.includes(normalized)) return normalized;
  return null;
};

router.use(verifyToken, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const users = await prisma.user.findMany({
      where: search ? {
        OR: [
          { nama: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { role: { equals: normalizeRole(search) ?? undefined } },
        ],
      } : undefined,
      select: publicUserSelect,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data pengguna' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nama, email, password, role } = req.body;
    const nim = typeof req.body.nim === 'string' ? req.body.nim.trim() : '';
    if (!nama?.trim() || !email?.trim() || !password || !role) {
      return res.status(400).json({ error: 'Nama, email, password, dan peran wajib diisi' });
    }

    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) {
      return res.status(400).json({ error: 'Peran pengguna tidak valid' });
    }
    if (password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });
    if (nim.length > 50) return res.status(400).json({ error: 'NIM maksimal 50 karakter.' });
    if (nim && normalizedRole !== 'MAHASISWA') return res.status(400).json({ error: 'NIM hanya dapat diisi untuk mahasiswa.' });

    const parsedClasses = await parseClassIds(req.body.kelasIds);
    if (parsedClasses.error) return res.status(400).json({ error: parsedClasses.error });
    if (normalizedRole !== 'MAHASISWA' && parsedClasses.kelasIds.length) return res.status(400).json({ error: 'Kelas hanya dapat ditetapkan pada akun mahasiswa.' });

    const user = await prisma.user.create({
      data: {
        nama: nama.trim(),
        email: email.trim().toLowerCase(),
        nim: nim || null,
        password: await bcrypt.hash(password, 10),
        role: normalizedRole,
        kelasDiikuti: { connect: parsedClasses.kelasIds.map((id) => ({ id })) },
      },
      select: publicUserSelect,
    });
    res.status(201).json({ success: true, user });
  } catch (error) {
    if (error?.code === 'P2002') return res.status(409).json({ error: error.meta?.target?.includes?.('nim') ? 'NIM sudah digunakan.' : 'Email sudah digunakan' });
    res.status(500).json({ error: 'Gagal membuat pengguna' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nama, email, password, role } = req.body;
    const nim = typeof req.body.nim === 'string' ? req.body.nim.trim() : '';
    if (!Number.isInteger(id) || !nama?.trim() || !email?.trim() || !role) {
      return res.status(400).json({ error: 'Data pengguna tidak lengkap' });
    }

    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) {
      return res.status(400).json({ error: 'Peran pengguna tidak valid' });
    }
    if (password && password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });
    if (nim.length > 50) return res.status(400).json({ error: 'NIM maksimal 50 karakter.' });
    if (nim && normalizedRole !== 'MAHASISWA') return res.status(400).json({ error: 'NIM hanya dapat diisi untuk mahasiswa.' });
    if (id === req.user.id && normalizedRole !== 'ADMIN') return res.status(400).json({ error: 'Admin tidak dapat menghapus perannya sendiri' });

    const hasClassSelection = Object.hasOwn(req.body, 'kelasIds');
    const parsedClasses = await parseClassIds(hasClassSelection ? req.body.kelasIds : undefined);
    if (parsedClasses.error) return res.status(400).json({ error: parsedClasses.error });
    if (normalizedRole !== 'MAHASISWA' && parsedClasses.kelasIds.length) return res.status(400).json({ error: 'Kelas hanya dapat ditetapkan pada akun mahasiswa.' });

    const data = { nama: nama.trim(), email: email.trim().toLowerCase(), nim: nim || null, role: normalizedRole };
    if (password) data.password = await bcrypt.hash(password, 10);
    if (hasClassSelection || normalizedRole !== 'MAHASISWA') {
      data.kelasDiikuti = { set: parsedClasses.kelasIds.map((kelasId) => ({ id: kelasId })) };
    }
    const user = await prisma.user.update({ where: { id }, data, select: publicUserSelect });
    res.json({ success: true, user });
  } catch (error) {
    if (error?.code === 'P2002') return res.status(409).json({ error: error.meta?.target?.includes?.('nim') ? 'NIM sudah digunakan.' : 'Email sudah digunakan' });
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    res.status(500).json({ error: 'Gagal memperbarui pengguna' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID pengguna tidak valid' });
    if (id === req.user.id) return res.status(400).json({ error: 'Anda tidak dapat menghapus akun sendiri' });
    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: 'Pengguna berhasil dihapus' });
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    res.status(500).json({ error: 'Gagal menghapus pengguna' });
  }
});

export default router;
