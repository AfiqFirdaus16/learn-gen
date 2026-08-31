'use client';

import { FormEvent, useEffect, useState } from 'react';
import { BookOpen, Loader2, Plus, X } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { authenticatedFetch } from '@/lib/auth';

type Material = { id: number; judul: string; deskripsi: string | null; createdAt: string; author: { nama: string } };

async function readResponse(response: Response) {
	const data = await response.json().catch(() => ({}));
	if (!response.ok) throw new Error(data.error || 'Permintaan gagal diproses.');
	return data;
}

export default function MaterialsPage() {
	const [materials, setMaterials] = useState<Material[]>([]);
	const [form, setForm] = useState({ judul: '', deskripsi: '' });
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');

	useEffect(() => {
		let cancelled = false;
		async function loadMaterials() {
			try {
				const response = await authenticatedFetch(`${API_BASE_URL}/api/materials`);
				const data = await readResponse(response);
				if (!cancelled) setMaterials(data.materials);
			} catch (loadError) {
				if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Gagal memuat materi.');
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		void loadMaterials();
		return () => { cancelled = true; };
	}, []);

	function openForm() {
		setForm({ judul: '', deskripsi: '' });
		setError('');
		setIsFormOpen(true);
	}

	async function submitForm(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		setError('');
		try {
			const response = await authenticatedFetch(`${API_BASE_URL}/api/materials`, { method: 'POST', body: JSON.stringify(form) });
			const data = await readResponse(response);
			setMaterials((current) => [data.material, ...current]);
			setNotice('Materi berhasil ditambahkan.');
			setIsFormOpen(false);
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : 'Gagal menambahkan materi.');
		} finally {
			setSaving(false);
		}
	}

	return <div className="space-y-6">
		<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500">Administrasi</p><h1 className="mt-1 text-3xl font-bold text-slate-800">Manajemen Materi</h1><p className="mt-2 text-slate-500">Kelola materi pembelajaran untuk siswa.</p></div><button type="button" onClick={openForm} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"><Plus className="size-4" />Add Materi</button></div>
		<div className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl border border-slate-200 border-l-4 border-l-indigo-500 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Total materi</p><p className="mt-1 text-3xl font-bold text-indigo-600">{materials.length}</p></div><div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2"><p className="text-sm font-semibold text-slate-700">Materi pembelajaran</p><p className="mt-1 text-sm text-slate-500">Tambahkan judul dan deskripsi agar siswa memiliki bahan belajar yang terorganisir.</p></div></div>
		{notice && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
		{error && !isFormOpen && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
		<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-200 p-4 font-semibold text-slate-700"><BookOpen className="size-5 text-indigo-600" />Daftar materi</div><div className="divide-y divide-slate-100">{loading ? <div className="p-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 size-5 animate-spin" />Memuat materi...</div> : materials.length === 0 ? <div className="p-12 text-center text-slate-500">Belum ada materi. Klik Add Materi untuk menambahkan.</div> : materials.map((material) => <article key={material.id} className="p-5 hover:bg-slate-50"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-bold text-slate-800">{material.judul}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{material.deskripsi || 'Tidak ada deskripsi.'}</p></div><p className="shrink-0 text-xs text-slate-400">{new Date(material.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-500">Dibuat oleh {material.author.nama}</p></article>)}</div></section>
		{isFormOpen && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label="Tambah materi"><form onSubmit={submitForm} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-xl font-bold text-slate-800">Tambah materi</h2><p className="mt-1 text-sm text-slate-500">Isi informasi materi yang akan dipelajari siswa.</p></div><button type="button" onClick={() => !saving && setIsFormOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup"><X className="size-5" /></button></div>{error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}<div className="mt-5 space-y-4"><label className="block text-sm font-semibold text-slate-700">Judul materi<input required maxLength={150} value={form.judul} onChange={(event) => setForm({ ...form, judul: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Contoh: Pengantar Aljabar" /></label><label className="block text-sm font-semibold text-slate-700">Deskripsi<textarea rows={4} value={form.deskripsi} onChange={(event) => setForm({ ...form, deskripsi: event.target.value })} className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Jelaskan isi materi secara singkat" /></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setIsFormOpen(false)} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Batal</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{saving && <Loader2 className="size-4 animate-spin" />}Simpan materi</button></div></form></div>}
	</div>;
}
