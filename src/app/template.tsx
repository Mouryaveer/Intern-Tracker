'use client';

import AppShell from '@/components/AppShell';

export default function RootPage({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
