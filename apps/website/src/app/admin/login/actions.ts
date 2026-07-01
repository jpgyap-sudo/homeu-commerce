'use server'

import { authenticateAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'

function safeAdminRedirect(value: FormDataEntryValue | null): string {
  const fallback = '/admin/dashboard'
  if (typeof value !== 'string' || !value) return fallback
  if (!value.startsWith('/admin') || value.startsWith('//')) return fallback
  return value
}

export async function loginAction(prevState: { error: string }, formData: FormData): Promise<{ error: string }>
export async function loginAction(formData: FormData): Promise<{ error: string }>
export async function loginAction(
  arg1: { error: string } | FormData,
  arg2?: FormData
): Promise<{ error: string }> {
  // Handle both call patterns: (state, formData) and (formData)
  const formData = arg2 || (arg1 as FormData)

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = safeAdminRedirect(formData.get('redirectTo'))

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const result = await authenticateAdmin(email, password)

  if ('error' in result) {
    return { error: result.error }
  }

  redirect(redirectTo)
}
