import 'dotenv/config';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';

const { Pool } = pg;
const { PrismaClient } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const router = express.Router();

const DEFAULT_ADMIN_EMAIL = 'admin@gmail.com';
const DEFAULT_ADMIN_PASSWORD = 'password';

const normalizeRole = (role) => {
    const normalized = String(role ?? 'MAHASISWA').trim().toUpperCase();
    if (['ADMIN', 'DOSEN', 'MAHASISWA'].includes(normalized)) {
        return normalized;
    }
    return 'MAHASISWA';
};

export const ensureDefaultAdmin = async () => {
    const email = DEFAULT_ADMIN_EMAIL.toLowerCase();
    const existingAdmin = await prisma.user.findUnique({ where: { email } });

    if (existingAdmin) {
        if (existingAdmin.role !== 'ADMIN') {
            await prisma.user.update({
                where: { id: existingAdmin.id },
                data: { role: 'ADMIN' },
            });
        }
        return;
    }

    await prisma.user.create({
        data: {
            nama: 'Admin',
            email,
            password: await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10),
            role: 'ADMIN',
        },
    });
};

router.post('/login', async (req, res) => {
    try {
        await ensureDefaultAdmin();

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email dan password harus diisi'
            });
        }

        const user = await prisma.user.findUnique({
            where: { email: String(email).trim().toLowerCase() },
        });

        if (!user) {
            return res.status(401).json({
                error: 'Email atau password salah'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Email atau password salah'
            });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, nama: user.nama, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(200).json({
            success: true,
            message: 'Login berhasil',
            token,
            user: {
                id: user.id,
                nama: user.nama,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Terjadi kesalahan saat login',
            message: error.message
        });
    }
});

router.post('/register', async (req, res) => {
    try {
        await ensureDefaultAdmin();

        const { nama, email, password, confirmPassword, role } = req.body;

        if (!nama || !email || !password || !confirmPassword) {
            return res.status(400).json({
                error: 'Semua field harus diisi'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                error: 'Password dan konfirmasi password tidak cocok'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password minimal 6 karakter'
            });
        }

        const normalizedRole = normalizeRole(role);
        if (normalizedRole === 'ADMIN') {
            return res.status(403).json({
                error: 'Akun admin tidak bisa dibuat melalui register.'
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            return res.status(409).json({
                error: 'Email sudah terdaftar'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                nama: String(nama).trim(),
                email: normalizedEmail,
                password: hashedPassword,
                role: normalizedRole,
            },
        });

        res.status(201).json({
            success: true,
            message: 'Registrasi berhasil',
            user: {
                id: newUser.id,
                nama: newUser.nama,
                email: newUser.email,
                role: newUser.role,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            error: 'Terjadi kesalahan saat registrasi',
            message: error.message
        });
    }
});

// --- UBAH req.admin MENJADI req.user ---

export const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: 'Token tidak ditemukan'
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-secret-key'
        );
        // PERBAIKAN: Simpan payload ke req.user, bukan req.admin
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Token tidak valid atau sudah expired'
        });
    }
};

export const requireAdmin = (req, res, next) => {
    // PERBAIKAN: Pengecekan menggunakan req.user
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Akses hanya untuk admin' });
    }
    next();
};

router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            // PERBAIKAN: Pencarian ID menggunakan req.user.id
            where: { id: req.user.id },
        });

        if (!user) {
            return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user.id,
                nama: user.nama,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        res.status(500).json({
            error: 'Terjadi kesalahan'
        });
    }
});

export default router;