'use client';

import { useEffect, useState } from 'react';
import { Award, BarChart3, BookOpen, CalendarCheck, ClipboardCheck, CircleCheck, GraduationCap, Presentation, School, Users, Video } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { authenticatedFetch } from '@/lib/auth';

const icons = { users: Users, material: BookOpen, test: ClipboardCheck };
type Role = 'admin' | 'dosen' | 'mahasiswa';
type DashboardStats = Record<string, number>;

export function DashboardOverview({ role }: { role: Role }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/dashboard/stats`);
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error(`Endpoint dashboard belum tersedia (HTTP ${response.status}). Restart backend agar route terbaru dimuat.`);
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal memuat data dashboard.');
        if (!cancelled) setStats(data.stats);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Gagal memuat data dashboard.');
      }
    }
    void loadStats();
    return () => { cancelled = true; };
  }, [role]);

  const cards = role === 'admin'
    ? [{ label: 'Pengguna aktif', key: 'activeUsers', color: 'border-l-[#123b78]', text: 'text-[#123b78]', icon: Users }, { label: 'Materi tersedia', key: 'materials', color: 'border-l-[#123b78]', text: 'text-[#123b78]', icon: BookOpen }, { label: 'Test berjalan', key: 'activeTests', color: 'border-l-[#123b78]', text: 'text-[#123b78]', icon: ClipboardCheck }, { label: 'Kelas terdaftar', key: 'registeredClasses', color: 'border-l-[#123b78]', text: 'text-[#123b78]', icon: GraduationCap }]
    : role === 'dosen'
      ? [{ label: 'Materi dibuat', key: 'createdMaterials', color: 'border-l-[#123b78]', text: 'text-[#123b78]', icon: Video }, { label: 'Kelas aktif', key: 'activeClasses', color: 'border-l-[#123b78]', text: 'text-[#123b78]', icon: School }, { label: 'Test dijadwalkan', key: 'scheduledTests', color: 'border-l-[#123b78]', text: 'text-[#123b78]', icon: CalendarCheck }, { label: 'Mahasiswa terdaftar', key: 'registeredStudents', color: 'border-l-[#123b78]', text: 'text-[#123b78]', icon: Users }]
      : [{ label: 'Materi tersedia', key: 'availableMaterials', color: 'border-l-[#123b78]', text: 'text-[#123b78]', icon: BookOpen }, { label: 'Materi selesai', key: 'completedMaterials', color: 'border-l-[#123b78]', text: 'text-[#123b78]', icon: CircleCheck }, { label: 'Test tersedia', key: 'availableTests', color: 'border-l-[#123b78]', text: 'text-[#123b78]', icon: Presentation }, { label: 'Rata-rata nilai', key: 'averageScore', color: 'border-l-[#123b78]', text: 'text-[#123b78]', icon: Award }];

  return (
    <div className="space-y-6">
      {role === 'dosen' ? (
        <section className="overflow-hidden rounded-2xl bg-[#123b78] px-6 py-8 text-white shadow-sm sm:px-8 sm:py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">Portal Dosen</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Selamat Datang, Dosen!</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">Berikut adalah ringkasan aktivitas pembelajaran Anda hari ini.</p>
        </section>
      ) : (
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#123b78]">Portal {role}</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-800">Dashboard</h1>
          <p className="mt-2 text-slate-500">Ringkasan aktivitas pembelajaran Anda.</p>
        </div>
      )}

      {error && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const value = stats?.[card.key];
          return (
            <div key={card.label} className={`relative overflow-hidden rounded-xl border border-slate-200 border-l-4 ${card.color} bg-white p-5 shadow-sm transition-shadow hover:shadow-md`}>
              <Icon className="absolute right-5 top-1/2 size-9 -translate-y-1/2 text-blue-100" strokeWidth={1.8} />
              <p className={`text-xs font-bold uppercase tracking-wide ${card.text}`}>{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-800">{value ?? '—'}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800">Aktivitas pembelajaran</h2>
              <p className="text-sm text-slate-500">Visualisasi sementara</p>
            </div>
            <BarChart3 className="size-5 text-[#123b78]" />
          </div>
          <div className="mt-8 flex h-48 items-end gap-3 border-b border-slate-100 px-2">
            {[35, 58, 42, 70, 55, 84, 63, 92].map((height, index) => (
              <div key={index} className="flex-1 rounded-t bg-gradient-to-t from-[#123b78] to-[#70b5f4]" style={{ height: `${height}%` }} />
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800">Informasi</h2>
              <p className="mt-1 text-sm text-slate-500">Ringkasan platform</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-full bg-blue-50 text-[#123b78]">
              <CircleCheck className="size-5" />
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <p className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-5 text-[#123b78]">Kartu ringkasan menggunakan data yang tersimpan di backend.</p>
            <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-5 text-slate-600">Data test dan kelas akan bertambah saat fiturnya dibuat.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export function PlaceholderPage({ title, description, type }: { title: string; description: string; type: keyof typeof icons }) {
  const Icon = icons[type];
  return <div className="space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500">Segera hadir</p><h1 className="mt-1 text-3xl font-bold text-slate-800">{title}</h1><p className="mt-2 text-slate-500">{description}</p></div><section className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm"><div className="flex size-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600"><Icon className="size-8" /></div><h2 className="mt-5 text-xl font-bold">Tampilan {title}</h2><p className="mt-2 max-w-md text-sm text-slate-500">Halaman ini sudah tersedia sebagai rancangan antarmuka. Fitur pengelolaan data akan ditambahkan pada tahap berikutnya.</p></section></div>;
}
