'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { API_BASE_URL } from '@/lib/api-config';
import { authenticatedFetch, getRoleHomeRoute } from '@/lib/auth';

type MaterialRecord = {
  id: number;
  topic: string;
  persona: string;
  duration: number;
  durationSeconds: number | null;
  accentType: string;
  script: string | null;
  scriptDescription: string | null;
  generatedPrompt: string | null;
  videoUrl: string | null;
  status: string;
  createdAt: string;
  elevenlabsVideoId: string | null;
};

async function readApiJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Permintaan gagal (HTTP ${response.status}).`);
  return data;
}

function getDurationLabel(video: MaterialRecord) {
  const seconds = video.durationSeconds ?? video.duration * 60;
  if (seconds < 60) return `${seconds} detik`;
  if (seconds % 60 === 0) return `${seconds / 60} menit`;
  return `${Math.floor(seconds / 60)} menit ${seconds % 60} detik`;
}

function getStatusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'completed' || normalized === 'done') return 'Selesai';
  if (normalized === 'failed' || normalized === 'error') return 'Gagal';
  return 'Sedang diproses';
}

export default function MaterialHistory() {
  const [videos, setVideos] = useState<MaterialRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [homeHref, setHomeHref] = useState('/dosen');

  const refreshHistory = useCallback(async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/videos`);
      const data = await readApiJson(response);
      setVideos(Array.isArray(data.data) ? data.data : []);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Gagal memuat riwayat materi.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHomeHref(getRoleHomeRoute());
      void refreshHistory();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshHistory]);

  useEffect(() => {
    if (!videos.some((video) => video.status.toLowerCase() === 'processing' && video.elevenlabsVideoId)) return;

    const intervalId = window.setInterval(async () => {
      const processingVideos = videos.filter((video) => video.status.toLowerCase() === 'processing' && video.elevenlabsVideoId);
      const updates = await Promise.all(processingVideos.map(async (video) => {
        try {
          const response = await authenticatedFetch(`${API_BASE_URL}/api/videos/status/${video.id}`);
          const data = await readApiJson(response);
          const providerStatus = String(data.data?.providerStatus || data.data?.dIdStatus || 'processing').toLowerCase();
          const status = providerStatus === 'done' ? 'completed' : ['failed', 'error'].includes(providerStatus) ? 'failed' : 'processing';
          return { id: video.id, status, videoUrl: data.data?.resultUrl || null };
        } catch {
          return null;
        }
      }));

      const resolvedUpdates = updates.filter((update): update is NonNullable<typeof update> => update !== null);
      if (resolvedUpdates.length) {
        setVideos((current) => current.map((video) => {
          const update = resolvedUpdates.find((item) => item.id === video.id);
          return update ? { ...video, status: update.status, videoUrl: update.videoUrl || video.videoUrl } : video;
        }));
      }
    }, 10_000);

    return () => window.clearInterval(intervalId);
  }, [videos]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Materi dosen</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Riwayat materi</h1>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => void refreshHistory(true)} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 size-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              Perbarui
            </Button>
            <Link href="/dosen/buat-materi"><Button type="button">Buat materi</Button></Link>
            <Link href={homeHref}><Button type="button" variant="outline">Dashboard</Button></Link>
          </div>
        </header>

        {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {isLoading ? (
          <p className="py-12 text-center text-sm text-slate-600">Memuat riwayat materi...</p>
        ) : videos.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><p className="font-semibold text-slate-900">Belum ada materi</p><p className="mt-1 text-sm text-slate-600">Materi yang dibuat akan muncul di halaman ini.</p><Link href="/dosen/buat-materi"><Button className="mt-4">Buat materi pertama</Button></Link></CardContent></Card>
        ) : (
          <div className="space-y-4">
            {videos.map((video) => {
              const scriptDescription = video.scriptDescription || video.generatedPrompt || video.script || 'Deskripsi naskah tidak tersedia.';
              const statusLabel = getStatusLabel(video.status);
              const completed = ['completed', 'done'].includes(video.status.toLowerCase()) && Boolean(video.videoUrl);

              const videoProviderName = video.accentType === 'heygen' ? 'HeyGen' : video.accentType === 'elevenlabs' ? 'D-ID + ElevenLabs' : 'D-ID';
              return (
                <Card key={video.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                    <div className="min-w-0">
                      <CardTitle className="break-words">{video.topic}</CardTitle>
                      <p className="mt-1 text-sm text-slate-500">Dibuat {new Date(video.createdAt).toLocaleString('id-ID')} · Provider {videoProviderName}</p>
                    </div>
                    <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${completed ? 'bg-green-100 text-green-800' : video.status.toLowerCase() === 'failed' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{statusLabel}</span>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <dl className="grid gap-4 sm:grid-cols-3">
                      <div><dt className="text-xs font-semibold uppercase text-slate-500">Topik</dt><dd className="mt-1 text-sm text-slate-900">{video.topic}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-500">Persona</dt><dd className="mt-1 text-sm text-slate-900">{video.persona}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase text-slate-500">Durasi</dt><dd className="mt-1 text-sm text-slate-900">{getDurationLabel(video)}</dd></div>
                    </dl>
                    <div>
                      <h2 className="text-xs font-semibold uppercase text-slate-500">Deskripsi naskah</h2>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{scriptDescription}</p>
                    </div>
                    <div className="border-t border-slate-200 pt-3">
                      {completed && video.videoUrl ? (
                        <a href={video.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 underline-offset-4 hover:underline">
                          <ExternalLink className="size-4" aria-hidden="true" /> Buka video
                        </a>
                      ) : video.status.toLowerCase() === 'failed' ? (
                        <p className="text-sm text-red-700">Video gagal dibuat. Anda dapat mencoba membuat materi kembali.</p>
                      ) : (
                        <p className="text-sm text-slate-600">Video sedang diproses {videoProviderName}. Status diperiksa otomatis setiap 10 detik.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
