'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStoredPersonas, type PersonaItem } from '@/lib/persona-storage';
import { saveVideo, type VideoItem } from '@/lib/video-storage';
import { API_BASE_URL } from '@/lib/api-config';

const styleLabels: Record<PersonaItem['learningStyle'], string> = { visual: 'Visual', auditory: 'Auditori', kinesthetic: 'Kinestetik', reading: 'Membaca & menulis' };

function buildPrompt(persona: PersonaItem, topic: string, duration: number, script: string) {
  return [`Topic: ${topic}`, `Audience profile: ${persona.name}`, `Student level: ${persona.level}`, `Learning style: ${styleLabels[persona.learningStyle]}`, `Narration tone: ${persona.tone}`, 'Narration language: English', `Preferred English accent: ${persona.accent}`, `Target duration: ${duration} minute(s)`, 'Voice direction: clear, natural, and engaging educational narration.', persona.notes ? `Additional notes: ${persona.notes}` : '', '', 'Final narration script:', script.trim()].filter(Boolean).join('\n');
}

function buildFallbackScript(topic: string, tone: PersonaItem['tone']) {
  const delivery = tone === 'formal' ? 'structured' : tone === 'energik' ? 'enthusiastic' : 'friendly';
  return `This lesson introduces ${topic}. Understanding ${topic} gives students a useful foundation for communicating clearly in English. We will explore the main idea step by step, using simple explanations and practical examples. As you listen, focus on the key terms and how they are used in context. Try repeating the examples aloud, then create one example of your own. By the end of this lesson, you should be able to recognise the essential points about ${topic} and use them with more confidence. Keep practising in a ${delivery} and consistent way.`;
}

