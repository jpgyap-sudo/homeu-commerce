'use client'

import { usePathname } from 'next/navigation'
import AdminSidebar from './AdminSidebar'
import PageViewTracker from '@/components/PageViewTracker'
import type { ReactNode } from 'react'

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // Login page gets a full-screen layout without the sidebar
  const isLogin = pathname === '/admin/login'

  if (isLogin) {
    return (
      <>
        <PageViewTracker />
        {children}
      </>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--admin-bg, #f4f6f4)' }}>
      <AdminSidebar />
      <PageViewTracker />
      <main style={{ flex: 1, minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
