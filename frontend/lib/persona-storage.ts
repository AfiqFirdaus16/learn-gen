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

const STORAGE_KEY = 'learn-gen-personas';

export function getStoredPersonas(): PersonaItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersonaItem[]) : [];
  } catch {
    return [];
  }
}

export function savePersona(persona: PersonaItem): PersonaItem[] {
  const next = [persona, ...getStoredPersonas()];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deletePersona(id: string): PersonaItem[] {
  const next = getStoredPersonas().filter((persona) => persona.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
