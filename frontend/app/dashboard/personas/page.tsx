'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { deletePersona, getStoredPersonas, savePersona, type EnglishAccent, type LearningStyle, type PersonaItem } from '@/lib/persona-storage';

const learningStyles: { value: LearningStyle; label: string; description: string }[] = [
  { value: 'visual', label: 'Visual', description: 'Mengutamakan diagram, warna, dan contoh visual.' },
  { value: 'auditory', label: 'Auditori', description: 'Mengutamakan penjelasan lisan yang runtut.' },
  { value: 'kinesthetic', label: 'Kinestetik', description: 'Mengutamakan latihan dan langkah praktik.' },
  { value: 'reading', label: 'Membaca & menulis', description: 'Mengutamakan poin penting dan rangkuman teks.' },
];
const accents: { value: EnglishAccent; label: string }[] = [
  { value: 'American', label: 'American English' }, { value: 'British', label: 'British English' }, { value: 'Australian', label: 'Australian English' }, { value: 'Canadian', label: 'Canadian English' }, { value: 'Irish', label: 'Irish English' }, { value: 'Indian', label: 'Indian English' }, { value: 'South African', label: 'South African English' },
];

export default function PersonasPage() {
  const [personas, setPersonas] = useState<PersonaItem[]>([]);
  const [form, setForm] = useState({ name: '', learningStyle: 'visual' as LearningStyle, level: 'pemula' as PersonaItem['level'], tone: 'ramah' as PersonaItem['tone'], accent: 'American' as EnglishAccent, notes: '' });
  useEffect(() => { const frame = window.requestAnimationFrame(() => setPersonas(getStoredPersonas())); return () => window.cancelAnimationFrame(frame); }, []);
  const update = (field: string, value: string) => setForm((previous) => ({ ...previous, [field]: value }));
  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setPersonas(savePersona({ id: `persona-${Date.now()}`, name: form.name.trim(), learningStyle: form.learningStyle, level: form.level, tone: form.tone, accent: form.accent, notes: form.notes.trim(), createdAt: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }));
    setForm({ name: '', learningStyle: 'visual', level: 'pemula', tone: 'ramah', accent: 'American', notes: '' });
  };
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:from-slate-950 dark:to-slate-900"><div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-600">Profil pembelajaran</p><h1 className="text-3xl font-bold">Buat profil untuk prompt video</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Profil menentukan audiens, gaya narasi, dan arahan suara yang bisa digunakan oleh provider mana pun.</p></div><Link href="/dosen"><Button variant="outline">Kembali ke dashboard dosen</Button></Link></div>
    <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]"><Card className="shadow-lg"><CardHeader><CardTitle>Profil baru</CardTitle></CardHeader><CardContent><form onSubmit={handleSave} className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="persona-name">Nama profil</Label><Input id="persona-name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Contoh: Pelajar SMA pemula" required /></div>
      <div className="space-y-2"><Label>Gaya belajar</Label><Select value={form.learningStyle} onValueChange={(value) => update('learningStyle', value ?? 'visual')}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{learningStyles.map((style) => <SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Tingkat pemahaman</Label><Select value={form.level} onValueChange={(value) => update('level', value ?? 'pemula')}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pemula">Pemula</SelectItem><SelectItem value="menengah">Menengah</SelectItem><SelectItem value="lanjutan">Lanjutan</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label>Nada penyampaian</Label><Select value={form.tone} onValueChange={(value) => update('tone', value ?? 'ramah')}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ramah">Ramah dan suportif</SelectItem><SelectItem value="formal">Formal dan terstruktur</SelectItem><SelectItem value="energik">Energik dan interaktif</SelectItem></SelectContent></Select></div>
      <div className="space-y-2 sm:col-span-2"><Label>Aksen bahasa Inggris</Label><Select value={form.accent} onValueChange={(value) => update('accent', value ?? 'American')}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{accents.map((accent) => <SelectItem key={accent.value} value={accent.value}>{accent.label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-slate-500">Arahkan aksen ini saat memilih suara di ElevenLabs atau provider lain.</p></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="notes">Kebutuhan khusus (opsional)</Label><Input id="notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Contoh: gunakan contoh sehari-hari dan bahasa sederhana" /></div>
      <div className="sm:col-span-2"><p className="rounded-lg bg-violet-50 p-3 text-sm text-violet-800">{learningStyles.find((style) => style.value === form.learningStyle)?.description}</p><Button type="submit" className="mt-4 w-full bg-violet-600 hover:bg-violet-700">Simpan profil</Button></div>
    </form></CardContent></Card>
    <div className="space-y-4"><div><h2 className="text-lg font-semibold">Profil tersimpan ({personas.length})</h2><p className="text-sm text-slate-600">Pilih salah satunya saat membuat prompt video.</p></div>{personas.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-slate-600">Belum ada profil. Buat profil pertama Anda dari formulir ini.</CardContent></Card> : personas.map((persona) => <Card key={persona.id} className="shadow-sm"><CardContent className="space-y-3 pt-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{persona.name}</h3><p className="text-sm text-slate-500">{persona.tone} · {persona.accent} English</p></div><Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setPersonas(deletePersona(persona.id))}>Hapus</Button></div><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-700">{learningStyles.find((style) => style.value === persona.learningStyle)?.label}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{persona.level}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{persona.accent}</span></div>{persona.notes && <p className="text-sm text-slate-600">{persona.notes}</p>}</CardContent></Card>)}</div>
    </div></div></div>;
}
