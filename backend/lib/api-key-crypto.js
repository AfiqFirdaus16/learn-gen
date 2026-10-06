import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function encryptionKey() {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('API_KEY_ENCRYPTION_SECRET atau JWT_SECRET wajib disetel untuk menyimpan API key.');
  return createHash('sha256').update(secret).digest();
}

export function encryptApiKey(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64')).join('.');
}

export function decryptApiKey(value) {
  const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
