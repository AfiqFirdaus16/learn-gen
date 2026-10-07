import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
import { verifyToken } from './auth.js';
import { decryptApiKey } from '../lib/api-key-crypto.js';

const { Pool } = pg;
const { PrismaClient } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const router = express.Router();

// ==========================================
// KONFIGURASI D-ID API
// ==========================================
const D_ID_API_BASE = 'https://api.d-id.com';
const HEYGEN_API_BASE = 'https://api.heygen.com/v3';
const supportedVideoProviders = new Set(['d-id', 'heygen', 'elevenlabs']);

function normalizeVideoProvider(value) {
  const provider = String(value || '').trim().toLowerCase();
  if (provider === 'd-id (studio)' || provider === 'd-id studio') return 'd-id';
  return provider;
}

/**
 * Membuat header Authorization dengan Basic Auth untuk D-ID API
 * @returns {string} Authorization header value
 */
async function getSavedApiKey(userId, provider, category = 'video') {
  const savedCredential = await prisma.apiCredential.findUnique({ where: { userId_category_provider: { userId, category, provider } } });
    if (savedCredential) return decryptApiKey(savedCredential.encryptedApiKey);
  if (category === 'voice') {
    const legacyCredential = await prisma.apiCredential.findUnique({ where: { userId_category_provider: { userId, category: 'video', provider } } });
    if (legacyCredential) return decryptApiKey(legacyCredential.encryptedApiKey);
  }
    return null;
}

async function getProviderSettings(userId) {
  const settings = await prisma.user.findUnique({ where: { id: userId }, select: { videoProvider: true, voiceProvider: true } });
  return { videoProvider: settings?.videoProvider || 'd-id', voiceProvider: settings?.voiceProvider || 'd-id' };
}

async function getDIdAuthHeader(userId) {
    const apiKey = await getSavedApiKey(userId, 'd-id');
    if (!apiKey) throw new Error('API key D-ID belum disimpan. Buka Manajemen API untuk menambahkannya.');
    const encodedKey = Buffer.from(`${apiKey}:`).toString('base64');
    return `Basic ${encodedKey}`;
}

