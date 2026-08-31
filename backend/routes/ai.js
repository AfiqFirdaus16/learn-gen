import 'dotenv/config';
import express from 'express';
import { Groq } from 'groq-sdk';
import axios from 'axios';

const router = express.Router();

function normalizeSpokenScript(rawValue) {
    if (!rawValue || typeof rawValue !== 'string') {
        return '';
    }

    let text = rawValue
        .replace(/```(?:json|text)?/gi, '')
        .replace(/^\s*(?:naskah|script|transcript|here is|berikut|contoh|script video)\s*[:\-]?\s*/i, '')
        .replace(/\r/g, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/[*•#_`]/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    const lines = text
        .split(/\n+/)
        .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
        .filter(Boolean)
        .filter((line) => !/^(?:naskah|script|transcript|here is|berikut|title|judul|voice|speaker|tema|persona|durasi|catatan|note|audio)/i.test(line));

    return lines.join('\n').trim();
}

const GROQ_MODEL_FALLBACKS = [
    process.env.GROQ_MODEL,
    'qwen/qwen3.8-27b',
    'qwen/qwen3.6-27b',
    'openai/gpt-oss-20b',
    'allam-2-7b',
].filter(Boolean).filter((model, index, list) => list.indexOf(model) === index);

const GROQ_MODEL = GROQ_MODEL_FALLBACKS[0] || 'qwen/qwen3.8-27b';

// Inisialisasi Groq dengan API Key dari .env
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function createGroqCompletion(messages, options = {}) {
    let lastError;

    for (const model of GROQ_MODEL_FALLBACKS) {
        try {
            return await groq.chat.completions.create({
                ...options,
                model,
                messages,
            });
        } catch (error) {
            lastError = error;
            const message = error?.error?.message || error?.message || '';
            const isUnavailable = /model_not_found|model_decommissioned|does not exist|do not have access|decommissioned/i.test(message);

            if (!isUnavailable) {
                throw error;
            }

            console.warn(`Groq model ${model} tidak tersedia, mencoba fallback berikutnya.`, message);
        }
    }

    throw lastError || new Error('Tidak ada model Groq yang tersedia untuk akun ini.');
}

// ==========================================
// ENDPOINT PENGECEKAN KONEKSI AI
// ==========================================
router.get('/check-connection', async (req, res) => {
    try {
        // 1. Menguji Koneksi Groq AI
        const groqResponse = await createGroqCompletion([
            { role: 'user', content: "Katakan 'Groq Berhasil' dalam 2 kata." }
        ]);
        const groqStatus = groqResponse.choices[0]?.message?.content;

        // 2. Menguji Koneksi ElevenLabs AI
        const elevenLabsResponse = await axios.get('https://api.elevenlabs.io/v1/voices', {
            headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY
            }
        });
        const voicesCount = elevenLabsResponse.data.voices.length;

        res.status(200).json({
            success: true,
            message: "✅ Semua API AI berhasil terhubung!",
            detail: {
                groq: groqStatus,
                elevenlabs_total_suara_tersedia: voicesCount
            }
        });

    } catch (error) {
        console.error("API Test Error:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: "❌ Gagal terhubung ke layanan AI",
            detail: error.response?.data || error.message
        });
    }
});

// ==========================================
// ENDPOINT: BUAT NASKAH AUDIO DARI BRIEF LENGKAP
// ==========================================
router.post('/generate-audio-script', async (req, res) => {
    try {
        const { videoConfig } = req.body;

        if (!videoConfig?.topic || !videoConfig?.persona || !videoConfig?.duration) {
            return res.status(400).json({ success: false, error: 'Data persona, durasi, dan materi wajib diisi.' });
        }

        const groqPrompt = [
            'Audio learning brief:',
            `Material/topic: ${videoConfig.topic}`,
            `Persona: ${videoConfig.persona}`,
            `Student level: ${videoConfig.level}`,
            `Learning style: ${videoConfig.learningStyle}`,
            `Teaching tone: ${videoConfig.tone}`,
            `Audio duration: ${videoConfig.duration} minute(s)`,
            `Target narration length: approximately ${videoConfig.targetWordCount} words`,
            `Voice: ${videoConfig.voiceName}`,
            videoConfig.notes ? `Additional notes: ${videoConfig.notes}` : '',
        ].filter(Boolean).join('\n');

        const groqResponse = await createGroqCompletion([
            {
                role: 'system',
                content: 'You are a narration-only scriptwriter. Output ONLY the spoken script for the video. No title, no intro text, no explanation, no bullet points, no markdown, no labels, no stage directions, no quotes, no mentions of AI, and no extra commentary. Write only the exact script that will be read aloud in the video. Keep it natural, easy to understand, and within the required word count. Use plain paragraphs only.'
            },
            {
                role: 'user',
                content: groqPrompt
            }
        ], {
            temperature: 0.7,
        });

        const scriptPrompt = normalizeSpokenScript(groqResponse.choices[0]?.message?.content);

        if (!scriptPrompt) throw new Error('Groq tidak mengembalikan naskah.');

        return res.status(200).json({
            success: true,
            data: {
                script: scriptPrompt,
                usage: {
                    total_tokens: groqResponse.usage?.total_tokens || 0
                }
            }
        });
    } catch (error) {
        console.error("Generate Script Error:", error.response?.data || error.message);
        return res.status(500).json({ success: false, error: "Gagal membuat naskah audio" });
    }
});

