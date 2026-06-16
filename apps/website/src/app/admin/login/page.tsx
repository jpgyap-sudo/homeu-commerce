import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LoginForm } from './LoginForm'

export default async function AdminLoginPage() {
  const session = await getSession()
  if (session) {
    redirect('/admin/dashboard')
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <svg width="140" height="32" viewBox="0 0 140 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="0" y="24" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="800" fill="currentColor">HomeU</text>
            <text x="0" y="32" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="600" letterSpacing="3.5" fill="currentColor" opacity="0.5">COMMAND</text>
          </svg>
        </div>
        <h1 className="admin-login-title">Sign in to your account</h1>
        <LoginForm />
      </div>
    </div>
  )
}
