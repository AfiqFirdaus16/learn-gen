'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Loader2, Pencil, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { authenticatedFetch } from '@/lib/auth';

type ClassItem = { id: number; namaKelas: string; deskripsi: string | null; createdAt: string; _count: { mahasiswa: number } };
type Props = { basePath: '/admin' | '/dosen' };

async function readResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Permintaan gagal diproses.');
  return data;
}

export function ClassManagement({ basePath }: Props) {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'namaKelas' | 'createdAt'>('namaKelas');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<ClassItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [namaKelas, setNamaKelas] = useState('');
  const [deskripsi, setDeskripsi] = useState('');

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ sortBy, sortOrder });
      if (search.trim()) params.set('search', search.trim());
      const data = await readResponse(await authenticatedFetch(`${API_BASE_URL}/api/classes?${params}`));
      setClasses(Array.isArray(data.classes) ? data.classes : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat kelas.');
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, sortOrder]);

  useEffect(() => { void loadClasses(); }, [loadClasses]);

  function openCreate() {
    setEditing(null);
    setNamaKelas('');
    setDeskripsi('');
    setError('');
    setFormOpen(true);
  }

  function openEdit(kelas: ClassItem) {
    setEditing(kelas);
    setNamaKelas(kelas.namaKelas);
    setDeskripsi(kelas.deskripsi || '');
    setError('');
    setFormOpen(true);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!namaKelas.trim()) return setError('Nama kelas wajib diisi.');
    if (namaKelas.trim().length > 100) return setError('Nama kelas maksimal 100 karakter.');
    setSaving(true);
    setError('');
    try {
      const data = await readResponse(await authenticatedFetch(`${API_BASE_URL}/api/classes${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify({ namaKelas: namaKelas.trim(), deskripsi: deskripsi.trim() }),
      }));
      setNotice(editing ? 'Kelas berhasil diperbarui.' : 'Kelas berhasil ditambahkan.');
      setFormOpen(false);
      await loadClasses();
      if (editing && data.kelas) setClasses((current) => current.map((item) => item.id === data.kelas.id ? { ...item, ...data.kelas } : item));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Gagal menyimpan kelas.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteClass(kelas: ClassItem) {
    if (!window.confirm(`Hapus kelas “${kelas.namaKelas}”? Anggota kelas akan dilepas.`)) return;
    setError('');
    setNotice('');
    try {
      await readResponse(await authenticatedFetch(`${API_BASE_URL}/api/classes/${kelas.id}`, { method: 'DELETE' }));
      setNotice('Kelas berhasil dihapus.');
      setClasses((current) => current.filter((item) => item.id !== kelas.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Gagal menghapus kelas.');
    }
  }

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Administrasi</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Manajemen Kelas</h1><p className="mt-2 text-slate-600">Buat kelas dan atur anggota mahasiswa.</p></div><button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"><Plus className="size-4" />Tambah kelas</button></header>
    {error && !formOpen && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}{notice && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 font-semibold text-slate-800"><BookOpen className="size-5 text-indigo-600" />Daftar kelas</div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama kelas" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm sm:w-64" /></label><select aria-label="Urutkan kelas" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="namaKelas">Urutkan: nama</option><option value="createdAt">Urutkan: tanggal dibuat</option></select><select aria-label="Arah urutan" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="asc">Naik</option><option value="desc">Turun</option></select></div></div>
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Nama Kelas</th><th className="px-5 py-3 font-semibold">Jumlah Mahasiswa</th><th className="px-5 py-3 font-semibold">Deskripsi</th><th className="px-5 py-3 text-right font-semibold">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 size-5 animate-spin" />Memuat kelas...</td></tr> : classes.length === 0 ? <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500">{search ? 'Tidak ada kelas yang cocok dengan pencarian.' : 'Belum ada kelas. Tambahkan kelas pertama Anda.'}</td></tr> : classes.map((kelas) => <tr key={kelas.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-800">{kelas.namaKelas}</td><td className="px-5 py-4 text-slate-600">{kelas._count.mahasiswa} mahasiswa</td><td className="max-w-md px-5 py-4 text-slate-600">{kelas.deskripsi || '—'}</td><td className="px-5 py-4"><div className="flex justify-end gap-1"><button type="button" onClick={() => openEdit(kelas)} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50" aria-label={`Edit ${kelas.namaKelas}`}><Pencil className="size-4" /></button><button type="button" onClick={() => router.push(`${basePath}/classes/${kelas.id}`)} className="rounded-lg p-2 text-sky-700 hover:bg-sky-50" aria-label={`Lihat anggota ${kelas.namaKelas}`}><Users className="size-4" /></button><button type="button" onClick={() => void deleteClass(kelas)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label={`Hapus ${kelas.namaKelas}`}><Trash2 className="size-4" /></button></div></td></tr>)}</tbody></table></div>
    </section>
    {formOpen && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label={editing ? 'Edit kelas' : 'Tambah kelas'}><form onSubmit={submitForm} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-xl font-bold text-slate-900">{editing ? 'Edit kelas' : 'Tambah kelas'}</h2><p className="mt-1 text-sm text-slate-500">Nama kelas harus unik.</p></div><button type="button" onClick={() => !saving && setFormOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup"><X className="size-5" /></button></div>{error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}<div className="mt-5 space-y-4"><label className="block text-sm font-semibold text-slate-700">Nama Kelas<input required maxLength={100} value={namaKelas} onChange={(event) => setNamaKelas(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label><label className="block text-sm font-semibold text-slate-700">Deskripsi Kelas <span className="font-normal text-slate-400">(opsional)</span><textarea rows={4} value={deskripsi} onChange={(event) => setDeskripsi(event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => !saving && setFormOpen(false)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600">Batal</button><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving && <Loader2 className="size-4 animate-spin" />}{editing ? 'Simpan perubahan' : 'Tambah kelas'}</button></div></form></div>}
  </div>;
}
