'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
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

type ProviderConfiguration = {
  selected: { video: string; voice: string };
  credentials: { category: 'video' | 'voice'; provider: string; maskedKey: string }[];
};

const videoProviderNames: Record<string, string> = { 'd-id': 'D-ID', heygen: 'HeyGen', elevenlabs: 'ElevenLabs' };

const personaOptions = [
  { label: 'Guru profesional yang sabar dan jelas dalam menjelaskan', description: 'Menjelaskan bertahap dengan tempo tenang dan memastikan ide utama mudah dipahami.' },
  { label: 'Dosen perguruan tinggi yang formal dan akademis', description: 'Menggunakan penyampaian formal, istilah tepat, dan susunan materi akademis.' },
  { label: 'Tutor pribadi yang ramah dan interaktif', description: 'Terasa seperti belajar satu lawan satu, dengan sapaan hangat dan ajakan berpikir.' },
  { label: 'Mentor berpengalaman yang praktis dan to the point', description: 'Fokus pada wawasan yang bisa langsung diterapkan tanpa bertele-tele.' },
  { label: 'Pengajar muda yang energik dan modern', description: 'Membawa suasana segar, dinamis, dan dekat dengan keseharian pelajar.' },
  { label: 'Ahli materi yang mendalam dan detail', description: 'Menguraikan konsep secara menyeluruh, termasuk rincian dan hubungan antaride.' },
  { label: 'Instruktur yang menggunakan analogi sehari-hari', description: 'Menghubungkan konsep dengan benda atau pengalaman yang akrab.' },
  { label: 'Pembicara motivasional yang inspiratif', description: 'Membangkitkan rasa ingin tahu dan keyakinan untuk terus belajar.' },
  { label: 'Guru yang humoris dan menyenangkan', description: 'Menyisipkan humor ringan agar pembelajaran terasa santai dan menarik.' },
  { label: 'Pengajar yang sistematis dan terstruktur', description: 'Menyampaikan materi secara runtut, dari pengantar hingga kesimpulan.' },
  { label: 'Tutor yang fokus pada pemahaman konsep dasar', description: 'Memperkuat fondasi dan menjelaskan istilah inti sebelum topik lanjutan.' },
  { label: 'Dosen yang menekankan aplikasi praktis', description: 'Menunjukkan bagaimana konsep digunakan dalam pekerjaan dan situasi nyata.' },
  { label: 'Instruktur yang cocok untuk pemula', description: 'Mengasumsikan audiens baru mengenal topik dan menjelaskan tanpa prasyarat.' },
  { label: 'Pengajar yang cocok untuk tingkat menengah hingga advanced', description: 'Membahas nuansa, keterkaitan, dan tantangan lanjutan dengan asumsi dasar sudah dipahami.' },
  { label: 'Mentor yang menggunakan pendekatan storytelling', description: 'Membingkai ide melalui cerita, situasi, atau tokoh yang mudah diikuti.' },
  { label: 'Guru yang tegas namun tetap suportif', description: 'Menjaga fokus dan standar belajar sambil memberi dorongan yang positif.' },
  { label: 'Ahli yang menjelaskan dengan bahasa sederhana', description: 'Mengubah istilah rumit menjadi kalimat ringkas dan mudah dicerna.' },
  { label: 'Pengajar yang interaktif dan sering memberi contoh', description: 'Mengajak audiens mengikuti alur dan memperjelas setiap ide dengan contoh.' },
  { label: 'Tutor yang fokus pada problem solving', description: 'Menuntun langkah analisis dan strategi untuk menyelesaikan masalah.' },
  { label: 'Instruktur yang ramah untuk mahasiswa pemula', description: 'Menggunakan nada inklusif dan contoh relevan bagi mahasiswa yang baru memulai.' },
  { label: 'Fasilitator diskusi yang terbuka dan reflektif', description: 'Mengundang beragam sudut pandang dan membantu audiens menarik kesimpulan.' },
  { label: 'Pelatih yang berorientasi pada latihan dan praktik', description: 'Mengutamakan demonstrasi, langkah kerja, dan penerapan langsung.' },
  { label: 'Pengajar yang kritis dan berbasis bukti', description: 'Mendorong penalaran serta menjelaskan klaim dengan fakta dan bukti.' },
  { label: 'Pemandu belajar yang tenang dan empatik', description: 'Peka terhadap kesulitan belajar dan memberi penjelasan dengan penuh perhatian.' },
];

