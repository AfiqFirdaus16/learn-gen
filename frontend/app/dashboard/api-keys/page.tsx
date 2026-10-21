'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, LoaderCircle, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_BASE_URL } from '@/lib/api-config';
import { authenticatedFetch, getAdmin } from '@/lib/auth';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';

type Credential = { category: 'video' | 'voice'; provider: string; maskedKey: string; updatedAt: string };
type Configuration = { selected: { video: string; voice: string }; credentials: Credential[] };
type UserRole = 'admin' | 'dosen' | 'mahasiswa';

const categoryLabels = { video: 'Video', voice: 'Suara' } as const;

function normalizeConfiguration(value: unknown): Configuration {
  const raw = value && typeof value === 'object' ? value as Partial<Configuration> : {};
  const credentials = Array.isArray(raw.credentials)
    ? raw.credentials.filter((credential): credential is Credential => Boolean(
      credential && typeof credential === 'object' &&
      (credential.category === 'video' || credential.category === 'voice') &&
      typeof credential.provider === 'string' &&
      typeof credential.maskedKey === 'string'
    ))
    : [];

  return {
    selected: {
      video: typeof raw.selected?.video === 'string' ? raw.selected.video : 'd-id',
      voice: typeof raw.selected?.voice === 'string' ? raw.selected.voice : 'd-id',
    },
    credentials,
  };
}

async function requestJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Permintaan gagal.');
  return data;
}

export default function ApiKeysPage() {
  const [config, setConfig] = useState<Configuration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await requestJson(await authenticatedFetch(`${API_BASE_URL}/api/api-keys`));
      setConfig(normalizeConfiguration(result.data));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const userRole = getAdmin()?.role;
      setRole(userRole === 'admin' || userRole === 'dosen' || userRole === 'mahasiswa' ? userRole : 'mahasiswa');
      void load().catch((reason) => setError(reason instanceof Error ? reason.message : 'Gagal memuat konfigurasi API.'));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save() {
    if (!config) return;
    setBusy('save'); setNotice(''); setError('');
    try {
      await requestJson(await authenticatedFetch(`${API_BASE_URL}/api/keys`, {
        method: 'POST',
        body: JSON.stringify({
          videoProvider: config.selected.video.trim(),
          videoApiKey: apiKey.trim(),
        }),
      }));
      setApiKey('');
      await load();
      setNotice('Pengaturan provider video dan suara berhasil disimpan.');
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

  function changeProvider(provider: string) {
    if (!config) return;
    setConfig({ ...config, selected: { ...config.selected, video: provider, voice: provider } });
  }

  return role ? <RoleDashboardShell role={role}><div className="mx-auto max-w-5xl space-y-7">
    <header><div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-100 p-3 text-indigo-700"><KeyRound className="size-6" /></div><div><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Pengaturan akun</p><h1 className="text-3xl font-bold text-slate-900">Manajemen API</h1></div></div><p className="mt-3 max-w-3xl text-slate-600">Simpan API key untuk digunakan kembali. Key dienkripsi sebelum masuk database dan tidak pernah ditampilkan utuh setelah disimpan.</p></header>
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {isLoading || !config ? <div className="flex items-center gap-2 p-8 text-slate-600">{isLoading ? <><LoaderCircle className="size-4 animate-spin" />Memuat pengaturan API...</> : <><span>Pengaturan API belum tersedia.</span><Button type="button" variant="outline" onClick={() => void load()}>Coba lagi</Button></>}</div> : <><Card>
      <CardHeader><CardTitle>Provider Video</CardTitle><p className="text-sm text-slate-600">Nama provider ini juga digunakan untuk konfigurasi suara.</p></CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2"><Label htmlFor="video-provider">Nama provider</Label><Input id="video-provider" type="text" value={config.selected.video} onChange={(event) => changeProvider(event.target.value)} placeholder="Contoh: D-ID, HeyGen, atau provider custom" maxLength={100} /></div>
        <div className="space-y-2"><Label htmlFor="video-key">API key video</Label><Input id="video-key" type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Tempel API key provider di sini" /></div>
      </CardContent>
    </Card>
      <Button type="button" onClick={() => void save()} disabled={Boolean(busy)}><Save className="mr-2 size-4" />{busy === 'save' ? 'Menyimpan...' : 'Simpan Pengaturan'}</Button>
      <Card><CardHeader><CardTitle>API key tersimpan</CardTitle><p className="text-sm text-slate-600">Key dienkripsi sebelum disimpan. Key yang sama digunakan untuk provider video dan suara.</p></CardHeader><CardContent>{config.credentials.filter((credential) => credential.category === 'video').length === 0 ? <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">Belum ada API key provider tersimpan.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="pb-3 font-medium">Kategori</th><th className="pb-3 font-medium">Provider</th><th className="pb-3 font-medium">API key</th><th className="pb-3 font-medium">Terakhir diubah</th><th className="pb-3" /></tr></thead><tbody>{config.credentials.filter((credential) => credential.category === 'video').map((credential) => <tr key={`${credential.category}-${credential.provider}`} className="border-b last:border-0"><td className="py-3">{categoryLabels[credential.category]}</td><td className="py-3 font-medium">{credential.provider}</td><td className="py-3 font-mono text-slate-600">{credential.maskedKey}</td><td className="py-3 text-slate-500">{new Date(credential.updatedAt).toLocaleDateString('id-ID')}</td><td className="py-3 text-right"><Button type="button" variant="outline" size="sm" aria-label={`Hapus key ${credential.provider}`} onClick={() => void remove(credential)} disabled={Boolean(busy)}><Trash2 className="size-4 text-red-600" /></Button></td></tr>)}</tbody></table></div>}</CardContent></Card>
    </>}
  </div></RoleDashboardShell> : <main className="p-8 text-sm text-slate-600">Memuat manajemen API...</main>;
}
