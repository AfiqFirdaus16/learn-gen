'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { authenticatedFetch, getAdmin } from '@/lib/auth';

type Role = 'admin' | 'dosen' | 'mahasiswa';
type User = { id: number; nama: string; email: string; role: Role; createdAt: string };
type FormData = { nama: string; email: string; password: string; role: Role };

const initialForm: FormData = { nama: '', email: '', password: '', role: 'mahasiswa' };
const roleLabel: Record<Role, string> = { admin: 'Admin', dosen: 'Dosen', mahasiswa: 'Mahasiswa' };
const roleClass: Record<Role, string> = {
  admin: 'bg-violet-100 text-violet-700',
  dosen: 'bg-sky-100 text-sky-700',
  mahasiswa: 'bg-emerald-100 text-emerald-700',
};

async function readResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Permintaan gagal diproses.');
  return data;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<FormData>(initialForm);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const currentUser = getAdmin();

  const loadUsers = useCallback(async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('search', query.trim());
      const suffix = params.size ? `?${params.toString()}` : '';
      const response = await authenticatedFetch(`${API_BASE_URL}/api/users${suffix}`);
      const data = await readResponse(response);
      setUsers(data.users);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat pengguna.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const totals = useMemo(() => ({
    all: users.length,
    dosen: users.filter((user) => user.role === 'dosen').length,
    mahasiswa: users.filter((user) => user.role === 'mahasiswa').length,
  }), [users]);

  function openCreate() {
    setEditingUser(null);
    setForm(initialForm);
    setError('');
    setIsFormOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm({ nama: user.nama, email: user.email, password: '', role: user.role });
    setError('');
    setIsFormOpen(true);
  }

  function closeForm() {
    if (!saving) setIsFormOpen(false);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = editingUser && !form.password ? { ...form, password: undefined } : form;
      const response = await authenticatedFetch(`${API_BASE_URL}/api/users${editingUser ? `/${editingUser.id}` : ''}`, {
        method: editingUser ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      await readResponse(response);
      setNotice(editingUser ? 'Data pengguna diperbarui.' : 'Pengguna baru berhasil ditambahkan.');
      setIsFormOpen(false);
      await loadUsers(search);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Gagal menyimpan pengguna.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(user: User) {
    if (!window.confirm(`Hapus akun ${user.nama}? Tindakan ini tidak dapat dibatalkan.`)) return;
    setError('');
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/users/${user.id}`, { method: 'DELETE' });
      await readResponse(response);
      setNotice('Pengguna berhasil dihapus.');
      await loadUsers(search);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Gagal menghapus pengguna.');
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadUsers(search);
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500">Administrasi</p><h1 className="mt-1 text-3xl font-bold text-slate-800">Manage User</h1><p className="mt-2 text-slate-500">Kelola akun admin, dosen, dan mahasiswa.</p></div>
      <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"><Plus className="size-4" />Tambah pengguna</button>
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      {[['Total pengguna', totals.all, 'text-indigo-600'], ['Dosen', totals.dosen, 'text-sky-600'], ['Mahasiswa', totals.mahasiswa, 'text-emerald-600']].map(([label, value, color]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p></div>)}
    </div>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 font-semibold text-slate-700"><Users className="size-5 text-indigo-600" />Daftar pengguna</div><form onSubmit={handleSearch} className="flex w-full gap-2 sm:w-auto"><label className="relative block flex-1 sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, email, atau peran" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label><button type="submit" className="rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cari</button></form></div>
      {notice && <p className="mx-4 mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
      {error && <p className="mx-4 mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Pengguna</th><th className="px-5 py-3 font-semibold">Peran</th><th className="px-5 py-3 font-semibold">Dibuat</th><th className="px-5 py-3 text-right font-semibold">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 size-5 animate-spin" />Memuat pengguna...</td></tr> : users.length === 0 ? <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500">Tidak ada pengguna yang cocok.</td></tr> : users.map((user) => <tr key={user.id} className="hover:bg-slate-50"><td className="px-5 py-4"><p className="font-semibold text-slate-800">{user.nama}</p><p className="mt-0.5 text-slate-500">{user.email}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${roleClass[user.role]}`}>{roleLabel[user.role]}</span></td><td className="px-5 py-4 text-slate-500">{new Date(user.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => openEdit(user)} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50" aria-label={`Edit ${user.nama}`}><Pencil className="size-4" /></button><button type="button" onClick={() => void deleteUser(user)} disabled={user.id === currentUser?.id} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300" aria-label={`Hapus ${user.nama}`}><Trash2 className="size-4" /></button></div></td></tr>)}</tbody></table></div>
    </section>

    {isFormOpen && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label={editingUser ? 'Edit pengguna' : 'Tambah pengguna'}><form onSubmit={submitForm} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-xl font-bold text-slate-800">{editingUser ? 'Edit pengguna' : 'Tambah pengguna'}</h2><p className="mt-1 text-sm text-slate-500">{editingUser ? 'Kosongkan password jika tidak ingin mengubahnya.' : 'Password minimal 6 karakter.'}</p></div><button type="button" onClick={closeForm} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup"><X className="size-5" /></button></div>{error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}<div className="mt-5 space-y-4"><label className="block text-sm font-semibold text-slate-700">Nama<input required value={form.nama} onChange={(event) => setForm({ ...form, nama: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label><label className="block text-sm font-semibold text-slate-700">Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label><label className="block text-sm font-semibold text-slate-700">Password<input required={!editingUser} minLength={editingUser ? undefined : 6} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label><label className="block text-sm font-semibold text-slate-700">Peran<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"><option value="admin">Admin</option><option value="dosen">Dosen</option><option value="mahasiswa">Mahasiswa</option></select></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={closeForm} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Batal</button><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving && <Loader2 className="size-4 animate-spin" />}{editingUser ? 'Simpan perubahan' : 'Tambah pengguna'}</button></div></form></div>}
  </div>;
}
