import { authenticatedFetch } from './auth';

export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'reading';
export type EnglishAccent = 'American' | 'British' | 'Australian' | 'Canadian' | 'Irish' | 'Indian' | 'South African';

export interface PersonaItem {
  id: string;
  name: string;
  learningStyle: LearningStyle;
  level: 'pemula' | 'menengah' | 'lanjutan';
  tone: 'ramah' | 'formal' | 'energik';
  accent: EnglishAccent;
  notes: string;
  createdAt: string;
}

<<<<<<< HEAD
export async function getStoredPersonas(): Promise<PersonaItem[]> {
  try {
    const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/personas`);
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload.personas) ? payload.personas : [];
  } catch {
    return [];
  }
=======
const STORAGE_KEY = 'learn-gen-personas';
const accents: EnglishAccent[] = ['American', 'British', 'Australian', 'Canadian', 'Irish', 'Indian', 'South African'];

function normalizePersona(value: Partial<PersonaItem>): PersonaItem {
  const learningStyle = ['visual', 'auditory', 'kinesthetic', 'reading'].includes(String(value.learningStyle)) ? value.learningStyle as LearningStyle : 'visual';
  const level = ['pemula', 'menengah', 'lanjutan'].includes(String(value.level)) ? value.level as PersonaItem['level'] : 'pemula';
  const tone = ['ramah', 'formal', 'energik'].includes(String(value.tone)) ? value.tone as PersonaItem['tone'] : 'ramah';
  return { id: String(value.id || `persona-${Date.now()}`), name: String(value.name || 'Profil pembelajaran'), learningStyle, level, tone, accent: accents.includes(value.accent as EnglishAccent) ? value.accent as EnglishAccent : 'American', notes: String(value.notes || ''), createdAt: String(value.createdAt || new Date().toLocaleDateString('id-ID')) };
}

export function getStoredPersonas(): PersonaItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored.map((persona) => normalizePersona(persona)) : [];
  } catch { return []; }
>>>>>>> 4cdfa9567d4761c73d64dfd837a72c1d016dd8ca
}

export async function savePersona(persona: Omit<PersonaItem, 'id' | 'createdAt'> & { id?: string }): Promise<PersonaItem[]> {
  try {
    const safeAvatarId = persona.avatarId || 'elevenlabs-auto-avatar';
    const safeAvatarName = persona.avatarName || 'Tema ElevenLabs';
    const safeVoiceId = persona.voiceId || 'elevenlabs-auto-voice';
    const safeVoiceName = persona.voiceName || 'Suara ElevenLabs';

    const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/personas`, {
      method: 'POST',
      body: JSON.stringify({
        name: persona.name,
        learningStyle: persona.learningStyle,
        avatarId: safeAvatarId,
        avatarName: safeAvatarName,
        voiceId: safeVoiceId,
        voiceName: safeVoiceName,
        level: persona.level,
        tone: persona.tone,
        notes: persona.notes,
      }),
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Gagal menyimpan persona');
    return await getStoredPersonas();
  } catch {
    return [];
  }
}

export async function deletePersona(id: string): Promise<PersonaItem[]> {
  try {
    const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/personas/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) return await getStoredPersonas();
    return await getStoredPersonas();
  } catch {
    return await getStoredPersonas();
  }
}
