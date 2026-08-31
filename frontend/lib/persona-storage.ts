import { authenticatedFetch } from './auth';

export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'reading';

export interface PersonaItem {
  id: string;
  name: string;
  learningStyle: LearningStyle;
  avatarId: string;
  avatarName: string;
  voiceId: string;
  voiceName: string;
  level: 'pemula' | 'menengah' | 'lanjutan';
  tone: 'ramah' | 'formal' | 'energik';
  notes: string;
  createdAt: string;
}

export async function getStoredPersonas(): Promise<PersonaItem[]> {
  try {
    const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/personas`);
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload.personas) ? payload.personas : [];
  } catch {
    return [];
  }
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
