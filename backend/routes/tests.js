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
const canManage = (req, res) => ['ADMIN', 'DOSEN'].includes(req.user.role) || res.status(403).json({ error: 'Akses hanya untuk dosen atau admin.' });
const testSelect = {
  id: true, judul: true, deskripsi: true, mulaiAt: true, selesaiAt: true, durasiMenit: true,
  status: true, createdAt: true, updatedAt: true, author: { select: { id: true, nama: true } },
  kelas: { select: { id: true, namaKelas: true, dosenId: true, _count: { select: { mahasiswa: true } } } },
  _count: { select: { hasil: true } },
};
const visibleTestWhere = (req) => req.user.role === 'ADMIN' ? {} : { kelas: { dosenId: req.user.id } };
const parseDate = (value) => value ? new Date(value) : null;

router.use(verifyToken);

router.get('/options', async (req, res) => {
  if (!canManage(req, res)) return;
  try {
    const [classes, teachers] = await Promise.all([
      prisma.kelas.findMany({ where: req.user.role === 'DOSEN' ? { dosenId: req.user.id } : {}, select: { id: true, namaKelas: true, dosenId: true, dosen: { select: { nama: true } } }, orderBy: { namaKelas: 'asc' } }),
      req.user.role === 'ADMIN' ? prisma.user.findMany({ where: { role: 'DOSEN' }, select: { id: true, nama: true }, orderBy: { nama: 'asc' } }) : [],
    ]);
    res.json({ success: true, classes, teachers });
  } catch (error) { console.error('Test options error:', error); res.status(500).json({ error: 'Gagal mengambil filter tes.' }); }
});

router.get('/', async (req, res) => {
  try {
    const isStudent = req.user.role === 'MAHASISWA';
    const where = isStudent ? { status: 'AKTIF', kelas: { mahasiswa: { some: { id: req.user.id } } } } : visibleTestWhere(req);
    if (req.query.classId) where.kelasId = Number(req.query.classId);
    if (req.query.teacherId && req.user.role === 'ADMIN') where.authorId = Number(req.query.teacherId);
    if (req.query.search) where.judul = { contains: String(req.query.search), mode: 'insensitive' };
    const tests = await prisma.test.findMany({ where, select: testSelect, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, tests });
  } catch (error) { console.error('Get tests error:', error); res.status(500).json({ error: 'Gagal mengambil data tes.' }); }
});

router.post('/', async (req, res) => {
  if (!canManage(req, res)) return;
  try {
    const judul = typeof req.body.judul === 'string' ? req.body.judul.trim() : '';
    const kelasId = Number(req.body.kelasId);
    const status = ['DRAFT', 'AKTIF', 'NONAKTIF'].includes(req.body.status) ? req.body.status : 'DRAFT';
    const mulaiAt = parseDate(req.body.mulaiAt); const selesaiAt = parseDate(req.body.selesaiAt);
    if (!judul) return res.status(400).json({ error: 'Judul tes wajib diisi.' });
    if (!Number.isInteger(kelasId) || kelasId < 1) return res.status(400).json({ error: 'Kelas wajib dipilih.' });
    if (mulaiAt && Number.isNaN(+mulaiAt)) return res.status(400).json({ error: 'Tanggal mulai tidak valid.' });
    if (mulaiAt && mulaiAt < new Date()) return res.status(400).json({ error: 'Waktu mulai tidak boleh lebih kecil dari waktu saat ini.' });
    if (selesaiAt && Number.isNaN(+selesaiAt)) return res.status(400).json({ error: 'Tanggal selesai tidak valid.' });
    if (mulaiAt && selesaiAt && selesaiAt <= mulaiAt) return res.status(400).json({ error: 'Waktu selesai harus lebih besar dari waktu mulai.' });
    if (!Number.isInteger(Number(req.body.durasiMenit)) || Number(req.body.durasiMenit) < 1) return res.status(400).json({ error: 'Durasi pengerjaan minimal 1 menit.' });
    const kelas = await prisma.kelas.findFirst({ where: { id: kelasId, ...(req.user.role === 'DOSEN' ? { dosenId: req.user.id } : {}) }, select: { id: true, dosenId: true } });
    if (!kelas) return res.status(400).json({ error: 'Kelas tidak ditemukan atau bukan kelas yang Anda ampu.' });
    const test = await prisma.test.create({ data: { judul, deskripsi: req.body.deskripsi?.trim() || null, mulaiAt, selesaiAt, durasiMenit: Number(req.body.durasiMenit), status, kelasId, authorId: req.user.role === 'ADMIN' && kelas.dosenId ? kelas.dosenId : req.user.id }, select: testSelect });
    res.status(201).json({ success: true, test });
  } catch (error) { console.error('Create test error:', error); res.status(500).json({ error: 'Gagal membuat tes.' }); }
});

