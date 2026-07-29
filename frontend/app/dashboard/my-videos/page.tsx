'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getStoredVideos, type VideoItem } from '@/lib/video-storage';

export default function MyVideosPage() {
    const [videos, setVideos] = useState<VideoItem[]>([]);

    useEffect(() => {
        setVideos(getStoredVideos());
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:from-slate-950 dark:to-slate-900">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600">Video yang telah dibuat</p>
                        <h1 className="text-3xl font-bold">Daftar video pembelajaran</h1>
                    </div>
                    <Link href="/dashboard">
                        <Button variant="outline">Kembali ke dashboard</Button>
                    </Link>
                </div>

                {videos.length === 0 ? (
                    <Card className="shadow-sm">
                        <CardContent className="py-12 text-center">
                            <p className="text-lg font-semibold">Belum ada video yang dibuat.</p>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Buat video pertama Anda dari halaman pembuatan video.</p>
                            <Link href="/dashboard/create-video">
                                <Button className="mt-6">Buat video baru</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {videos.map((video) => (
                            <Card key={video.id} className="shadow-sm">
                                <CardHeader>
                                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <CardTitle className="text-xl">{video.topic}</CardTitle>
                                            <p className="text-sm text-slate-600 dark:text-slate-300">Untuk: {video.learnerName}</p>
                                        </div>
                                        <div className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                            {video.status}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid gap-3 md:grid-cols-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-500">Persona</p>
                                        <p>{video.persona}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-500">Durasi</p>
                                        <p>{video.duration} menit</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-500">Tanggal dibuat</p>
                                        <p>{video.createdAt}</p>
                                    </div>
                                    <div className="md:col-span-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                                        <p className="font-semibold">Prompt</p>
                                        <p className="mt-1">{video.generatedPrompt}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
