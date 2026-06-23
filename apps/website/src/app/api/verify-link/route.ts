import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { verifyOtp } from '@/lib/otp'

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  return new TextEncoder().encode(secret)
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Verify the JWT
    let payload: any
    try {
      const { payload: verified } = await jwtVerify(token, getJwtSecret())
      payload = verified
    } catch {
      return NextResponse.json(
        { error: 'Verification link is invalid or has expired' },
        { status: 400 }
      )
    }

    const { email, otp, purpose } = payload

    if (!email || !otp || !purpose) {
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 400 })
    }

    // Verify the OTP
    const result = await verifyOtp(email, otp, purpose)
    if (!result.verified) {
      return NextResponse.json(
        { error: result.error || 'Verification failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      verified: true,
      email,
      purpose,
    })
  } catch (err: any) {
    console.error('[verify-link] Error:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
