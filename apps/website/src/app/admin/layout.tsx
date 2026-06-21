import './admin-legacy.css'
import './luxury-theme.css'
import AdminShell from './AdminShell'
import AdminFontPreload from './AdminFontPreload'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'DaVinciOS — Command Center',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AdminFontPreload />
      <AdminShell>{children}</AdminShell>
    </>
  )
}
