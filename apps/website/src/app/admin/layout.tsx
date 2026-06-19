import './admin-legacy.css'
import './luxury-theme.css'
import AdminShell from './AdminShell'

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
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500&family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;1,14..32,300;1,14..32,400&family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />
      <AdminShell>{children}</AdminShell>
    </>
  )
}
