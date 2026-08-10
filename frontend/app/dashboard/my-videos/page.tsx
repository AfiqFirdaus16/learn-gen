'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getStoredVideos, type VideoItem } from '@/lib/video-storage';

function AttemptDetails({ video, failed = false }: { video: VideoItem; failed?: boolean }) {
    const statusLabel = video.status === 'Processing' ? 'Diproses' : video.status;

    return <Card className={failed ? 'border-red-100 shadow-sm' : 'border-emerald-100 shadow-sm'}><CardHeader><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-xl">{video.topic}</CardTitle><p className="text-sm text-slate-600 dark:text-slate-300">{video.persona} / {video.duration} menit / {video.createdAt}</p></div><span className={`w-fit rounded-full px-3 py-1 text-sm font-medium ${failed ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>{failed ? 'Gagal' : statusLabel}</span></div></CardHeader><CardContent className={failed ? 'space-y-3' : undefined}><div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"><p className="font-semibold">Prompt lengkap</p><pre className="mt-1 whitespace-pre-wrap font-sans">{video.generatedPrompt}</pre></div>{failed && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"><p className="font-semibold">Alasan gagal</p><p className="mt-1">{video.failureReason || 'Penyebab kegagalan tidak tersedia.'}</p><Link href={`/dashboard/create-video?retry=${encodeURIComponent(video.id)}`}><Button className="mt-4" size="sm">Generate ulang</Button></Link></div>}</CardContent></Card>;
}

export default function MyVideosPage() {
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [openPanel, setOpenPanel] = useState<'success' | 'failed' | null>(null);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => setVideos(getStoredVideos()));
        return () => window.cancelAnimationFrame(frame);
    }, []);

    const successfulAttempts = videos.filter((video) => video.status !== 'Failed');
    const failedAttempts = videos.filter((video) => video.status === 'Failed');
    const togglePanel = (panel: 'success' | 'failed') => setOpenPanel((current) => current === panel ? null : panel);

    return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:from-slate-950 dark:to-slate-900"><div className="mx-auto max-w-6xl space-y-6"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600">Riwayat generate</p><h1 className="text-3xl font-bold">Riwayat percobaan video</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Prompt tersimpan untuk setiap percobaan, baik yang berhasil maupun gagal.</p></div><Link href="/dashboard"></Link></div>
        {videos.length === 0 ? <Card className="shadow-sm"><CardContent className="py-12 text-center"><p className="text-lg font-semibold">Belum ada riwayat generate.</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Buat video pertama Anda dari halaman pembuatan video.</p><Link href="/dashboard/create-video"><Button className="mt-6">Buat video baru</Button></Link></CardContent></Card> : <div className="space-y-8">
            <div className="grid items-start gap-3 sm:grid-cols-2">
                <section className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900"><button type="button" onClick={() => togglePanel('success')} aria-expanded={openPanel === 'success'} className="w-full p-4 text-left transition hover:bg-emerald-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">Berhasil dibuat</p><p className="mt-1 text-2xl font-bold">{successfulAttempts.length}</p></div><span className="text-sm font-semibold">{openPanel === 'success' ? 'Tutup detail' : 'Lihat detail'}</span></div></button>{openPanel === 'success' && <div className="space-y-3 border-t border-emerald-200 p-4">{successfulAttempts.length === 0 ? <p className="text-sm">Belum ada video yang berhasil dikirim.</p> : successfulAttempts.map((video) => <AttemptDetails key={video.id} video={video} />)}</div>}</section>
                <section className="overflow-hidden rounded-xl border border-red-200 bg-red-50 text-red-900"><button type="button" onClick={() => togglePanel('failed')} aria-expanded={openPanel === 'failed'} className="w-full p-4 text-left transition hover:bg-red-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">Gagal dibuat</p><p className="mt-1 text-2xl font-bold">{failedAttempts.length}</p></div><span className="text-sm font-semibold">{openPanel === 'failed' ? 'Tutup detail' : 'Lihat detail'}</span></div></button>{openPanel === 'failed' && <div className="space-y-3 border-t border-red-200 p-4">{failedAttempts.length === 0 ? <p className="text-sm">Belum ada percobaan yang gagal.</p> : failedAttempts.map((video) => <AttemptDetails key={video.id} video={video} failed />)}</div>}</section>
            </div>
            <section className="space-y-4"><h2 className="text-xl font-semibold">Semua percobaan</h2><div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">{videos.map((video) => { const failed = video.status === 'Failed'; const label = failed ? 'Gagal' : video.status === 'Processing' ? 'Berhasil dikirim' : video.status; return <div key={video.id} className="flex flex-col gap-2 border-b border-slate-100 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800"><div><p className="font-semibold">{video.topic}</p><p className="text-sm text-slate-500">{video.createdAt}</p></div><span className={`w-fit rounded-full px-3 py-1 text-sm font-medium ${failed ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>{label}</span></div>; })}</div></section>
        </div>}
    </div></div>;
}
