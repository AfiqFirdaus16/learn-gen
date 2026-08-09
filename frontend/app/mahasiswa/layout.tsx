import { RoleDashboardShell } from '@/components/role-dashboard-shell';
export default function MahasiswaLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <RoleDashboardShell role="mahasiswa">{children}</RoleDashboardShell>; }
