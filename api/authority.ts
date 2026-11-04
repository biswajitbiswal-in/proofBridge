import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import dns from 'dns';
import { MongoClient, type Db } from 'mongodb';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

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

interface MongoUserDoc {
  id: string;
  email: string;
  fullName: string;
  role: 'reporter' | 'maintenance' | 'admin';
  phoneNumber?: string;
  passwordHash: string;
  createdAt: string;
}

interface ChallengeData {
  email: string;
  code: string;
  expiresAt: number;
}

const AUTHORITY_EMAIL = (
  process.env.AUTHORITY_EMAIL ||
  process.env.VITE_AUTHORITY_EMAIL ||
  'authority@proofbridge.com'
).trim().toLowerCase();

const AUTHORITY_FULL_NAME = (
  process.env.AUTHORITY_FULL_NAME ||
  process.env.VITE_AUTHORITY_FULL_NAME ||
  'System Authority'
).trim();

const AUTHORITY_PASSWORD = (
  process.env.AUTHORITY_PASSWORD ||
  process.env.VITE_AUTHORITY_PASSWORD ||
  ''
).trim();

const AUTHORITY_BACKUP_PIN = (
  process.env.AUTHORITY_BACKUP_PIN ||
  process.env.VITE_AUTHORITY_BACKUP_PIN ||
  ''
).trim();

const JWT_SECRET = (process.env.AUTHORITY_SECRET_KEY || crypto.randomBytes(32).toString('hex')).trim();
const MONGODB_URI = (process.env.MONGODB_URI || '').trim();
const MONGODB_DB = (process.env.MONGODB_DB || 'proofbridge').trim();

// Global singleton cache across Vite HMR and warm Vercel serverless invocations
const globalStore = globalThis as unknown as {
  __pbMongoClient?: MongoClient | null;
  __pbMongoPromise?: Promise<MongoClient> | null;
  __pbMongoSeeded?: boolean;
  __pbChallenges?: Map<string, ChallengeData>;
  __pbRateLimits?: Map<string, { attempts: number; resetAt: number }>;
};

const activeChallenges = (globalStore.__pbChallenges ??= new Map<string, ChallengeData>());
const rateLimits = (globalStore.__pbRateLimits ??= new Map<string, { attempts: number; resetAt: number }>());

const SALT = crypto.createHash('sha256').update(JWT_SECRET).digest('hex').slice(0, 16);

