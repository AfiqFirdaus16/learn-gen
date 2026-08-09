'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStoredPersonas, type PersonaItem } from '@/lib/persona-storage';
import { estimateTokens, getTokenUsage, MONTHLY_TOKEN_LIMIT, recordTokenUsage } from '@/lib/token-usage';
import { getStoredVideos, saveVideo, updateStoredVideo, type VideoItem } from '@/lib/video-storage';
import { saveConfirmedScript, updateConfirmedScriptStatus } from '@/lib/confirmed-script-storage';
import { API_BASE_URL } from '@/lib/api-config';

const styleLabels: Record<PersonaItem['learningStyle'], string> = { visual: 'Visual', auditory: 'Auditori', kinesthetic: 'Kinestetik', reading: 'Membaca & menulis' };
const cleanScript = (value: string) => value
  .replace(/^(?:(?:prompt|naskah)(?:\s+(?:untuk|heygen))?\s*:\s*)/i, '')
  .replace(/\([^)]*\)\s*/g, '')
  .replace(/\bselamat\s+datang[^.!?]*[.!?]\s*/i, '')
  .replace(/\bdi\s+heygen\b/gi, '')
  .replace(/[*•#_`]/g, '');

async function readApiJson(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Endpoint AI tidak tersedia (HTTP ${response.status}). Restart backend di port 5000 agar route terbaru dimuat.`);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Permintaan ke server gagal.');
  return data;
}

export default function CreateVideoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [personas, setPersonas] = useState<PersonaItem[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('3');
  const [usedTokens, setUsedTokens] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [heygenPrompt, setHeygenPrompt] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedPersonas = getStoredPersonas();
      setPersonas(storedPersonas);
      setUsedTokens(getTokenUsage());

      const retryId = searchParams.get('retry');
      const retryVideo = retryId ? getStoredVideos().find((video) => video.id === retryId && video.status === 'Failed') : undefined;
      if (retryVideo) {
        const matchingPersona = storedPersonas.find((item) => item.id === retryVideo.personaId || item.name === retryVideo.persona);
        setSelectedPersonaId(matchingPersona?.id || '');
        setTopic(retryVideo.topic);
        setDuration(String(retryVideo.duration));
        setHeygenPrompt(retryVideo.generatedPrompt);
        setIsConfirmed(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [searchParams]);

  const persona = personas.find((item) => item.id === selectedPersonaId);
  const durationMinutes = Math.min(10, Math.max(1, Number(duration) || 3));
  const targetWordCount = durationMinutes * 110;
  const prompt = useMemo(() => {
    if (!persona) return 'Pilih persona terlebih dahulu untuk melihat instruksi video.';
    const notes = persona.notes ? ` Perhatian khusus: ${persona.notes}.` : '';
    return `Create an English-learning video script about ${topic || 'the selected topic'} for ${persona.level}-level students. Use a ${styleLabels[persona.learningStyle].toLowerCase()} learning approach and a ${persona.tone} tone. Address students as a group, never one individual. The lesson lasts ${durationMinutes} minute${durationMinutes > 1 ? 's' : ''}; write approximately ${targetWordCount} words.${notes}`;
  }, [durationMinutes, persona, targetWordCount, topic]);
  const estimatedTokens = persona ? estimateTokens(prompt) + Math.ceil(targetWordCount * 1.3) : 0;
  const remainingTokens = Math.max(0, MONTHLY_TOKEN_LIMIT - usedTokens);
  const usagePercent = Math.min(100, usedTokens / MONTHLY_TOKEN_LIMIT * 100);
  const isOverLimit = Boolean(persona && estimatedTokens > remainingTokens);
  const scriptWordCount = heygenPrompt.trim() ? heygenPrompt.trim().split(/\s+/).length : 0;

  function clearDraft() {
    setHeygenPrompt('');
    setIsConfirmed(false);
  }

  function prepareHeygenPrompt() {
    setErrorMsg('');
    if (!persona) return setErrorMsg('Pilih persona terlebih dahulu.');
    if (!topic.trim()) return setErrorMsg('Isi topik sebelum menyiapkan prompt HeyGen.');
    if (isOverLimit) return setErrorMsg(`Token tidak mencukupi. Estimasi kebutuhan ${estimatedTokens.toLocaleString('id-ID')} token; sisa kuota ${remainingTokens.toLocaleString('id-ID')} token.`);
    setIsCreatingPrompt(true);
    fetch(`${API_BASE_URL}/api/ai/generate-heygen-prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      .then(readApiJson)
      .then((json) => {
        if (!json.success) throw new Error(json.error || 'Gagal membuat naskah HeyGen.');
        setHeygenPrompt(cleanScript(json.data.script));
        setIsConfirmed(false);
      })
      .catch((error: unknown) => setErrorMsg(error instanceof Error ? error.message : 'Terjadi kesalahan saat meminta Groq AI.'))
      .finally(() => setIsCreatingPrompt(false));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMsg('');
    if (!persona) return setErrorMsg('Pilih persona terlebih dahulu.');
    if (!heygenPrompt || !isConfirmed) return setErrorMsg('Tinjau dan konfirmasi naskah HeyGen sebelum membuat video.');
    const createdAt = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const createVideoAttempt = (status: VideoItem['status'], failureReason?: string, heygenVideoId?: string): VideoItem => ({
      id: `video-${Date.now()}`,
      learnerName: 'Murid',
      topic: topic || 'Topik belum ditentukan',
      learningStyle: persona.learningStyle,
      persona: persona.name,
      personaId: persona.id,
      duration: Number(duration) || 3,
      accentType: persona.voiceId,
      avatarId: persona.avatarId,
      generatedPrompt: heygenPrompt,
      status,
      failureReason,
      heygenVideoId,
      createdAt,
    });
    if (isOverLimit) {
      const reason = `Kuota token tidak mencukupi. Estimasi kebutuhan ${estimatedTokens.toLocaleString('id-ID')} token, sedangkan sisa kuota ${remainingTokens.toLocaleString('id-ID')} token.`;
      saveVideo(createVideoAttempt('Failed', reason));
      setErrorMsg(reason);
      return;
    }
    setIsSubmitting(true);
    const attempt = createVideoAttempt('Processing');
    saveVideo(attempt);
    const confirmedScriptId = `script-${Date.now()}`;
    saveConfirmedScript({
      id: confirmedScriptId,
      topic: topic || 'Topik belum ditentukan',
      content: heygenPrompt,
      personaName: persona.name,
      status: 'Confirmed',
      createdAt: new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    });
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ script: heygenPrompt, avatar_id: persona.avatarId, voice_id: persona.voiceId }) });
      const json = await readApiJson(response);
      if (!json.success) throw new Error(json.error || 'Gagal membuat video di sisi server.');
      updateConfirmedScriptStatus(confirmedScriptId, 'Submitted');
      setUsedTokens(recordTokenUsage(estimatedTokens));
      updateStoredVideo(attempt.id, { heygenVideoId: json.data.heygen_video_id });
      router.push('/dashboard/my-videos');
    } catch (error: unknown) {
      updateConfirmedScriptStatus(confirmedScriptId, 'Failed');
      const reason = error instanceof Error ? error.message : 'Terjadi kesalahan saat menghubungi server.';
      updateStoredVideo(attempt.id, { status: 'Failed', failureReason: reason });
      setErrorMsg(reason);
    } finally { setIsSubmitting(false); }
  }

  return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:from-slate-950 dark:to-slate-900"><div className="mx-auto max-w-5xl space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Buat video baru</p><h1 className="text-3xl font-bold">Form pembuat video AI</h1></div><Link href="/dashboard"><Button variant="outline">Kembali ke dashboard</Button></Link></div>
    {errorMsg && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-600">{errorMsg}</div>}
    <Card><CardContent className="pt-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Kuota token bulan ini</p><p className="text-sm text-slate-600">Terpakai {usedTokens.toLocaleString('id-ID')} dari {MONTHLY_TOKEN_LIMIT.toLocaleString('id-ID')} token</p></div><span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${remainingTokens <= 1000 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>Sisa {remainingTokens.toLocaleString('id-ID')} token</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className={`h-full ${usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${usagePercent}%` }} /></div>{persona && <p className={`mt-3 text-sm ${isOverLimit ? 'text-red-600' : 'text-slate-600'}`}>Estimasi video ini: {estimatedTokens.toLocaleString('id-ID')} token. {isOverLimit ? 'Kuota tidak mencukupi.' : 'Penggunaan aktual dicatat setelah video berhasil dibuat.'}</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>1. Pilih persona</CardTitle></CardHeader><CardContent>{personas.length === 0 ? <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50 p-5"><p className="font-semibold">Belum ada persona yang tersedia</p><p className="mt-1 text-sm text-slate-600">Buat persona berisi gaya belajar, avatar, dan suara sebelum membuat video.</p><Link href="/dashboard/personas"><Button className="mt-4 bg-violet-600 hover:bg-violet-700">Buat persona</Button></Link></div> : <div className="space-y-3"><Label>Persona untuk video ini</Label><Select value={selectedPersonaId} onValueChange={(value) => { setSelectedPersonaId(value ?? ''); clearDraft(); }}><SelectTrigger className="w-full"><SelectValue placeholder="Pilih persona yang akan digunakan" /></SelectTrigger><SelectContent>{personas.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {styleLabels[item.learningStyle]}</SelectItem>)}</SelectContent></Select>{persona && <div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm sm:grid-cols-3"><div><p className="text-xs font-semibold uppercase text-blue-600">Target audiens</p><p className="font-semibold">Murid {persona.level}</p><p>{persona.tone}</p></div><div><p className="text-xs font-semibold uppercase text-blue-600">Cara belajar</p><p>{styleLabels[persona.learningStyle]}</p></div><div><p className="text-xs font-semibold uppercase text-blue-600">Presenter</p><p>{persona.avatarName} · {persona.voiceName}</p></div></div>}</div>}</CardContent></Card>
    <Card><CardHeader><CardTitle>2. Detail video</CardTitle></CardHeader><CardContent><form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="topic">Topik</Label><Input id="topic" value={topic} onChange={(event) => { setTopic(event.target.value); clearDraft(); }} placeholder="Contoh: Algoritma Sorting" required /></div><div className="space-y-2"><Label htmlFor="duration">Durasi video (menit)</Label><Input id="duration" type="number" min="1" max="10" value={duration} onChange={(event) => { setDuration(event.target.value); clearDraft(); }} required /></div><div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 md:col-span-2"><Label>Naskah Video</Label><p className="mt-2 text-sm text-slate-600">Groq AI membuat naskah narasi sesuai durasi yang dipilih, dalam teks polos tanpa karakter dekoratif.</p><Button type="button" onClick={prepareHeygenPrompt} disabled={isCreatingPrompt || !persona || isOverLimit} className="mt-4 bg-violet-600 hover:bg-violet-700">{isCreatingPrompt ? 'Membuat naskah...' : 'Buat preview naskah dengan Groq AI'}</Button></div>{heygenPrompt && <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4 md:col-span-2"><div><p className="font-semibold text-violet-950">3. Preview naskah</p><p className="text-sm text-violet-800">Target sekitar {targetWordCount} kata untuk durasi {durationMinutes} menit. Saat ini {scriptWordCount} kata. Edit naskah bila perlu, kemudian konfirmasi untuk mengaktifkan pembuatan video.</p></div><textarea value={heygenPrompt} onChange={(event) => { setHeygenPrompt(event.target.value); setIsConfirmed(false); }} className="min-h-32 w-full rounded-md border border-violet-200 bg-white p-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-400" /><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={isConfirmed} onChange={(event) => setIsConfirmed(event.target.checked)} /> Saya telah meninjau dan menyetujui naskah ini.</label></div>}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end md:col-span-2"><Link href="/dashboard/personas"><Button type="button" variant="outline">Kelola persona</Button></Link><Button type="submit" disabled={isSubmitting || !persona || !heygenPrompt || !isConfirmed} className="min-w-44 bg-blue-600 hover:bg-blue-700">{isSubmitting ? 'Memproses video...' : 'Konfirmasi & buat video'}</Button></div></form></CardContent></Card>
  </div></div>;
}
