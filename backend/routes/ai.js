import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// ==========================================
// KONFIGURASI GEMINI
// ==========================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY tidak ditemukan di environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ==========================================
// UTILITY: NORMALISASI NASKAH
// ==========================================
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

// ==========================================
// UTILITY: GENERATE CONTENT DENGAN GEMINI
// ==========================================

// ==========================================
// UTILITY: GENERATE CONTENT DENGAN GEMINI
// ==========================================
async function generateGeminiContent(userPrompt, systemInstruction = null) {
    try {
        const model = genAI.getGenerativeModel({ 
            model: GEMINI_MODEL,
            systemInstruction: systemInstruction
        });

        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: userPrompt }]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 2048,
            }
        });

        const response = result.response;
        const text = response.text();

        if (!text) {
            const finishReason = response.candidates?.[0]?.finishReason;
            throw new Error(`Gemini tidak mengembalikan respons${finishReason ? ` (Alasan: ${finishReason})` : ''}.`);
        }

        return {
            text: text.trim(),
            usage: {
                promptTokens: result.usageMetadata?.promptTokenCount || 0,
                outputTokens: result.usageMetadata?.candidatesTokenCount || 0,
                totalTokens: result.usageMetadata?.totalTokenCount || 0
            }
        };
    } catch (error) {
        console.error('Gemini API Error:', error.message);
        const err = new Error(error.message || 'Gemini API gagal memproses permintaan');
        err.status = error.status || 500;
        throw err;
    }
}

// ==========================================
// ENDPOINT: CEK KONEKSI GEMINI
// ==========================================
router.get('/check-connection', async (req, res) => {
    try {
        const result = await generateGeminiContent(
            'Reply with exactly two words: connection verified'
        );

        res.status(200).json({
            success: true,
            message: '✅ Koneksi Google Gemini berhasil!',
            details: {
                model: GEMINI_MODEL,
                response: result.text,
                tokenUsage: result.usage
            }
        });
    } catch (error) {
        console.error('Connection Check Error:', error.message);
        res.status(error.status || 500).json({
            success: false,
            error: '❌ Gagal terhubung ke Google Gemini API',
            details: error.message
        });
    }
});

// ==========================================
// ENDPOINT: GENERATE SCRIPT EDUKASI
// ==========================================
router.post('/generate-script', async (req, res) => {
    try {
        const { topic, duration, durationSeconds, learningStyle, persona, targetWordCount, notes } = req.body;

        // Validasi input
        if (!topic || !duration || !persona) {
            return res.status(400).json({
                success: false,
                error: 'Input wajib: topic, duration, persona'
            });
        }

        const systemInstruction = `Anda adalah seorang penulis naskah narasi edukasi profesional. 
Tugas Anda adalah menghasilkan naskah yang:
- Jelas, terstruktur, dan langsung dapat dibacakan
- Tanpa format markdown, tanda khusus, atau instruksi panggung
- Tanpa judul, label, atau penjelasan tambahan
- Hanya berisi paragraf narasi yang siap diucapkan
- Sesuai dengan level siswa dan gaya belajar yang diminta
- Tetap fokus pada topik yang diberikan

Hasilkan HANYA naskah narasi tanpa komentar atau metadata apapun.`;

        const userPrompt = `Buatkan naskah edukasi dengan spesifikasi berikut:
- Topik: ${topic}
    - Durasi: ${Number(durationSeconds) > 0 ? `${Number(durationSeconds)} detik` : `${duration} menit`}
- Gaya Belajar: ${learningStyle}
- Level Siswa: ${persona}
- Target Panjang: sekitar ${targetWordCount || 'auto'} kata
${notes ? `- Catatan Tambahan: ${notes}` : ''}

Hasilkan hanya naskah narasi yang siap dibacakan, tanpa apapun selain konten narasi itu sendiri.`;

        const result = await generateGeminiContent(userPrompt, systemInstruction);
        const script = normalizeSpokenScript(result.text);

        if (!script) {
            return res.status(400).json({
                success: false,
                error: 'Gemini tidak menghasilkan naskah yang valid'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                script,
                wordCount: script.split(/\s+/).length,
                characterCount: script.length,
                usage: {
                    promptTokens: result.usage.promptTokens,
                    outputTokens: result.usage.outputTokens,
                    totalTokens: result.usage.totalTokens
                }
            }
        });
    } catch (error) {
        console.error('Generate Script Error:', error.message);
        res.status(error.status || 502).json({
            success: false,
            error: error.message || 'Gagal membuat naskah script',
            provider: 'google-gemini'
        });
    }
});

// ==========================================
// ENDPOINT: GENERATE SCRIPT (BACKWARD COMPATIBILITY)
// ==========================================
router.post('/generate-elevenlabs-prompt', async (req, res) => {
    try {
        const { videoConfig } = req.body;

        if (!videoConfig?.topic || !videoConfig?.persona || !videoConfig?.duration) {
            return res.status(400).json({ 
                success: false, 
                error: 'Data persona, durasi, dan materi wajib diisi.' 
            });
        }

        const systemInstruction = `Anda adalah seorang penulis naskah narasi edukasi profesional. 
Tugas Anda adalah menghasilkan naskah yang:
- Jelas, terstruktur, dan langsung dapat dibacakan
- Tanpa format markdown, tanda khusus, atau instruksi panggung
- Tanpa judul, label, atau penjelasan tambahan
- Hanya berisi paragraf narasi yang siap diucapkan
- Sesuai dengan level siswa dan gaya belajar yang diminta
- Tetap fokus pada topik yang diberikan

Hasilkan HANYA naskah narasi tanpa komentar atau metadata apapun.`;

        const userPrompt = [
            'Buatkan naskah edukasi dengan spesifikasi berikut:',
            `Materi/Topik: ${videoConfig.topic}`,
            `Persona: ${videoConfig.persona}`,
            `Level Siswa: ${videoConfig.level || 'menengah'}`,
            `Gaya Belajar: ${videoConfig.learningStyle || 'visual'}`,
            `Tone Pengajaran: ${videoConfig.tone || 'profesional'}`,
            `Durasi: ${videoConfig.duration} menit`,
            `Target Panjang: sekitar ${videoConfig.targetWordCount || 'auto'} kata`,
            videoConfig.notes ? `Catatan Tambahan: ${videoConfig.notes}` : '',
            '',
            'Hasilkan hanya naskah narasi yang siap dibacakan, tanpa apapun selain konten narasi itu sendiri.'
        ].filter(Boolean).join('\n');

        const result = await generateGeminiContent(userPrompt, systemInstruction);
        const script = normalizeSpokenScript(result.text);

        if (!script) {
            throw new Error('Gemini tidak menghasilkan naskah yang valid');
        }

        return res.status(200).json({
            success: true,
            data: {
                script,
                usage: {
                    total_tokens: result.usage.totalTokens
                }
            }
        });
    } catch (error) {
        console.error('Generate Script Error:', error.message);
        return res.status(error.status || 502).json({
            success: false,
            error: error.message || 'Gemini gagal membuat naskah.',
            provider: 'google-gemini'
        });
    }
});

export default router;