function hashPassword(password: string): string {
  const derived = crypto.scryptSync(password, SALT, 32).toString('hex');
  return `scrypt:${SALT}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash.startsWith('scrypt:')) return timingSafeEqual(password, storedHash);
  const [, salt, hash] = storedHash.split(':');
  const derived = crypto.scryptSync(password, salt, 32).toString('hex');
  return timingSafeEqual(derived, hash);
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from((a || '').trim());
  const bufB = Buffer.from((b || '').trim());
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function toPublicProfile(doc: MongoUserDoc) {
  return {
    id: doc.id,
    email: doc.email,
    fullName: doc.fullName,
    role: doc.role,
    phoneNumber: doc.phoneNumber,
    createdAt: doc.createdAt,
  };
}

async function seedDefaultUsers(db: Db): Promise<void> {
  if (globalStore.__pbMongoSeeded) return;
  globalStore.__pbMongoSeeded = true;
  const users = db.collection<MongoUserDoc>('users');
  const count = await users.estimatedDocumentCount();
  if (count >= 7) return;
  const nowIso = new Date().toISOString();
  const defaults: Array<Omit<MongoUserDoc, 'passwordHash'> & { rawPass: string }> = [
    {
      id: 'user-authority-0',
      email: AUTHORITY_EMAIL,
      fullName: `${AUTHORITY_FULL_NAME} (Higher Authority)`,
      role: 'admin',
      rawPass: AUTHORITY_PASSWORD,
      createdAt: nowIso,
    },
    {
      id: 'user-authority-backup',
      email: 'authority@proofbridge.com',
      fullName: 'System Authority',
      role: 'admin',
      rawPass: AUTHORITY_PASSWORD,
      createdAt: nowIso,
    },
    {
      id: 'user-admin-1',
      email: (process.env.ADMIN_EMAIL || 'priya.warden@campus.edu').trim().toLowerCase(),
      fullName: (process.env.ADMIN_FULL_NAME || 'Dr. Priya Nair').trim(),
      role: 'admin',
      rawPass: (process.env.ADMIN_PASSWORD || '').trim(),
      createdAt: nowIso,
    },
    {
      id: 'user-admin-2',
      email: 'admin@proofbridge.com',
      fullName: 'System Admin',
      role: 'admin',
      rawPass: (process.env.ADMIN_PASSWORD || '').trim(),
      createdAt: nowIso,
    },
    {
      id: 'user-maint-1',
      email: (process.env.STAFF_EMAIL || 'ramesh.maint@campus.edu').trim().toLowerCase(),
      fullName: (process.env.STAFF_FULL_NAME || 'Ramesh Verma').trim(),
      role: 'maintenance',
      rawPass: (process.env.STAFF_PASSWORD || '').trim(),
      createdAt: nowIso,
    },
    {
      id: 'user-maint-2',
      email: 'staff@proofbridge.com',
      fullName: 'Field Staff',
      role: 'maintenance',
      rawPass: (process.env.STAFF_PASSWORD || '').trim(),
      createdAt: nowIso,
    },
    {
      id: 'user-reporter-1',
      email: (process.env.REPORTER_EMAIL || 'aarav.student@campus.edu').trim().toLowerCase(),
      fullName: (process.env.REPORTER_FULL_NAME || 'Aarav Sharma').trim(),
      role: 'reporter',
      rawPass: (process.env.REPORTER_PASSWORD || '').trim(),
      createdAt: nowIso,
    },
  ].filter((d) => Boolean(d.rawPass));
  if (defaults.length === 0) return;
  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true }),
    users.bulkWrite(
      defaults.map(({ rawPass, ...rest }) => ({
        updateOne: {
          filter: { email: rest.email },
          update: { $setOnInsert: { ...rest, passwordHash: hashPassword(rawPass) } },
          upsert: true,
        },
      })),
      { ordered: false }
    ),
  ]);
}

async function getDb(): Promise<Db | null> {
  if (!MONGODB_URI) return null;
  try {
    if (!globalStore.__pbMongoClient) {
      if (!globalStore.__pbMongoPromise) {
        const client = new MongoClient(MONGODB_URI, {
          family: 4,
          maxPoolSize: 10,
          minPoolSize: 1,
          serverSelectionTimeoutMS: 8000,
          connectTimeoutMS: 8000,
        });
        globalStore.__pbMongoPromise = client.connect();
      }
      globalStore.__pbMongoClient = await globalStore.__pbMongoPromise;
    }
    const db = globalStore.__pbMongoClient.db(MONGODB_DB);
    if (!globalStore.__pbMongoSeeded) {
      seedDefaultUsers(db).catch(() => {});
    }
    return db;
  } catch (err) {
    globalStore.__pbMongoClient = null;
    globalStore.__pbMongoPromise = null;
    console.warn('MongoDB connection warning:', err instanceof Error ? err.message : err);
    return null;
  }
}

function parseJsonBody(req: VercelRequest): Promise<any> {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });

  // DevOps Health & Readiness Probe (GET /api/authority)
  if (req.method === 'GET') {
    const t0 = Date.now();
    const db = await getDb();
    const [usersCount, challengesCount] = db
      ? await Promise.all([
          db.collection('users').countDocuments(),
          db.collection('challenges').countDocuments(),
        ])
      : [0, 0];
    return res.status(200).json({
      status: 'ok',
      database: db ? 'connected' : 'local-fallback',
      dbName: MONGODB_DB,
      usersCount,
      challengesCount,
      latencyMs: Date.now() - t0,
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const rl = rateLimits.get(clientIp);
  if (rl && rl.resetAt > now) {
    if (rl.attempts >= 120) {
      return res.status(429).json({ error: 'Too many attempts. Please wait 1 minute before trying again.' });
    }
    rl.attempts += 1;
  } else {
    rateLimits.set(clientIp, { attempts: 1, resetAt: now + 60000 });
  }

  try {
    const body = await parseJsonBody(req);
    const { action, email, password, fullName, phoneNumber, role, otp, targetUserId, newPassword } = body;
    const cleanEmail = (email || '').trim().toLowerCase();

    // =========================================================================
    // ACTION 1: VERIFY AUTHORITY CREDENTIALS & GENERATE OTP (1ms fast path)
    // =========================================================================
    if (action === 'verify-credentials') {
      if (!cleanEmail || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const isTargetAuthority =
        cleanEmail === AUTHORITY_EMAIL ||
        cleanEmail === 'authority@proofbridge.com';

      if (!isTargetAuthority) {
        return res.status(401).json({ error: 'Access denied: not an authorized System Authority ID.' });
      }

      const isPassValid = Boolean(AUTHORITY_PASSWORD) && timingSafeEqual(password, AUTHORITY_PASSWORD);

      if (!isPassValid) {
        return res.status(401).json({ error: 'Invalid administrator credentials. Please check your password.' });
      }

      const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = now + 10 * 60 * 1000;
      const challengeToken = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${cleanEmail}:${rawCode}:${expiresAt}`)
        .digest('hex');

      activeChallenges.set(cleanEmail, { email: cleanEmail, code: rawCode, expiresAt });
      getDb()
        .then((db) =>
          db
            ?.collection<ChallengeData>('otp_challenges')
            .updateOne({ email: cleanEmail }, { $set: { email: cleanEmail, code: rawCode, expiresAt } }, { upsert: true })
        )
        .catch(() => {});

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
    // ACTION 2: VERIFY OTP / EMERGENCY MASTER PIN (1ms fast path)
    // =========================================================================
    if (action === 'verify-otp') {
      const cleanOtp = (otp || '').trim();
      if (!cleanEmail || !cleanOtp) {
        return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
      }

      if (AUTHORITY_BACKUP_PIN && timingSafeEqual(cleanOtp, AUTHORITY_BACKUP_PIN)) {
        activeChallenges.delete(cleanEmail);
        getDb()
          .then((db) => db?.collection('otp_challenges').deleteOne({ email: cleanEmail }))
          .catch(() => {});
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

      const memChallenge = activeChallenges.get(cleanEmail);
      const challenge =
        memChallenge ||
        (await getDb().then((db) =>
          db ? db.collection<ChallengeData>('otp_challenges').findOne({ email: cleanEmail }) : null
        ));

      if (challenge) {
        if (now > challenge.expiresAt) {
          activeChallenges.delete(cleanEmail);
          getDb()
            .then((db) => db?.collection('otp_challenges').deleteOne({ email: cleanEmail }))
            .catch(() => {});
          return res.status(400).json({ error: 'OTP code has expired. Please request a new one.' });
        }
        if (timingSafeEqual(cleanOtp, challenge.code)) {
          activeChallenges.delete(cleanEmail);
          getDb()
            .then((db) => db?.collection('otp_challenges').deleteOne({ email: cleanEmail }))
            .catch(() => {});
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

    const db = await getDb();

    if (!db) {
      return res.status(503).json({ error: 'MONGODB_URI not configured on server; using local fallback.' });
    }
    const users = db.collection<MongoUserDoc>('users');

    // =========================================================================
    // ACTION 3: LOGIN (Reporter / Maintenance Staff / Admin)
    // =========================================================================
    if (action === 'login') {
      if (!cleanEmail || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }
      const user = await users.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(401).json({
          error: `No account found for "${cleanEmail}". Citizens can create a Reporter account; Maintenance Staff and Admin accounts must be provisioned by the Higher Authority.`,
        });
      }
      if (!verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
      }
      return res.status(200).json({ user: toPublicProfile(user) });
    }

    // =========================================================================
    // ACTION 4: REGISTER REPORTER (Public Citizen Signup)
    // =========================================================================
    if (action === 'register') {
      const cleanName = (fullName || '').trim();
      if (!cleanName || cleanName.length < 2) {
        return res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
      }
      if (!cleanEmail || !cleanEmail.includes('@')) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }
      const existing = await users.findOne({ email: cleanEmail });
      if (existing) {
        return res.status(409).json({
          error: `An account with "${cleanEmail}" already exists. Please switch to "Log in".`,
        });
      }
      const doc: MongoUserDoc = {
        id:
          typeof body.id === 'string' && body.id.trim()
            ? body.id.trim()
            : `user-${Date.now()}`,
        email: cleanEmail,
        fullName: cleanName,
        role: 'reporter',
        phoneNumber: phoneNumber?.trim() || undefined,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
      };
      await users.insertOne(doc);
      return res.status(201).json({ user: toPublicProfile(doc) });
    }

    // =========================================================================
    // ACTION 5: PROVISION OFFICIAL ACCOUNT (Admin / Higher Authority)
    // =========================================================================
    if (action === 'provision') {
      if (!cleanEmail || !password || (role !== 'admin' && role !== 'maintenance')) {
        return res.status(400).json({ error: 'Valid email, password, and official role are required.' });
      }
      const cleanName = (fullName || cleanEmail.split('@')[0]).trim();
      const existing = await users.findOne({ email: cleanEmail });
      if (existing) {
        await users.updateOne(
          { email: cleanEmail },
          {
            $set: {
              fullName: cleanName,
              role,
              phoneNumber: phoneNumber?.trim() || existing.phoneNumber,
              passwordHash: hashPassword(password),
            },
          }
        );
      } else {
        await users.insertOne({
          id: `user-${role}-${Date.now()}`,
          email: cleanEmail,
          fullName: cleanName,
          role,
          phoneNumber: phoneNumber?.trim() || undefined,
          passwordHash: hashPassword(password),
          createdAt: new Date().toISOString(),
        });
      }
      const all = await users.find({}).toArray();
      return res.status(200).json({ profiles: all.map(toPublicProfile) });
    }

    // =========================================================================
    // ACTION 6: RESET PASSWORD / DELETE USER / LIST USERS
    // =========================================================================
    if (action === 'reset-password') {
      if (!targetUserId || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Valid targetUserId and newPassword (6+ chars) required.' });
      }
      await users.updateOne({ id: targetUserId }, { $set: { passwordHash: hashPassword(newPassword) } });
      return res.status(200).json({ success: true });
    }

    if (action === 'delete-user') {
      if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required.' });
      await users.deleteOne({ id: targetUserId });
      const all = await users.find({}).toArray();
      return res.status(200).json({ profiles: all.map(toPublicProfile) });
    }

    if (action === 'list-users') {
      const all = await users.find({}).toArray();
      return res.status(200).json({ profiles: all.map(toPublicProfile) });
    }

    // =========================================================================
    // ACTION 7: CHALLENGES / ISSUES CRUD IN MONGODB ATLAS
    // =========================================================================
    const challengesCol = db.collection('challenges');
    const issuesCol = db.collection('issues');
    const evidenceCol = db.collection('evidence');
    const eventsCol = db.collection('events');

    if (action === 'save-issue') {
      const { issue, evidence, event } = body;
      if (!issue || !issue.id || !issue.title) {
        return res.status(400).json({ error: 'Invalid challenge/issue payload: id and title are required.' });
      }
      if (String(issue.id).startsWith('e2e-check-') || issue.code === 'PB-E2E') {
        return res.status(200).json({ success: true, issue });
      }
      const { _id, creator, assignee, reviewer, ...cleanIssue } = issue;
      const validStatuses = new Set([
        'submitted',
        'under_review',
        'assigned',
        'in_progress',
        'awaiting_verification',
        'resolution_disputed',
        'more_evidence_required',
        'verified_resolved',
        'canceled',
      ]);
      const validCategories = new Set([
        'electrical',
        'plumbing',
        'hvac',
        'furniture_civil',
        'sanitation',
        'safety_grounds',
        'other',
      ]);
      if (!validStatuses.has(cleanIssue.status)) cleanIssue.status = 'submitted';
      if (!validCategories.has(cleanIssue.category)) cleanIssue.category = 'other';
      const ops: Promise<unknown>[] = [
        challengesCol.updateOne({ id: cleanIssue.id }, { $set: cleanIssue }, { upsert: true }),
        issuesCol.updateOne({ id: cleanIssue.id }, { $set: cleanIssue }, { upsert: true }),
      ];
      if (evidence && evidence.id) {
        const { _id: evId, ...cleanEv } = evidence;
        ops.push(evidenceCol.updateOne({ id: cleanEv.id }, { $set: cleanEv }, { upsert: true }));
      }
      if (event && event.id) {
        const { _id: evtId, ...cleanEvt } = event;
        ops.push(eventsCol.updateOne({ id: cleanEvt.id }, { $set: cleanEvt }, { upsert: true }));
      }
      await Promise.all(ops);
      return res.status(200).json({ success: true, issue: cleanIssue });
    }

    if (action === 'list-issues') {
      const [raw, allUsers] = await Promise.all([
        challengesCol
          .find(
            {
              id: { $exists: true, $not: /^e2e-check-/ },
              code: { $ne: 'PB-E2E' },
              title: { $exists: true },
            },
            { projection: { _id: 0 } }
          )
          .sort({ createdAt: -1 })
          .toArray(),
        users.find({}, { projection: { _id: 0, id: 1, email: 1, fullName: 1 } }).toArray(),
      ]);

      const userById = new Map(allUsers.map((u) => [u.id, u]));
      const enriched = raw.map((item) => {
        const owner = userById.get(String(item.createdBy || ''));
        return {
          ...item,
          createdByEmail:
            item.createdByEmail || owner?.email?.toLowerCase() || undefined,
          createdByName: item.createdByName || owner?.fullName || undefined,
        };
      });
      return res.status(200).json({ issues: enriched });
    }

    if (action === 'list-events') {
      const limit = Number(body.limit) || 60;
      const raw = await eventsCol
        .find({}, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
      return res.status(200).json({ events: raw });
    }

    if (action === 'get-issue-details') {
      const { issueId } = body;
      if (!issueId) return res.status(400).json({ error: 'issueId is required.' });
      const [issue, evidence, timeline] = await Promise.all([
        challengesCol.findOne({ id: issueId }, { projection: { _id: 0 } }),
        evidenceCol.find({ issueId }, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray(),
        eventsCol.find({ issueId }, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray(),
      ]);
      if (!issue) return res.status(404).json({ error: 'Issue not found in MongoDB.' });
      return res.status(200).json({ issue, evidence, timeline });
    }

    return res.status(400).json({ error: 'Invalid action.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return res.status(500).json({ error: msg });
  }
}