const accentOptions = [
  'American (General American)', 'British (Received Pronunciation / RP)', 'British (Modern Standard)',
  'Australian', 'Canadian', 'Irish', 'Scottish', 'New Zealand', 'South African',
  'Indian English', 'Singaporean English', 'Filipino English', 'Neutral / International English',
  'American Southern', 'American New York', 'British Cockney', 'British Northern',
  'Soft & Calm English', 'Clear & Professional English', 'Energetic & Friendly English',
];

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
  if (!response.ok) {
    const formatErrorValue = (value: unknown) => typeof value === 'string' ? value : value ? JSON.stringify(value) : '';
    const details = typeof data.details === 'string'
      ? data.details
      : data.details
        ? JSON.stringify(data.details)
        : '';
    const message = formatErrorValue(data.error) || `Permintaan gagal (HTTP ${response.status}).`;
    throw new Error(details && !message.includes(details) ? `${message} (${details})` : message);
  }
  return data;
}

function CreateVideoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [personaNotes, setPersonaNotes] = useState('');
  const [personaSearch, setPersonaSearch] = useState('');
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);
  const [accent, setAccent] = useState('');
  const [accentSearch, setAccentSearch] = useState('');
  const [isAccentOpen, setIsAccentOpen] = useState(false);
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
  const [providerConfig, setProviderConfig] = useState<ProviderConfiguration | null>(null);
  const [aiProvider, setAiProvider] = useState('d-id');

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
  const videoProvider = aiProvider;
  const promptProviderName = 'Gemini';
  const videoProviderName = videoProviderNames[videoProvider] || videoProvider;
  const hasSavedCredential = (category: 'video' | 'voice', provider: string) => Boolean(providerConfig?.credentials.some((credential) => credential.category === category && credential.provider === provider));
  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0;
  const selectedPersona = personaOptions.find((option) => option.label === personaNotes);
  const filteredPersonas = useMemo(() => personaOptions.filter((option) => option.label.toLowerCase().includes(personaSearch.toLowerCase())), [personaSearch]);
  const filteredAccents = useMemo(() => accentOptions.filter((option) => option.toLowerCase().includes(accentSearch.toLowerCase())), [accentSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHomeHref(getRoleHomeRoute());
      const retryId = searchParams.get('retry');
      const retryVideo = retryId ? getStoredVideos().find((video) => video.id === retryId && video.status === 'Failed') : undefined;
      if (retryVideo) {
        setPersonaNotes(personaOptions.some((option) => option.label === retryVideo.persona) ? retryVideo.persona : '');
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
        }
      } catch (error) {
        if (active) setErrorMsg(error instanceof Error ? error.message : 'Gagal memuat pilihan API.');
      }
    };
    void loadProviderConfiguration();
    return () => { active = false; };
  }, []);

  function clearScript() {
    setScript('');
    setIsConfirmed(false);
  }

  async function generateScript() {
    setErrorMsg('');
    if (!personaNotes.trim()) return setErrorMsg('Tulis catatan persona terlebih dahulu.');
    if (!accent) return setErrorMsg('Pilih aksen Bahasa Inggris terlebih dahulu.');
    if (!topic.trim()) return setErrorMsg('Isi topik terlebih dahulu.');
    if (!scriptDescription.trim()) return setErrorMsg('Tulis deskripsi naskah terlebih dahulu.');
    setIsCreatingScript(true);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/ai/generate-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, persona: personaNotes.trim(), accent, learningStyle: 'auditory', duration: durationMinutes, durationSeconds, targetWordCount: Math.max(1, Math.ceil(durationSeconds * 110 / 60)), notes: scriptDescription.trim() }),
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
    if (!accent) return setErrorMsg('Pilih aksen Bahasa Inggris terlebih dahulu.');
    if (!script.trim() || !isConfirmed) return setErrorMsg('Tinjau dan konfirmasi naskah terlebih dahulu.');
    if (!providerConfig) return setErrorMsg('Pilihan provider belum termuat. Muat ulang halaman atau buka Manajemen API.');
    if (!hasSavedCredential('video', videoProvider)) return setErrorMsg(`Simpan API key ${videoProviderName} di Manajemen API sebelum membuat video.`);
    const createdAt = new Date().toISOString();
    const generatedPrompt = `Topic: ${topic}\nPersona: ${personaNotes.trim()}\nPreferred English accent: ${accent}\nScript description: ${scriptDescription.trim()}\nDuration: ${durationLabel}\nPrompt provider: ${promptProviderName}\nVideo provider: ${videoProviderName}\n\nFinal narration script:\n${script.trim()}`;
    const attempt: VideoItem = { id: `video-${Date.now()}`, learnerName: 'Murid', topic, learningStyle: 'auditory', persona: personaNotes.trim(), duration: Math.ceil(durationMinutes), durationSeconds, accentType: videoProvider, script: script.trim(), scriptDescription: `${scriptDescription.trim()}\nPreferred English accent: ${accent}`, generatedPrompt, status: 'Processing', createdAt };
    saveVideo(attempt);
    const confirmedScriptId = `script-${Date.now()}`;
    saveConfirmedScript({ id: confirmedScriptId, topic, content: script.trim(), personaName: personaNotes.trim(), status: 'Confirmed', createdAt });
    setIsSubmitting(true);
    try {
      const saveResponse = await authenticatedFetch(`${API_BASE_URL}/api/videos`, { method: 'POST', body: JSON.stringify({ learnerName: 'Murid', topic, learningStyle: 'auditory', persona: personaNotes.trim(), accent, duration: Math.ceil(durationMinutes), durationSeconds, accentType: videoProvider, provider: aiProvider, voiceProvider: videoProvider, script: script.trim(), scriptDescription: `${scriptDescription.trim()}\nPreferred English accent: ${accent}`, generatedPrompt, status: 'processing' }) });
      const savedVideo = await readApiJson(saveResponse);
      const createdVideo = await readApiJson(await authenticatedFetch(`${API_BASE_URL}/api/videos/create`, { method: 'POST', body: JSON.stringify({ videoId: savedVideo.data.id, persona: personaNotes.trim(), accent, scriptText: script.trim(), provider: aiProvider, voiceProvider: videoProvider }) }));
      updateConfirmedScriptStatus(confirmedScriptId, 'Submitted');
      updateStoredVideo(attempt.id, { status: 'Processing', databaseVideoId: savedVideo.data.id, elevenlabsVideoId: createdVideo.data.providerVideoId || createdVideo.data.dIdVideoId });
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
        {providerConfig && <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5"><div><p className="font-semibold">Pengaturan provider</p><p className="text-sm text-slate-600">Naskah: {promptProviderName} · Video dan suara: {videoProviderName}</p></div><Link href="/dashboard/api-keys" className="text-sm font-semibold text-indigo-700 hover:underline">Ubah pengaturan API</Link></CardContent></Card>}
        <Card><CardHeader><CardTitle>Deskripsi naskah</CardTitle></CardHeader><CardContent><Label htmlFor="script-description">Naskah seperti apa yang ingin dibuat?</Label><textarea id="script-description" value={scriptDescription} onChange={(event) => { setScriptDescription(event.target.value); clearScript(); }} placeholder="Contoh: jelaskan pengertian, tiga langkah utama, dan satu contoh sederhana. Tetap fokus pada topik materi." className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white p-3 text-sm" required /><p className="mt-2 text-sm text-slate-600">{promptProviderName} selalu menulis naskah dalam Bahasa Inggris menggunakan kosakata sederhana untuk pembelajaran anak SD.</p></CardContent></Card>
        <Card className="overflow-visible"><CardHeader><CardTitle>Deskripsi persona</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label htmlFor="persona-notes">Pilih persona yang ingin digunakan</Label><div className="relative mt-2"><input id="persona-notes" role="combobox" aria-expanded={isPersonaOpen} aria-controls="persona-options" aria-autocomplete="list" autoComplete="off" value={isPersonaOpen ? personaSearch : personaNotes} onFocus={() => { setPersonaSearch(''); setIsPersonaOpen(true); }} onChange={(event) => { setPersonaSearch(event.target.value); setIsPersonaOpen(true); }} onKeyDown={(event) => { if (event.key === 'Escape') setIsPersonaOpen(false); if (event.key === 'Enter' && isPersonaOpen && filteredPersonas[0]) { event.preventDefault(); setPersonaNotes(filteredPersonas[0].label); setPersonaSearch(''); setIsPersonaOpen(false); clearScript(); } }} placeholder="Cari dan pilih persona..." className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm outline-none focus:border-blue-600" required readOnly={!isPersonaOpen} /><input type="hidden" name="persona" value={personaNotes} required />{isPersonaOpen && <div id="persona-options" role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">{filteredPersonas.length ? filteredPersonas.map((option) => <button key={option.label} type="button" role="option" aria-selected={personaNotes === option.label} onClick={() => { setPersonaNotes(option.label); setPersonaSearch(''); setIsPersonaOpen(false); clearScript(); }} className="block w-full px-3 py-2.5 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none">{option.label}</button>) : <p className="px-3 py-2.5 text-sm text-slate-500">Tidak ada persona yang cocok.</p>}</div>}</div>{selectedPersona && <p className="mt-2 rounded-md bg-blue-50 p-3 text-sm text-slate-700">{selectedPersona.description}</p>}</div><div><Label htmlFor="accent-select">Pilih Aksen</Label><div className="relative mt-2"><input id="accent-select" role="combobox" aria-expanded={isAccentOpen} aria-controls="accent-options" aria-autocomplete="list" autoComplete="off" value={isAccentOpen ? accentSearch : accent} onFocus={() => { setAccentSearch(''); setIsAccentOpen(true); }} onChange={(event) => setAccentSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setIsAccentOpen(false); if (event.key === 'Enter' && isAccentOpen && filteredAccents[0]) { event.preventDefault(); setAccent(filteredAccents[0]); setAccentSearch(''); setIsAccentOpen(false); clearScript(); } }} placeholder="Cari dan pilih aksen Bahasa Inggris..." className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm outline-none focus:border-blue-600" required readOnly={!isAccentOpen} /><input type="hidden" name="accent" value={accent} required />{isAccentOpen && <div id="accent-options" role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">{filteredAccents.length ? filteredAccents.map((option) => <button key={option} type="button" role="option" aria-selected={accent === option} onClick={() => { setAccent(option); setAccentSearch(''); setIsAccentOpen(false); clearScript(); }} className="block w-full px-3 py-2.5 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none">{option}</button>) : <p className="px-3 py-2.5 text-sm text-slate-500">Tidak ada aksen yang cocok.</p>}</div>}</div></div><p className="text-sm text-slate-600">{promptProviderName} memakai persona dan aksen terpilih untuk mengarahkan karakter serta gaya penyampaian naskah.</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Detail video</CardTitle></CardHeader><CardContent><form onSubmit={handleSubmit} className="space-y-5"><div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(8rem,0.7fr)_minmax(9rem,0.8fr)]"><div className="min-w-0 space-y-2"><Label htmlFor="topic">Topik</Label><Input id="topic" value={topic} onChange={(event) => { setTopic(event.target.value); clearScript(); }} className="h-10" required /></div><div className="min-w-0 space-y-2"><Label htmlFor="duration">Durasi video</Label><Input id="duration" type="number" min="1" max={durationUnit === 'seconds' ? '600' : '10'} step="1" value={duration} onChange={(event) => { setDuration(event.target.value); clearScript(); }} className="h-10" required /></div><div className="min-w-0 space-y-2"><Label htmlFor="duration-unit">Satuan durasi</Label><select id="duration-unit" value={durationUnit} onChange={(event) => { setDurationUnit(event.target.value as 'seconds' | 'minutes'); clearScript(); }} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="seconds">Detik</option><option value="minutes">Menit</option></select></div></div><p className="text-sm text-slate-600">Target video: {durationLabel}. Naskah dibuat sekitar {Math.max(1, Math.ceil(durationSeconds * 110 / 60))} kata.</p>
        <Button type="button" onClick={generateScript} disabled={isCreatingScript || !personaNotes.trim() || !accent}>{isCreatingScript ? 'Membuat preview...' : `Buat preview naskah dengan ${promptProviderName}`}</Button>{script && <div className="space-y-3"><Label htmlFor="script">Preview naskah</Label><p className="text-sm text-slate-600">{wordCount} kata. Naskah akan diproses menjadi video oleh {videoProviderName}.</p><textarea id="script" value={script} onChange={(event) => { setScript(event.target.value); setIsConfirmed(false); }} className="min-h-40 w-full rounded-md border border-slate-300 bg-white p-3 text-sm" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isConfirmed} onChange={(event) => setIsConfirmed(event.target.checked)} /> Saya telah meninjau naskah ini.</label></div>}<Button type="submit" disabled={isSubmitting || !script.trim() || !isConfirmed || !providerConfig || !personaNotes.trim() || !accent}>{isSubmitting ? 'Memproses video...' : `Konfirmasi dan buat video ${videoProviderName}`}</Button></form></CardContent></Card>
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
