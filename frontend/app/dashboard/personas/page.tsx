'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { deletePersona, getStoredPersonas, savePersona, type LearningStyle, type PersonaItem } from '@/lib/persona-storage';
import { API_BASE_URL } from '@/lib/api-config';
import { getRoleHomeRoute } from '@/lib/auth';

const learningStyles: { value: LearningStyle; label: string; description: string }[] = [
  { value: 'visual', label: 'Visual', description: 'Mengutamakan diagram, warna, dan contoh visual.' },
  { value: 'auditory', label: 'Auditori', description: 'Mengutamakan penjelasan lisan yang runtut.' },
  { value: 'kinesthetic', label: 'Kinestetik', description: 'Mengutamakan latihan dan langkah praktik.' },
  { value: 'reading', label: 'Membaca & menulis', description: 'Mengutamakan poin penting dan rangkuman teks.' },
];

interface ElevenLabsVoice {
  voice_id: string;
  name?: string;
  gender?: string;
  language?: string;
  category?: string;
  labels?: string[] | Record<string, string | number | boolean>;
  description?: string;
}
interface ElevenLabsAssetsResponse {
  success: boolean;
  raw_voices?: { voices?: ElevenLabsVoice[] };
}

function getElevenLabsThemeLabel(voice?: ElevenLabsVoice): string {
  if (!voice) return 'ElevenLabs Theme';

  const labelValues = Array.isArray(voice.labels)
    ? voice.labels
    : voice.labels
      ? Object.values(voice.labels)
      : [];

  const normalizedValues = [voice.category, ...labelValues.map(String), voice.description, voice.name]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  const keywords = normalizedValues.join(' ').toLowerCase();

  if (keywords.includes('professional') || keywords.includes('formal') || keywords.includes('serious')) return 'Professional Coach';
  if (keywords.includes('warm') || keywords.includes('friendly') || keywords.includes('gentle')) return 'Warm Mentor';
  if (keywords.includes('energetic') || keywords.includes('youth') || keywords.includes('excited')) return 'Energetic Host';
  if (keywords.includes('calm') || keywords.includes('soft') || keywords.includes('soothing')) return 'Calm Guide';
  if (keywords.includes('clarity') || keywords.includes('clear') || keywords.includes('news')) return 'Clear Presenter';

  return 'ElevenLabs Theme';
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<PersonaItem[]>([]);
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [error, setError] = useState('');
  const [homeHref, setHomeHref] = useState('/admin');
  const [form, setForm] = useState({ name: '', learningStyle: 'visual' as LearningStyle, voiceId: '', level: 'pemula' as PersonaItem['level'], tone: 'ramah' as PersonaItem['tone'], notes: '' });

  useEffect(() => {
    setHomeHref(getRoleHomeRoute());
  }, []);

  useEffect(() => {
    const loadPersonas = async () => {
      const storedPersonas = await getStoredPersonas();
      setPersonas(storedPersonas);
    };

    const loadAssets = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/ai/elevenlabs-assets`);
        const json = await response.json() as ElevenLabsAssetsResponse;
        if (!json.success) throw new Error();

        const availableVoices = json.raw_voices?.voices || [];
        const prioritizedVoices = availableVoices.filter((voice) => voice.language === 'Indonesian' || voice.language === 'id-ID');
        const nextVoices = prioritizedVoices.length ? prioritizedVoices : availableVoices;
        setVoices(nextVoices);

        if (nextVoices.length && !form.voiceId) {
          setForm((previous) => ({ ...previous, voiceId: nextVoices[0].voice_id }));
        }
      } catch {
        setError('Daftar suara ElevenLabs belum dapat dimuat. Pastikan server backend sedang berjalan.');
      } finally {
        setLoadingAssets(false);
      }
    };

    loadPersonas();
    loadAssets();
  }, []);

  const update = (field: string, value: string) => setForm((previous) => ({ ...previous, [field]: value }));

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const voice = voices.find((item) => item.voice_id === form.voiceId);
    if (!form.name.trim() || !voice) {
      setError('Lengkapi nama dan pilih suara ElevenLabs untuk menyimpan persona.');
      return;
    }

    const themeLabel = getElevenLabsThemeLabel(voice);
    const persona: Omit<PersonaItem, 'id' | 'createdAt'> & { id?: string } = {
      name: form.name.trim(),
      learningStyle: form.learningStyle,
      avatarId: `elevenlabs-${voice.voice_id}`,
      avatarName: `Tema ${themeLabel}`,
      voiceId: voice.voice_id,
      voiceName: voice.name || 'Suara ElevenLabs',
      level: form.level,
      tone: form.tone,
      notes: form.notes.trim(),
    };

    const nextPersonas = await savePersona(persona);
    setPersonas(nextPersonas);
    setForm({ name: '', learningStyle: 'visual', voiceId: voices[0]?.voice_id || '', level: 'pemula', tone: 'ramah', notes: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-600">Persona pembelajaran</p><h1 className="text-3xl font-bold">Buat profil untuk video Anda</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Persona menentukan siapa pembelajar, cara penyampaian, avatar, dan suara video.</p></div>
          <Link href={homeHref}><Button variant="outline">Kembali ke dashboard</Button></Link>
        </div>
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
        <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <Card className="shadow-lg"><CardHeader><CardTitle>Persona baru</CardTitle></CardHeader><CardContent>
            <form onSubmit={handleSave} className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="persona-name">Nama persona</Label><Input id="persona-name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Contoh: Aisyah, pelajar SMA" required /></div>
              <div className="space-y-2"><Label>Gaya belajar</Label><Select value={form.learningStyle} onValueChange={(value) => update('learningStyle', value ?? 'visual')}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{learningStyles.map((style) => <SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Tingkat pemahaman</Label><Select value={form.level} onValueChange={(value) => update('level', value ?? 'pemula')}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pemula">Pemula</SelectItem><SelectItem value="menengah">Menengah</SelectItem><SelectItem value="lanjutan">Lanjutan</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Nada penyampaian</Label><Select value={form.tone} onValueChange={(value) => update('tone', value ?? 'ramah')}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ramah">Ramah dan suportif</SelectItem><SelectItem value="formal">Formal dan terstruktur</SelectItem><SelectItem value="energik">Energik dan interaktif</SelectItem></SelectContent></Select></div>
              <div className="space-y-2 sm:col-span-2"><Label>Suara ElevenLabs</Label><Select disabled={loadingAssets || voices.length === 0} value={form.voiceId} onValueChange={(value) => update('voiceId', value ?? '')}><SelectTrigger className="w-full"><SelectValue placeholder={loadingAssets ? 'Memuat suara...' : voices.length === 0 ? 'Suara tidak tersedia' : 'Pilih suara'} /></SelectTrigger><SelectContent>{voices.map((voice) => <SelectItem key={voice.voice_id} value={voice.voice_id}>{voice.name || 'Suara ElevenLabs'} {voice.category ? `· ${voice.category}` : ''}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="notes">Kebutuhan khusus (opsional)</Label><Input id="notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Contoh: gunakan contoh sehari-hari dan bahasa sederhana" /></div>
              <div className="sm:col-span-2"><p className="rounded-lg bg-violet-50 p-3 text-sm text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">{learningStyles.find((style) => style.value === form.learningStyle)?.description}</p><p className="mt-3 text-xs text-slate-600 dark:text-slate-300">Avatar akan dibuat otomatis dari tema suara ElevenLabs yang dipilih, agar tetap konsisten dengan gaya presentasi yang tersedia.</p><Button type="submit" disabled={loadingAssets || voices.length === 0} className="mt-4 w-full bg-violet-600 hover:bg-violet-700">Simpan persona</Button></div>
            </form>
          </CardContent></Card>
          <div className="space-y-4"><div><h2 className="text-lg font-semibold">Persona tersimpan ({personas.length})</h2><p className="text-sm text-slate-600 dark:text-slate-300">Pilih salah satunya saat membuat video.</p></div>
            {personas.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-slate-600 dark:text-slate-300">Belum ada persona. Buat persona pertama Anda dari formulir ini.</CardContent></Card> : personas.map((persona) => <Card key={persona.id} className="shadow-sm"><CardContent className="space-y-3 pt-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{persona.name}</h3><p className="text-sm text-slate-500">{persona.avatarName} · {persona.voiceName}</p></div><Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={async () => setPersonas(await deletePersona(persona.id))}>Hapus</Button></div><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">{learningStyles.find((style) => style.value === persona.learningStyle)?.label}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{persona.level}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{persona.tone}</span></div>{persona.notes && <p className="text-sm text-slate-600 dark:text-slate-300">{persona.notes}</p>}</CardContent></Card>)}</div>
        </div>
      </div>
    </div>
  );
}
  