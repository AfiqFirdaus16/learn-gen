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

export default function CreateVideoPage() {
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
    });

    // State untuk API HeyGen Assets
    const [avatars, setAvatars] = useState<any[]>([]);
    const [voices, setVoices] = useState<any[]>([]);
    const [isLoadingAssets, setIsLoadingAssets] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

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
}

