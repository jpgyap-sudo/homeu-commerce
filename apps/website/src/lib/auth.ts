import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { query } from './db'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'homeu-admin-secret-change-in-production'
)
const COOKIE_NAME = 'homeu_admin_session'
const SESSION_DURATION = 60 * 60 * 24 // 24 hours

// ============================================================
// Password hashing with bcrypt (replaces Payload CMS PBKDF2)
// ============================================================

export async function hashPassword(password: string): Promise<string> {
  // Use bcryptjs (pure JS implementation available in Docker)
  const bcrypt = await import('bcryptjs')
  return bcrypt.hashSync(password, 10)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    const bcrypt = await import('bcryptjs')
    return bcrypt.compareSync(password, hash)
  } catch {
    return false
  }
}

// ============================================================
// JWT Session management
// ============================================================

export interface SessionUser {
  id: number
  email: string
  name: string
  role: string
}

export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ sub: String(user.id), email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(JWT_SECRET)

  // Also set httpOnly cookie via next/headers
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION,
  })

  return token
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null

    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      id: Number(payload.sub),
      email: String(payload.email || ''),
      name: String(payload.name || ''),
      role: String(payload.role || ''),
    }
  } catch {
    return null
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function authenticateAdmin(
  email: string,
  password: string
): Promise<{ user: SessionUser; token: string } | { error: string }> {
  // Look up user
  const { rows } = await query(
    `SELECT id, email, name, role, password_hash, salt, hash
     FROM customers
     WHERE email = $1 AND role = 'admin' AND status = 'active'
     LIMIT 1`,
    [email.toLowerCase().trim()]
  )

  const user = rows[0]
  if (!user) {
    return { error: 'Invalid email or password' }
  }

  // Check password_hash first (bcrypt), fall back to Payload PBKDF2 hash
  let valid = false
  if (user.password_hash) {
    valid = await verifyPassword(password, user.password_hash)
  } else if (user.hash && user.salt) {
    // Legacy Payload CMS PBKDF2 fallback
    const crypto = await import('crypto')
    return new Promise((resolve) => {
      crypto.pbkdf2(password, user.salt, 25000, 512, 'sha256', (err, hashBuffer) => {
        if (err) return resolve({ error: 'Authentication error' })
        const storedHash = Buffer.from(user.hash, 'hex')
        if (
          hashBuffer.length === storedHash.length &&
          crypto.timingSafeEqual(hashBuffer, storedHash)
        ) {
          resolve(createAdminSession(user))
        } else {
          resolve({ error: 'Invalid email or password' })
        }
      })
    })
  } else {
    return { error: 'No password set for this account' }
  }

  if (!valid) {
    return { error: 'Invalid email or password' }
  }

  return createAdminSession(user)

  function createAdminSession(user: any) {
    return createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }).then((token) => ({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    }))
  }
}
