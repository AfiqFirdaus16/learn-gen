'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStoredPersonas, type PersonaItem } from '@/lib/persona-storage';
import { estimateTokens, getTokenUsage, MONTHLY_TOKEN_LIMIT, recordTokenUsage } from '@/lib/token-usage';
import { saveVideo, type VideoItem } from '@/lib/video-storage';

const styleLabels: Record<PersonaItem['learningStyle'], string> = { visual: 'Visual', auditory: 'Auditori', kinesthetic: 'Kinestetik', reading: 'Membaca & menulis' };

export default function CreateVideoPage() {
  const router = useRouter();
  const [personas, setPersonas] = useState<PersonaItem[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('3');
  const [usedTokens, setUsedTokens] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPersonas(getStoredPersonas());
      setUsedTokens(getTokenUsage());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const persona = personas.find((item) => item.id === selectedPersonaId);
  const prompt = useMemo(() => {
    if (!persona) return 'Pilih persona terlebih dahulu untuk melihat instruksi video.';
    const notes = persona.notes ? ` Perhatian khusus: ${persona.notes}.` : '';
    return `Buat naskah video pembelajaran tentang ${topic || 'topik yang dipilih'} berdurasi ${Number(duration) || 3} menit untuk ${persona.name}, tingkat ${persona.level}, dengan gaya belajar ${styleLabels[persona.learningStyle]}. Gunakan nada ${persona.tone}, avatar ${persona.avatarName}, dan suara ${persona.voiceName}.${notes}`;
  }, [duration, persona, topic]);
  const estimatedTokens = persona ? estimateTokens(prompt) + 100 : 0;
  const remainingTokens = Math.max(0, MONTHLY_TOKEN_LIMIT - usedTokens);
  const usagePercent = Math.min(100, usedTokens / MONTHLY_TOKEN_LIMIT * 100);
  const isOverLimit = Boolean(persona && estimatedTokens > remainingTokens);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMsg('');
    if (!persona) return setErrorMsg('Pilih persona terlebih dahulu.');
    if (isOverLimit) return setErrorMsg(`Token tidak mencukupi. Estimasi kebutuhan ${estimatedTokens.toLocaleString('id-ID')} token; sisa kuota ${remainingTokens.toLocaleString('id-ID')} token.`);
    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:5000/api/ai/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topik: prompt, avatar_id: persona.avatarId, voice_id: persona.voiceId }) });
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Gagal membuat video di sisi server.');
      setUsedTokens(recordTokenUsage(Number(json.data?.usage?.total_tokens) || estimatedTokens));
      const video: VideoItem & { heygenVideoId?: string } = { id: `video-${Date.now()}`, learnerName: persona.name, topic: topic || 'Topik belum ditentukan', learningStyle: persona.learningStyle, persona: persona.name, duration: Number(duration) || 3, accentType: persona.voiceId, generatedPrompt: prompt, status: 'Processing', heygenVideoId: json.data.heygen_video_id, createdAt: new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) };
      saveVideo(video);
      router.push('/dashboard/my-videos');
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Terjadi kesalahan saat menghubungi server.');
    } finally { setIsSubmitting(false); }
  }

  return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:from-slate-950 dark:to-slate-900"><div className="mx-auto max-w-5xl space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Buat video baru</p><h1 className="text-3xl font-bold">Form pembuat video AI</h1></div><Link href="/dashboard"><Button variant="outline">Kembali ke dashboard</Button></Link></div>
    {errorMsg && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-600">{errorMsg}</div>}
    <Card><CardContent className="pt-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Kuota token bulan ini</p><p className="text-sm text-slate-600">Terpakai {usedTokens.toLocaleString('id-ID')} dari {MONTHLY_TOKEN_LIMIT.toLocaleString('id-ID')} token</p></div><span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${remainingTokens <= 1000 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>Sisa {remainingTokens.toLocaleString('id-ID')} token</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className={`h-full ${usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${usagePercent}%` }} /></div>{persona && <p className={`mt-3 text-sm ${isOverLimit ? 'text-red-600' : 'text-slate-600'}`}>Estimasi video ini: {estimatedTokens.toLocaleString('id-ID')} token. {isOverLimit ? 'Kuota tidak mencukupi.' : 'Penggunaan aktual dicatat setelah video berhasil dibuat.'}</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>1. Pilih persona</CardTitle></CardHeader><CardContent>{personas.length === 0 ? <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50 p-5"><p className="font-semibold">Belum ada persona yang tersedia</p><p className="mt-1 text-sm text-slate-600">Buat persona berisi gaya belajar, avatar, dan suara sebelum membuat video.</p><Link href="/dashboard/personas"><Button className="mt-4 bg-violet-600 hover:bg-violet-700">Buat persona</Button></Link></div> : <div className="space-y-3"><Label>Persona untuk video ini</Label><Select value={selectedPersonaId} onValueChange={(value) => setSelectedPersonaId(value ?? '')}><SelectTrigger className="w-full"><SelectValue placeholder="Pilih persona yang akan digunakan" /></SelectTrigger><SelectContent>{personas.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {styleLabels[item.learningStyle]}</SelectItem>)}</SelectContent></Select>{persona && <div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm sm:grid-cols-3"><div><b>{persona.name}</b><p>{persona.level} · {persona.tone}</p></div><div><p className="text-xs font-semibold uppercase text-blue-600">Cara belajar</p><p>{styleLabels[persona.learningStyle]}</p></div><div><p className="text-xs font-semibold uppercase text-blue-600">Presenter</p><p>{persona.avatarName} · {persona.voiceName}</p></div></div>}</div>}</CardContent></Card>
    <Card><CardHeader><CardTitle>2. Detail video</CardTitle></CardHeader><CardContent><form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="topic">Topik</Label><Input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Contoh: Algoritma Sorting" required /></div><div className="space-y-2"><Label htmlFor="duration">Durasi video (menit)</Label><Input id="duration" type="number" min="1" max="10" value={duration} onChange={(event) => setDuration(event.target.value)} required /></div><div className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 md:col-span-2"><Label>Instruksi yang akan dikirim ke AI</Label><p className="mt-2 text-sm text-slate-600">{prompt}</p></div><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end md:col-span-2"><Link href="/dashboard/personas"><Button type="button" variant="outline">Kelola persona</Button></Link><Button type="submit" disabled={isSubmitting || !persona || isOverLimit} className="min-w-44 bg-blue-600 hover:bg-blue-700">{isSubmitting ? 'Memproses AI...' : isOverLimit ? 'Kuota token tidak cukup' : 'Buat video AI'}</Button></div></form></CardContent></Card>
  </div></div>;
}
