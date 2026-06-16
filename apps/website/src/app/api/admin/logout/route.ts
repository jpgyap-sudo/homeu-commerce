import { destroySession } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST() {
  await destroySession()
  return NextResponse.redirect(new URL('/admin/login', 'http://localhost'))
}

export async function GET() {
  await destroySession()
  return NextResponse.redirect(new URL('/admin/login', 'http://localhost'))
}
