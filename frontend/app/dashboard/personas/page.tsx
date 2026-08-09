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

const learningStyles: { value: LearningStyle; label: string; description: string }[] = [
  { value: 'visual', label: 'Visual', description: 'Mengutamakan diagram, warna, dan contoh visual.' },
  { value: 'auditory', label: 'Auditori', description: 'Mengutamakan penjelasan lisan yang runtut.' },
  { value: 'kinesthetic', label: 'Kinestetik', description: 'Mengutamakan latihan dan langkah praktik.' },
  { value: 'reading', label: 'Membaca & menulis', description: 'Mengutamakan poin penting dan rangkuman teks.' },
];

interface HeygenAvatar { avatar_id: string; avatar_name?: string; gender?: string }
interface HeygenVoice { voice_id: string; name?: string; gender?: string; language?: string }
interface HeygenAssetsResponse {
  success: boolean;
  raw_avatars?: { data?: { avatars?: HeygenAvatar[] } };
  raw_voices?: { data?: { voices?: HeygenVoice[] } };
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<PersonaItem[]>([]);
  const [avatars, setAvatars] = useState<HeygenAvatar[]>([]);
  const [voices, setVoices] = useState<HeygenVoice[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', learningStyle: 'visual' as LearningStyle, avatarId: '', voiceId: '', level: 'pemula' as PersonaItem['level'], tone: 'ramah' as PersonaItem['tone'], notes: '' });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPersonas(getStoredPersonas()));
    const loadAssets = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/ai/heygen-assets`);
        const json = await response.json() as HeygenAssetsResponse;
        if (!json.success) throw new Error();
        const availableVoices = json.raw_voices?.data?.voices || [];
        const indonesianVoices = availableVoices.filter((voice) => voice.language === 'Indonesian' || voice.language === 'id-ID');
        setAvatars(json.raw_avatars?.data?.avatars || []);
        setVoices(indonesianVoices.length ? indonesianVoices : availableVoices);
      } catch {
        setError('Aset avatar dan suara belum dapat dimuat. Pastikan server backend sedang berjalan.');
      } finally {
        setLoadingAssets(false);
      }
    };
    loadAssets();
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const update = (field: string, value: string) => setForm((previous) => ({ ...previous, [field]: value }));

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const avatar = avatars.find((item) => item.avatar_id === form.avatarId);
    const voice = voices.find((item) => item.voice_id === form.voiceId);
    if (!form.name.trim() || !avatar || !voice) {
      setError('Lengkapi nama, avatar, dan suara untuk menyimpan persona.');
      return;
    }
    const persona: PersonaItem = {
      id: `persona-${Date.now()}`,
      name: form.name.trim(), learningStyle: form.learningStyle, avatarId: avatar.avatar_id,
      avatarName: avatar.avatar_name || 'Avatar pilihan', voiceId: voice.voice_id,
      voiceName: voice.name || 'Suara pilihan', level: form.level, tone: form.tone,
      notes: form.notes.trim(), createdAt: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    setPersonas(savePersona(persona));
    setForm({ name: '', learningStyle: 'visual', avatarId: '', voiceId: '', level: 'pemula', tone: 'ramah', notes: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-600">Persona pembelajaran</p><h1 className="text-3xl font-bold">Buat profil untuk video Anda</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Persona menentukan siapa pembelajar, cara penyampaian, avatar, dan suara video.</p></div>
          <Link href="/dashboard"><Button variant="outline">Kembali ke dashboard</Button></Link>
        </div>
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
        <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <Card className="shadow-lg"><CardHeader><CardTitle>Persona baru</CardTitle></CardHeader><CardContent>
            <form onSubmit={handleSave} className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="persona-name">Nama persona</Label><Input id="persona-name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Contoh: Aisyah, pelajar SMA" required /></div>
              <div className="space-y-2"><Label>Gaya belajar</Label><Select value={form.learningStyle} onValueChange={(value) => update('learningStyle', value ?? 'visual')}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{learningStyles.map((style) => <SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Tingkat pemahaman</Label><Select value={form.level} onValueChange={(value) => update('level', value ?? 'pemula')}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pemula">Pemula</SelectItem><SelectItem value="menengah">Menengah</SelectItem><SelectItem value="lanjutan">Lanjutan</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Nada penyampaian</Label><Select value={form.tone} onValueChange={(value) => update('tone', value ?? 'ramah')}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ramah">Ramah dan suportif</SelectItem><SelectItem value="formal">Formal dan terstruktur</SelectItem><SelectItem value="energik">Energik dan interaktif</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Avatar</Label><Select disabled={loadingAssets} value={form.avatarId} onValueChange={(value) => update('avatarId', value ?? '')}><SelectTrigger className="w-full"><SelectValue placeholder={loadingAssets ? 'Memuat avatar...' : 'Pilih avatar'} /></SelectTrigger><SelectContent>{avatars.map((avatar) => <SelectItem key={avatar.avatar_id} value={avatar.avatar_id}>{avatar.avatar_name} {avatar.gender ? `(${avatar.gender})` : ''}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Suara</Label><Select disabled={loadingAssets} value={form.voiceId} onValueChange={(value) => update('voiceId', value ?? '')}><SelectTrigger className="w-full"><SelectValue placeholder={loadingAssets ? 'Memuat suara...' : 'Pilih suara'} /></SelectTrigger><SelectContent>{voices.map((voice) => <SelectItem key={voice.voice_id} value={voice.voice_id}>{voice.name} {voice.gender ? `(${voice.gender})` : ''}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="notes">Kebutuhan khusus (opsional)</Label><Input id="notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Contoh: gunakan contoh sehari-hari dan bahasa sederhana" /></div>
              <div className="sm:col-span-2"><p className="rounded-lg bg-violet-50 p-3 text-sm text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">{learningStyles.find((style) => style.value === form.learningStyle)?.description}</p><Button type="submit" disabled={loadingAssets} className="mt-4 w-full bg-violet-600 hover:bg-violet-700">Simpan persona</Button></div>
            </form>
          </CardContent></Card>
          <div className="space-y-4"><div><h2 className="text-lg font-semibold">Persona tersimpan ({personas.length})</h2><p className="text-sm text-slate-600 dark:text-slate-300">Pilih salah satunya saat membuat video.</p></div>
            {personas.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-slate-600 dark:text-slate-300">Belum ada persona. Buat persona pertama Anda dari formulir ini.</CardContent></Card> : personas.map((persona) => <Card key={persona.id} className="shadow-sm"><CardContent className="space-y-3 pt-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{persona.name}</h3><p className="text-sm text-slate-500">{persona.avatarName} · {persona.voiceName}</p></div><Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setPersonas(deletePersona(persona.id))}>Hapus</Button></div><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">{learningStyles.find((style) => style.value === persona.learningStyle)?.label}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{persona.level}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{persona.tone}</span></div>{persona.notes && <p className="text-sm text-slate-600 dark:text-slate-300">{persona.notes}</p>}</CardContent></Card>)}</div>
        </div>
      </div>
    </div>
  );
}
