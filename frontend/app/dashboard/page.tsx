'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getRoleHomeRoute } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getRoleHomeRoute());
  }, [router]);

  return null;
}
