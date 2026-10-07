import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes, { ensureDefaultAdmin } from './routes/auth.js';
import aiRoutes from './routes/ai.js';
import userRoutes from './routes/users.js';
import dashboardRoutes from './routes/dashboard.js';
import videoRoutes from './routes/videos.js';
import materialRoutes from './routes/materials.js';
import testRoutes from './routes/tests.js';
import personaRoutes from './routes/personas.js';
import apiKeyRoutes from './routes/api-keys.js';

// 2. Import untuk Driver Adapter Prisma
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';

const app = express();

// 3. Inisialisasi Prisma menggunakan Adapter Postgres
const { Pool } = pg;
const { PrismaClient } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PORT = process.env.PORT || 5000;

await ensureDefaultAdmin();

// ==========================================
// MIDDLEWARE
// ==========================================

// PERBAIKAN 1: Mengatur CORS agar mengizinkan Vercel dan Localhost
app.use(cors({
    origin: [
        process.env.FRONTEND_URL,
        'http://localhost:3000', // Untuk jaga-jaga jika frontend jalan di 3000
        'http://localhost:3001', // TAMBAHKAN INI karena frontend Anda sekarang di 3001
        'https://learn-gen-4886.vercel.app'
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ==========================================
// ROUTES
// ==========================================

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ message: 'Server is running' });
});

// Menggunakan auth routes
app.use('/api/auth', authRoutes);

// Menggunakan AI routes
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/personas', personaRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/keys', apiKeyRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// ==========================================
// SERVER START
// ==========================================

// Graceful Shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

// PERBAIKAN 2: Menghapus app.listen ganda (agar tidak EADDRINUSE error di lokal)
// Hanya jalankan app.listen jika TIDAK di environment Vercel (production)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server berjalan di komputer lokal pada port ${PORT}`);
    });
}

// Ekspor untuk Vercel menggunakan sintaks ES Module
export default app;
