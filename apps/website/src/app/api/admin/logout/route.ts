import { destroySession } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST() {
  await destroySession()
  return NextResponse.redirect(new URL('/admin/login', process.env.APP_URL || 'https://homeu.ph'))
}

export async function GET() {
  await destroySession()
  return NextResponse.redirect(new URL('/admin/login', process.env.APP_URL || 'https://homeu.ph'))
}
