import 'dotenv/config';
import express from 'express';
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

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

async function createGeminiCompletion(prompt) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY belum dikonfigurasi.');
    }

    let response;
    try {
        response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
            {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7 },
            },
            {
                params: { key: process.env.GEMINI_API_KEY },
                headers: { 'Content-Type': 'application/json' },
            },
        );
    } catch (error) {
        const providerMessage = error.response?.data?.error?.message || error.message;
        const providerError = new Error(`Gemini API (${error.response?.status || 'network'}): ${providerMessage}`);
        providerError.status = error.response?.status || 502;
        throw providerError;
    }

    const text = response.data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim();

    if (!text) {
        const finishReason = response.data?.candidates?.[0]?.finishReason;
        throw new Error(`Gemini tidak mengembalikan naskah${finishReason ? ` (${finishReason})` : ''}.`);
    }
    return { text, usage: response.data?.usageMetadata };
}

// ==========================================
// ENDPOINT PENGECEKAN KONEKSI AI
// ==========================================
router.get('/check-connection', async (req, res) => {
    try {
        // 1. Menguji koneksi Gemini AI
        const geminiResponse = await createGeminiCompletion("Reply with exactly two words: Gemini connected.");

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
                gemini: geminiResponse.text,
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
router.post('/generate-elevenlabs-prompt', async (req, res) => {
    try {
        const { videoConfig } = req.body;

        if (!videoConfig?.topic || !videoConfig?.persona || !videoConfig?.duration) {
            return res.status(400).json({ success: false, error: 'Data persona, durasi, dan materi wajib diisi.' });
        }

        const geminiPrompt = [
            'Audio learning brief:',
            `Material/topic: ${videoConfig.topic}`,
            `Persona: ${videoConfig.persona}`,
            `Student level: ${videoConfig.level}`,
            `Learning style: ${videoConfig.learningStyle}`,
            `Teaching tone: ${videoConfig.tone}`,
            `Audio duration: ${videoConfig.duration} minute(s)`,
            `Target narration length: approximately ${videoConfig.targetWordCount} words`,
            `Required script direction: ${videoConfig.scriptDescription || 'Explain the topic clearly and stay strictly within the requested material.'}`,
            `Presenter avatar: ${videoConfig.avatarName}`,
            `Voice: ${videoConfig.voiceName}`,
            videoConfig.notes ? `Additional notes: ${videoConfig.notes}` : '',
        ].filter(Boolean).join('\n');

        const geminiResponse = await createGeminiCompletion(`You are a narration-only educational scriptwriter. Output ONLY the spoken script for the video. Stay strictly on the requested material/topic and follow the user's script direction. Do not add unrelated examples or topics. No title, no explanation, no labels, no stage directions, no markdown, no quotes, and no extra commentary. Return only plain paragraphs that will be read aloud.\n\n${geminiPrompt}`);
        const script = normalizeSpokenScript(geminiResponse.text);
        if (!script) throw new Error('Gemini tidak mengembalikan naskah.');

        return res.status(200).json({
            success: true,
            data: {
                script,
                usage: {
                    total_tokens: geminiResponse.usage?.totalTokenCount || 0
                }
            }
        });
    } catch (error) {
        console.error("Generate Gemini Script Error:", error.response?.data || error.message);
        return res.status(error.status || 502).json({
            success: false,
            error: error.message || 'Gemini gagal membuat naskah.',
            provider: 'gemini',
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

// ==========================================
// ENDPOINT: CEK SISA KUOTA KARAKTER ELEVENLABS
// ==========================================
router.get('/elevenlabs-quota', async (req, res) => {
    try {
        const quotaResponse = await axios.get('https://api.elevenlabs.io/v1/user/subscription', {
            headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
        });

        const characterCount = Number(quotaResponse.data.character_count || 0);
        const characterLimit = Number(quotaResponse.data.character_limit || 0);

        res.status(200).json({
            success: true,
            karakter_terpakai: characterCount,
            total_karakter: characterLimit,
            sisa_karakter: Math.max(0, characterLimit - characterCount),
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