router.get('/credits', verifyToken, async (req, res) => {
  try {
    const requestedProvider = req.query.provider ? normalizeVideoProvider(req.query.provider) : '';
    if (requestedProvider && !supportedVideoProviders.has(requestedProvider)) {
      return res.status(400).json({ success: false, error: 'Provider AI tidak dikenali atau kunci belum diatur.' });
    }
    const provider = requestedProvider || (await getProviderSettings(req.user.id)).videoProvider;
    if (provider === 'heygen') {
      const apiKey = await getSavedApiKey(req.user.id, 'heygen');
      if (!apiKey) throw new Error('API key HeyGen belum disimpan. Buka Manajemen API untuk menambahkannya.');
      const response = await axios.get(`${HEYGEN_API_BASE}/users/me`, { headers: { 'X-Api-Key': apiKey } });
      const user = response.data?.data || {};
      const remaining = user.billing_type === 'wallet'
        ? Number(user.wallet?.remaining_balance)
        : Number(user.subscription?.credits?.premium_credits?.remaining ?? 0) + Number(user.subscription?.credits?.add_on_credits?.remaining ?? 0);
      return res.json({ success: true, data: { provider, total: null, remaining: Number.isFinite(remaining) ? remaining : null, unit: user.wallet?.currency || 'kredit' } });
    }
    const response = await axios.get(`${D_ID_API_BASE}/credits`, {
      headers: {
        Authorization: await getDIdAuthHeader(req.user.id),
        ...(provider === 'elevenlabs' && await getSavedApiKey(req.user.id, 'elevenlabs') ? { 'x-api-key-external': JSON.stringify({ elevenlabs: await getSavedApiKey(req.user.id, 'elevenlabs') }) } : {}),
      },
    });
    const credits = response.data?.credits || response.data;
    const total = Number(credits?.total ?? response.data?.total ?? 0);
    const remaining = Number(credits?.remaining ?? response.data?.remaining ?? 0);

    return res.json({
      success: true,
      data: {
        total: Number.isFinite(total) ? total : 0,
        remaining: Number.isFinite(remaining) ? remaining : 0,
        provider,
        unit: 'kredit',
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
        accentType: true,
        provider: true,
        voiceProvider: true,
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
    const { learnerName, topic, learningStyle, persona, duration, durationSeconds, accentType, provider, voiceProvider, script, scriptDescription, generatedPrompt, elevenlabsVideoId, status = 'processing' } = req.body;
    if (!topic || !learningStyle || !persona || !duration || !accentType) {
      return res.status(400).json({ error: 'Data materi video belum lengkap.' });
    }
    if (durationSeconds !== undefined && (!Number.isInteger(Number(durationSeconds)) || Number(durationSeconds) < 1)) {
      return res.status(400).json({ error: 'Durasi detik harus berupa bilangan bulat positif.' });
    }
    const selectedProvider = normalizeVideoProvider(provider || accentType || 'd-id');
    if (!supportedVideoProviders.has(selectedProvider)) {
      return res.status(400).json({ success: false, error: 'Provider AI tidak dikenali atau kunci belum diatur.' });
    }
    const selectedVoiceProvider = String(voiceProvider || (await getProviderSettings(req.user.id)).voiceProvider || 'd-id').trim().toLowerCase();
    if (!['d-id', 'elevenlabs'].includes(selectedVoiceProvider)) {
      return res.status(400).json({ success: false, error: 'Provider suara tidak dikenali.' });
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
        provider: selectedProvider,
        voiceProvider: selectedVoiceProvider,
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
    const { videoId, scriptText, sourceUrl, voiceId } = req.body;

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

    const providerSettings = await getProviderSettings(req.user.id);
    const provider = normalizeVideoProvider(req.body.provider || video.provider || video.accentType || providerSettings.videoProvider);
    const voiceProvider = String(req.body.voiceProvider || video.voiceProvider || providerSettings.voiceProvider || 'd-id').trim().toLowerCase();
    if (!supportedVideoProviders.has(provider)) {
      return res.status(400).json({ success: false, error: 'Provider AI tidak dikenali atau kunci belum diatur.' });
    }
    if (!['d-id', 'elevenlabs'].includes(voiceProvider)) {
      return res.status(400).json({ success: false, error: 'Provider suara tidak dikenali.' });
    }

    let providerVideoId;
    let providerLabel;
    switch (provider) {
      case 'heygen': {
        if (!voiceId?.trim()) return res.status(400).json({ success: false, error: 'Voice ID HeyGen wajib diisi.' });
        const apiKey = await getSavedApiKey(req.user.id, 'heygen');
        if (!apiKey) throw new Error('API key HeyGen belum disimpan. Buka Manajemen API untuk menambahkannya.');
        const response = await axios.post(`${HEYGEN_API_BASE}/videos`, {
          type: 'image',
          image: { type: 'url', url: sourceUrl },
          script: scriptText,
          voice_id: voiceId.trim(),
          title: video.topic,
          resolution: '1080p',
          aspect_ratio: 'auto',
        }, { headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' } });
        providerVideoId = response.data?.data?.video_id;
        providerLabel = 'HeyGen';
        break;
      }
      case 'elevenlabs':
      case 'd-id': {
        const headers = { Authorization: await getDIdAuthHeader(req.user.id), 'Content-Type': 'application/json' };
        let script = { type: 'text', input: scriptText };
        if (voiceProvider === 'elevenlabs') {
          if (!voiceId?.trim()) return res.status(400).json({ success: false, error: 'Voice ID ElevenLabs wajib diisi.' });
          const elevenLabsKey = await getSavedApiKey(req.user.id, 'elevenlabs', 'voice');
          if (!elevenLabsKey) throw new Error('API key suara ElevenLabs belum disimpan. Buka Manajemen API untuk menambahkannya.');
          headers['x-api-key-external'] = JSON.stringify({ elevenlabs: elevenLabsKey });
          script = { type: 'text', input: scriptText, provider: { type: 'elevenlabs', voice_id: voiceId.trim() } };
        }
        const response = await axios.post(`${D_ID_API_BASE}/talks`, { source_url: sourceUrl, script }, { headers });
        providerVideoId = response.data.id;
        providerLabel = voiceProvider === 'elevenlabs' ? 'D-ID + ElevenLabs' : 'D-ID';
        break;
      }
      default:
        return res.status(400).json({ success: false, error: 'Provider AI tidak dikenali atau kunci belum diatur.' });
    }
    if (!providerVideoId) throw new Error(`${providerLabel || provider} tidak mengembalikan ID video.`);

    // Simpan D-ID video ID ke database
    const updatedVideo = await prisma.video.update({
      where: { id: parseInt(videoId) },
      data: {
        elevenlabsVideoId: providerVideoId,
        provider,
        voiceProvider,
        status: 'processing'
      }
    });

    console.log(`Video creation initiated with ${providerLabel} ID: ${providerVideoId}`);

    return res.status(200).json({
      success: true,
      message: `Video sedang diproses oleh ${providerLabel}.`,
      data: {
        videoId: updatedVideo.id,
        providerVideoId,
        provider,
        voiceProvider,
        dIdVideoId: provider === 'd-id' ? providerVideoId : undefined,
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
      provider: req.body?.provider || 'video-provider'
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
    const provider = normalizeVideoProvider(video.provider || video.accentType || 'd-id');
    const voiceProvider = String(video.voiceProvider || 'd-id').toLowerCase();
    let providerStatus;
    let resultUrl;
    let failureMessage;
    if (provider === 'heygen') {
      const apiKey = await getSavedApiKey(req.user.id, 'heygen');
      if (!apiKey) throw new Error('API key HeyGen tidak tersedia untuk memeriksa status video ini.');
      const response = await axios.get(`${HEYGEN_API_BASE}/videos/${video.elevenlabsVideoId}`, { headers: { 'X-Api-Key': apiKey } });
      providerStatus = response.data?.data?.status;
      resultUrl = response.data?.data?.video_url;
      failureMessage = response.data?.data?.failure_message;
    } else {
      const headers = { Authorization: await getDIdAuthHeader(req.user.id) };
      if (voiceProvider === 'elevenlabs') {
        const elevenLabsKey = await getSavedApiKey(req.user.id, 'elevenlabs', 'voice');
        if (elevenLabsKey) headers['x-api-key-external'] = JSON.stringify({ elevenlabs: elevenLabsKey });
      }
      const response = await axios.get(`${D_ID_API_BASE}/talks/${video.elevenlabsVideoId}`, { headers });
      providerStatus = response.data.status;
      resultUrl = response.data.result_url;
      failureMessage = response.data.error?.description;
    }

    let dbStatus = providerStatus === 'completed' || providerStatus === 'done' ? 'completed' : 'processing';

    // Perbarui database jika video sudah selesai
    if (['done', 'completed'].includes(String(providerStatus).toLowerCase()) && resultUrl) {
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
    else if (['error', 'failed'].includes(String(providerStatus).toLowerCase())) {
      await prisma.video.update({
        where: { id: parseInt(id) },
        data: {
          status: 'failed'
        }
      });
      dbStatus = 'failed';
      console.error(`Video ${id} failed with status: ${providerStatus}`);
    }

    return res.status(200).json({
      success: true,
      data: {
        videoId: video.id,
        provider,
        voiceProvider,
        providerVideoId: video.elevenlabsVideoId,
        providerStatus,
        dIdVideoId: provider === 'd-id' ? video.elevenlabsVideoId : undefined,
        dIdStatus: provider === 'd-id' ? providerStatus : undefined,
        resultUrl: resultUrl || null,
        failureMessage: failureMessage || null,
        databaseStatus: dbStatus,
        message: ['done', 'completed'].includes(String(providerStatus).toLowerCase())
          ? 'Video siap ditonton!' 
          : ['processing', 'pending', 'created'].includes(String(providerStatus).toLowerCase())
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
