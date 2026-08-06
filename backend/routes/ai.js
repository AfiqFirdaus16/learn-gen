import 'dotenv/config';
import express from 'express';
import { Groq } from 'groq-sdk';
import axios from 'axios';

const router = express.Router();

// Inisialisasi Groq dengan API Key dari .env
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ==========================================
// ENDPOINT PENGECEKAN KONEKSI AI
// ==========================================
router.get('/check-connection', async (req, res) => {
    try {
        // 1. Menguji Koneksi Groq AI
        // Kita meminta Groq untuk membalas dengan kalimat pendek
        const groqResponse = await groq.chat.completions.create({
            messages: [{ role: "user", content: "Katakan 'Groq Berhasil' dalam 2 kata." }],
            model: "llama-3.1-8b-instant",
        });
        const groqStatus = groqResponse.choices[0]?.message?.content;

        // 2. Menguji Koneksi HeyGen AI
        // Kita mencoba mengambil daftar Avatar dari akun HeyGen Anda
        const heygenResponse = await axios.get('https://api.heygen.com/v2/avatars', {
            headers: {
                'X-Api-Key': process.env.HEYGEN_API_KEY
            }
        });
        const avatarsCount = heygenResponse.data.data.length;

        // Jika kedua kode di atas berhasil dilewati tanpa error, kirim respons sukses
        res.status(200).json({
            success: true,
            message: "✅ Semua API AI berhasil terhubung!",
            detail: {
                groq: groqStatus,
                heygen_total_avatar_tersedia: avatarsCount
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
// ENDPOINT: BUAT NASKAH SINGKAT HEYGEN DENGAN GROQ UNTUK DITINJAU PENGGUNA
// ==========================================
router.post('/generate-heygen-prompt', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) return res.status(400).json({ success: false, error: 'Instruksi naskah wajib diisi.' });

        const groqResponse = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You write educational video scripts for English learning. Create ONE clear English narration based on the user's instruction. Follow the requested approximate word count so the narration matches the selected video duration. Start with one concise opening sentence that introduces why the topic matters, then explain the lesson. The audience is students as a group; never mention a person's name or address one individual. Do not use generic greetings or openings such as welcome, do not mention HeyGen or any platform, do not introduce an avatar, and do not include narrator or visual directions in parentheses. Use plain text only: no title, quotes, Markdown, asterisks, bullets, emojis, or decorative characters. Return only the final English script."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.7,
        });

        // Groq kadang tetap menambahkan label seperti "Prompt:"; label ini tidak perlu dikirim ke HeyGen.
        const heygenPrompt = groqResponse.choices[0]?.message?.content
            ?.trim()
            .replace(/^(?:(?:prompt|naskah)(?:\s+(?:untuk|heygen))?\s*:\s*)/i, '')
            .replace(/\([^)]*\)\s*/g, '')
            .replace(/\bselamat\s+datang[^.!?]*[.!?]\s*/i, '')
            .replace(/\bdi\s+heygen\b/gi, '')
            .replace(/[*•#_`]/g, '');
        if (!heygenPrompt) throw new Error('Groq tidak mengembalikan naskah.');

        return res.status(200).json({
            success: true,
            data: {
                script: heygenPrompt,
                usage: {
                    prompt_tokens: groqResponse.usage?.prompt_tokens || 0,
                    completion_tokens: groqResponse.usage?.completion_tokens || 0,
                    total_tokens: groqResponse.usage?.total_tokens || 0
                }
            }
        });
    } catch (error) {
        console.error("Generate HeyGen Script Error:", error.response?.data || error.message);
        return res.status(500).json({ success: false, error: "Gagal membuat naskah HeyGen" });
    }
});

// ==========================================
// ENDPOINT UTAMA: GENERATE VIDEO DARI NASKAH YANG SUDAH DIKONFIRMASI
// ==========================================
router.post('/generate', async (req, res) => {
    try {
        const { script, avatar_id, voice_id } = req.body;

        if (!script || !avatar_id || !voice_id) {
            return res.status(400).json({ success: false, error: "Naskah, Avatar, dan Suara wajib diisi!" });
        }

        // PROSES HEYGEN AI: menggunakan naskah yang telah dikonfirmasi.
        const heygenResponse = await axios.post('https://api.heygen.com/v2/video/generate', {
            video_inputs: [
                {
                    character: {
                        type: "avatar",
                        avatar_id: avatar_id, // <- Menerima ID secara dinamis dari frontend
                        avatar_style: "normal"
                    },
                    voice: {
                        type: "text",
                        input_text: script,
                        voice_id: voice_id // <- Menerima ID secara dinamis dari frontend
                    }
                }
            ],
            test: true, // Ubah ke false nanti jika ingin membuat video sungguhan (memotong kredit)
            aspect_ratio: "16:9"
        }, {
            headers: {
                'X-Api-Key': process.env.HEYGEN_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const videoId = heygenResponse.data.data.video_id;

        res.status(200).json({
            success: true,
            message: "Proses pembuatan video berhasil dimulai!",
            data: {
                naskah: script,
                heygen_video_id: videoId
            }
        });

    } catch (error) {
        console.error("Generate Video Error:", error.response?.data || error.message);
        const status = error.response?.status;
        let failureReason = "Layanan pembuatan video sedang bermasalah. Silakan coba lagi beberapa saat lagi.";

        if (status === 429) {
            failureReason = "Batas permintaan atau kredit HeyGen telah tercapai. Periksa kuota akun Anda, lalu coba generate ulang.";
        } else if (status === 401 || status === 403) {
            failureReason = "Akses ke HeyGen ditolak. Periksa API key atau izin akun sebelum mencoba lagi.";
        } else if (status === 400) {
            failureReason = error.response?.data?.message || error.response?.data?.error?.message || "Data video tidak dapat diproses oleh HeyGen. Periksa naskah, avatar, dan suara lalu coba lagi.";
        }
        res.status(500).json({
            success: false,
            error: failureReason
        });
    }
});

// ==========================================
// ENDPOINT: LIHAT DAFTAR AVATAR & SUARA HEYGEN (RAW DATA)
// ==========================================
router.get('/heygen-assets', async (req, res) => {
    try {
        // 1. Mengambil daftar Avatar
        const avatarsResponse = await axios.get('https://api.heygen.com/v2/avatars', {
            headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY }
        });

        // 2. Mengambil daftar Suara (Voices)
        const voicesResponse = await axios.get('https://api.heygen.com/v2/voices', {
            headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY }
        });

        // 3. Langsung kirimkan data mentah dari HeyGen tanpa fungsi .map()
        res.status(200).json({
            success: true,
            raw_avatars: avatarsResponse.data,
            raw_voices: voicesResponse.data
        });

    } catch (error) {
        console.error("Gagal mengambil aset HeyGen:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: "Gagal memuat daftar avatar dan suara",
            detail: error.response?.data || error.message
        });
    }
});

// ==========================================
// ENDPOINT: CEK SISA KREDIT / KUOTA HEYGEN
// ==========================================
router.get('/heygen-quota', async (req, res) => {
    try {
        // HeyGen menyediakan endpoint khusus untuk mengecek batas akun (limits)
        const quotaResponse = await axios.get('https://api.heygen.com/v2/user/info', {
            headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY }
        });

        // Struktur data dari HeyGen biasanya menyimpan sisa kredit di dalam properti tertentu
        res.status(200).json({
            success: true,
            kredit_tersisa: quotaResponse.data.data.quota_left || 0,
            total_kredit: quotaResponse.data.data.quota_total || 0
        });

    } catch (error) {
        console.error("Gagal mengecek kuota HeyGen:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: "Gagal memuat informasi kuota"
        });
    }
});

export default router;
