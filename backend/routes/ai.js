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
// ENDPOINT UTAMA: GENERATE VIDEO PEMBELAJARAN
// ==========================================
router.post('/generate', async (req, res) => {
    try {
        // 1. Menangkap topik dari input pengguna di frontend
        const { topik } = req.body;

        if (!topik) {
            return res.status(400).json({ error: "Topik pembelajaran wajib diisi!" });
        }

        // 2. PROSES GROQ AI: Membuat Naskah dengan Batasan
        // Di sinilah kita mendikte (memberi instruksi ketat) kepada AI
        const groqResponse = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "Anda adalah guru ahli yang bertugas membuat naskah video pembelajaran. Batasan: Maksimal 60 kata, gunakan bahasa Indonesia yang baku namun santai, jangan gunakan kalimat sapaan pembuka (seperti halo/selamat pagi), dan langsung jelaskan inti materinya saja."
                },
                {
                    role: "user",
                    content: `Buat naskah video pembelajaran tentang: ${topik}`
                }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.7, // Mengatur tingkat kreativitas AI (0.0 kaku - 1.0 kreatif)
        });

        const naskah = groqResponse.choices[0]?.message?.content;

        // 3. PROSES HEYGEN AI: Mengubah Naskah menjadi Video
        const heygenResponse = await axios.post('https://api.heygen.com/v2/video/generate', {
            video_inputs: [
                {
                    character: {
                        type: "avatar",
                        avatar_id: "GANTI_DENGAN_AVATAR_ID_ANDA", // ID karakter visual HeyGen
                        avatar_style: "normal"
                    },
                    voice: {
                        type: "text",
                        input_text: naskah,
                        voice_id: "GANTI_DENGAN_VOICE_ID_ANDA" // ID suara (Dubber) HeyGen
                    }
                }
            ],
            test: true, // Sangat disarankan bernilai 'true' saat tahap development agar tidak menguras saldo/kredit HeyGen Anda
            aspect_ratio: "16:9"
        }, {
            headers: {
                'X-Api-Key': process.env.HEYGEN_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        // HeyGen tidak langsung memberikan file MP4, melainkan memberikan ID Antrean Video
        const videoId = heygenResponse.data.data.video_id;

        // 4. Mengembalikan hasil ke Frontend
        res.status(200).json({
            success: true,
            message: "Proses pembuatan video berhasil dimulai!",
            data: {
                topik: topik,
                naskah_dari_groq: naskah,
                heygen_video_id: videoId
            }
        });

    } catch (error) {
        console.error("Generate Video Error:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: "Gagal memproses video pembelajaran",
            detail: error.response?.data || error.message
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

export default router;