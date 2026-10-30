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

const canManageClasses = (req) => ['DOSEN', 'ADMIN'].includes(req.user.role);
const visibleClassWhere = (req) => req.user.role === 'DOSEN' ? { dosenId: req.user.id } : {};
const studentSelect = { id: true, nama: true, nim: true, email: true };

function parseClassId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseClassInput(body) {
  const namaKelas = typeof body.namaKelas === 'string' ? body.namaKelas.trim() : '';
  const deskripsi = typeof body.deskripsi === 'string' ? body.deskripsi.trim() : '';
  if (!namaKelas) return { error: 'Nama kelas wajib diisi.' };
  if (namaKelas.length > 100) return { error: 'Nama kelas maksimal 100 karakter.' };
  return { data: { namaKelas, deskripsi: deskripsi || null } };
}

async function findManagedClass(req, id) {
  return prisma.kelas.findFirst({ where: { id, ...visibleClassWhere(req) }, select: { id: true, dosenId: true } });
}

router.get('/', async (req, res) => {
  if (!canManageClasses(req)) return res.status(403).json({ error: 'Akses hanya untuk dosen atau admin.' });
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const sortBy = req.query.sortBy === 'createdAt' ? 'createdAt' : 'namaKelas';
    const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';
    const classes = await prisma.kelas.findMany({
      where: {
        ...visibleClassWhere(req),
        ...(search ? { namaKelas: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: { _count: { select: { mahasiswa: true } } },
      orderBy: { [sortBy]: sortOrder },
    });
    return res.json({ success: true, classes });
  } catch (error) {
    console.error('Get classes error:', error);
    return res.status(500).json({ error: 'Gagal mengambil daftar kelas.' });
  }
});

router.post('/', async (req, res) => {
  if (!canManageClasses(req)) return res.status(403).json({ error: 'Akses hanya untuk dosen atau admin.' });
  try {
    const parsed = parseClassInput(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const duplicate = await prisma.kelas.findFirst({ where: { namaKelas: { equals: parsed.data.namaKelas, mode: 'insensitive' } }, select: { id: true } });
    if (duplicate) return res.status(409).json({ error: 'Nama kelas sudah digunakan.' });
    const kelas = await prisma.kelas.create({ data: { ...parsed.data, dosenId: req.user.role === 'DOSEN' ? req.user.id : null } });
    return res.status(201).json({ success: true, kelas });
  } catch (error) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'Nama kelas sudah digunakan.' });
    console.error('Create class error:', error);
    return res.status(500).json({ error: 'Gagal menambahkan kelas.' });
  }
});

router.get('/:id/available-students', async (req, res) => {
  if (!canManageClasses(req)) return res.status(403).json({ error: 'Akses hanya untuk dosen atau admin.' });
  const id = parseClassId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID kelas tidak valid.' });
  try {
    if (!await findManagedClass(req, id)) return res.status(404).json({ error: 'Kelas tidak ditemukan.' });
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const students = await prisma.user.findMany({
      where: {
        role: 'MAHASISWA',
        kelasDiikuti: { none: { id } },
        ...(search ? { OR: [
          { nama: { contains: search, mode: 'insensitive' } },
          { nim: { contains: search, mode: 'insensitive' } },
        ] } : {}),
      },
      select: studentSelect,
      orderBy: { nama: 'asc' },
      take: 100,
    });
    return res.json({ success: true, students });
  } catch (error) {
    console.error('Get available students error:', error);
    return res.status(500).json({ error: 'Gagal mengambil daftar mahasiswa.' });
  }
});

router.get('/:id', async (req, res) => {
  if (!canManageClasses(req)) return res.status(403).json({ error: 'Akses hanya untuk dosen atau admin.' });
  const id = parseClassId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID kelas tidak valid.' });
  try {
    const kelas = await prisma.kelas.findFirst({
      where: { id, ...visibleClassWhere(req) },
      include: { mahasiswa: { select: studentSelect, orderBy: { nama: 'asc' } }, _count: { select: { mahasiswa: true } } },
    });
    if (!kelas) return res.status(404).json({ error: 'Kelas tidak ditemukan.' });
    return res.json({ success: true, kelas });
  } catch (error) {
    console.error('Get class detail error:', error);
    return res.status(500).json({ error: 'Gagal mengambil detail kelas.' });
  }
});

