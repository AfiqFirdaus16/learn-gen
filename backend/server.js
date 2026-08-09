import 'dotenv/config'; // Wajib di baris 1
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import aiRoutes from './routes/ai.js';
import dashboardRoutes from './routes/dashboard.js';
import videoRoutes from './routes/videos.js';

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

// 4. Deklarasi PORT cukup satu kali saja di sini
const PORT = process.env.PORT || 5000;

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors());
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
app.use('/api/ai', aiRoutes); // <- Tambahkan baris ini
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/videos', videoRoutes);

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
app.listen(PORT, () => {
    console.log(`Server berhasil berjalan di port ${PORT}`);
});

// Graceful Shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
