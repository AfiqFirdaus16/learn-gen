import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
import { verifyToken } from './auth.js';

const { Pool } = pg;
const { PrismaClient } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const router = express.Router();

// ==========================================
// KONFIGURASI D-ID API
// ==========================================
const D_ID_API_KEY = process.env.D_ID_API_KEY;
const D_ID_API_BASE = 'https://api.d-id.com';

/**
 * Membuat header Authorization dengan Basic Auth untuk D-ID API
 * @returns {string} Authorization header value
 */
function getDIdAuthHeader() {
    if (!D_ID_API_KEY) {
        throw new Error('D_ID_API_KEY tidak ditemukan di environment variables');
    }
    const encodedKey = Buffer.from(`${D_ID_API_KEY}:`).toString('base64');
    return `Basic ${encodedKey}`;
}

router.get('/credits', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(`${D_ID_API_BASE}/credits`, {
      headers: { Authorization: getDIdAuthHeader() },
    });
    const credits = response.data?.credits || response.data;
    const total = Number(credits?.total ?? response.data?.total ?? 0);
    const remaining = Number(credits?.remaining ?? response.data?.remaining ?? 0);

    return res.json({
      success: true,
      data: {
        total: Number.isFinite(total) ? total : 0,
        remaining: Number.isFinite(remaining) ? remaining : 0,
      },
    });
  } catch (error) {
    console.error('D-ID Credits Error:', error.response?.data || error.message);
    return res.status(error.response?.status || 502).json({
      success: false,
      error: 'Gagal memuat sisa kredit D-ID.',
      provider: 'd-id',
    });
  }
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const videos = await prisma.video.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        topic: true,
        persona: true,
        duration: true,
        durationSeconds: true,
        script: true,
        scriptDescription: true,
        generatedPrompt: true,
        videoUrl: true,
        status: true,
        createdAt: true,
        elevenlabsVideoId: true,
      },
    });

    return res.json({ success: true, data: videos });
  } catch (error) {
    console.error('List user videos error:', error);
    return res.status(500).json({ success: false, error: 'Gagal memuat riwayat materi.' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { learnerName, topic, learningStyle, persona, duration, durationSeconds, accentType, script, scriptDescription, generatedPrompt, elevenlabsVideoId, status = 'processing' } = req.body;
    if (!topic || !learningStyle || !persona || !duration || !accentType) {
      return res.status(400).json({ error: 'Data materi video belum lengkap.' });
    }
    if (durationSeconds !== undefined && (!Number.isInteger(Number(durationSeconds)) || Number(durationSeconds) < 1)) {
      return res.status(400).json({ error: 'Durasi detik harus berupa bilangan bulat positif.' });
    }

    const spokenScript = typeof script === 'string' ? script.trim() : '';
    const fullPrompt = typeof generatedPrompt === 'string' ? generatedPrompt.trim() : spokenScript;

    const video = await prisma.video.create({
      data: {
        userId: req.user.id,
        learnerName: learnerName || 'Murid',
        topic,
        learningStyle,
        persona,
        duration: Number(duration),
        durationSeconds: durationSeconds === undefined ? null : Number(durationSeconds),
        accentType,
        script: spokenScript || fullPrompt,
        scriptDescription: typeof scriptDescription === 'string' ? scriptDescription.trim() : null,
        generatedPrompt: fullPrompt,
        elevenlabsVideoId,
        status,
      },
    });

    return res.status(201).json({ success: true, data: { id: video.id } });
  } catch (error) {
    console.error('Create video record error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan materi video.' });
  }
});

