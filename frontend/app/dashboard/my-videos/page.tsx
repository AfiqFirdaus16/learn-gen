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
import { getStoredVideos, saveVideo, updateStoredVideo, type VideoItem } from '@/lib/video-storage';
import { API_BASE_URL } from '@/lib/api-config';
import { authenticatedFetch, getRoleHomeRoute } from '@/lib/auth';
import { MONTHLY_TOKEN_LIMIT, estimateTokens, getTokenUsage, recordTokenUsage } from '@/lib/token-usage';
import { saveConfirmedScript, updateConfirmedScriptStatus } from '@/lib/confirmed-script-storage';

const styleLabels: Record<PersonaItem['learningStyle'], string> = { visual: 'Visual', auditory: 'Auditori', kinesthetic: 'Kinestetik', reading: 'Membaca & menulis' };

function buildFullVideoPrompt({ persona, topic, duration, script }: { persona: PersonaItem; topic: string; duration: number; script: string }) {
    return [`Topic: ${topic}`, `Audience profile: ${persona.name}`, `Student level: ${persona.level}`, `Learning style: ${styleLabels[persona.learningStyle]}`, `Narration tone: ${persona.tone}`, 'Narration language: English', `Preferred English accent: ${persona.accent}`, `Target duration: ${duration} minute(s)`, 'Voice direction: clear, natural, and engaging educational narration.', persona.notes ? `Additional notes: ${persona.notes}` : '', '', 'Final narration script:', script.trim()].filter(Boolean).join('\n');
}
const cleanScript = (value: string) => value
    .replace(/^(?:(?:prompt|naskah|script)(?:\s+(?:untuk|elevenlabs))?\s*:\s*)/i, '')
    .replace(/\([^)]*\)\s*/g, '')
    .replace(/\bselamat\s+datang[^.!?]*[.!?]\s*/i, '')
    .replace(/\bdi\s+elevenlabs\b/gi, '')
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
    const [videoScript, setVideoScript] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [homeHref, setHomeHref] = useState('/dashboard');

    const persona = personas.find((item) => item.id === selectedPersonaId);
    const durationMinutes = Math.min(10, Math.max(1, Number(duration) || 3));
    const targetWordCount = durationMinutes * 110;
    const prompt = useMemo(() => persona ? buildFullVideoPrompt({ persona, topic, duration: durationMinutes, script: 'Naskah akan dibuat oleh Gemini AI.' }) : '', [durationMinutes, persona, topic]);
    const estimatedTokens = persona ? estimateTokens(prompt) + Math.ceil(targetWordCount * 1.3) : 0;
    const remainingTokens = Math.max(0, MONTHLY_TOKEN_LIMIT - usedTokens);
    const isOverLimit = Boolean(persona && estimatedTokens > remainingTokens);
    const usagePercent = Math.min(100, (usedTokens / MONTHLY_TOKEN_LIMIT) * 100);
    const scriptWordCount = videoScript.trim() ? videoScript.trim().split(/\s+/).length : 0;
    const heygenPrompt = videoScript;
    const setHeygenPrompt = setVideoScript;
    const prepareHeygenPrompt = prepareVideoScript;

    useEffect(() => {
        setHomeHref(getRoleHomeRoute());
        const load = async () => {
            const loadedPersonas = await getStoredPersonas();
            setPersonas(loadedPersonas);
            setUsedTokens(getTokenUsage());
            const retryId = searchParams.get('retry');
            const retryVideo = retryId ? getStoredVideos().find((video) => video.id === retryId && video.status === 'Failed') : undefined;
            if (retryVideo) {
                const matchingPersona = loadedPersonas.find((item) => item.id === retryVideo.personaId || item.name === retryVideo.persona);
                setSelectedPersonaId(matchingPersona?.id || '');
                setTopic(retryVideo.topic);
                setDuration(String(retryVideo.duration));
                setVideoScript(cleanScript(retryVideo.script || retryVideo.generatedPrompt));
                setIsConfirmed(true);
            }
        };
        void load();
    }, [searchParams]);

    function clearDraft() {
        setVideoScript('');
        setIsConfirmed(false);
    }

    async function prepareVideoScript() {
        setErrorMsg('');
        if (!persona) return setErrorMsg('Pilih persona terlebih dahulu.');
        if (!topic.trim()) return setErrorMsg('Isi topik sebelum membuat naskah video.');
        if (isOverLimit) return setErrorMsg('Token tidak mencukupi untuk membuat naskah ini.');
        setIsCreatingPrompt(true);
        try {
            const requestBody = { topic, duration: durationMinutes, learningStyle: styleLabels[persona.learningStyle], persona: `${persona.name}, level ${persona.level}`, targetWordCount, notes: persona.notes };
            let response = await authenticatedFetch(`${API_BASE_URL}/api/ai/generate-script`, { method: 'POST', body: JSON.stringify(requestBody) });
            if (response.status === 404) {
                response = await authenticatedFetch(`${API_BASE_URL}/api/ai/generate-elevenlabs-prompt`, {
                    method: 'POST',
                    body: JSON.stringify({ videoConfig: { topic, persona: persona.name, level: persona.level, learningStyle: styleLabels[persona.learningStyle], tone: persona.tone, duration: durationMinutes, targetWordCount, notes: persona.notes } }),
                });
            }
            const json = await readApiJson(response);
            if (!json.success) throw new Error(json.error || 'Gagal membuat naskah video.');
            setVideoScript(cleanScript(json.data.script));
            setIsConfirmed(false);
        } catch (error) {
            setErrorMsg(error instanceof Error ? error.message : 'Gagal membuat naskah.');
        } finally {
            setIsCreatingPrompt(false);
        }
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setErrorMsg('');
        if (!persona) return setErrorMsg('Pilih persona terlebih dahulu.');
        if (!videoScript || !isConfirmed) return setErrorMsg('Tinjau dan konfirmasi naskah sebelum membuat video.');
        if (!sourceUrl.trim()) return setErrorMsg('URL gambar avatar D-ID wajib diisi.');
        const createdAt = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const fullPrompt = buildFullVideoPrompt({ persona, topic, duration: Number(duration) || 3, script: videoScript });
        const createVideoAttempt = (status: VideoItem['status'], failureReason?: string, elevenlabsVideoId?: string): VideoItem => ({
            id: `video-${Date.now()}`,
            learnerName: 'Murid',
            topic: topic || 'Topik belum ditentukan',
            learningStyle: persona.learningStyle,
            persona: persona.name,
            personaId: persona.id,
            duration: Number(duration) || 3,
            accentType: 'd-id',
            script: videoScript,
            generatedPrompt: fullPrompt,
            status,
            failureReason,
            elevenlabsVideoId,
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
            content: videoScript,
            personaName: persona.name,
            status: 'Confirmed',
            createdAt: new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        });
        try {
            const savedMaterial = await authenticatedFetch(`${API_BASE_URL}/api/videos`, {
                method: 'POST',
                body: JSON.stringify({
                    learnerName: 'Murid',
                    topic,
                    learningStyle: persona.learningStyle,
                    persona: persona.name,
                    duration: Number(duration) || 3,
                    accentType: 'd-id',
                    script: videoScript,
                    generatedPrompt: fullPrompt,
                    status: 'completed',
                }),
            });
            const savedVideo = await readApiJson(savedMaterial);
            const dIdResponse = await authenticatedFetch(`${API_BASE_URL}/api/videos/create`, {
                method: 'POST',
                body: JSON.stringify({ videoId: savedVideo.data.id, scriptText: videoScript, sourceUrl: sourceUrl.trim() }),
            });
            await readApiJson(dIdResponse);
            updateConfirmedScriptStatus(confirmedScriptId, 'Submitted');
            setUsedTokens(recordTokenUsage(estimatedTokens));
            updateStoredVideo(attempt.id, { status: 'Completed' });
            router.push('/dosen/riwayat-materi');
        } catch (error: unknown) {
            updateConfirmedScriptStatus(confirmedScriptId, 'Failed');
            const reason = error instanceof Error ? error.message : 'Terjadi kesalahan saat menghubungi server.';
            updateStoredVideo(attempt.id, { status: 'Failed', failureReason: reason });
            setErrorMsg(reason);
        } finally { setIsSubmitting(false); }
    }

    return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:from-slate-950 dark:to-slate-900"><div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Buat video baru</p><h1 className="text-3xl font-bold">Form pembuat video AI</h1></div><Link href="/dashboard"></Link></div>
        {errorMsg && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-600">{errorMsg}</div>}
        <Card><CardContent className="pt-5"><Label htmlFor="source-url">URL gambar avatar D-ID</Label><Input id="source-url" type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://contoh.com/avatar.jpg" required /></CardContent></Card>
        <Card><CardHeader><CardTitle>1. Pilih persona</CardTitle></CardHeader><CardContent>{personas.length === 0 ? <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50 p-5"><p className="font-semibold">Belum ada persona yang tersedia</p><p className="mt-1 text-sm text-slate-600">Buat persona berisi gaya belajar, avatar, dan suara sebelum membuat video.</p><Link href="/dashboard/personas"><Button className="mt-4 bg-violet-600 hover:bg-violet-700">Buat persona</Button></Link></div> : <div className="space-y-3"><Label>Persona untuk video ini</Label><Select value={selectedPersonaId} onValueChange={(value) => { setSelectedPersonaId(value ?? ''); clearDraft(); }}><SelectTrigger className="w-full"><SelectValue placeholder="Pilih persona yang akan digunakan" /></SelectTrigger><SelectContent>{personas.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {styleLabels[item.learningStyle]}</SelectItem>)}</SelectContent></Select>{persona && <div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm sm:grid-cols-3"><div><p className="text-xs font-semibold uppercase text-blue-600">Target audiens</p><p className="font-semibold">Murid {persona.level}</p><p>{persona.tone}</p></div><div><p className="text-xs font-semibold uppercase text-blue-600">Cara belajar</p><p>{styleLabels[persona.learningStyle]}</p></div><div><p className="text-xs font-semibold uppercase text-blue-600">Presenter</p><p>{persona.avatarName} · {persona.voiceName}</p></div></div>}</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle>2. Detail video</CardTitle></CardHeader><CardContent><form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="topic">Topik</Label><Input id="topic" value={topic} onChange={(event) => { setTopic(event.target.value); clearDraft(); }} placeholder="Contoh: Algoritma Sorting" required /></div><div className="space-y-2"><Label htmlFor="duration">Durasi video (menit)</Label><Input id="duration" type="number" min="1" max="10" value={duration} onChange={(event) => { setDuration(event.target.value); clearDraft(); }} required /></div><div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 md:col-span-2"><Label>Naskah Video</Label><p className="mt-2 text-sm text-slate-600">Groq AI membuat naskah narasi sesuai durasi yang dipilih, dalam teks polos tanpa karakter dekoratif.</p><Button type="button" onClick={prepareHeygenPrompt} disabled={isCreatingPrompt || !persona || isOverLimit} className="mt-4 bg-violet-600 hover:bg-violet-700">{isCreatingPrompt ? 'Membuat naskah...' : 'Buat preview naskah dengan Groq AI'}</Button></div>{heygenPrompt && <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4 md:col-span-2"><div><p className="font-semibold text-violet-950">3. Preview naskah</p><p className="text-sm text-violet-800">Target sekitar {targetWordCount} kata untuk durasi {durationMinutes} menit. Saat ini {scriptWordCount} kata. Edit naskah bila perlu, kemudian konfirmasi untuk mengaktifkan pembuatan video.</p></div><textarea value={heygenPrompt} onChange={(event) => { setHeygenPrompt(event.target.value); setIsConfirmed(false); }} className="min-h-32 w-full rounded-md border border-violet-200 bg-white p-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-400" /><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={isConfirmed} onChange={(event) => setIsConfirmed(event.target.checked)} /> Saya telah meninjau dan menyetujui naskah ini.</label></div>}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end md:col-span-2"><Link href="/dashboard/personas"><Button type="button" variant="outline">Kelola persona</Button></Link><Button type="submit" disabled={isSubmitting || !persona || !heygenPrompt || !isConfirmed} className="min-w-44 bg-blue-600 hover:bg-blue-700">{isSubmitting ? 'Memproses video...' : 'Konfirmasi & buat video'}</Button></div></form></CardContent></Card>
    </div></div>;
}