export default function CreateVideoPage() {
  const router = useRouter();
  const [personas, setPersonas] = useState<PersonaItem[]>([]);
  const [personaId, setPersonaId] = useState('');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('3');
  const [script, setScript] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { const frame = requestAnimationFrame(() => setPersonas(getStoredPersonas())); return () => cancelAnimationFrame(frame); }, []);
  const persona = personas.find((item) => item.id === personaId);
  const minutes = Math.min(10, Math.max(1, Number(duration) || 3));
  const targetWords = minutes * 110;
  const resetScript = () => { setScript(''); setConfirmed(false); };

  async function generateScript() {
    setError(''); setNotice('');
    if (!persona) return setError('Pilih profil pembelajaran terlebih dahulu.');
    if (!topic.trim()) return setError('Isi topik sebelum membuat naskah.');
    setCreating(true);
    try {
      const body = JSON.stringify({ videoConfig: { topic, persona: persona.name, level: persona.level, learningStyle: styleLabels[persona.learningStyle], tone: persona.tone, accent: persona.accent, duration: minutes, targetWordCount: targetWords, notes: persona.notes } });
      let response = await fetch(`${API_BASE_URL}/api/ai/generate-video-prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      // Backend lama memakai nama endpoint sebelumnya. Fallback ini menjaga tombol
      // tetap berfungsi sampai server yang berjalan sempat di-restart/deploy ulang.
      if (response.status === 404) response = await fetch(`${API_BASE_URL}/api/ai/generate-heygen-prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || `Gagal membuat naskah (HTTP ${response.status}).`);
      const generatedScript = String(data.data.script || '').trim() || buildFallbackScript(topic, persona.tone);
      setScript(generatedScript);
      setConfirmed(false);
      if (data.data.fallback) {
        const failureReason = data.notice || 'Groq sedang tidak tersedia; sistem menggunakan draf naskah cadangan.';
        saveVideo({
          id: `video-${Date.now()}`,
          learnerName: 'Murid',
          topic,
          learningStyle: persona.learningStyle,
          persona: persona.name,
          personaId: persona.id,
          duration: minutes,
          accentType: persona.accent,
          script: generatedScript,
          generatedPrompt: buildPrompt(persona, topic, minutes, generatedScript),
          status: 'Failed',
          createdAt: new Date().toLocaleString('id-ID'),
          failureReason,
        });
        setNotice(`Pembuatan naskah gagal dan prompt telah disimpan di riwayat gagal. Alasan: ${failureReason}`);
      }
    } catch (caughtError) {
      const fallbackScript = buildFallbackScript(topic, persona.tone);
      const failureReason = caughtError instanceof Error && caughtError.message
        ? caughtError.message
        : 'Layanan pembuatan naskah tidak dapat dihubungi.';

      // Simpan prompt yang sudah terbentuk agar dosen tetap dapat melihat dan
      // mencoba ulang percobaan yang gagal dari halaman riwayat.
      saveVideo({
        id: `video-${Date.now()}`,
        learnerName: 'Murid',
        topic,
        learningStyle: persona.learningStyle,
        persona: persona.name,
        personaId: persona.id,
        duration: minutes,
        accentType: persona.accent,
        script: fallbackScript,
        generatedPrompt: buildPrompt(persona, topic, minutes, fallbackScript),
        status: 'Failed',
        createdAt: new Date().toLocaleString('id-ID'),
        failureReason,
      });

      setScript(fallbackScript);
      setConfirmed(false);
      setNotice(`Pembuatan naskah gagal dan prompt telah disimpan di riwayat gagal. Alasan: ${failureReason}`);
    } finally { setCreating(false); }
  }

  function savePrompt(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (!persona || !script || !confirmed) return setError('Pilih profil, buat naskah, lalu konfirmasi naskah terlebih dahulu.');
    setSaving(true);
    const item: VideoItem = { id: `video-${Date.now()}`, learnerName: 'Murid', topic, learningStyle: persona.learningStyle, persona: persona.name, personaId: persona.id, duration: minutes, accentType: persona.accent, script, generatedPrompt: buildPrompt(persona, topic, minutes, script), status: 'PromptReady', createdAt: new Date().toLocaleString('id-ID') };
    saveVideo(item);
    setSaving(false);
    router.push('/dosen/riwayat-materi');
  }

  return <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 lg:p-8"><div className="w-full space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Buat video baru</p><h1 className="text-3xl font-bold">Video Generator</h1></div>
    {error && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>}
    {notice && <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800">{notice}</div>}
    <Card><CardHeader><CardTitle>1. Pilih profil pembelajaran</CardTitle></CardHeader><CardContent>{personas.length === 0 ? <div className="rounded-lg border border-dashed border-violet-300 bg-violet-50 p-5"><p className="font-semibold">Belum ada profil tersedia</p><Link href="/dosen/profil"><Button className="mt-4">Buat profil</Button></Link></div> : <div className="space-y-3"><Label>Profil untuk prompt ini</Label><Select value={personaId} onValueChange={(value) => { setPersonaId(value ?? ''); resetScript(); }}><SelectTrigger className="w-full"><SelectValue placeholder="Pilih profil" /></SelectTrigger><SelectContent>{personas.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.accent} English</SelectItem>)}</SelectContent></Select>{persona && <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-950">Audiens {persona.level} · gaya {styleLabels[persona.learningStyle]} · nada {persona.tone} · aksen {persona.accent} English</div>}</div>}</CardContent></Card>
    <Card><CardHeader><CardTitle>2. Detail dan naskah</CardTitle></CardHeader><CardContent><form onSubmit={savePrompt} className="grid gap-5 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="topic">Topik</Label><Input id="topic" value={topic} onChange={(event) => { setTopic(event.target.value); resetScript(); }} placeholder="Contoh: Algoritma Sorting" required /></div><div className="space-y-2"><Label htmlFor="duration">Durasi video (menit)</Label><Input id="duration" type="number" min="1" max="10" value={duration} onChange={(event) => { setDuration(event.target.value); resetScript(); }} required /></div><div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 md:col-span-2"><Label>Naskah bahasa Inggris</Label><p className="mt-2 text-sm text-slate-600">Groq AI membuat naskah sesuai profil, gaya belajar, dan aksen yang dipilih.</p><Button type="button" onClick={generateScript} disabled={creating || !persona} className="mt-4 bg-violet-600 hover:bg-violet-700">{creating ? 'Membuat naskah...' : 'Buat preview naskah dengan Groq AI'}</Button></div>{script && <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4 md:col-span-2"><p className="font-semibold">3. Preview naskah</p><textarea value={script} onChange={(event) => { setScript(event.target.value); setConfirmed(false); }} className="min-h-40 w-full rounded-md border border-violet-200 bg-white p-3 text-sm" /><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> Saya telah meninjau dan menyetujui naskah ini.</label></div>}<div className="flex justify-end gap-3 md:col-span-2"><Link href="/dosen/profil"><Button type="button" variant="outline">Kelola profil</Button></Link><Button type="submit" disabled={saving || !persona || !script || !confirmed}>{saving ? 'Menyimpan...' : 'Simpan prompt siap generate'}</Button></div></form></CardContent></Card>
  </div></main>;
}
