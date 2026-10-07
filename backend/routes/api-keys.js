import express from 'express';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
import { verifyToken } from './auth.js';
import { decryptApiKey, encryptApiKey } from '../lib/api-key-crypto.js';

const { Pool } = pg;
const { PrismaClient } = pkg;
const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })) });
const router = express.Router();

export const apiProviders = {
  prompt: [
    { id: 'gemini', name: 'Google Gemini', url: 'https://aistudio.google.com/app/apikey' },
    { id: 'grok', name: 'Grok (xAI)', url: 'https://console.x.ai/' },
    { id: 'groq', name: 'Groq', url: 'https://console.groq.com/keys' },
  ],
  video: [
    { id: 'd-id', name: 'D-ID', url: 'https://studio.d-id.com/account-settings' },
    { id: 'heygen', name: 'HeyGen', url: 'https://app.heygen.com/settings?nav=API' },
    { id: 'elevenlabs', name: 'ElevenLabs', url: 'https://elevenlabs.io/app/settings/api-keys' },
  ],
};

const mask = (value) => value ? `••••••••${value.slice(-4)}` : null;

router.get('/', verifyToken, async (req, res) => {
  try {
    const [user, credentials] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user.id }, select: { promptProvider: true, videoProvider: true } }),
      prisma.apiCredential.findMany({ where: { userId: req.user.id }, select: { category: true, provider: true, encryptedApiKey: true, updatedAt: true } }),
    ]);
    const keys = credentials.map(({ category, provider, encryptedApiKey, updatedAt }) => ({ category, provider, maskedKey: mask(decryptApiKey(encryptedApiKey)), updatedAt }));
    return res.json({ success: true, data: { providers: apiProviders, selected: { prompt: user?.promptProvider || 'gemini', video: user?.videoProvider || 'd-id' }, credentials: keys } });
  } catch (error) {
    console.error('Load API configuration error:', error);
    return res.status(500).json({ success: false, error: 'Gagal memuat konfigurasi API.' });
  }
});

async function saveApiConfiguration(req, res) {
  const { category, provider, apiKey, selectedProvider } = req.body || {};
  const providers = apiProviders[category];
  if (!providers || (provider && !providers.some((item) => item.id === provider))) {
    return res.status(400).json({ success: false, error: 'Kategori atau provider tidak valid.' });
  }
  if (apiKey !== undefined && (typeof apiKey !== 'string' || apiKey.trim().length < 8 || apiKey.length > 4096)) {
    return res.status(400).json({ success: false, error: 'API key harus berisi minimal 8 karakter.' });
  }
  if (selectedProvider && !providers.some((item) => item.id === selectedProvider)) {
    return res.status(400).json({ success: false, error: 'Provider pilihan tidak valid.' });
  }

  try {
    if (apiKey?.trim()) {
      await prisma.apiCredential.upsert({
        where: { userId_category_provider: { userId: req.user.id, category, provider } },
        create: { userId: req.user.id, category, provider, encryptedApiKey: encryptApiKey(apiKey.trim()) },
        update: { encryptedApiKey: encryptApiKey(apiKey.trim()) },
      });
    }
    if (selectedProvider) {
      await prisma.user.update({ where: { id: req.user.id }, data: category === 'prompt' ? { promptProvider: selectedProvider } : { videoProvider: selectedProvider } });
    }
    return res.json({ success: true, message: 'Konfigurasi API tersimpan.' });
  } catch (error) {
    console.error('Save API configuration error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Gagal menyimpan konfigurasi API.' });
  }
}

router.put('/', verifyToken, saveApiConfiguration);
router.post('/', verifyToken, saveApiConfiguration);

router.delete('/:category/:provider', verifyToken, async (req, res) => {
  const { category, provider } = req.params;
  if (!apiProviders[category]?.some((item) => item.id === provider)) return res.status(400).json({ success: false, error: 'Provider tidak valid.' });
  try {
    await prisma.apiCredential.deleteMany({ where: { userId: req.user.id, category, provider } });
    return res.json({ success: true, message: 'API key dihapus.' });
  } catch (error) {
    console.error('Delete API key error:', error);
    return res.status(500).json({ success: false, error: 'Gagal menghapus API key.' });
  }
});

export default router;
