'use client';

import { useMemo, useState } from 'react';
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
  const [formData, setFormData] = useState({
    learnerName: '',
    topic: '',
    learningStyle: 'visual',
    persona: 'guru ramah',
    duration: '3',
    accentType: 'British',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generatedPrompt = useMemo(() => {
    const duration = Number(formData.duration) || 3;
    return `Buat video pembelajaran tentang ${formData.topic || 'topik yang dipilih'} berdurasi ${duration} menit dengan gaya ${formData.learningStyle}, persona ${formData.persona}, dan aksen ${formData.accentType}.`;
  }, [formData]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const videoItem: VideoItem = {
      id: `video-${Date.now()}`,
      learnerName: formData.learnerName || 'Pembelajar',
      topic: formData.topic || 'Topik belum ditentukan',
      learningStyle: formData.learningStyle,
      persona: formData.persona,
      duration: Number(formData.duration) || 3,
      accentType: formData.accentType,
      generatedPrompt,
      status: 'Completed',
      createdAt: new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    saveVideo(videoItem);

    setTimeout(() => {
      router.push('/dashboard/my-videos');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Buat video baru</p>
            <h1 className="text-3xl font-bold">Form pembuat video AI</h1>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">Kembali ke dashboard</Button>
          </Link>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Isi detail pembelajaran</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="learnerName">Nama pembelajar</Label>
                <Input id="learnerName" value={formData.learnerName} onChange={(e) => handleChange('learnerName', e.target.value)} placeholder="Contoh: Aisyah" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic">Topik</Label>
                <Input id="topic" value={formData.topic} onChange={(e) => handleChange('topic', e.target.value)} placeholder="Contoh: Algoritma Sorting" />
              </div>

              <div className="space-y-2">
                <Label>Gaya belajar</Label>
                <Select value={formData.learningStyle} onValueChange={(value) => handleChange('learningStyle', value)}>
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
                <Label>Persona</Label>
                <Select value={formData.persona} onValueChange={(value) => handleChange('persona', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih persona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guru ramah">Guru ramah</SelectItem>
                    <SelectItem value="mentor serius">Mentor serius</SelectItem>
                    <SelectItem value="pengajar energik">Pengajar energik</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Durasi video (menit)</Label>
                <Input id="duration" type="number" min="1" max="10" value={formData.duration} onChange={(e) => handleChange('duration', e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Aksen</Label>
                <Select value={formData.accentType} onValueChange={(value) => handleChange('accentType', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih aksen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="British">British</SelectItem>
                    <SelectItem value="American">American</SelectItem>
                    <SelectItem value="Australian">Australian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <Label>Prompt yang akan dibuat</Label>
                <p className="text-sm text-slate-600 dark:text-slate-300">{generatedPrompt}</p>
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={isSubmitting} className="min-w-44">
                  {isSubmitting ? 'Menyimpan...' : 'Buat video'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
