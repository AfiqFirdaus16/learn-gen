'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ClipboardCheck, Loader2, Plus, Share2, X } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { authenticatedFetch } from '@/lib/auth';

type Test = { id: number; judul: string; status: 'DRAFT' | 'DIBAGIKAN'; createdAt: string; author: { nama: string } };

async function readResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Permintaan gagal diproses.');
  return data;
}

export function TestManagement({ title, eyebrow }: { title: string; eyebrow: string }) {
  const [tests, setTests] = useState<Test[]>([]);
  const [judul, setJudul] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadTests() {
    setLoading(true);
    try {
      const data = await readResponse(await authenticatedFetch(`${API_BASE_URL}/api/tests`));
      setTests(data.tests);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat tes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadTests(); }, []);

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = await readResponse(await authenticatedFetch(`${API_BASE_URL}/api/tests`, { method: 'POST', body: JSON.stringify({ judul }) }));
      setTests((current) => [data.test, ...current]);
      setJudul('');
      setFormOpen(false);
      setNotice('Tes berhasil dibuat sebagai draft.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Gagal membuat tes.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleShare(test: Test) {
    try {
      const status = test.status === 'DIBAGIKAN' ? 'DRAFT' : 'DIBAGIKAN';
      const data = await readResponse(await authenticatedFetch(`${API_BASE_URL}/api/tests/${test.id}`, { method: 'PUT', body: JSON.stringify({ status }) }));
      setTests((current) => current.map((item) => item.id === test.id ? data.test : item));
      setNotice(status === 'DIBAGIKAN' ? 'Tes dibagikan kepada siswa.' : 'Tes ditarik kembali menjadi draft.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Gagal memperbarui tes.');
    }
  }

  return <div className="space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500">{eyebrow}</p><h1 className="mt-1 text-3xl font-bold text-slate-800">{title}</h1><p className="mt-2 text-slate-500">Buat tes dan bagikan kepada siswa.</p></div><button type="button" onClick={() => { setError(''); setFormOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"><Plus className="size-4" />Add Test</button></div><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl border border-slate-200 border-l-4 border-l-indigo-500 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Total tes</p><p className="mt-1 text-3xl font-bold text-indigo-600">{tests.length}</p></div><div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Dibagikan</p><p className="mt-1 text-3xl font-bold text-emerald-600">{tests.filter((test) => test.status === 'DIBAGIKAN').length}</p></div><div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Draft</p><p className="mt-1 text-3xl font-bold text-amber-500">{tests.filter((test) => test.status === 'DRAFT').length}</p></div></div>{notice && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}{error && !formOpen && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-200 p-4 font-semibold text-slate-700"><ClipboardCheck className="size-5 text-indigo-600" />Daftar tes</div>{loading ? <div className="p-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 size-5 animate-spin" />Memuat tes...</div> : tests.length === 0 ? <div className="p-12 text-center text-slate-500">Belum ada tes. Klik Add Test untuk membuat tes.</div> : <div className="divide-y divide-slate-100">{tests.map((test) => <article key={test.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold text-slate-800">{test.judul}</h2><p className="mt-1 text-xs text-slate-500">Dibuat oleh {test.author.nama} pada {new Date(test.createdAt).toLocaleDateString('id-ID')}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${test.status === 'DIBAGIKAN' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{test.status === 'DIBAGIKAN' ? 'Dibagikan' : 'Draft'}</span><button type="button" onClick={() => void toggleShare(test)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Share2 className="size-3.5" />{test.status === 'DIBAGIKAN' ? 'Tarik kembali' : 'Bagikan'}</button></div></article>)}</div>}</section>{formOpen && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label="Tambah tes"><form onSubmit={submitForm} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-xl font-bold text-slate-800">Tambah tes</h2><p className="mt-1 text-sm text-slate-500">Buat judul tes terlebih dahulu, lalu bagikan kepada siswa.</p></div><button type="button" onClick={() => !saving && setFormOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup"><X className="size-5" /></button></div>{error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}<label className="mt-5 block text-sm font-semibold text-slate-700">Judul tes<input required maxLength={150} value={judul} onChange={(event) => setJudul(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Contoh: Evaluasi Aljabar Dasar" /></label><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setFormOpen(false)} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{saving && <Loader2 className="size-4 animate-spin" />}Simpan tes</button></div></form></div>}</div>;
}