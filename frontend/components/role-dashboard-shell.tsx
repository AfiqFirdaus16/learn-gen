'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, BookOpen, ClipboardCheck, LayoutDashboard, LogOut, Users, Video } from 'lucide-react';
import type { ReactNode } from 'react';

type Role = 'admin' | 'dosen' | 'mahasiswa';

const navigation = {
  admin: [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Manage User', href: '/admin/users', icon: Users },
    { label: 'Manage Materi', href: '/admin/materials', icon: BookOpen },
    { label: 'Manage Test', href: '/admin/tests', icon: ClipboardCheck },
  ],
  dosen: [
    { label: 'Dashboard', href: '/dosen', icon: LayoutDashboard },
    { label: 'Buat Materi', href: '/dosen/buat-materi', icon: Video },
    { label: 'Riwayat Materi', href: '/dosen/riwayat-materi', icon: ClipboardCheck },
    { label: 'Set Materi', href: '/dosen/set-materi', icon: BookOpen },
    { label: 'Set Test', href: '/dosen/set-test', icon: ClipboardCheck },
  ],
  mahasiswa: [
    { label: 'Dashboard', href: '/mahasiswa', icon: LayoutDashboard },
    { label: 'Materi', href: '/mahasiswa/materi', icon: BookOpen },
    { label: 'Test', href: '/mahasiswa/test', icon: ClipboardCheck },
  ],
} as const;

const roleLabel = { admin: 'Administrator', dosen: 'Dosen', mahasiswa: 'Mahasiswa' } as const;

export function RoleDashboardShell({ role, children }: { role: Role; children: ReactNode }) {
  const pathname = usePathname();
  const items = navigation[role];

  return <div className="min-h-screen bg-slate-100 text-slate-800"><aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-gradient-to-b from-indigo-500 to-blue-700 px-5 py-6 text-white shadow-xl md:flex"><Link href={`/${role}`} className="flex items-center gap-3 border-b border-white/15 pb-6"><div className="flex size-10 items-center justify-center rounded-full bg-white/15 text-xl font-black">L</div><div><p className="font-bold tracking-wide">LEARN-GEN</p><p className="text-xs text-indigo-100">Portal {roleLabel[role]}</p></div></Link><nav className="mt-7 space-y-2">{items.map((item) => { const Icon = item.icon; const active = pathname === item.href; return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition ${active ? 'bg-white/20 shadow-sm' : 'text-indigo-50 hover:bg-white/10'}`}><Icon className="size-4" />{item.label}</Link>; })}</nav><div className="mt-auto border-t border-white/15 pt-5"><Link href="/auth/login" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-indigo-50 hover:bg-white/10"><LogOut className="size-4" />Keluar</Link></div></aside><div className="md:pl-64"><header className="sticky top-0 z-10 flex h-20 items-center justify-end border-b border-slate-200 bg-white/95 px-5 shadow-sm backdrop-blur md:px-8"><div className="flex w-full items-center justify-between md:w-auto md:justify-end md:gap-5"><p className="font-bold text-indigo-600 md:hidden">LEARN-GEN</p><div className="flex items-center gap-3"><button type="button" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifikasi"><Bell className="size-5" /></button><div className="h-8 w-px bg-slate-200" /><div className="text-right"><p className="text-sm font-semibold">{roleLabel[role]}</p><p className="text-xs text-slate-500">Portal pembelajaran</p></div><div className="flex size-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{role === 'admin' ? 'A' : role === 'dosen' ? 'D' : 'M'}</div></div></div></header><main className="p-5 md:p-8">{children}</main></div></div>;
}
