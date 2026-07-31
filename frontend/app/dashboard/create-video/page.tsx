'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveVideo, type VideoItem } from '@/lib/video-storage';
import { getStoredPersonas, type PersonaItem } from '@/lib/persona-storage';
import { estimateTokens, getTokenUsage, MONTHLY_TOKEN_LIMIT, recordTokenUsage } from '@/lib/token-usage';

const learningStyleLabels: Record<PersonaItem['learningStyle'], string> = {
  visual: 'Visual', auditory: 'Auditori', kinesthetic: 'Kinestetik', reading: 'Membaca & menulis',
};

export default function CreateVideoPage() {
<<<<<<< HEAD
  const router = useRouter();
  const [personas, setPersonas] = useState<PersonaItem[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [formData, setFormData] = useState({ topic: '', duration: '3' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [usedTokens, setUsedTokens] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPersonas(getStoredPersonas());
      setUsedTokens(getTokenUsage());
=======
    const router = useRouter();
    const [remainingCredit, setRemainingCredit] = useState<number | string>("...");
    // State Input Form
    const [formData, setFormData] = useState({
        learnerName: '',
        topic: '',
        learningStyle: 'visual',
        avatarId: '', // Diubah dari 'persona' agar cocok dengan HeyGen
        voiceId: '',  // Diubah dari 'accentType' agar cocok dengan HeyGen
        duration: '3',
>>>>>>> ac73fd2d4675bc80707f2e21c555f880a9e4ce08
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const selectedPersona = personas.find((persona) => persona.id === selectedPersonaId);
  const generatedPrompt = useMemo(() => {
    const duration = Number(formData.duration) || 3;
    if (!selectedPersona) return 'Pilih persona terlebih dahulu untuk melihat instruksi video.';
    const notes = selectedPersona.notes ? ` Perhatian khusus: ${selectedPersona.notes}.` : '';
    return `Buat naskah video pembelajaran tentang ${formData.topic || 'topik yang dipilih'} berdurasi ${duration} menit untuk ${selectedPersona.name}, tingkat ${selectedPersona.level}, dengan gaya belajar ${learningStyleLabels[selectedPersona.learningStyle]}. Gunakan nada ${selectedPersona.tone}, avatar ${selectedPersona.avatarName}, dan suara ${selectedPersona.voiceName}.${notes}`;
  }, [formData, selectedPersona]);
  const estimatedTokens = selectedPersona ? estimateTokens(generatedPrompt) + 100 : 0;
  const remainingTokens = Math.max(0, MONTHLY_TOKEN_LIMIT - usedTokens);
  const usagePercent = Math.min(100, (usedTokens / MONTHLY_TOKEN_LIMIT) * 100);
  const willExceedLimit = selectedPersona && estimatedTokens > remainingTokens;

<<<<<<< HEAD
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    if (!selectedPersona) {
      setErrorMsg('Pilih persona terlebih dahulu. Video hanya dapat dibuat menggunakan persona yang tersimpan.');
      return;
    }
    if (willExceedLimit) {
      setErrorMsg(`Token tidak mencukupi. Video ini diperkirakan membutuhkan ${estimatedTokens.toLocaleString('id-ID')} token, sedangkan sisa kuota Anda ${remainingTokens.toLocaleString('id-ID')} token.`);
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:5000/api/ai/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topik: generatedPrompt, avatar_id: selectedPersona.avatarId, voice_id: selectedPersona.voiceId }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Gagal membuat video di sisi server.');

      const actualTokens = Number(json.data?.usage?.total_tokens) || estimatedTokens;
      setUsedTokens(recordTokenUsage(actualTokens));

      const videoItem: VideoItem & { heygenVideoId?: string } = {
        id: `video-${Date.now()}`, learnerName: selectedPersona.name, topic: formData.topic || 'Topik belum ditentukan',
        learningStyle: selectedPersona.learningStyle, persona: selectedPersona.name, duration: Number(formData.duration) || 3,
        accentType: selectedPersona.voiceId, generatedPrompt, status: 'Processing', heygenVideoId: json.data.heygen_video_id,
        createdAt: new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      };
      saveVideo(videoItem);
      router.push('/dashboard/my-videos');
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Terjadi kesalahan saat menghubungi server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Buat video baru</p><h1 className="text-3xl font-bold">Form pembuat video AI</h1></div><Link href="/dashboard"><Button variant="outline">Kembali ke dashboard</Button></Link></div>
        {errorMsg && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{errorMsg}</div>}
        <Card className="shadow-sm"><CardContent className="pt-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Kuota token bulan ini</p><p className="text-sm text-slate-600 dark:text-slate-300">Terpakai {usedTokens.toLocaleString('id-ID')} dari {MONTHLY_TOKEN_LIMIT.toLocaleString('id-ID')} token</p></div><div className={`rounded-full px-3 py-1.5 text-sm font-semibold ${remainingTokens <= 1_000 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'}`}>Sisa {remainingTokens.toLocaleString('id-ID')} token</div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className={`h-full rounded-full ${usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${usagePercent}%` }} /></div>{selectedPersona && <p className={`mt-3 text-sm ${willExceedLimit ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>Video ini diperkirakan memakai sekitar {estimatedTokens.toLocaleString('id-ID')} token (instruksi + naskah). {willExceedLimit ? 'Kuota tidak mencukupi.' : 'Penggunaan aktual dicatat setelah video berhasil dibuat.'}</p>}</CardContent></Card>
        <Card className="shadow-lg"><CardHeader><CardTitle>1. Pilih persona</CardTitle></CardHeader><CardContent className="space-y-4">
          {personas.length === 0 ? <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50 p-5 dark:border-violet-800 dark:bg-violet-950/30"><p className="font-semibold text-violet-950 dark:text-violet-100">Belum ada persona yang tersedia</p><p className="mt-1 text-sm text-violet-800 dark:text-violet-200">Buat persona berisi gaya belajar, avatar, dan suara sebelum membuat video.</p><Link href="/dashboard/personas"><Button className="mt-4 bg-violet-600 hover:bg-violet-700">Buat persona</Button></Link></div> : <><div className="space-y-2"><Label>Persona untuk video ini</Label><Select value={selectedPersonaId} onValueChange={(value) => setSelectedPersonaId(value ?? '')}><SelectTrigger className="w-full"><SelectValue placeholder="Pilih persona yang akan digunakan" /></SelectTrigger><SelectContent>{personas.map((persona) => <SelectItem key={persona.id} value={persona.id}>{persona.name} · {learningStyleLabels[persona.learningStyle]}</SelectItem>)}</SelectContent></Select></div>{selectedPersona && <div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/30 sm:grid-cols-3"><div><p className="font-semibold text-blue-950 dark:text-blue-100">{selectedPersona.name}</p><p className="text-blue-700 dark:text-blue-300">{selectedPersona.level} · {selectedPersona.tone}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Cara belajar</p><p className="text-blue-950 dark:text-blue-100">{learningStyleLabels[selectedPersona.learningStyle]}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Presenter</p><p className="text-blue-950 dark:text-blue-100">{selectedPersona.avatarName} · {selectedPersona.voiceName}</p></div></div>}</>}
        </CardContent></Card>
        <Card className="shadow-lg"><CardHeader><CardTitle>2. Detail video</CardTitle></CardHeader><CardContent><form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="topic">Topik</Label><Input id="topic" value={formData.topic} onChange={(e) => setFormData((previous) => ({ ...previous, topic: e.target.value }))} placeholder="Contoh: Algoritma Sorting" required /></div><div className="space-y-2"><Label htmlFor="duration">Durasi video (menit)</Label><Input id="duration" type="number" min="1" max="10" value={formData.duration} onChange={(e) => setFormData((previous) => ({ ...previous, duration: e.target.value }))} required /></div><div className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 md:col-span-2 dark:border-slate-700 dark:bg-slate-900/60"><Label>Instruksi yang akan dikirim ke AI</Label><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{generatedPrompt}</p></div><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end md:col-span-2"><Link href="/dashboard/personas"><Button type="button" variant="outline">Kelola persona</Button></Link><Button type="submit" disabled={isSubmitting || !selectedPersona || willExceedLimit} className="min-w-44 bg-blue-600 hover:bg-blue-700">{isSubmitting ? 'Memproses AI...' : willExceedLimit ? 'Kuota token tidak cukup' : 'Buat video AI'}</Button></div></form></CardContent></Card>
      </div>
    </div>
  );
=======
    // Mengambil data Avatar & Voice dari Backend saat halaman dimuat
    useEffect(() => {
        const fetchAssetsAndQuota = async () => {
            try {
                // 1. Ambil Aset Avatar & Voice
                const resAssets = await fetch("http://localhost:5000/api/ai/heygen-assets");
                const jsonAssets = await resAssets.json();

                if (jsonAssets.success) {
                    const fetchedAvatars = jsonAssets.raw_avatars?.data?.avatars || [];
                    const fetchedVoices = jsonAssets.raw_voices?.data?.voices || [];
                    const indoVoices = fetchedVoices.filter((v: any) => v.language === "Indonesian" || v.language === "id-ID");
                    setAvatars(fetchedAvatars);
                    setVoices(indoVoices.length > 0 ? indoVoices : fetchedVoices);
                }

                // 2. Ambil Info Kuota
                const resQuota = await fetch("http://localhost:5000/api/ai/heygen-quota");
                const jsonQuota = await resQuota.json();

                if (jsonQuota.success) {
                    setRemainingCredit(jsonQuota.kredit_tersisa);
                } else {
                    setRemainingCredit("0"); // Fallback jika gagal
                }

            } catch (err) {
                console.error("Gagal memuat data dari server:", err);
                setErrorMsg("Gagal terhubung ke server.");
                setRemainingCredit("Error");
            } finally {
                setIsLoadingAssets(false);
            }
        };

        fetchAssetsAndQuota();
    }, []);

    // Membuat prompt dinamis yang akan dikirim ke Groq (Topik)
    const generatedPrompt = useMemo(() => {
        const duration = Number(formData.duration) || 3;
        return `Buat naskah video pembelajaran tentang ${formData.topic || 'topik yang dipilih'} berdurasi ${duration} menit dengan gaya ${formData.learningStyle}. Namanya adalah ${formData.learnerName || 'Siswa'}.`;
    }, [formData]);

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        // Validasi internal
        if (!formData.avatarId || !formData.voiceId) {
            setErrorMsg('Harap pilih Avatar dan Suara terlebih dahulu.');
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Kirim data ke Backend (Groq + HeyGen)
            const response = await fetch("http://localhost:5000/api/ai/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topik: generatedPrompt, // Kita kirim prompt lengkap ini sebagai topik ke Groq
                    avatar_id: formData.avatarId,
                    voice_id: formData.voiceId
                })
            });

            const json = await response.json();

            if (!json.success) {
                throw new Error(json.error || "Gagal membuat video di sisi server.");
            }

            // 2. Jika sukses, simpan ke local storage / database Anda
            const videoItem: VideoItem & { heygenVideoId?: string } = {
                id: `video-${Date.now()}`,
                learnerName: formData.learnerName || 'Pembelajar',
                topic: formData.topic || 'Topik belum ditentukan',
                learningStyle: formData.learningStyle,
                persona: formData.avatarId, // Menyimpan ID Avatar
                duration: Number(formData.duration) || 3,
                accentType: formData.voiceId, // Menyimpan ID Suara
                generatedPrompt,
                status: 'Processing', // Ubah status jadi Processing karena HeyGen butuh waktu
                heygenVideoId: json.data.heygen_video_id, // Simpan ID dari HeyGen
                createdAt: new Date().toLocaleString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                }),
            };

            saveVideo(videoItem);

            // 3. Arahkan ke halaman Video Saya
            router.push('/dashboard/my-videos');

        } catch (error: any) {
            console.error(error);
            setErrorMsg(error.message || 'Terjadi kesalahan saat menghubungi server.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:from-slate-950 dark:to-slate-900">
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Buat video baru</p>
                        <h1 className="text-3xl font-bold">Form pembuat video AI</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Lencana Sisa Kredit */}
                        <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400">
                            <span className="text-lg">🪙</span>
                            Sisa Kredit:
                            <span className="font-bold">{remainingCredit}</span>
                        </div>

                        <Link href="/dashboard">
                            <Button variant="outline">Kembali ke dashboard</Button>
                        </Link>
                    </div>
                </div>

                {errorMsg && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
                        {errorMsg}
                    </div>
                )}

                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Isi detail pembelajaran</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="learnerName">Nama pembelajar</Label>
                                <Input id="learnerName" value={formData.learnerName} onChange={(e) => handleChange('learnerName', e.target.value)} placeholder="Contoh: Aisyah" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="topic">Topik</Label>
                                <Input id="topic" value={formData.topic} onChange={(e) => handleChange('topic', e.target.value)} placeholder="Contoh: Algoritma Sorting" required />
                            </div>

                            <div className="space-y-2">
                                <Label>Gaya belajar</Label>
                                <Select value={formData.learningStyle} onValueChange={(value) => handleChange('learningStyle', value ?? '')}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Pilih gaya belajar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="visual">Visual</SelectItem>
                                        <SelectItem value="auditory">Auditory</SelectItem>
                                        <SelectItem value="kinesthetic">Kinesthetic</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="duration">Durasi video (menit)</Label>
                                <Input id="duration" type="number" min="1" max="10" value={formData.duration} onChange={(e) => handleChange('duration', e.target.value)} required />
                            </div>

                            {/* DROPDOWN AVATAR HEYGEN DINAMIS */}
                            <div className="space-y-2">
                                <Label>Pilih Persona (Avatar)</Label>
                                <Select disabled={isLoadingAssets} value={formData.avatarId} onValueChange={(value) => handleChange('avatarId', value ?? '')}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder={isLoadingAssets ? "Memuat avatar..." : "Pilih wajah avatar"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {avatars.map((avatar) => (
                                            <SelectItem key={avatar.avatar_id} value={avatar.avatar_id}>
                                                {avatar.avatar_name} ({avatar.gender})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* DROPDOWN SUARA HEYGEN DINAMIS */}
                            <div className="space-y-2">
                                <Label>Pilih Suara (Voice)</Label>
                                <Select disabled={isLoadingAssets} value={formData.voiceId} onValueChange={(value) => handleChange('voiceId', value ?? '')}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder={isLoadingAssets ? "Memuat suara..." : "Pilih suara bahasa Indonesia"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {voices.map((voice) => (
                                            <SelectItem key={voice.voice_id} value={voice.voice_id}>
                                                {voice.name} ({voice.gender})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="md:col-span-2 space-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                                <Label>Instruksi yang akan dikirim ke AI</Label>
                                <p className="text-sm text-slate-600 dark:text-slate-300">{generatedPrompt}</p>
                            </div>

                            <div className="md:col-span-2 flex justify-end">
                                <Button type="submit" disabled={isSubmitting || isLoadingAssets} className="min-w-44 bg-blue-600 hover:bg-blue-700">
                                    {isSubmitting ? 'Memproses AI...' : 'Buat video AI'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
>>>>>>> ac73fd2d4675bc80707f2e21c555f880a9e4ce08
}