router.put('/:id', async (req, res) => {
  if (!canManage(req, res)) return;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID tes tidak valid.' });
  try {
    const existing = await prisma.test.findFirst({ where: { id, ...visibleTestWhere(req) } });
    if (!existing) return res.status(404).json({ error: 'Tes tidak ditemukan.' });
    const data = {};
    if ('judul' in req.body) { data.judul = typeof req.body.judul === 'string' ? req.body.judul.trim() : ''; if (!data.judul) return res.status(400).json({ error: 'Judul tes wajib diisi.' }); }
    if ('deskripsi' in req.body) data.deskripsi = req.body.deskripsi?.trim() || null;
    if ('status' in req.body) { if (!['DRAFT', 'AKTIF', 'NONAKTIF'].includes(req.body.status)) return res.status(400).json({ error: 'Status tes tidak valid.' }); data.status = req.body.status; }
    if ('mulaiAt' in req.body) data.mulaiAt = parseDate(req.body.mulaiAt);
    if ('selesaiAt' in req.body) data.selesaiAt = parseDate(req.body.selesaiAt);
    if ('durasiMenit' in req.body) { data.durasiMenit = Number(req.body.durasiMenit); if (!Number.isInteger(data.durasiMenit) || data.durasiMenit < 1) return res.status(400).json({ error: 'Durasi pengerjaan minimal 1 menit.' }); }
    if ('kelasId' in req.body) {
      const kelasId = Number(req.body.kelasId);
      const kelas = await prisma.kelas.findFirst({ where: { id: kelasId, ...(req.user.role === 'DOSEN' ? { dosenId: req.user.id } : {}) } });
      if (!kelas) return res.status(400).json({ error: 'Kelas tidak ditemukan atau bukan kelas yang Anda ampu.' });
      data.kelasId = kelasId;
      if (req.user.role === 'ADMIN' && kelas.dosenId) data.authorId = kelas.dosenId;
    }
    const mulai = data.mulaiAt ?? existing.mulaiAt; const selesai = data.selesaiAt ?? existing.selesaiAt;
    if (mulai && selesai && selesai <= mulai) return res.status(400).json({ error: 'Waktu selesai harus lebih besar dari waktu mulai.' });
    const test = await prisma.test.update({ where: { id }, data, select: testSelect });
    res.json({ success: true, test });
  } catch (error) { console.error('Update test error:', error); res.status(500).json({ error: 'Gagal memperbarui tes.' }); }
});

router.delete('/:id', async (req, res) => {
  if (!canManage(req, res)) return;
  const id = Number(req.params.id);
  try {
    const existing = await prisma.test.findFirst({ where: { id, ...visibleTestWhere(req) }, select: { id: true } });
    if (!existing) return res.status(404).json({ error: 'Tes tidak ditemukan.' });
    await prisma.test.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) { console.error('Delete test error:', error); res.status(500).json({ error: 'Gagal menghapus tes.' }); }
});

router.get('/:id/results', async (req, res) => {
  if (!canManage(req, res)) return;
  const id = Number(req.params.id);
  try {
    const test = await prisma.test.findFirst({ where: { id, ...visibleTestWhere(req) }, select: testSelect });
    if (!test) return res.status(404).json({ error: 'Tes tidak ditemukan.' });
    const students = test.kelasId ? await prisma.user.findMany({ where: { role: 'MAHASISWA', kelasDiikuti: { some: { id: test.kelasId } } }, select: { id: true, nama: true, nim: true }, orderBy: { nama: 'asc' } }) : [];
    const results = await prisma.testResult.findMany({ where: { testId: id }, select: { id: true, mahasiswaId: true, nilai: true, jawaban: true, mulaiAt: true, selesaiAt: true } });
    const byStudent = new Map(results.map((result) => [result.mahasiswaId, result]));
    res.json({ success: true, test, results: students.map((student) => {
      const result = byStudent.get(student.id);
      const late = !result && test.selesaiAt && new Date(test.selesaiAt) < new Date();
      return { ...student, ...(result || {}), status: result ? 'SELESAI' : late ? 'TERLAMBAT' : 'BELUM_MENGERJAKAN' };
    }) });
  } catch (error) { console.error('Get test results error:', error); res.status(500).json({ error: 'Gagal mengambil hasil tes.' }); }
});

router.put('/:id/results/:resultId', async (req, res) => {
  if (!canManage(req, res)) return;
  const testId = Number(req.params.id); const resultId = Number(req.params.resultId); const nilai = Number(req.body.nilai);
  if (!Number.isFinite(nilai) || nilai < 0 || nilai > 100) return res.status(400).json({ error: 'Nilai harus berada di antara 0 dan 100.' });
  try {
    const test = await prisma.test.findFirst({ where: { id: testId, ...visibleTestWhere(req) }, select: { id: true } });
    if (!test) return res.status(404).json({ error: 'Tes tidak ditemukan.' });
    const result = await prisma.testResult.updateMany({ where: { id: resultId, testId }, data: { nilai } });
    if (!result.count) return res.status(404).json({ error: 'Hasil tes tidak ditemukan.' });
    res.json({ success: true, nilai });
  } catch (error) { console.error('Grade test result error:', error); res.status(500).json({ error: 'Gagal menyimpan nilai.' }); }
});

export default router;
