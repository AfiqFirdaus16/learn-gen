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
