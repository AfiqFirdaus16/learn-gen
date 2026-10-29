'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Search, UserMinus, UserPlus, Users } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { authenticatedFetch } from '@/lib/auth';

type Student = { id: number; nama: string; nim: string | null; email: string };
type ClassDetail = { id: number; namaKelas: string; deskripsi: string | null; mahasiswa: Student[] };

async function readResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Permintaan gagal diproses.');
  return data;
}

export function ClassDetail({ basePath }: { basePath: '/admin' | '/dosen' }) {
  const params = useParams<{ id: string }>();
  const classId = params.id;
  const [kelas, setKelas] = useState<ClassDetail | null>(null);
  const [available, setAvailable] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [namaKelas, setNamaKelas] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadClass = useCallback(async () => {
    const data = await readResponse(await authenticatedFetch(`${API_BASE_URL}/api/classes/${classId}`));
    setKelas(data.kelas);
    setNamaKelas(data.kelas.namaKelas);
    setDeskripsi(data.kelas.deskripsi || '');
  }, [classId]);

  const loadAvailable = useCallback(async () => {
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    const data = await readResponse(await authenticatedFetch(`${API_BASE_URL}/api/classes/${classId}/available-students${query}`));
    setAvailable(Array.isArray(data.students) ? data.students : []);
  }, [classId, search]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadClass(), loadAvailable()]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat kelas.');
    } finally {
      setLoading(false);
    }
  }, [loadClass, loadAvailable]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const visibleSelected = useMemo(() => new Set(selected), [selected]);

  async function updateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!namaKelas.trim()) return setError('Nama kelas wajib diisi.');
    if (namaKelas.trim().length > 100) return setError('Nama kelas maksimal 100 karakter.');
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const data = await readResponse(await authenticatedFetch(`${API_BASE_URL}/api/classes/${classId}`, {
        method: 'PUT', body: JSON.stringify({ namaKelas: namaKelas.trim(), deskripsi: deskripsi.trim() }),
      }));
      setKelas((current) => current ? { ...current, ...data.kelas } : current);
      setNotice('Informasi kelas berhasil diperbarui.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Gagal memperbarui kelas.');
    } finally {
      setSaving(false);
    }
  }

  async function addStudents(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected.length === 0) return setError('Pilih minimal satu mahasiswa untuk ditambahkan.');
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await readResponse(await authenticatedFetch(`${API_BASE_URL}/api/classes/${classId}/students`, {
        method: 'POST', body: JSON.stringify({ studentIds: selected }),
      }));
      setSelected([]);
      setNotice(`${selected.length} mahasiswa berhasil ditambahkan ke kelas.`);
      await loadAll();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Gagal menambahkan mahasiswa.');
    } finally {
      setSaving(false);
    }
  }

  async function removeStudent(student: Student) {
    if (!window.confirm(`Keluarkan ${student.nama} dari kelas ini?`)) return;
    setError('');
    setNotice('');
    try {
      await readResponse(await authenticatedFetch(`${API_BASE_URL}/api/classes/${classId}/students/${student.id}`, { method: 'DELETE' }));
      setNotice(`${student.nama} berhasil dikeluarkan dari kelas.`);
      await loadAll();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Gagal mengeluarkan mahasiswa.');
    }
  }

  if (loading && !kelas) return <div className="p-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 size-5 animate-spin" />Memuat kelas...</div>;
  if (error && !kelas) return <div className="space-y-4"><p role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</p><Link href={`${basePath}/classes`} className="text-sm font-semibold text-indigo-700">Kembali ke daftar kelas</Link></div>;
  if (!kelas) return null;

  return <div className="space-y-6">
    <Link href={`${basePath}/classes`} className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:underline"><ArrowLeft className="size-4" />Kembali ke daftar kelas</Link>
    <header><p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Manajemen kelas</p><h1 className="mt-1 text-3xl font-bold text-slate-900">{kelas.namaKelas}</h1><p className="mt-2 text-slate-600">Kelola informasi kelas dan mahasiswa yang terdaftar.</p></header>
    {error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}{notice && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
    <form onSubmit={updateClass} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-800">Informasi kelas</h2><div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-semibold text-slate-700">Nama Kelas<input required maxLength={100} value={namaKelas} onChange={(event) => setNamaKelas(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label><label className="block text-sm font-semibold text-slate-700">Deskripsi Kelas <span className="font-normal text-slate-400">(opsional)</span><textarea rows={3} value={deskripsi} onChange={(event) => setDeskripsi(event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label></div><button disabled={saving} type="submit" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Menyimpan...' : 'Simpan informasi kelas'}</button></form>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 p-4"><h2 className="flex items-center gap-2 font-bold text-slate-800"><Users className="size-5 text-indigo-600" />Anggota kelas ({kelas.mahasiswa.length})</h2></div>{kelas.mahasiswa.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Belum ada mahasiswa dalam kelas ini.</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Nama</th><th className="px-5 py-3 font-semibold">NIM</th><th className="px-5 py-3 font-semibold">Email</th><th className="px-5 py-3 text-right font-semibold">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{kelas.mahasiswa.map((student) => <tr key={student.id}><td className="px-5 py-4 font-semibold text-slate-800">{student.nama}</td><td className="px-5 py-4 text-slate-600">{student.nim || '—'}</td><td className="px-5 py-4 text-slate-600">{student.email}</td><td className="px-5 py-4 text-right"><button type="button" onClick={() => void removeStudent(student)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"><UserMinus className="size-4" />Keluarkan</button></td></tr>)}</tbody></table></div>}</section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="flex items-center gap-2 text-lg font-bold text-slate-800"><UserPlus className="size-5 text-indigo-600" />Masukkan mahasiswa</h2><p className="mt-1 text-sm text-slate-500">Cari berdasarkan nama atau NIM. Pilih beberapa mahasiswa sekaligus.</p></div><label className="relative mb-4 block max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau NIM" className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm" /></label><form onSubmit={addStudents} className="space-y-4"><div className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">{available.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Tidak ada mahasiswa tersedia yang cocok.</p> : available.map((student) => <label key={student.id} className="flex cursor-pointer items-center gap-3 p-3 hover:bg-slate-50"><input type="checkbox" checked={visibleSelected.has(student.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} className="size-4 accent-indigo-600" /><span className="min-w-0 flex-1"><span className="block font-semibold text-slate-800">{student.nama}</span><span className="block text-xs text-slate-500">NIM: {student.nim || '—'} · {student.email}</span></span></label>)}</div><div className="flex items-center justify-between"><span className="text-sm text-slate-500">{selected.length} mahasiswa dipilih</span><button disabled={saving || selected.length === 0} type="submit" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving && <Loader2 className="size-4 animate-spin" />}Tambahkan ke kelas</button></div></form></section>
  </div>;
}