router.post('/generate-elevenlabs-prompt', async (req, res) => {
    try {
        const { videoConfig } = req.body;

        if (!videoConfig?.topic || !videoConfig?.persona || !videoConfig?.duration) {
            return res.status(400).json({
                success: false,
                error: 'Data topik, persona, dan durasi wajib diisi.'
            });
        }

        const groqPrompt = [
            'Video learning brief:',
            `Topic/material: ${videoConfig.topic}`,
            `Presenter persona: ${videoConfig.persona}`,
            `Audience level: ${videoConfig.level || 'pemula'}`,
            `Learning style: ${videoConfig.learningStyle || 'Visual'}`,
            `Teaching tone: ${videoConfig.tone || 'ramah'}`,
            `Duration: ${videoConfig.duration} minute(s)`,
            `Target script length: approximately ${videoConfig.targetWordCount || 300} words`,
            `Presenter theme: ${videoConfig.avatarName || 'ElevenLabs theme'}`,
            `Voice: ${videoConfig.voiceName || 'ElevenLabs voice'}`,
            videoConfig.notes ? `Additional notes: ${videoConfig.notes}` : '',
        ].filter(Boolean).join('\n');

        const groqResponse = await createGroqCompletion([
            {
                role: 'system',
                content: 'You are a narration-only scriptwriter. Output ONLY the spoken script for the video. No title, no intro text, no explanation, no bullet points, no markdown, no labels, no stage directions, no quotes, no mentions of AI, and no extra commentary. Write only the exact script that will be read aloud in the video. Keep it natural, easy to understand, and within the required word count. Use plain paragraphs only.'
            },
            {
                role: 'user',
                content: groqPrompt
            }
        ], {
            temperature: 0.7,
        });

        const script = normalizeSpokenScript(groqResponse.choices[0]?.message?.content);

        if (!script) {
            throw new Error('Groq tidak mengembalikan script untuk video.');
        }

        return res.status(200).json({
            success: true,
            data: {
                script,
                usage: {
                    total_tokens: groqResponse.usage?.total_tokens || 0
                }
            }
        });
    } catch (error) {
        console.error('Generate elevenlabs Prompt Error:', error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            error: 'Gagal membuat naskah video dari persona.'
        });
    }
});

// ==========================================
// ENDPOINT UTAMA: GENERATE AUDIO (TEXT-TO-SPEECH)
// ==========================================
router.post('/generate', async (req, res) => {
    try {
        const { script, voice_id, full_prompt: fullPrompt } = req.body;
        const cleanedScript = normalizeSpokenScript(script);

        if (!cleanedScript || !voice_id) {
            return res.status(400).json({ success: false, error: "Naskah dan Suara wajib diisi!" });
        }

        // Mengirim naskah ke ElevenLabs dan meminta respons dalam bentuk arraybuffer (audio stream)
        const elevenLabsResponse = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
            {
                text: cleanedScript,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            },
            {
                headers: {
                    'xi-api-key': process.env.ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg'
                },
                responseType: 'arraybuffer' // Penting untuk menerima file biner audio
            }
        );

        // Mengonversi buffer audio menjadi string Base64 agar mudah dikirim via JSON
        const audioBase64 = Buffer.from(elevenLabsResponse.data, 'binary').toString('base64');

        res.status(200).json({
            success: true,
            message: "Audio berhasil di-generate!",
            data: {
                naskah: cleanedScript,
                full_prompt: fullPrompt,
                audio_base64: `data:audio/mpeg;base64,${audioBase64}`
            }
        });

    } catch (error) {
        console.error("Generate Audio Error:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: "Layanan text-to-speech sedang bermasalah. Periksa kuota karakter Anda atau coba lagi nanti."
        });
    }
});

// ==========================================
// ENDPOINT: LIHAT DAFTAR SUARA ELEVENLABS
// ==========================================
router.get('/elevenlabs-assets', async (req, res) => {
    try {
        const voicesResponse = await axios.get('https://api.elevenlabs.io/v1/voices', {
            headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
        });

        res.status(200).json({
            success: true,
            raw_voices: voicesResponse.data,
            raw_avatars: { data: { avatars: [] } }
        });

    } catch (error) {
        console.error("Gagal mengambil aset ElevenLabs:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: "Gagal memuat daftar suara",
            detail: error.response?.data || error.message
        });
    }
});

router.get('/elevenlabs-assets', async (req, res) => {
    try {
        const voicesResponse = await axios.get('https://api.elevenlabs.io/v1/voices', {
            headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
        });

        return res.status(200).json({
            success: true,
            raw_avatars: { data: { avatars: [] } },
            raw_voices: voicesResponse.data
        });
    } catch (error) {
        console.error("Gagal mengambil aset ElevenLabs:", error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            error: "Gagal memuat daftar suara",
            detail: error.response?.data || error.message
        });
    }
});

// ==========================================
// ENDPOINT: CEK SISA KUOTA KARAKTER ELEVENLABS
// ==========================================
router.get('/elevenlabs-quota', async (req, res) => {
    try {
        const quotaResponse = await axios.get('https://api.elevenlabs.io/v1/user/subscription', {
            headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
        });

        res.status(200).json({
            success: true,
            karakter_terpakai: quotaResponse.data.character_count,
            total_karakter: quotaResponse.data.character_limit
        });

    } catch (error) {
        console.error("Gagal mengecek kuota ElevenLabs:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: "Gagal memuat informasi kuota"
        });
    }
});

export default router;