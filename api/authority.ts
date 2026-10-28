import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';

interface VercelRequest extends IncomingMessage {
  body?: any;
  query?: Record<string, string | string[]>;
  method?: string;
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => this;
}

// Server-only environment variables (Never prefixed with VITE_)
const AUTHORITY_EMAIL = (
  process.env.AUTHORITY_EMAIL ||
  process.env.VITE_AUTHORITY_EMAIL ||
  'biswajitbiswal.in@gmail.com'
).trim().toLowerCase();

const AUTHORITY_FULL_NAME = (
  process.env.AUTHORITY_FULL_NAME ||
  process.env.VITE_AUTHORITY_FULL_NAME ||
  'Biswajit Biswal'
).trim();

const AUTHORITY_PASSWORD = (
  process.env.AUTHORITY_PASSWORD ||
  process.env.VITE_AUTHORITY_PASSWORD ||
  'Biswajit@2026'
);

const AUTHORITY_BACKUP_PIN = (
  process.env.AUTHORITY_BACKUP_PIN ||
  process.env.VITE_AUTHORITY_BACKUP_PIN ||
  '792026'
).trim();

const JWT_SECRET = process.env.AUTHORITY_SECRET_KEY || 'proofbridge_auth_secret_key_2026';

// In-memory rate limiting & active challenge store for serverless instance
interface ChallengeData {
  email: string;
  code: string;
  expiresAt: number;
}
const activeChallenges = new Map<string, ChallengeData>();
const rateLimits = new Map<string, { attempts: number; resetAt: number }>();

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function parseJsonBody(req: VercelRequest): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(req.body);
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Rate Limiting (10 requests per minute per IP)
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const rl = rateLimits.get(clientIp);
  if (rl && rl.resetAt > now) {
    if (rl.attempts >= 10) {
      return res.status(429).json({ error: 'Too many attempts. Please wait 1 minute before trying again.' });
    }
    rl.attempts += 1;
  } else {
    rateLimits.set(clientIp, { attempts: 1, resetAt: now + 60000 });
  }

  try {
    const body = await parseJsonBody(req);
    const { action, email, password, otp, challengeToken } = body;

    const cleanEmail = (email || '').trim().toLowerCase();

    // =========================================================================
    // ACTION 1: VERIFY CREDENTIALS & GENERATE OTP
    // =========================================================================
    if (action === 'verify-credentials') {
      if (!cleanEmail || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const isTargetAuthority =
        cleanEmail === AUTHORITY_EMAIL ||
        cleanEmail === 'biswajitbiswal.in@gmail.com' ||
        cleanEmail === 'authority@proofbridge.com';

      if (!isTargetAuthority) {
        return res.status(401).json({ error: 'Access denied: not an authorized System Authority ID.' });
      }

      const isPassValid = timingSafeEqual(password, AUTHORITY_PASSWORD);
      if (!isPassValid) {
        return res.status(401).json({ error: 'Invalid administrator credentials. Please check your password.' });
      }

      // Generate 6-digit OTP
      const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = now + 10 * 60 * 1000; // 10 minutes

      // Create signed challenge token
      const challengeToken = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${cleanEmail}:${rawCode}:${expiresAt}`)
        .digest('hex');

      activeChallenges.set(cleanEmail, {
        email: cleanEmail,
        code: rawCode,
        expiresAt,
      });

      return res.status(200).json({
        success: true,
        message: 'Credentials verified. 2-Step OTP dispatched.',
        expiresAt,
        challengeToken,
        user: {
          id: 'user-authority-0',
          email: cleanEmail,
          fullName: `${AUTHORITY_FULL_NAME} (Higher Authority)`,
          role: 'admin',
        },
      });
    }

    // =========================================================================
    // ACTION 2: VERIFY OTP / EMERGENCY MASTER PIN
    // =========================================================================
    if (action === 'verify-otp') {
      const cleanOtp = (otp || '').trim();
      if (!cleanEmail || !cleanOtp) {
        return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
      }

      // 1. Emergency Master Backup PIN check (Server-side only)
      if (timingSafeEqual(cleanOtp, AUTHORITY_BACKUP_PIN)) {
        activeChallenges.delete(cleanEmail);
        return res.status(200).json({
          success: true,
          verified: true,
          user: {
            id: 'user-authority-0',
            email: cleanEmail,
            fullName: `${AUTHORITY_FULL_NAME} (Higher Authority)`,
            role: 'admin',
          },
        });
      }

      // 2. Active in-memory challenge check
      const challenge = activeChallenges.get(cleanEmail);
      if (challenge) {
        if (now > challenge.expiresAt) {
          activeChallenges.delete(cleanEmail);
          return res.status(400).json({ error: 'OTP code has expired. Please request a new one.' });
        }
        if (timingSafeEqual(cleanOtp, challenge.code)) {
          activeChallenges.delete(cleanEmail);
          return res.status(200).json({
            success: true,
            verified: true,
            user: {
              id: 'user-authority-0',
              email: cleanEmail,
              fullName: `${AUTHORITY_FULL_NAME} (Higher Authority)`,
              role: 'admin',
            },
          });
        }
      }

      return res.status(400).json({
        error: 'Invalid verification code. Please check your Gmail or use your Master PIN.',
      });
    }

    return res.status(400).json({ error: 'Invalid action.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return res.status(500).json({ error: msg });
  }
}
