'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { authenticatedFetch } from '@/lib/auth';

type VideoOption = { id: number; topic: string; status: string; videoUrl: string | null; createdAt: string };
type Material = {
  id: number;
  judul: string;
  deskripsi: string | null;
  publishAt: string | null;
  isActive: boolean;
  videoId: number | null;
  video: VideoOption | null;
  createdAt: string;
};
type FormValues = { judul: string; deskripsi: string; publishAt: string; videoId: string; isActive: boolean };

const emptyForm: FormValues = { judul: '', deskripsi: '', publishAt: '', videoId: '', isActive: true };

async function readResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Permintaan gagal diproses.');
  return data;
}

function toLocalInputValue(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SetMateriPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [videos, setVideos] = useState<VideoOption[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const data = await readResponse(await authenticatedFetch(`${API_BASE_URL}/api/materials`));
      setMaterials(Array.isArray(data.materials) ? data.materials : []);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Gagal memuat materi.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVideos = useCallback(async () => {
    try {
      const data = await readResponse(await authenticatedFetch(`${API_BASE_URL}/api/videos`));
      const generatedVideos = Array.isArray(data.data) ? data.data : [];
      setVideos(generatedVideos.filter((video: VideoOption) => video.status?.toLowerCase() === 'completed' && video.videoUrl));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Gagal memuat video yang sudah dibuat.');
    }
  }, []);

  useEffect(() => {
    void loadMaterials();
    void loadVideos();
  }, [loadMaterials, loadVideos]);

  const filteredMaterials = useMemo(() => materials
    .filter((material) => material.judul.toLocaleLowerCase('id-ID').includes(search.trim().toLocaleLowerCase('id-ID')))
    .filter((material) => statusFilter === 'all' || material.isActive === (statusFilter === 'active'))
    .sort((a, b) => new Date(a.publishAt || '9999-12-31').getTime() - new Date(b.publishAt || '9999-12-31').getTime()),
  [materials, search, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, publishAt: toLocalInputValue(new Date()) });
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(material: Material) {
    setEditing(material);
    setForm({
      judul: material.judul,
      deskripsi: material.deskripsi || '',
      publishAt: toLocalInputValue(material.publishAt || ''),
      videoId: material.videoId ? String(material.videoId) : '',
      isActive: material.isActive,
    });
    setFormError('');
    setFormOpen(true);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    if (form.judul.trim().length === 0) return setFormError('Judul materi wajib diisi.');
    if (form.judul.trim().length > 100) return setFormError('Judul materi maksimal 100 karakter.');
    if (!form.videoId) return setFormError('Video materi wajib dipilih.');
    if (!form.publishAt || new Date(form.publishAt).getTime() <= Date.now()) return setFormError('Tanggal dan jam publikasi harus lebih besar dari waktu saat ini.');

    setSaving(true);
    try {
      await readResponse(await authenticatedFetch(`${API_BASE_URL}/api/materials${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify({ ...form, judul: form.judul.trim(), deskripsi: form.deskripsi.trim(), videoId: Number(form.videoId), publishAt: new Date(form.publishAt).toISOString() }),
      }));
      setNotice(editing ? 'Pengaturan materi berhasil diperbarui.' : 'Materi berhasil dijadwalkan.');
      setFormOpen(false);
      await loadMaterials();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Gagal menyimpan materi.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(material: Material) {
    setPageError('');
    setNotice('');
    try {
      await readResponse(await authenticatedFetch(`${API_BASE_URL}/api/materials/${material.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !material.isActive }),
      }));
      setMaterials((current) => current.map((item) => item.id === material.id ? { ...item, isActive: !item.isActive } : item));
      setNotice(`Materi ${material.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Gagal mengubah status materi.');
    }
  }

  async function deleteMaterial(material: Material) {
    if (!window.confirm(`Hapus materi “${material.judul}”?`)) return;
    setPageError('');
    setNotice('');
    try {
      await readResponse(await authenticatedFetch(`${API_BASE_URL}/api/materials/${material.id}`, { method: 'DELETE' }));
      setMaterials((current) => current.filter((item) => item.id !== material.id));
      setNotice('Materi berhasil dihapus.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Gagal menghapus materi.');
    }
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Materi dosen</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Pengaturan Materi</h1><p className="mt-2 text-slate-600">Jadwalkan video pembelajaran untuk mahasiswa. Materi aktif tetap tersedia setelah waktu publikasi.</p></div>
      <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#123b78] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-900"><Plus className="size-4" />Tambah materi</button>
    </div>

    {pageError && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{pageError}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-semibold text-slate-800"><BookOpen className="size-5 text-[#123b78]" />Daftar materi</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari judul materi" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-600 sm:w-60" /></label>
          <select aria-label="Filter status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600"><option value="all">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Judul Materi</th><th className="px-5 py-3 font-semibold">Video</th><th className="px-5 py-3 font-semibold">Publikasi</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 text-right font-semibold">Aksi</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 size-5 animate-spin" />Memuat materi...</td></tr>
              : filteredMaterials.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">{materials.length ? 'Tidak ada materi yang cocok dengan pencarian atau filter.' : 'Belum ada materi. Tambahkan video yang sudah selesai dibuat.'}</td></tr>
                : filteredMaterials.map((material) => <tr key={material.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4"><p className="font-semibold text-slate-800">{material.judul}</p><p className="mt-0.5 max-w-sm truncate text-slate-500">{material.deskripsi || 'Tanpa deskripsi'}</p></td>
                  <td className="px-5 py-4 text-slate-600">{material.video?.topic || 'Video tidak tersedia'}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(material.publishAt)}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${material.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{material.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td className="px-5 py-4"><div className="flex justify-end gap-1"><button type="button" onClick={() => openEdit(material)} className="rounded-lg p-2 text-blue-700 hover:bg-blue-50" aria-label={`Edit ${material.judul}`}><Pencil className="size-4" /></button><button type="button" onClick={() => void toggleStatus(material)} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">{material.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button><button type="button" onClick={() => void deleteMaterial(material)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label={`Hapus ${material.judul}`}><Trash2 className="size-4" /></button></div></td>
                </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    {formOpen && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label={editing ? 'Edit materi' : 'Tambah materi'}>
      <form onSubmit={submitForm} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between"><div><h2 className="text-xl font-bold text-slate-900">{editing ? 'Edit materi' : 'Tambah materi'}</h2><p className="mt-1 text-sm text-slate-500">Pilih video yang selesai dibuat dan atur waktu mulai publikasi.</p></div><button type="button" onClick={() => !saving && setFormOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup"><X className="size-5" /></button></div>
        {formError && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>}
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">Judul Materi<input required maxLength={100} value={form.judul} onChange={(event) => setForm({ ...form, judul: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-600" placeholder="Contoh: Pengantar Aljabar" /><span className="mt-1 block text-right text-xs font-normal text-slate-400">{form.judul.length}/100</span></label>
          <label className="block text-sm font-semibold text-slate-700">Deskripsi Materi <span className="font-normal text-slate-400">(opsional)</span><textarea rows={3} value={form.deskripsi} onChange={(event) => setForm({ ...form, deskripsi: event.target.value })} className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-600" placeholder="Jelaskan isi materi secara singkat" /></label>
          <label className="block text-sm font-semibold text-slate-700">Tanggal &amp; Jam Publikasi<input required type="datetime-local" min={toLocalInputValue(new Date())} value={form.publishAt} onChange={(event) => setForm({ ...form, publishAt: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-600" /><span className="mt-1 block text-xs font-normal text-slate-500">Waktu mengikuti zona waktu perangkat Anda; harus di masa depan.</span></label>
          <label className="block text-sm font-semibold text-slate-700">Video Materi<select required value={form.videoId} onChange={(event) => setForm({ ...form, videoId: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-600"><option value="">Pilih video yang sudah selesai dibuat</option>{videos.map((video) => <option key={video.id} value={video.id}>{video.topic} · {new Date(video.createdAt).toLocaleDateString('id-ID')}</option>)}</select>{videos.length === 0 && <span className="mt-1 block text-xs font-normal text-amber-700">Belum ada video selesai. Buat video melalui menu Buat Materi terlebih dahulu.</span>}</label>
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="size-4 accent-[#123b78]" />Aktif — tampil untuk mahasiswa setelah waktu publikasi</label>
        </div>
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => !saving && setFormOpen(false)} disabled={saving} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Batal</button><button disabled={saving || videos.length === 0} type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[#123b78] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50">{saving && <Loader2 className="size-4 animate-spin" />}{editing ? 'Simpan perubahan' : 'Jadwalkan materi'}</button></div>
      </form>
    </div>}
  </div>;
}
