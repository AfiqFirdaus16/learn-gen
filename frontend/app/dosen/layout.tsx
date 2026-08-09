import { RoleDashboardShell } from '@/components/role-dashboard-shell';
export default function DosenLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <RoleDashboardShell role="dosen">{children}</RoleDashboardShell>; }
