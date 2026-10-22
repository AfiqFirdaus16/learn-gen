'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Loader2, Play } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { authenticatedFetch } from '@/lib/auth';

type PublishedMaterial = {
  id: number;
  judul: string;
  deskripsi: string | null;
  publishAt: string;
  video: { topic: string; videoUrl: string };
  author: { nama: string };
};

export default function MateriPage() {
  const [materials, setMaterials] = useState<PublishedMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadMaterials() {
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/materials`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Gagal memuat materi.');
        if (!cancelled) setMaterials(Array.isArray(data.materials) ? data.materials : []);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Gagal memuat materi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadMaterials();
    return () => { cancelled = true; };
  }, []);

  return <div className="space-y-6">
    <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Pembelajaran</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Materi</h1><p className="mt-2 text-slate-600">Materi aktif tersedia mulai waktu publikasi dan dapat dipelajari kapan saja.</p></div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    {loading ? <div className="rounded-xl border border-slate-200 bg-white py-14 text-center text-slate-500"><Loader2 className="mx-auto mb-2 size-5 animate-spin" />Memuat materi...</div>
      : materials.length === 0 ? <section className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-blue-200 bg-white p-8 text-center"><BookOpen className="size-10 text-blue-300" /><h2 className="mt-4 text-lg font-bold text-slate-800">Belum ada materi tersedia</h2><p className="mt-1 max-w-md text-sm text-slate-500">Materi aktif akan muncul di sini setelah tanggal dan jam publikasinya.</p></section>
        : <div className="grid gap-5 xl:grid-cols-2">{materials.map((material) => <article key={material.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="aspect-video bg-slate-950"><video className="size-full" src={material.video.videoUrl} controls preload="metadata" aria-label={`Video ${material.judul}`} /></div>
          <div className="p-5"><div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#123b78]"><Play className="size-5" /></div><div className="min-w-0"><h2 className="font-bold text-slate-900">{material.judul}</h2><p className="mt-0.5 text-sm text-slate-500">Video: {material.video.topic}</p></div></div>
            {material.deskripsi && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">{material.deskripsi}</p>}
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">Dari {material.author.nama} · Dipublikasikan {new Date(material.publishAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
        </article>)}</div>}
  </div>;
}
