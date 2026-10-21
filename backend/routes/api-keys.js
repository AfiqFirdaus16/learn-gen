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
  video: [
    { id: 'd-id', name: 'D-ID', url: 'https://studio.d-id.com/account-settings' },
    { id: 'heygen', name: 'HeyGen', url: 'https://app.heygen.com/settings?nav=API' },
  ],
  voice: [
    { id: 'd-id', name: 'D-ID (suara bawaan)', url: 'https://studio.d-id.com/account-settings' },
    { id: 'elevenlabs', name: 'ElevenLabs', url: 'https://elevenlabs.io/app/settings/api-keys' },
  ],
};

const mask = (value) => value ? `••••••••${value.slice(-4)}` : null;

router.get('/', verifyToken, async (req, res) => {
  try {
    const [user, credentials] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user.id }, select: { videoProvider: true, voiceProvider: true } }),
      prisma.apiCredential.findMany({ where: { userId: req.user.id, category: { in: ['video', 'voice'] } }, select: { category: true, provider: true, encryptedApiKey: true, updatedAt: true } }),
    ]);
    const keys = (Array.isArray(credentials) ? credentials : []).map(({ category, provider, encryptedApiKey, updatedAt }) => ({ category, provider, maskedKey: mask(decryptApiKey(encryptedApiKey)), updatedAt }));
    return res.json({ success: true, data: { providers: apiProviders, selected: { video: user?.videoProvider || 'd-id', voice: user?.voiceProvider || 'd-id' }, credentials: keys } });
  } catch (error) {
    console.error('Load API configuration error:', error);
    return res.status(500).json({ success: false, error: 'Gagal memuat konfigurasi API.' });
  }
});

async function saveApiConfiguration(req, res) {
  const body = req.body || {};
  const providerValue = body.videoProvider ?? body.selectedProvider ?? body.provider ?? body.voiceProvider ?? 'd-id';
  const apiKeyValue = body.videoApiKey ?? body.apiKey ?? body.voiceApiKey;
  const videoProvider = typeof providerValue === 'string' ? providerValue.trim() : '';
  const videoApiKey = typeof apiKeyValue === 'string' ? apiKeyValue.trim() : apiKeyValue;

  if (!videoProvider || videoProvider.length > 100) {
    return res.status(400).json({ success: false, error: 'Nama provider harus diisi dan maksimal 100 karakter.' });
  }
  if (videoApiKey !== undefined && (typeof videoApiKey !== 'string' || (videoApiKey && videoApiKey.length < 8) || videoApiKey.length > 4096)) {
    return res.status(400).json({ success: false, error: 'API key harus berisi minimal 8 karakter.' });
  }

  try {
    const savedVideoCredential = videoApiKey
      ? null
      : await prisma.apiCredential.findUnique({
        where: { userId_category_provider: { userId: req.user.id, category: 'video', provider: videoProvider } },
        select: { encryptedApiKey: true },
      });
    const synchronizedApiKey = videoApiKey || (savedVideoCredential ? decryptApiKey(savedVideoCredential.encryptedApiKey) : '');
    const encryptedApiKey = synchronizedApiKey ? encryptApiKey(synchronizedApiKey) : null;

    await prisma.$transaction(async (transaction) => {
      if (encryptedApiKey) {
        for (const category of ['video', 'voice']) {
          await transaction.apiCredential.upsert({
            where: { userId_category_provider: { userId: req.user.id, category, provider: videoProvider } },
            create: { userId: req.user.id, category, provider: videoProvider, encryptedApiKey },
            update: { encryptedApiKey },
          });
        }
      }

      await transaction.apiCredential.deleteMany({
        where: { userId: req.user.id, category: 'voice', provider: { not: videoProvider } },
      });
      await transaction.user.update({
        where: { id: req.user.id },
        data: { promptProvider: 'gemini', videoProvider, voiceProvider: videoProvider },
      });
    });

    return res.json({ success: true, message: 'Konfigurasi provider video dan suara tersimpan.' });
  } catch (error) {
    console.error('Save API configuration error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Gagal menyimpan konfigurasi API.' });
  }
}

router.put('/', verifyToken, saveApiConfiguration);
router.post('/', verifyToken, saveApiConfiguration);

router.delete('/:category/:provider', verifyToken, async (req, res) => {
  const { category, provider } = req.params;
  if (!['video', 'voice'].includes(category) || !provider || provider.length > 100) return res.status(400).json({ success: false, error: 'Provider API tidak valid.' });
  try {
    await prisma.apiCredential.deleteMany({ where: { userId: req.user.id, category: { in: ['video', 'voice'] }, provider } });
    return res.json({ success: true, message: 'API key dihapus.' });
  } catch (error) {
    console.error('Delete API key error:', error);
    return res.status(500).json({ success: false, error: 'Gagal menghapus API key.' });
  }
});

export default router;
