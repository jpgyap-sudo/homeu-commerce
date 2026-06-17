import './admin.css'
import './luxury-theme.css'
import AdminShell from './AdminShell'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminShell>{children}</AdminShell>
}
