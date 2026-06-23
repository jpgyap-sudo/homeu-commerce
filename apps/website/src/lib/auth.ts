import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { query } from './db'

/**
 * Resolve the JWT signing secret lazily — at request time, NOT at module import.
 * A module-level throw breaks `next build` (Next imports route modules to collect
 * page data, and the build stage has no JWT_SECRET). At runtime the env is always
 * set (docker-compose / .env), so signing & verifying work normally.
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 1) {
    throw new Error('JWT_SECRET is not configured. Set a secure random value (min 32 chars).')
  }
  return new TextEncoder().encode(secret)
}
const COOKIE_NAME = 'homeu_admin_session'
const SESSION_DURATION = 60 * 60 * 24 // 24 hours
const ADMIN_ROLES = new Set(['admin', 'superadmin', 'editor', 'sales'])

// ============================================================
// Password hashing with bcrypt
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
  id: number | string
  email: string
  name: string
  role: string
  tabs: string[]
}

export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ sub: String(user.id), email: user.email, name: user.name, role: user.role, tabs: user.tabs })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getJwtSecret())

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

    const { payload } = await jwtVerify(token, getJwtSecret())
    return {
      id: Number(payload.sub),
      email: String(payload.email || ''),
      name: String(payload.name || ''),
      role: String(payload.role || ''),
      tabs: Array.isArray(payload.tabs) ? payload.tabs : ['*'],
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
    // Look up user — allow any role (admin, editor, sales, etc.)
    const { rows } = await query(
      `SELECT id, email, name, role, password_hash, tab_permissions
       FROM customers
       WHERE email = $1 AND status = 'active'
       LIMIT 1`,
      [email.toLowerCase().trim()]
    )

  const user = rows[0]
  if (!user) {
    return { error: 'Invalid email or password' }
  }

  if (!ADMIN_ROLES.has(user.role)) {
    return { error: 'This account does not have DaVinciOS access' }
  }

  // Verify password using bcrypt
  if (!user.password_hash) {
    return { error: 'No password set for this account' }
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return { error: 'Invalid email or password' }
  }

  // Create session with tabs
  let tabs: string[] = ['*']
  try { tabs = typeof user.tab_permissions === 'string' ? JSON.parse(user.tab_permissions) : (user.tab_permissions || ['*']) } catch { /* keep default */ }

  const token = await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tabs,
  })

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role, tabs },
    token,
  }
}
