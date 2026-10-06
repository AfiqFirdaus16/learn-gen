'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, BookOpen, ClipboardCheck, KeyRound, LayoutDashboard, LogOut, Users, Video } from 'lucide-react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { logout } from '@/lib/auth';

type Role = 'admin' | 'dosen' | 'mahasiswa';

const navigation = {
  admin: [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Manajemen API', href: '/dashboard/api-keys', icon: KeyRound },
    { label: 'Manajemen Pengguna', href: '/admin/users', icon: Users },
    { label: 'Manajemen Materi', href: '/admin/materials', icon: BookOpen },
    { label: 'Manajemen Tes', href: '/admin/tests', icon: ClipboardCheck },
  ],
  dosen: [
    { label: 'Dashboard', href: '/dosen', icon: LayoutDashboard },
    { label: 'Manajemen API', href: '/dashboard/api-keys', icon: KeyRound },
    { label: 'Buat Materi', href: '/dosen/buat-materi', icon: Video },
    { label: 'Riwayat Materi', href: '/dosen/riwayat-materi', icon: ClipboardCheck },
    { label: 'Pengaturan Materi', href: '/dosen/set-materi', icon: BookOpen },
    { label: 'Pengaturan Tes', href: '/dosen/set-test', icon: ClipboardCheck },
  ],
  mahasiswa: [
    { label: 'Dashboard', href: '/mahasiswa', icon: LayoutDashboard },
    { label: 'Manajemen API', href: '/dashboard/api-keys', icon: KeyRound },
    { label: 'Materi', href: '/mahasiswa/materi', icon: BookOpen },
    { label: 'Tes', href: '/mahasiswa/test', icon: ClipboardCheck },
  ],
} as const;

const roleLabel = { admin: 'Administrator', dosen: 'Dosen', mahasiswa: 'Mahasiswa' } as const;

export function RoleDashboardShell({ role, children }: { role: Role; children: ReactNode }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();

  function handleLogout() {
    if (isLoggingOut) return;
    logout();
    setIsLoggingOut(true);
    window.setTimeout(() => router.replace('/auth/login'), 160);
  }

  const items = navigation[role];

  return <div className={`min-h-screen bg-slate-50 text-slate-800 ${isLoggingOut ? 'page-transition-exit' : ''}`}>
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white px-5 py-6 text-slate-700 shadow-sm md:flex">
      <Link href={`/${role}`} className="flex items-center gap-3 border-b border-slate-200 pb-6">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#123b78] text-xl font-black text-white">L</div>
        <div>
          <p className="font-bold tracking-wide text-[#123b78]">LEARN-GEN</p>
          <p className="text-xs text-slate-500">Portal {roleLabel[role]}</p>
        </div>
      </Link>
      <nav className="mt-7 space-y-2">{items.map((item) => { const Icon = item.icon; const active = pathname === item.href; return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${active ? 'bg-[#123b78] text-white shadow-sm' : 'text-slate-600 hover:bg-blue-50 hover:text-[#123b78]'}`}><Icon className="size-4" />{item.label}</Link>; })}</nav>
      <div className="mt-auto border-t border-slate-200 pt-5"><button type="button" onClick={handleLogout} disabled={isLoggingOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-blue-50 hover:text-[#123b78] disabled:opacity-60"><LogOut className="size-4" />Keluar</button></div>
    </aside>
    <div className="md:pl-64">
      <header className="sticky top-0 z-10 flex h-20 items-center justify-end border-b border-slate-200 bg-white/95 px-5 shadow-sm backdrop-blur md:px-8">
        <div className="flex w-full items-center justify-between md:w-auto md:justify-end md:gap-5">
          <p className="font-bold text-[#123b78] md:hidden">LEARN-GEN</p>
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-full p-2 text-slate-500 transition-colors hover:bg-blue-50 hover:text-[#123b78]" aria-label="Notifikasi">
              <Bell className="size-5" />
            </button>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-right">
              <p className="text-sm font-semibold">{roleLabel[role]}</p>
              <p className="text-xs text-slate-500">Portal pembelajaran</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-[#123b78]">{role === 'admin' ? 'A' : role === 'dosen' ? 'D' : 'M'}</div>
          </div>
        </div>
      </header>
      <main className="min-h-[calc(100vh-5rem)] bg-slate-50 p-5 md:p-8">{children}</main>
    </div>
  </div>;
}
