import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { query } from './db'
import { createMailTransporter, loadSmtpConfig } from './smtp-config'

export const OTP_SALT_ROUNDS = 10
export const OTP_EXPIRY_MINUTES = 5
export const OTP_RESEND_SECONDS = 30

export const ALLOWED_PURPOSES = new Set([
  'registration',
  'login_new_device',
  'change_password',
  'customer_delete',
])

// ── JWT signing for verification link tokens ───────────────────────

function getLinkSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  return new TextEncoder().encode(secret)
}

/** Generate a one-click verification link token (JWT, expires in 5 min). */
export async function createVerificationToken(
  email: string,
  otp: string,
  purpose: string
): Promise<string> {
  return await new SignJWT({ email, otp, purpose })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(getLinkSecret())
}

// ── OTP Email Sending ──────────────────────────────────────────────

export async function sendOtpEmail(
  to: string,
  otp: string,
  purpose?: string
): Promise<boolean> {
  try {
    const transporter = await createMailTransporter()
    const smtpConfig = await loadSmtpConfig()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://store.homeatelier.ph'

    // Build one-click verification link
    let verifyLink = ''
    if (purpose) {
      const token = await createVerificationToken(to, otp, purpose)
      verifyLink = `${siteUrl}/verify-link?token=${token}`
    }

    const purposeLabel =
      purpose === 'registration' ? 'Verify your email address' :
      purpose === 'login_new_device' ? 'Confirm new device login' :
      purpose === 'change_password' ? 'Confirm password change' :
      'Verify your account'

    await transporter.sendMail({
      from: smtpConfig.from,
      to,
      subject: `Your Verification Code — Home Atelier`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/uploads/reviews/bdda42a44380cbd7858cdc620097aed8e17f7bd2d1837be245688e77c9942ba5.png" alt="Home Atelier" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 8px;" />
            <h2 style="color: #1a6d3e; font-family: Georgia, serif; margin: 0;">Home Atelier</h2>
            <p style="color: #666; font-size: 13px; margin: 4px 0 0;">${purposeLabel}</p>
          </div>

          <p style="color: #333; font-size: 15px; line-height: 1.5;">Your one-time verification code is:</p>
          <div style="text-align: center; margin: 20px 0; padding: 16px; background: #f7f9f6; border-radius: 10px;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a6d3e;">${otp}</span>
          </div>

          ${verifyLink ? `
            <div style="text-align: center; margin: 20px 0;">
              <a href="${verifyLink}"
                 style="display: inline-block; padding: 14px 32px; background: #1a6d3e; color: #fff;
                        text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
                Verify Now →
              </a>
            </div>
            <p style="color: #666; font-size: 13px; text-align: center;">
              Or use the code above. This link expires in ${OTP_EXPIRY_MINUTES} minutes.
            </p>
          ` : `
            <p style="color: #666; font-size: 13px;">This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
          `}

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e3e8e0;">
            <p style="font-size: 12px; color: #999;">
              If you did not request this code, please ignore this email.
            </p>
          </div>
        </div>
      `,
    })

    console.log(`[OTP] Email sent to ${to}`)
    return true
  } catch (err: any) {
    console.error('[OTP] Failed to send email:', err.message)
    return false
  }
}

// ── OTP Generation ─────────────────────────────────────────────────

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// ── Send OTP for Registration ──────────────────────────────────────

export async function sendRegistrationOtp(
  email: string,
  name: string,
  phone?: string
): Promise<{ success: boolean; error?: string }> {
  return sendOtpWithPurpose(email, 'registration', { name, phone })
}

// ── Send OTP for New Device Login ──────────────────────────────────

export async function sendLoginDeviceOtp(
  email: string
): Promise<{ success: boolean; error?: string }> {
  return sendOtpWithPurpose(email, 'login_new_device')
}

// ── Send OTP for Password Change ──────────────────────────────────

export async function sendChangePasswordOtp(
  email: string
): Promise<{ success: boolean; error?: string }> {
  return sendOtpWithPurpose(email, 'change_password')
}

// ── Internal: send OTP with rate limiting ──────────────────────────

async function sendOtpWithPurpose(
  email: string,
  purpose: string,
  meta?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim()

  // Rate limit check
  const recent = await query(
    `SELECT created_at FROM otp_codes
     WHERE email = $1 AND purpose = $2 AND used = FALSE
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedEmail, purpose]
  )

  if (recent.rows.length > 0) {
    const elapsed = (Date.now() - new Date(recent.rows[0].created_at).getTime()) / 1000
    if (elapsed < OTP_RESEND_SECONDS) {
      return {
        success: false,
        error: `Please wait ${Math.ceil(OTP_RESEND_SECONDS - elapsed)}s before requesting a new code`,
      }
    }
  }

  const otp = generateOtp()
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
  const hash = bcrypt.hashSync(otp, OTP_SALT_ROUNDS)

  // Delete any existing unused OTPs for this email+purpose
  await query(
    'DELETE FROM otp_codes WHERE email = $1 AND purpose = $2 AND used = FALSE',
    [normalizedEmail, purpose]
  )

  // Insert new OTP
  await query(
    'INSERT INTO otp_codes (email, code, purpose, expires_at) VALUES ($1, $2, $3, $4)',
    [normalizedEmail, hash, purpose, expiresAt]
  )

  // Send email with verification link
  if (!(await sendOtpEmail(normalizedEmail, otp, purpose))) {
    // Rollback on send failure
    await query(
      'DELETE FROM otp_codes WHERE email = $1 AND purpose = $2 AND used = FALSE',
      [normalizedEmail, purpose]
    )
    return { success: false, error: 'Failed to send OTP email. Please try again.' }
  }

  return { success: true }
}

// ── Verify OTP ─────────────────────────────────────────────────────

export async function verifyOtp(
  email: string,
  code: string,
  purpose: string
): Promise<{ success: boolean; verified: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim()

  const { rows } = await query(
    `SELECT * FROM otp_codes
     WHERE email = $1 AND purpose = $2 AND used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedEmail, purpose]
  )

  if (rows.length === 0) {
    return { success: false, verified: false, error: 'Invalid or expired OTP' }
  }

  const match = await bcrypt.compare(String(code), rows[0].code)
  if (!match) {
    return { success: false, verified: false, error: 'Invalid OTP' }
  }

  // Mark as verified
  await query('UPDATE otp_codes SET verified_at = NOW() WHERE id = $1', [rows[0].id])

  return { success: true, verified: true }
}

// ── Cleanup stale pending registrations ────────────────────────────

export async function cleanupPendingCustomers(): Promise<void> {
  await query(
    `UPDATE customers
     SET otp_pending_email = NULL,
         otp_pending_name = NULL,
         otp_pending_phone = NULL,
         otp_pending_data = NULL,
         otp_pending_expires_at = NULL
     WHERE otp_pending_expires_at IS NOT NULL
       AND otp_pending_expires_at < NOW()`
  )
}
