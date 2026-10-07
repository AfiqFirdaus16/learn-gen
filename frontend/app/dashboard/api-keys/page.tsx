'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, KeyRound, LoaderCircle, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_BASE_URL } from '@/lib/api-config';
import { authenticatedFetch, getAdmin } from '@/lib/auth';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';

type Provider = { id: string; name: string; url: string };
type Credential = { category: 'prompt' | 'video'; provider: string; maskedKey: string; updatedAt: string };
type Configuration = { providers: { prompt: Provider[]; video: Provider[] }; selected: { prompt: string; video: string }; credentials: Credential[] };
type UserRole = 'admin' | 'dosen' | 'mahasiswa';

const categoryLabels = { prompt: 'AI untuk prompt dan naskah', video: 'API video dan suara' } as const;

async function requestJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Permintaan gagal.');
  return data;
}

export default function ApiKeysPage() {
  const [config, setConfig] = useState<Configuration | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [keys, setKeys] = useState({ prompt: '', video: '' });
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const result = await requestJson(await authenticatedFetch(`${API_BASE_URL}/api/api-keys`));
    setConfig(result.data as Configuration);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const userRole = getAdmin()?.role;
      setRole(userRole === 'admin' || userRole === 'dosen' || userRole === 'mahasiswa' ? userRole : 'mahasiswa');
      void load().catch((reason) => setError(reason instanceof Error ? reason.message : 'Gagal memuat konfigurasi API.'));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save(category: 'prompt' | 'video') {
    if (!config) return;
    setBusy(category); setNotice(''); setError('');
    const provider = config.selected[category];
    try {
      await requestJson(await authenticatedFetch(`${API_BASE_URL}/api/keys`, {
        method: 'POST',
        body: JSON.stringify({ category, provider, selectedProvider: provider, ...(keys[category].trim() ? { apiKey: keys[category].trim() } : {}) }),
      }));
      setKeys((current) => ({ ...current, [category]: '' }));
      await load();
      setNotice(`${categoryLabels[category]} berhasil disimpan.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Gagal menyimpan API key.');
    } finally { setBusy(''); }
  }

  async function remove(credential: Credential) {
    setBusy(`${credential.category}-${credential.provider}`); setError(''); setNotice('');
    try {
      await requestJson(await authenticatedFetch(`${API_BASE_URL}/api/api-keys/${credential.category}/${credential.provider}`, { method: 'DELETE' }));
      await load(); setNotice(`API key ${credential.provider} dihapus.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Gagal menghapus API key.'); }
    finally { setBusy(''); }
  }

  function changeProvider(category: 'prompt' | 'video', provider: string) {
    if (!config) return;
    setConfig({ ...config, selected: { ...config.selected, [category]: provider } });
  }

  function providerForm(category: 'prompt' | 'video') {
    if (!config) return null;
    const selected = config.providers[category].find((provider) => provider.id === config.selected[category]);
    const saved = config.credentials.some((credential) => credential.category === category && credential.provider === config.selected[category]);
    return <Card key={category}>
      <CardHeader><CardTitle>{categoryLabels[category]}</CardTitle><p className="text-sm text-slate-600">{category === 'prompt' ? 'Pilih model AI yang akan membuat prompt dan naskah.' : 'Pilih layanan video atau suara yang akan digunakan.'}</p></CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2"><Label htmlFor={`${category}-provider`}>Provider</Label><select id={`${category}-provider`} value={config.selected[category]} onChange={(event) => changeProvider(category, event.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{config.providers[category].map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor={`${category}-key`}>API key {saved && <span className="font-normal text-emerald-700">(sudah tersimpan; isi hanya untuk mengganti)</span>}</Label><Input id={`${category}-key`} type="password" autoComplete="new-password" value={keys[category]} onChange={(event) => setKeys((current) => ({ ...current, [category]: event.target.value }))} placeholder={saved ? '••••••••••••' : 'Tempel API key di sini'} /></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><a href={selected?.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:underline">Buat API key di {selected?.name}<ExternalLink className="size-4" /></a><Button type="button" onClick={() => void save(category)} disabled={Boolean(busy) || (!keys[category].trim() && config.selected[category] === '')}><Save className="mr-2 size-4" />{busy === category ? 'Menyimpan...' : 'Simpan pilihan'}</Button></div>
        {category === 'video' && config.selected.video !== 'd-id' && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Key {selected?.name} dapat disimpan di sini. Alur pembuatan video aplikasi saat ini masih terhubung ke D-ID.</p>}
      </CardContent>
    </Card>;
  }

  return role ? <RoleDashboardShell role={role}><div className="mx-auto max-w-5xl space-y-7">
    <header><div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-100 p-3 text-indigo-700"><KeyRound className="size-6" /></div><div><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Pengaturan akun</p><h1 className="text-3xl font-bold text-slate-900">Manajemen API</h1></div></div><p className="mt-3 max-w-3xl text-slate-600">Simpan API key untuk digunakan kembali. Key dienkripsi sebelum masuk database dan tidak pernah ditampilkan utuh setelah disimpan.</p></header>
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!config ? <div className="flex items-center gap-2 p-8 text-slate-600"><LoaderCircle className="size-4 animate-spin" />Memuat pengaturan API...</div> : <>{providerForm('prompt')}{providerForm('video')}
      <Card><CardHeader><CardTitle>API key tersimpan</CardTitle><p className="text-sm text-slate-600">Key hanya dapat dikelola oleh akun Anda.</p></CardHeader><CardContent>{config.credentials.length === 0 ? <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">Belum ada API key tersimpan.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="pb-3 font-medium">Kategori</th><th className="pb-3 font-medium">Provider</th><th className="pb-3 font-medium">API key</th><th className="pb-3 font-medium">Terakhir diubah</th><th className="pb-3" /></tr></thead><tbody>{config.credentials.map((credential) => { const name = config.providers[credential.category].find((provider) => provider.id === credential.provider)?.name || credential.provider; return <tr key={`${credential.category}-${credential.provider}`} className="border-b last:border-0"><td className="py-3">{categoryLabels[credential.category]}</td><td className="py-3 font-medium">{name}</td><td className="py-3 font-mono text-slate-600">{credential.maskedKey}</td><td className="py-3 text-slate-500">{new Date(credential.updatedAt).toLocaleDateString('id-ID')}</td><td className="py-3 text-right"><Button type="button" variant="outline" size="sm" aria-label={`Hapus key ${name}`} onClick={() => void remove(credential)} disabled={Boolean(busy)}><Trash2 className="size-4 text-red-600" /></Button></td></tr>; })}</tbody></table></div>}</CardContent></Card>
    </>}
  </div></RoleDashboardShell> : <main className="p-8 text-sm text-slate-600">Memuat manajemen API...</main>;
}
