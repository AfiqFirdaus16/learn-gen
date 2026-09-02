'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_BASE_URL } from '@/lib/api-config';
import { authenticatedFetch, getRoleHomeRoute } from '@/lib/auth';
import { getStoredVideos, saveVideo, updateStoredVideo, type VideoItem } from '@/lib/video-storage';
import { saveConfirmedScript, updateConfirmedScriptStatus } from '@/lib/confirmed-script-storage';

function cleanScript(value: string) {
  return value
    .replace(/```(?:text)?/gi, '')
    .replace(/^\s*(?:naskah|script|transcript)\s*[:\-]?\s*/i, '')
    .replace(/\[[^\]]*\]|\([^)]*\)/g, '')
    .replace(/[*•#_`]/g, '')
    .trim();
}

async function readApiJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Permintaan gagal (HTTP ${response.status}).`);
  return data;
}

export default function CreateVideoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [personaNotes, setPersonaNotes] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [voiceName, setVoiceName] = useState('');
  const [topic, setTopic] = useState('');
  const [scriptDescription, setScriptDescription] = useState('');
  const [duration, setDuration] = useState('3');
  const [script, setScript] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isCreatingScript, setIsCreatingScript] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [homeHref, setHomeHref] = useState('/dashboard');
  const [quota, setQuota] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [isLoadingQuota, setIsLoadingQuota] = useState(true);

  const durationMinutes = Math.min(10, Math.max(1, Number(duration) || 3));
  const estimatedCharacters = script.trim().length || Math.ceil(durationMinutes * 110 * 5.5);
  const quotaExceeded = Boolean(quota && script.trim() && estimatedCharacters > quota.remaining);
  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0;

  async function refreshQuota() {
    const response = await fetch(`${API_BASE_URL}/api/ai/elevenlabs-quota`);
    const data = await readApiJson(response);
    setQuota({ used: Number(data.karakter_terpakai || 0), limit: Number(data.total_karakter || 0), remaining: Number(data.sisa_karakter || 0) });
  }

  useEffect(() => {
    setHomeHref(getRoleHomeRoute());
    const retryId = searchParams.get('retry');
    const retryVideo = retryId ? getStoredVideos().find((video) => video.id === retryId && video.status === 'Failed') : undefined;
    if (retryVideo) {
      setPersonaNotes(retryVideo.persona);
      setTopic(retryVideo.topic);
      setScriptDescription('');
      setDuration(String(retryVideo.duration));
      setScript(cleanScript(retryVideo.script || retryVideo.generatedPrompt));
      setIsConfirmed(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      try {
        const voiceResponse = await fetch(`${API_BASE_URL}/api/ai/elevenlabs-assets`);
        const voiceData = await readApiJson(voiceResponse);
        const voice = voiceData.raw_voices?.voices?.[0];
        if (voice) {
          setVoiceId(voice.voice_id);
          setVoiceName(voice.name || 'Suara ElevenLabs');
        }
        await refreshQuota();
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'Gagal memuat konfigurasi ElevenLabs.');
      } finally {
        setIsLoadingQuota(false);
      }
    };
    void load();
  }, []);

  function clearScript() {
    setScript('');
    setIsConfirmed(false);
  }

  async function generateScript() {
    setErrorMsg('');
    if (!personaNotes.trim()) return setErrorMsg('Tulis catatan persona terlebih dahulu.');
    if (!topic.trim()) return setErrorMsg('Isi topik terlebih dahulu.');
    if (!scriptDescription.trim()) return setErrorMsg('Tulis deskripsi naskah terlebih dahulu.');
    setIsCreatingScript(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/generate-elevenlabs-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoConfig: { topic, persona: personaNotes.trim(), scriptDescription: scriptDescription.trim(), duration: durationMinutes, targetWordCount: durationMinutes * 110, notes: personaNotes.trim() } }),
      });
      const data = await readApiJson(response);
      setScript(cleanScript(data.data.script));
      setIsConfirmed(false);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Gagal membuat naskah dengan Gemini.');
    } finally {
      setIsCreatingScript(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMsg('');
    if (!personaNotes.trim()) return setErrorMsg('Tulis catatan persona terlebih dahulu.');
    if (!voiceId) return setErrorMsg('Suara ElevenLabs belum tersedia.');
    if (!script.trim() || !isConfirmed) return setErrorMsg('Tinjau dan konfirmasi naskah terlebih dahulu.');
    if (quotaExceeded) return setErrorMsg(`Kredit ElevenLabs tidak mencukupi. Perkiraan ${estimatedCharacters} karakter, sisa ${quota?.remaining} karakter.`);

    const createdAt = new Date().toISOString();
    const generatedPrompt = `Topic: ${topic}\nPersona: ${personaNotes.trim()}\nScript description: ${scriptDescription.trim()}\nDuration: ${durationMinutes} minute(s)\nVoice: ${voiceName}\n\nFinal narration script:\n${script.trim()}`;
    const attempt: VideoItem = { id: `video-${Date.now()}`, learnerName: 'Murid', topic, learningStyle: 'auditory', persona: personaNotes.trim(), duration: durationMinutes, accentType: voiceId, script: script.trim(), generatedPrompt, status: 'Processing', createdAt };
    saveVideo(attempt);
    const confirmedScriptId = `script-${Date.now()}`;
    saveConfirmedScript({ id: confirmedScriptId, topic, content: script.trim(), personaName: personaNotes.trim(), status: 'Confirmed', createdAt });
    setIsSubmitting(true);
    try {
      const audioResponse = await fetch(`${API_BASE_URL}/api/ai/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ script: script.trim(), voice_id: voiceId, full_prompt: generatedPrompt }) });
      const audioData = await readApiJson(audioResponse);
      const saveResponse = await authenticatedFetch(`${API_BASE_URL}/api/videos`, { method: 'POST', body: JSON.stringify({ learnerName: 'Murid', topic, learningStyle: 'auditory', persona: personaNotes.trim(), duration: durationMinutes, accentType: voiceId, script: audioData.data.naskah || script.trim(), generatedPrompt, status: 'completed' }) });
      await readApiJson(saveResponse);
      updateConfirmedScriptStatus(confirmedScriptId, 'Submitted');
      updateStoredVideo(attempt.id, { status: 'Completed' });
      await refreshQuota();
      router.push('/dosen/riwayat-materi');
    } catch (error) {
      updateConfirmedScriptStatus(confirmedScriptId, 'Failed');
      updateStoredVideo(attempt.id, { status: 'Failed', failureReason: error instanceof Error ? error.message : 'Gagal membuat audio.' });
      setErrorMsg(error instanceof Error ? error.message : 'Gagal membuat audio.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Buat video baru</p><h1 className="text-3xl font-bold">Form pembuat video AI</h1></div><Link href={homeHref}><Button variant="outline">Kembali ke dashboard</Button></Link></header>
        {errorMsg && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-600">{errorMsg}</div>}
        <Card><CardHeader><CardTitle>2. Deskripsi naskah</CardTitle></CardHeader><CardContent><Label htmlFor="script-description">Naskah seperti apa yang ingin dibuat?</Label><textarea id="script-description" value={scriptDescription} onChange={(event) => { setScriptDescription(event.target.value); clearScript(); }} placeholder="Contoh: jelaskan pengertian, tiga langkah utama, dan satu contoh sederhana. Tetap fokus pada topik materi." className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 text-sm" required /><p className="mt-2 text-sm text-slate-600">Gemini akan mengikuti arahan ini agar naskah tetap sesuai topik.</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="font-semibold">Kredit ElevenLabs</p><p className="text-sm text-slate-600">{isLoadingQuota ? 'Memuat kuota realtime...' : quota ? `${quota.remaining.toLocaleString('id-ID')} karakter tersisa dari ${quota.limit.toLocaleString('id-ID')}` : 'Kuota belum dapat dimuat.'}</p><p className="mt-2 text-sm text-slate-600">Perkiraan penggunaan: {estimatedCharacters.toLocaleString('id-ID')} karakter</p></CardContent></Card>
        <Card><CardHeader><CardTitle>1. Deskripsi persona</CardTitle></CardHeader><CardContent><Label htmlFor="persona-notes">Seperti apa persona yang ingin digunakan?</Label><textarea id="persona-notes" value={personaNotes} onChange={(event) => { setPersonaNotes(event.target.value); clearScript(); }} placeholder="Contoh: guru matematika yang sabar, energik, dan menjelaskan konsep dengan analogi sederhana untuk siswa SMA" className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 text-sm" required /><p className="mt-2 text-sm text-slate-600">Gemini akan memproses catatan ini sebagai karakter dan gaya penyampaian naskah.</p></CardContent></Card>
        <Card><CardHeader><CardTitle>2. Detail video</CardTitle></CardHeader><CardContent><form onSubmit={handleSubmit} className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><div><Label htmlFor="topic">Topik</Label><Input id="topic" value={topic} onChange={(event) => { setTopic(event.target.value); clearScript(); }} required /></div><div><Label htmlFor="duration">Durasi video (menit)</Label><Input id="duration" type="number" min="1" max="10" value={duration} onChange={(event) => { setDuration(event.target.value); clearScript(); }} required /></div></div><Button type="button" onClick={generateScript} disabled={isCreatingScript || !personaNotes.trim()}>{isCreatingScript ? 'Membuat preview...' : 'Buat preview naskah dengan Gemini AI'}</Button>{script && <div className="space-y-3"><Label htmlFor="script">Preview naskah</Label><p className="text-sm text-slate-600">{wordCount} kata. Naskah ini akan dibacakan oleh suara {voiceName || 'ElevenLabs'}.</p><textarea id="script" value={script} onChange={(event) => { setScript(event.target.value); setIsConfirmed(false); }} className="min-h-40 w-full rounded-md border border-slate-300 bg-white p-3 text-sm" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isConfirmed} onChange={(event) => setIsConfirmed(event.target.checked)} /> Saya telah meninjau naskah ini.</label></div>}<Button type="submit" disabled={isSubmitting || !script.trim() || !isConfirmed || quotaExceeded}>{isSubmitting ? 'Memproses video...' : 'Konfirmasi dan buat video'}</Button></form></CardContent></Card>
      </div>
    </div>
  );
}
