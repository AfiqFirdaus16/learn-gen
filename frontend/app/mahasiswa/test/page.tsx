'use client';

import { useEffect, useState } from 'react';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { authenticatedFetch } from '@/lib/auth';

type Test = { id: number; judul: string; createdAt: string; author: { nama: string } };

export default function TestPage() {
	const [tests, setTests] = useState<Test[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	useEffect(() => { authenticatedFetch(`${API_BASE_URL}/api/tests`).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setTests(data.tests); }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Gagal memuat tes.')).finally(() => setLoading(false)); }, []);
	return <div className="space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500">Pembelajaran</p><h1 className="mt-1 text-3xl font-bold text-slate-800">Test</h1><p className="mt-2 text-slate-500">Kerjakan tes yang dibagikan oleh guru.</p></div>{error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-200 p-4 font-semibold text-slate-700"><ClipboardCheck className="size-5 text-indigo-600" />Tes tersedia</div>{loading ? <div className="p-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 size-5 animate-spin" />Memuat tes...</div> : tests.length === 0 ? <div className="p-12 text-center text-slate-500">Belum ada tes yang dibagikan.</div> : <div className="divide-y divide-slate-100">{tests.map((test) => <article key={test.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold text-slate-800">{test.judul}</h2><p className="mt-1 text-xs text-slate-500">Dibagikan oleh {test.author.nama} pada {new Date(test.createdAt).toLocaleDateString('id-ID')}</p></div><button type="button" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Mulai tes</button></article>)}</div>}</section></div>;
}
