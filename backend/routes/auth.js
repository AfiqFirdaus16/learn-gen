import 'dotenv/config'; // Tambahkan ini di baris 1 auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';

const { Pool } = pg;
const { PrismaClient } = pkg;

// Konfigurasi koneksi Adapter PostgreSQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const router = express.Router();

// ==========================================
// LOGIN ENDPOINT
// ==========================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validasi input
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email dan password harus diisi'
            });
        }

        // Tabel pengguna saat ini bernama Admin dan menyimpan seluruh peran.
        const admin = await prisma.admin.findUnique({
            where: { email },
        });

        if (!admin) {
            return res.status(401).json({
                error: 'Email atau password salah'
            });
        }

        // Verifikasi password
        const isPasswordValid = await bcrypt.compare(password, admin.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Email atau password salah'
            });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { id: admin.id, email: admin.email, nama: admin.nama, role: admin.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(200).json({
            success: true,
            message: 'Login berhasil',
            token,
            admin: {
                id: admin.id,
                nama: admin.nama,
                email: admin.email,
                role: admin.role,
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

// ==========================================
// REGISTER ENDPOINT (untuk development)
// ==========================================
router.post('/register', async (req, res) => {
    try {
        const { nama, email, password, confirmPassword } = req.body;

        // Validasi input
        if (!nama || !email || !password || !confirmPassword) {
            return res.status(400).json({
                error: 'Semua field harus diisi'
            });
        }

        // Validasi password match
        if (password !== confirmPassword) {
            return res.status(400).json({
                error: 'Password dan konfirmasi password tidak cocok'
            });
        }

        // Validasi password strength
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password minimal 6 karakter'
            });
        }

        // Cek email sudah terdaftar
        const existingAdmin = await prisma.admin.findUnique({
            where: { email },
        });

        if (existingAdmin) {
            return res.status(409).json({
                error: 'Email sudah terdaftar'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Buat admin baru
        const newAdmin = await prisma.admin.create({
            data: {
                nama,
                email,
                password: hashedPassword,
                role: 'mahasiswa',
            },
        });

        res.status(201).json({
            success: true,
            message: 'Registrasi berhasil',
            admin: {
                id: newAdmin.id,
                nama: newAdmin.nama,
                email: newAdmin.email,
                role: newAdmin.role,
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

// ==========================================
// VERIFY TOKEN MIDDLEWARE
// ==========================================
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
        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Token tidak valid atau sudah expired'
        });
    }
};

// Hanya akun dengan peran admin yang boleh mengelola pengguna.
export const requireAdmin = (req, res, next) => {
    if (req.admin?.role !== 'admin') {
        return res.status(403).json({ error: 'Akses hanya untuk admin' });
    }
    next();
};

// ==========================================
// GET CURRENT ADMIN (Protected Route)
// ==========================================
router.get('/me', verifyToken, async (req, res) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: { id: req.admin.id },
        });

        res.status(200).json({
            success: true,
            admin: {
                id: admin.id,
                nama: admin.nama,
                email: admin.email,
                role: admin.role,
            },
        });
    } catch (error) {
        res.status(500).json({
            error: 'Terjadi kesalahan'
        });
    }
});

export default router;
