'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_BASE_URL } from '@/lib/api-config';
import { authenticatedFetch, getRoleHomeRoute } from '@/lib/auth';
import { getStoredVideos, saveVideo, updateStoredVideo, type VideoItem } from '@/lib/video-storage';
import { saveConfirmedScript, updateConfirmedScriptStatus } from '@/lib/confirmed-script-storage';

type ProviderConfiguration = {
  selected: { video: string; voice: string };
  credentials: { category: 'video' | 'voice'; provider: string; maskedKey: string }[];
};

const videoProviderNames: Record<string, string> = { 'd-id': 'D-ID', heygen: 'HeyGen', elevenlabs: 'ElevenLabs' };

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

function CreateVideoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [personaNotes, setPersonaNotes] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [scriptDescription, setScriptDescription] = useState('');
  const [duration, setDuration] = useState('10');
  const [durationUnit, setDurationUnit] = useState<'seconds' | 'minutes'>('seconds');
  const [script, setScript] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isCreatingScript, setIsCreatingScript] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [homeHref, setHomeHref] = useState('/dashboard');
  const [credits, setCredits] = useState<{ total: number | null; remaining: number | null; provider: string; unit: string } | null>(null);
  const [providerConfig, setProviderConfig] = useState<ProviderConfiguration | null>(null);
  const [voiceId, setVoiceId] = useState('');
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  const [isRefreshingCredits, setIsRefreshingCredits] = useState(false);
  const [creditsUpdatedAt, setCreditsUpdatedAt] = useState<Date | null>(null);
  const [creditsRefreshFailed, setCreditsRefreshFailed] = useState(false);
  const [aiProvider, setAiProvider] = useState('d-id');
  const [voiceProvider, setVoiceProvider] = useState('d-id');
  const creditsRequestInFlight = useRef(false);

  const durationValue = Number(duration) || (durationUnit === 'seconds' ? 10 : 3);
  const durationSeconds = durationUnit === 'seconds'
    ? Math.min(600, Math.max(1, Math.round(durationValue)))
    : Math.min(10, Math.max(1, durationValue)) * 60;
  const durationMinutes = durationSeconds / 60;
  const durationLabel = durationSeconds < 60
    ? `${durationSeconds} detik`
    : durationSeconds % 60 === 0
      ? `${durationSeconds / 60} menit`
      : `${Math.floor(durationSeconds / 60)} menit ${durationSeconds % 60} detik`;
  const estimatedCredits = Number((durationSeconds / 60).toFixed(2));
  const creditsExceeded = Boolean(credits && credits.remaining !== null && credits.provider !== 'heygen' && estimatedCredits > credits.remaining);
  const videoProvider = aiProvider;
  const promptProviderName = 'Gemini';
  const videoProviderName = videoProviderNames[videoProvider] || videoProvider;
  const hasSavedCredential = (category: 'video' | 'voice', provider: string) => Boolean(providerConfig?.credentials.some((credential) => credential.category === category && credential.provider === provider));
  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0;

  const refreshCredits = useCallback(async () => {
    if (creditsRequestInFlight.current) return;
    creditsRequestInFlight.current = true;
    setIsRefreshingCredits(true);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/videos/credits?provider=${encodeURIComponent(videoProvider)}`);
      const data = await readApiJson(response);
      setCredits({
        total: data.data?.total == null ? null : Number(data.data.total),
        remaining: data.data?.remaining == null ? null : Number(data.data.remaining),
        provider: String(data.data?.provider || videoProvider),
        unit: String(data.data?.unit || 'kredit'),
      });
      setCreditsUpdatedAt(new Date());
      setCreditsRefreshFailed(false);
    } catch {
      setCreditsRefreshFailed(true);
    } finally {
      creditsRequestInFlight.current = false;
      setIsRefreshingCredits(false);
    }
  }, [videoProvider]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHomeHref(getRoleHomeRoute());
      const retryId = searchParams.get('retry');
      const retryVideo = retryId ? getStoredVideos().find((video) => video.id === retryId && video.status === 'Failed') : undefined;
      if (retryVideo) {
        setPersonaNotes(retryVideo.persona);
        setTopic(retryVideo.topic);
        setScriptDescription('');
        if (retryVideo.durationSeconds) {
          setDuration(String(retryVideo.durationSeconds));
          setDurationUnit('seconds');
        } else {
          setDuration(String(retryVideo.duration));
          setDurationUnit('minutes');
        }
        setScript(cleanScript(retryVideo.script || retryVideo.generatedPrompt));
        setIsConfirmed(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    const loadProviderConfiguration = async () => {
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/api-keys`);
        const data = await readApiJson(response);
        if (active) {
          const configuration = data.data as ProviderConfiguration;
          setProviderConfig(configuration);
          setAiProvider(configuration.selected?.video || 'd-id');
          setVoiceProvider(configuration.selected?.voice || 'd-id');
        }
      } catch (error) {
        if (active) setErrorMsg(error instanceof Error ? error.message : 'Gagal memuat pilihan API.');
      }
    };
    void loadProviderConfiguration();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadCredits = async () => {
      await refreshCredits();
      if (isMounted) setIsLoadingCredits(false);
    };
    const refreshWhenActive = () => {
      if (document.visibilityState === 'visible') void refreshCredits();
    };

    void loadCredits();
    const intervalId = window.setInterval(refreshWhenActive, 30_000);
    document.addEventListener('visibilitychange', refreshWhenActive);
    window.addEventListener('focus', refreshWhenActive);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshWhenActive);
      window.removeEventListener('focus', refreshWhenActive);
    };
  }, [refreshCredits]);

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
      const response = await authenticatedFetch(`${API_BASE_URL}/api/ai/generate-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, persona: personaNotes.trim(), learningStyle: 'auditory', duration: durationMinutes, durationSeconds, targetWordCount: Math.max(1, Math.ceil(durationSeconds * 110 / 60)), notes: scriptDescription.trim() }),
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
    if (!script.trim() || !isConfirmed) return setErrorMsg('Tinjau dan konfirmasi naskah terlebih dahulu.');
    if (!providerConfig) return setErrorMsg('Pilihan provider belum termuat. Muat ulang halaman atau buka Manajemen API.');
    if (!sourceUrl.trim()) return setErrorMsg(`URL gambar avatar ${videoProviderName} wajib diisi.`);
    if (!hasSavedCredential('video', videoProvider)) return setErrorMsg(`Simpan API key ${videoProviderName} di Manajemen API sebelum membuat video.`);
    if (voiceProvider === 'elevenlabs' && (!hasSavedCredential('voice', 'elevenlabs') || !voiceId.trim())) return setErrorMsg('Simpan API key suara ElevenLabs dan isi Voice ID terlebih dahulu.');
    if (creditsExceeded) return setErrorMsg(`Kredit ${videoProviderName} tidak mencukupi. Perkiraan ${estimatedCredits} kredit, sisa ${credits?.remaining}.`);

    const createdAt = new Date().toISOString();
    const generatedPrompt = `Topic: ${topic}\nPersona: ${personaNotes.trim()}\nScript description: ${scriptDescription.trim()}\nDuration: ${durationLabel}\nPrompt provider: ${promptProviderName}\nVideo provider: ${videoProviderName}\n\nFinal narration script:\n${script.trim()}`;
    const attempt: VideoItem = { id: `video-${Date.now()}`, learnerName: 'Murid', topic, learningStyle: 'auditory', persona: personaNotes.trim(), duration: Math.ceil(durationMinutes), durationSeconds, accentType: videoProvider, script: script.trim(), scriptDescription: scriptDescription.trim(), generatedPrompt, status: 'Processing', createdAt };
    saveVideo(attempt);
    const confirmedScriptId = `script-${Date.now()}`;
    saveConfirmedScript({ id: confirmedScriptId, topic, content: script.trim(), personaName: personaNotes.trim(), status: 'Confirmed', createdAt });
    setIsSubmitting(true);
    try {
      const saveResponse = await authenticatedFetch(`${API_BASE_URL}/api/videos`, { method: 'POST', body: JSON.stringify({ learnerName: 'Murid', topic, learningStyle: 'auditory', persona: personaNotes.trim(), duration: Math.ceil(durationMinutes), durationSeconds, accentType: videoProvider, provider: aiProvider, voiceProvider, script: script.trim(), scriptDescription: scriptDescription.trim(), generatedPrompt, status: 'processing' }) });
      const savedVideo = await readApiJson(saveResponse);
      const createdVideo = await readApiJson(await authenticatedFetch(`${API_BASE_URL}/api/videos/create`, { method: 'POST', body: JSON.stringify({ videoId: savedVideo.data.id, scriptText: script.trim(), sourceUrl: sourceUrl.trim(), voiceId: voiceId.trim(), provider: aiProvider, voiceProvider }) }));
      updateConfirmedScriptStatus(confirmedScriptId, 'Submitted');
      updateStoredVideo(attempt.id, { status: 'Processing', databaseVideoId: savedVideo.data.id, elevenlabsVideoId: createdVideo.data.providerVideoId || createdVideo.data.dIdVideoId });
      await refreshCredits();
      router.push('/dosen/riwayat-materi');
    } catch (error) {
      updateConfirmedScriptStatus(confirmedScriptId, 'Failed');
      updateStoredVideo(attempt.id, { status: 'Failed', failureReason: error instanceof Error ? error.message : `Gagal membuat video ${videoProviderName}.` });
      setErrorMsg(error instanceof Error ? error.message : `Gagal membuat video ${videoProviderName}.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Buat video baru</p><h1 className="text-3xl font-bold">Form pembuat video AI</h1></div><Link href={homeHref}><Button variant="outline">Kembali ke dashboard</Button></Link></header>
        {errorMsg && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-600">{errorMsg}</div>}
        {providerConfig && <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5"><div><p className="font-semibold">Provider tersimpan</p><p className="text-sm text-slate-600">Naskah: {promptProviderName} · Video: {videoProviderName} · Suara: {voiceProvider === 'elevenlabs' ? 'ElevenLabs' : 'D-ID (bawaan)'}</p></div><Link href="/dashboard/api-keys" className="text-sm font-semibold text-indigo-700 hover:underline">Ubah pengaturan API</Link></CardContent></Card>}
        <Card><CardHeader><CardTitle>Pilih Provider Video dan Suara</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="ai-provider">Provider Video</Label><select id="ai-provider" value={aiProvider} onChange={(event) => setAiProvider(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="d-id">D-ID (Studio)</option><option value="heygen" disabled>HeyGen (Coming Soon)</option></select></div><div><Label htmlFor="voice-provider">Provider Suara</Label><select id="voice-provider" value={voiceProvider} onChange={(event) => setVoiceProvider(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="d-id">D-ID (suara bawaan)</option><option value="elevenlabs">ElevenLabs</option></select></div></CardContent></Card>
        <Card><CardHeader><CardTitle>Deskripsi naskah</CardTitle></CardHeader><CardContent><Label htmlFor="script-description">Naskah seperti apa yang ingin dibuat?</Label><textarea id="script-description" value={scriptDescription} onChange={(event) => { setScriptDescription(event.target.value); clearScript(); }} placeholder="Contoh: jelaskan pengertian, tiga langkah utama, dan satu contoh sederhana. Tetap fokus pada topik materi." className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 text-sm" required /><p className="mt-2 text-sm text-slate-600">{promptProviderName} selalu menulis naskah dalam Bahasa Inggris menggunakan kosakata sederhana untuk pembelajaran anak SD.</p></CardContent></Card>
        {aiProvider === 'd-id' && <Card><CardContent className="flex items-start justify-between gap-4 pt-5"><div><p className="font-semibold">Kredit D-ID</p><p className="text-sm text-slate-600">{isLoadingCredits ? 'Memuat saldo...' : credits?.remaining !== null && credits?.remaining !== undefined ? `${credits.remaining.toLocaleString('id-ID')} ${credits.unit} tersisa${credits.total !== null ? ` dari ${credits.total.toLocaleString('id-ID')}` : ''}` : 'Saldo provider belum dapat dimuat.'}</p><p className="mt-1 text-xs text-slate-500">{isRefreshingCredits ? 'Memperbarui saldo...' : creditsRefreshFailed ? 'Pembaruan gagal. Coba perbarui kembali.' : creditsUpdatedAt ? `Terakhir diperbarui ${creditsUpdatedAt.toLocaleTimeString('id-ID')}.` : 'Saldo diperbarui otomatis tiap 30 detik.'}</p><p className="mt-2 text-sm text-slate-600">Perkiraan penggunaan: {estimatedCredits.toLocaleString('id-ID', { maximumFractionDigits: 2 })} kredit ({durationLabel})</p>{creditsExceeded && <p role="alert" className="mt-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-700">Kredit tidak mencukupi untuk durasi ini.</p>}</div><Button type="button" variant="outline" onClick={() => void refreshCredits()} disabled={isRefreshingCredits}><RefreshCw className={`mr-2 size-4 ${isRefreshingCredits ? 'animate-spin' : ''}`} aria-hidden="true" />Perbarui</Button></CardContent></Card>}
        <Card><CardHeader><CardTitle>Deskripsi persona</CardTitle></CardHeader><CardContent><Label htmlFor="persona-notes">Seperti apa persona yang ingin digunakan?</Label><textarea id="persona-notes" value={personaNotes} onChange={(event) => { setPersonaNotes(event.target.value); clearScript(); }} placeholder="Contoh: guru matematika yang sabar, energik, dan menjelaskan konsep dengan analogi sederhana untuk siswa SMA" className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 text-sm" required /><p className="mt-2 text-sm text-slate-600">{promptProviderName} memakai catatan ini untuk mengikuti karakter dan gaya penyampaian naskah.</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Detail video</CardTitle></CardHeader><CardContent><form onSubmit={handleSubmit} className="space-y-5"><div className="grid gap-5 sm:grid-cols-3"><div><Label htmlFor="topic">Topik</Label><Input id="topic" value={topic} onChange={(event) => { setTopic(event.target.value); clearScript(); }} required /></div><div><Label htmlFor="duration">Durasi video ({durationUnit === 'seconds' ? 'detik' : 'menit'})</Label><Input id="duration" type="number" min="1" max={durationUnit === 'seconds' ? '600' : '10'} step="1" value={duration} onChange={(event) => { setDuration(event.target.value); clearScript(); }} required /></div><div><Label htmlFor="duration-unit">Satuan durasi</Label><select id="duration-unit" value={durationUnit} onChange={(event) => { setDurationUnit(event.target.value as 'seconds' | 'minutes'); clearScript(); }} className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="seconds">Detik</option><option value="minutes">Menit</option></select></div></div><p className="text-sm text-slate-600">Target video: {durationLabel}. Naskah dibuat sekitar {Math.max(1, Math.ceil(durationSeconds * 110 / 60))} kata.</p><div><Label htmlFor="source-url">URL gambar avatar {videoProvider === 'heygen' ? 'HeyGen' : 'D-ID'}</Label><Input id="source-url" type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://contoh.com/avatar.jpg" required /></div>{videoProvider !== 'd-id' && <div><Label htmlFor="voice-id">Voice ID {videoProvider === 'heygen' ? 'HeyGen' : 'ElevenLabs'}</Label><Input id="voice-id" value={voiceId} onChange={(event) => setVoiceId(event.target.value)} placeholder={videoProvider === 'heygen' ? 'Voice ID dari akun HeyGen' : 'Voice ID dari akun ElevenLabs'} required /><p className="mt-1 text-xs text-slate-500">Gunakan ID suara dari provider yang dipilih.</p></div>}
        {(videoProvider === 'heygen' || voiceProvider === 'elevenlabs') && <div><Label htmlFor="voice-id">Voice ID {videoProvider === 'heygen' ? 'HeyGen' : 'ElevenLabs'}</Label><Input id="voice-id" value={voiceId} onChange={(event) => setVoiceId(event.target.value)} placeholder={videoProvider === 'heygen' ? 'Voice ID dari akun HeyGen' : 'Voice ID dari akun ElevenLabs'} required /><p className="mt-1 text-xs text-slate-500">Gunakan ID suara dari provider yang dipilih.</p></div>}
        <Button type="button" onClick={generateScript} disabled={isCreatingScript || !personaNotes.trim()}>{isCreatingScript ? 'Membuat preview...' : `Buat preview naskah dengan ${promptProviderName}`}</Button>{script && <div className="space-y-3"><Label htmlFor="script">Preview naskah</Label><p className="text-sm text-slate-600">{wordCount} kata. Naskah akan diproses menjadi video oleh {videoProviderName}.</p><textarea id="script" value={script} onChange={(event) => { setScript(event.target.value); setIsConfirmed(false); }} className="min-h-40 w-full rounded-md border border-slate-300 bg-white p-3 text-sm" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isConfirmed} onChange={(event) => setIsConfirmed(event.target.checked)} /> Saya telah meninjau naskah ini.</label></div>}<Button type="submit" disabled={isSubmitting || !script.trim() || !isConfirmed || creditsExceeded || !providerConfig}>{isSubmitting ? 'Memproses video...' : `Konfirmasi dan buat video ${videoProviderName}`}</Button></form></CardContent></Card>
      </div>
    </div>
  );
}

export default function CreateVideoPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 text-sm text-slate-600">Memuat form pembuatan video...</main>}>
      <CreateVideoContent />
    </Suspense>
  );
}