router.put('/:id', async (req, res) => {
  if (!canManageClasses(req)) return res.status(403).json({ error: 'Akses hanya untuk dosen atau admin.' });
  const id = parseClassId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID kelas tidak valid.' });
  try {
    const parsed = parseClassInput(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    if (!await findManagedClass(req, id)) return res.status(404).json({ error: 'Kelas tidak ditemukan.' });
    const duplicate = await prisma.kelas.findFirst({
      where: { id: { not: id }, namaKelas: { equals: parsed.data.namaKelas, mode: 'insensitive' } }, select: { id: true },
    });
    if (duplicate) return res.status(409).json({ error: 'Nama kelas sudah digunakan.' });
    const kelas = await prisma.kelas.update({ where: { id }, data: parsed.data });
    return res.json({ success: true, kelas });
  } catch (error) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'Nama kelas sudah digunakan.' });
    console.error('Update class error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui kelas.' });
  }
});

router.post('/:id/students', async (req, res) => {
  if (!canManageClasses(req)) return res.status(403).json({ error: 'Akses hanya untuk dosen atau admin.' });
  const id = parseClassId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID kelas tidak valid.' });
  const studentIds = Array.isArray(req.body.studentIds) ? [...new Set(req.body.studentIds.map(Number))] : [];
  if (!studentIds.length || studentIds.some((studentId) => !Number.isInteger(studentId) || studentId < 1)) return res.status(400).json({ error: 'Pilih minimal satu mahasiswa.' });
  try {
    if (!await findManagedClass(req, id)) return res.status(404).json({ error: 'Kelas tidak ditemukan.' });
    const students = await prisma.user.findMany({ where: { id: { in: studentIds }, role: 'MAHASISWA' }, select: { id: true } });
    if (students.length !== studentIds.length) return res.status(400).json({ error: 'Daftar berisi pengguna yang bukan mahasiswa atau tidak ditemukan.' });
    await prisma.kelas.update({ where: { id }, data: { mahasiswa: { connect: studentIds.map((studentId) => ({ id: studentId })) } } });
    return res.json({ success: true, message: 'Mahasiswa berhasil dimasukkan ke kelas.' });
  } catch (error) {
    console.error('Add students to class error:', error);
    return res.status(500).json({ error: 'Gagal menambahkan mahasiswa ke kelas.' });
  }
});

router.delete('/:id/students/:studentId', async (req, res) => {
  if (!canManageClasses(req)) return res.status(403).json({ error: 'Akses hanya untuk dosen atau admin.' });
  const id = parseClassId(req.params.id);
  const studentId = parseClassId(req.params.studentId);
  if (!id || !studentId) return res.status(400).json({ error: 'ID kelas atau mahasiswa tidak valid.' });
  try {
    if (!await findManagedClass(req, id)) return res.status(404).json({ error: 'Kelas tidak ditemukan.' });
    await prisma.kelas.update({ where: { id }, data: { mahasiswa: { disconnect: { id: studentId } } } });
    return res.json({ success: true, message: 'Mahasiswa berhasil dikeluarkan dari kelas.' });
  } catch (error) {
    console.error('Remove student from class error:', error);
    return res.status(500).json({ error: 'Gagal mengeluarkan mahasiswa dari kelas.' });
  }
});

router.delete('/:id', async (req, res) => {
  if (!canManageClasses(req)) return res.status(403).json({ error: 'Akses hanya untuk dosen atau admin.' });
  const id = parseClassId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID kelas tidak valid.' });
  try {
    if (!await findManagedClass(req, id)) return res.status(404).json({ error: 'Kelas tidak ditemukan.' });
    await prisma.kelas.delete({ where: { id } });
    return res.json({ success: true, message: 'Kelas berhasil dihapus.' });
  } catch (error) {
    console.error('Delete class error:', error);
    return res.status(500).json({ error: 'Gagal menghapus kelas.' });
  }
});

export default router;
