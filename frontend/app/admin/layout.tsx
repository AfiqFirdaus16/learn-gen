import { RoleDashboardShell } from '@/components/role-dashboard-shell';
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <RoleDashboardShell role="admin">{children}</RoleDashboardShell>; }