// ==========================================
// ENDPOINT: BUAT VIDEO DENGAN D-ID API
// ==========================================
/**
 * POST /create
 * Membuat video menggunakan D-ID API dengan naskah dan sumber gambar
 * 
 * Body:
 * {
 *   "videoId": <database_video_id>,
 *   "scriptText": "Naskah dari Gemini",
 *   "sourceUrl": "https://example.com/avatar.jpg"
 * }
 */
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { videoId, scriptText, sourceUrl } = req.body;

    // Validasi input
    if (!scriptText || !sourceUrl) {
      return res.status(400).json({
        success: false,
        error: 'scriptText dan sourceUrl wajib diisi.'
      });
    }

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'videoId (dari database) wajib diisi.'
      });
    }

    // Verifikasi video ada dan milik user yang sedang login
    const video = await prisma.video.findUnique({
      where: { id: parseInt(videoId) }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video tidak ditemukan.'
      });
    }

    if (video.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Anda tidak memiliki akses ke video ini.'
      });
    }

    // Kirim permintaan ke D-ID API
    const authHeader = getDIdAuthHeader();
    const dIdResponse = await axios.post(
      `${D_ID_API_BASE}/talks`,
      {
        source_url: sourceUrl,
        script: {
          type: 'text',
          input: scriptText
        }
      },
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      }
    );

    const dIdVideoId = dIdResponse.data.id;

    // Simpan D-ID video ID ke database
    const updatedVideo = await prisma.video.update({
      where: { id: parseInt(videoId) },
      data: {
        elevenlabsVideoId: dIdVideoId,  // Reuse field untuk D-ID ID
        status: 'processing'
      }
    });

    console.log(`Video creation initiated with D-ID ID: ${dIdVideoId}`);

    return res.status(200).json({
      success: true,
      message: 'Video sedang diproses oleh D-ID API.',
      data: {
        videoId: updatedVideo.id,
        dIdVideoId: dIdVideoId,
        status: 'processing',
        message: 'Silakan gunakan GET /status/:id untuk mengecek progres'
      }
    });

  } catch (error) {
    console.error('D-ID Video Creation Error:', error.response?.data || error.message);

    // Log error detail untuk debugging
    if (error.response?.data) {
      console.error('D-ID API Response:', error.response.data);
    }

    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || 'Gagal membuat video dengan D-ID API.',
      details: error.message,
      provider: 'd-id'
    });
  }
});

// ==========================================
// ENDPOINT: CEK STATUS VIDEO D-ID
// ==========================================
/**
 * GET /status/:id
 * Mengecek status video yang sedang diproses oleh D-ID API
 * 
 * Jika status = "done", result_url akan disimpan ke database
 */
router.get('/status/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Ambil data video dari database
    const video = await prisma.video.findUnique({
      where: { id: parseInt(id) }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video tidak ditemukan.'
      });
    }

    if (video.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Anda tidak memiliki akses ke video ini.'
      });
    }

    if (!video.elevenlabsVideoId) {
      return res.status(400).json({
        success: false,
        error: 'D-ID video ID tidak ditemukan. Jalankan POST /create terlebih dahulu.'
      });
    }

    // Cek status dengan D-ID API
    const authHeader = getDIdAuthHeader();
    const dIdResponse = await axios.get(
      `${D_ID_API_BASE}/talks/${video.elevenlabsVideoId}`,
      {
        headers: {
          'Authorization': authHeader
        }
      }
    );

    const dIdStatus = dIdResponse.data.status;
    const resultUrl = dIdResponse.data.result_url;

    let dbStatus = 'processing';

    // Perbarui database jika video sudah selesai
    if (dIdStatus === 'done' && resultUrl) {
      await prisma.video.update({
        where: { id: parseInt(id) },
        data: {
          videoUrl: resultUrl,
          status: 'completed',
          completedAt: new Date()
        }
      });
      dbStatus = 'completed';
      console.log(`Video ${id} completed with URL: ${resultUrl}`);
    }
    // Perbarui database jika ada error
    else if (dIdStatus === 'error' || dIdStatus === 'failed') {
      await prisma.video.update({
        where: { id: parseInt(id) },
        data: {
          status: 'failed'
        }
      });
      dbStatus = 'failed';
      console.error(`Video ${id} failed with status: ${dIdStatus}`);
    }

    return res.status(200).json({
      success: true,
      data: {
        videoId: video.id,
        dIdVideoId: video.elevenlabsVideoId,
        dIdStatus: dIdStatus,
        resultUrl: resultUrl || null,
        databaseStatus: dbStatus,
        message: dIdStatus === 'done' 
          ? 'Video siap ditonton!' 
          : dIdStatus === 'processing' 
            ? 'Video masih diproses. Cek kembali dalam beberapa saat.'
            : 'Video gagal diproses. Silakan coba lagi.'
      }
    });

  } catch (error) {
    console.error('D-ID Status Check Error:', error.response?.data || error.message);

    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || 'Gagal mengecek status video.',
      details: error.message,
      provider: 'd-id'
    });
  }
});

export default router;
