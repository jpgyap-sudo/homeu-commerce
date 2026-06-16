'use server'

import { authenticateAdmin, createSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const result = await authenticateAdmin(email, password)

  if ('error' in result) {
    return { error: result.error }
  }

  redirect('/admin/dashboard')
}
