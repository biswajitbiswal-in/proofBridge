const isLocalModeForced = () => true;
const isSupabaseConfigured = false;
const isSupabaseSchemaReady = async () => false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = null;
import {
  canTransitionStatus,
  validateEvidenceFile,
} from '../types/domain.ts';
import type {
  EvidenceType,
  Issue,
  IssueCategory,
  IssueEvent,
  IssueEvidence,
  IssueStatus,
  IssueUrgency,
  UserProfile,
  UserRole,
} from '../types/domain.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

// ============================================================================
// LOCAL PERSISTENT DATABASE FALLBACK (Works with zero SQL / Supabase setup)
// ============================================================================
const STORAGE_KEYS = {
  PROFILES: 'proofbridge_profiles_v1',
  CREDENTIALS: 'proofbridge_credentials_v1',
  ADMIN_GRANTS: 'proofbridge_admin_grants_v1',
  ACTIVE_USER: 'proofbridge_active_user_v1',
  ISSUES: 'proofbridge_issues_v1',
  EVIDENCE: 'proofbridge_evidence_v1',
  EVENTS: 'proofbridge_events_v1',
  SEQ: 'proofbridge_seq_v1',
};

declare const process: any;
const isNodeEnv = typeof process !== 'undefined' && Boolean(process.env);
const nodeEnv = isNodeEnv ? process.env : {};

export const HIGHER_AUTHORITY_FULL_NAME = (
  env.VITE_AUTHORITY_FULL_NAME ||
  nodeEnv.AUTHORITY_FULL_NAME ||
  'System Authority'
).trim();

export const HIGHER_AUTHORITY_EMAIL = (
  env.VITE_AUTHORITY_EMAIL ||
  nodeEnv.AUTHORITY_EMAIL ||
  'authority@proofbridge.com'
)
  .trim()
  .toLowerCase();

// In production browser builds, secrets are NEVER compiled into client bundles.
// Verification is strictly handled server-side via the Vercel Serverless Function (/api/authority).
// In Node.js testing environments, nodeEnv provides the test secrets.
export const HIGHER_AUTHORITY_DEFAULT_PASSWORD =
  nodeEnv.AUTHORITY_PASSWORD || '';

export const HIGHER_AUTHORITY_BACKUP_PIN =
  nodeEnv.AUTHORITY_BACKUP_PIN || '';

interface StoredOtpData {
  email: string;
  code: string;
  expiresAt: number;
}

export function isHigherAuthority(
  user?: Pick<UserProfile, 'email' | 'role'> | null
): boolean {
  if (!user) return false;
  const clean = user.email.trim().toLowerCase();
  return (
    user.role === 'admin' &&
    (clean === HIGHER_AUTHORITY_EMAIL || clean === 'authority@proofbridge.com')
  );
}

const OFFICIAL_ADMIN_EMAILS = new Set([
  HIGHER_AUTHORITY_EMAIL,
  'authority@proofbridge.com',
  'priya.warden@campus.edu',
  'admin@proofbridge.com',
]);

const OFFICIAL_MAINTENANCE_EMAILS = new Set([
  'ramesh.maint@campus.edu',
  'staff@proofbridge.com',
]);

// No pre-computed credential hashes are bundled in client JS; authentication is handled by /api/authority
const DEFAULT_CREDENTIAL_HASHES: Record<string, string> = {};

function hashPassword(password: string): string {
  // Deterministic salted hash for local credential verification
  const input = `pb_salt_2026::${password}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `pbh_${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0)
    .toString(16)
    .padStart(8, '0')}`;
}

const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: 'user-authority-0',
    email: HIGHER_AUTHORITY_EMAIL,
    fullName: `${HIGHER_AUTHORITY_FULL_NAME} (Higher Authority)`,
    role: 'admin',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'user-authority-backup',
    email: 'authority@proofbridge.com',
    fullName: 'System Authority',
    role: 'admin',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'user-reporter-1',
    email: 'aarav.student@campus.edu',
    fullName: 'Aarav Sharma',
    role: 'reporter',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'user-maint-1',
    email: 'ramesh.maint@campus.edu',
    fullName: 'Ramesh Verma',
    role: 'maintenance',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'user-maint-2',
    email: 'staff@proofbridge.com',
    fullName: 'Field Staff',
    role: 'maintenance',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'user-admin-1',
    email: 'priya.warden@campus.edu',
    fullName: 'Dr. Priya Nair',
    role: 'admin',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'user-admin-2',
    email: 'admin@proofbridge.com',
    fullName: 'System Admin',
    role: 'admin',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

function resolveProvisionedRole(email: string): UserRole {
  const clean = email.trim().toLowerCase();
  const adminGrants = readLocal<Record<string, UserRole>>(
    STORAGE_KEYS.ADMIN_GRANTS,
    {}
  );
  if (adminGrants[clean]) return adminGrants[clean];
  if (OFFICIAL_ADMIN_EMAILS.has(clean)) return 'admin';
  if (OFFICIAL_MAINTENANCE_EMAILS.has(clean)) return 'maintenance';
  return 'reporter';
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function nextIssueCode(): string {
  const existingIssues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []);
  const maxExisting = existingIssues.reduce((max, item) => {
    const num = parseInt(String(item.code || '').replace(/\D/g, ''), 10);
    return Number.isFinite(num) && num > max ? num : max;
  }, 1000);
  const current = Math.max(readLocal<number>(STORAGE_KEYS.SEQ, 1001), maxExisting + 1);
  writeLocal(STORAGE_KEYS.SEQ, current + 1);
  return `PB-${current}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Fast client-side image compression for photos > 200KB so local storage and MongoDB sync are sub-10ms
    if (typeof document !== 'undefined' && file.type.startsWith('image/') && file.size > 200 * 1024) {
      const img = new Image();
      const objUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
          return;
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
      };
      img.src = objUrl;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

function ensureLocalInitialized(): UserProfile {
  let profiles = readLocal<UserProfile[]>(STORAGE_KEYS.PROFILES, []);
  if (profiles.length === 0) {
    profiles = DEFAULT_PROFILES;
    writeLocal(STORAGE_KEYS.PROFILES, profiles);
  } else {
    // Ensure official staff/admin accounts exist and sanitize any unauthorized self-elevated roles
    const adminGrants = readLocal<Record<string, UserRole>>(
      STORAGE_KEYS.ADMIN_GRANTS,
      {}
    );
    let changed = false;
    let grantsChanged = false;
    for (const def of DEFAULT_PROFILES) {
      if (!profiles.some((p) => p.email.toLowerCase() === def.email.toLowerCase())) {
        profiles.push(def);
        changed = true;
      }
    }
    profiles = profiles.map((p) => {
      const emailKey = p.email.toLowerCase();
      let inferredRole: UserRole = p.role;
      if (
        p.id.startsWith('user-maintenance-') ||
        p.id.startsWith('user-maint-') ||
        OFFICIAL_MAINTENANCE_EMAILS.has(emailKey)
      ) {
        inferredRole = 'maintenance';
      } else if (
        p.id.startsWith('user-admin-') ||
        p.id.startsWith('user-authority-') ||
        OFFICIAL_ADMIN_EMAILS.has(emailKey)
      ) {
        inferredRole = 'admin';
      }
      if (inferredRole === 'maintenance' || inferredRole === 'admin') {
        if (adminGrants[emailKey] !== inferredRole) {
          adminGrants[emailKey] = inferredRole;
          grantsChanged = true;
        }
      }
      const expectedRole =
        adminGrants[emailKey] ||
        (inferredRole === 'maintenance' || inferredRole === 'admin'
          ? inferredRole
          : resolveProvisionedRole(emailKey));
      if (p.role !== expectedRole) {
        changed = true;
        return { ...p, role: expectedRole };
      }
      return p;
    });
    if (grantsChanged) {
      writeLocal(STORAGE_KEYS.ADMIN_GRANTS, adminGrants);
    }
    if (changed) {
      writeLocal(STORAGE_KEYS.PROFILES, profiles);
    }
  }

  // Ensure default hashed credentials exist for official pre-provisioned accounts
  const credentials = readLocal<Record<string, string>>(
    STORAGE_KEYS.CREDENTIALS,
    {}
  );
  let credsChanged = false;
  for (const [emailKey, prehashed] of Object.entries(DEFAULT_CREDENTIAL_HASHES)) {
    const cleanKey = emailKey.toLowerCase();
    if (!credentials[cleanKey]) {
      credentials[cleanKey] = prehashed;
      credsChanged = true;
    }
  }
  // Guarantee Higher Authority master password is valid in testing / offline environments
  if (isNodeEnv && HIGHER_AUTHORITY_DEFAULT_PASSWORD) {
    if (credentials[HIGHER_AUTHORITY_EMAIL] !== hashPassword(HIGHER_AUTHORITY_DEFAULT_PASSWORD)) {
      credentials[HIGHER_AUTHORITY_EMAIL] = hashPassword(HIGHER_AUTHORITY_DEFAULT_PASSWORD);
      credsChanged = true;
    }
  }
  if (credsChanged) {
    writeLocal(STORAGE_KEYS.CREDENTIALS, credentials);
  }

  // Always purge any legacy demo issues, test artifacts, demo evidence, or demo events
  const existingIssues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []);
  const cleanIssues = existingIssues.filter(
    (i) =>
      !i.isDemo &&
      !i.id.startsWith('demo-issue-') &&
      !i.id.startsWith('e2e-check-') &&
      i.code !== 'PB-E2E' &&
      !i.title.includes('[DEMO]')
  );
  if (cleanIssues.length !== existingIssues.length) {
    writeLocal(STORAGE_KEYS.ISSUES, cleanIssues);
  }

  const existingEvidence = readLocal<IssueEvidence[]>(STORAGE_KEYS.EVIDENCE, []);
  const cleanEvidence = existingEvidence.filter(
    (e) => !e.id.startsWith('demo-') && !e.issueId.startsWith('demo-issue-')
  );
  if (cleanEvidence.length !== existingEvidence.length) {
    writeLocal(STORAGE_KEYS.EVIDENCE, cleanEvidence);
  }

  const existingEvents = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
  const cleanEvents = existingEvents.filter(
    (e) =>
      !e.id.startsWith('demo-') &&
      !e.issueId.startsWith('demo-issue-') &&
      !e.message.includes('[DEMO]')
  );
  if (cleanEvents.length !== existingEvents.length) {
    writeLocal(STORAGE_KEYS.EVENTS, cleanEvents);
  }

  const active = readLocal<UserProfile | null>(STORAGE_KEYS.ACTIVE_USER, null);
  if (active) {
    const synced = profiles.find(
      (p) => p.email.toLowerCase() === active.email.toLowerCase()
    );
    if (synced && (synced.role !== active.role || synced.id !== active.id)) {
      writeLocal(STORAGE_KEYS.ACTIVE_USER, synced);
      return synced;
    }
    return active;
  }
  return profiles[0];
}

const VALID_STATUSES = new Set<IssueStatus>([
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

const VALID_CATEGORIES = new Set<IssueCategory>([
  'electrical',
  'plumbing',
  'hvac',
  'furniture_civil',
  'sanitation',
  'safety_grounds',
  'other',
]);

const VALID_URGENCIES = new Set<IssueUrgency>(['low', 'medium', 'high', 'critical']);

function hydrateLocalIssue(
  issue: Issue,
  profiles: UserProfile[],
  events?: IssueEvent[]
): Issue {
  const safeStatus: IssueStatus = VALID_STATUSES.has(issue.status)
    ? issue.status
    : 'submitted';
  const safeCategory: IssueCategory = VALID_CATEGORIES.has(issue.category)
    ? issue.category
    : 'other';
  const safeUrgency: IssueUrgency = VALID_URGENCIES.has(issue.urgency)
    ? issue.urgency
    : 'medium';
  const allEvents = events || readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
  const createdEvent = allEvents.find(
    (e) => e.issueId === issue.id && e.eventType === 'issue_created'
  );
  const creator =
    profiles.find((p) => p.id === issue.createdBy) ||
    (issue.createdByEmail
      ? profiles.find(
          (p) => p.email.toLowerCase() === issue.createdByEmail!.toLowerCase()
        )
      : undefined) ||
    (issue.createdByName
      ? profiles.find(
          (p) =>
            p.fullName.trim().toLowerCase() ===
            issue.createdByName!.trim().toLowerCase()
        )
      : undefined) ||
    (createdEvent?.actorName
      ? profiles.find(
          (p) =>
            p.fullName.trim().toLowerCase() ===
            createdEvent.actorName!.trim().toLowerCase()
        )
      : undefined);

  return {
    ...issue,
    status: safeStatus,
    category: safeCategory,
    urgency: safeUrgency,
    createdBy: creator?.id || issue.createdBy,
    createdByEmail:
      issue.createdByEmail || creator?.email?.toLowerCase() || undefined,
    createdByName:
      issue.createdByName ||
      creator?.fullName ||
      createdEvent?.actorName ||
      undefined,
    creator:
      creator ||
      (issue.createdByName || createdEvent?.actorName
        ? {
            id: issue.createdBy,
            email: issue.createdByEmail || '',
            fullName: (issue.createdByName || createdEvent?.actorName)!,
            role: 'reporter',
            createdAt: issue.createdAt,
          }
        : undefined),
    assignee: profiles.find((p) => p.id === issue.assignedTo),
    reviewer: profiles.find((p) => p.id === issue.reviewedBy),
  };
}

// ============================================================================
// SUPABASE MAPPERS
// ============================================================================
interface RawProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone_number?: string;
  created_at: string;
}

function mapProfile(row?: RawProfile | null): UserProfile | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    phoneNumber: row.phone_number,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapIssue(row: any): Issue {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    category: row.category,
    locationBuilding: row.location_building,
    locationRoom: row.location_room ?? undefined,
    urgency: row.urgency,
    status: row.status,
    isDemo: Boolean(row.is_demo),
    createdBy: row.created_by,
    assignedTo: row.assigned_to ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    workNotes: row.work_notes ?? undefined,
    reviewNotes: row.review_notes ?? undefined,
    parentRecurringIssueId: row.parent_recurring_issue_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at ?? undefined,
    creator: mapProfile(row.creator),
    assignee: mapProfile(row.assignee),
    reviewer: mapProfile(row.reviewer),
  };
}

export function getLocalActiveProfile(): UserProfile {
  return ensureLocalInitialized();
}

export function getSavedLocalSession(): UserProfile | null {
  ensureLocalInitialized();
  return readLocal<UserProfile | null>(STORAGE_KEYS.ACTIVE_USER, null);
}

export function getCachedWorkspaceSnapshot(): {
  issues: Issue[];
  profiles: UserProfile[];
  events: Array<IssueEvent & { issueCode?: string; issueTitle?: string }>;
} {
  ensureLocalInitialized();
  const profiles = readLocal<UserProfile[]>(
    STORAGE_KEYS.PROFILES,
    DEFAULT_PROFILES
  );
  const rawIssues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []).filter(
    (i) => !i.isDemo
  );
  const issues = rawIssues
    .map((i) => hydrateLocalIssue(i, profiles))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  const events = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 60)
    .map((ev) => {
      const parent = issues.find((i) => i.id === ev.issueId);
      return {
        ...ev,
        issueCode: parent?.code,
        issueTitle: parent?.title,
      };
    });

  return { issues, profiles, events };
}

export function clearLocalSession(): void {
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
}

function formatNameFromEmail(email: string): string {
  const prefix = email.split('@')[0] || 'User';
  return prefix
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function signInOrCreateLocalUser(
  email: string,
  fullName?: string
): UserProfile {
  ensureLocalInitialized();
  const cleanEmail = email.trim().toLowerCase();
  const profiles = readLocal<UserProfile[]>(STORAGE_KEYS.PROFILES, DEFAULT_PROFILES);
  let user = profiles.find((p) => p.email.toLowerCase() === cleanEmail);
  if (!user) {
    // Public registration strictly creates a Reporter account unless pre-provisioned
    user = {
      id: `user-${Date.now()}`,
      email: cleanEmail,
      fullName: fullName?.trim() || formatNameFromEmail(cleanEmail),
      role: resolveProvisionedRole(cleanEmail),
      createdAt: new Date().toISOString(),
    };
    profiles.push(user);
    writeLocal(STORAGE_KEYS.PROFILES, profiles);
  } else if (fullName?.trim()) {
    user.fullName = fullName.trim();
    writeLocal(STORAGE_KEYS.PROFILES, profiles);
  }
  writeLocal(STORAGE_KEYS.ACTIVE_USER, user);
  return user;
}

export function saveActiveUserSession(user: UserProfile): void {
  ensureLocalInitialized();
  writeLocal(STORAGE_KEYS.ACTIVE_USER, user);
}

export function authenticateLocalUser(
  email: string,
  password: string
): UserProfile {
  ensureLocalInitialized();
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter your email address.');
  }
  if (!password) {
    throw new Error('Please enter your password.');
  }

  // Self-heal higher authority master credentials and profile in test/dev
  if (
    cleanEmail === HIGHER_AUTHORITY_EMAIL ||
    cleanEmail === 'authority@proofbridge.com'
  ) {
    if (isNodeEnv && HIGHER_AUTHORITY_DEFAULT_PASSWORD && password === HIGHER_AUTHORITY_DEFAULT_PASSWORD) {
      const profiles = readLocal<UserProfile[]>(
        STORAGE_KEYS.PROFILES,
        DEFAULT_PROFILES
      );
      let master = profiles.find((p) => p.email.toLowerCase() === cleanEmail);
      if (!master) {
        master = {
          id: 'user-authority-0',
          email: cleanEmail,
          fullName: `${HIGHER_AUTHORITY_FULL_NAME} (Higher Authority)`,
          role: 'admin',
          createdAt: new Date().toISOString(),
        };
        profiles.push(master);
        writeLocal(STORAGE_KEYS.PROFILES, profiles);
      } else {
        let changed = false;
        if (master.role !== 'admin') {
          master.role = 'admin';
          changed = true;
        }
        if (!master.fullName.includes(HIGHER_AUTHORITY_FULL_NAME)) {
          master.fullName = `${HIGHER_AUTHORITY_FULL_NAME} (Higher Authority)`;
          changed = true;
        }
        if (changed) {
          writeLocal(STORAGE_KEYS.PROFILES, profiles);
        }
      }
      writeLocal(STORAGE_KEYS.ACTIVE_USER, master);
      return master;
    }
  }

  const profiles = readLocal<UserProfile[]>(
    STORAGE_KEYS.PROFILES,
    DEFAULT_PROFILES
  );
  const user = profiles.find((p) => p.email.toLowerCase() === cleanEmail);
  if (!user) {
    throw new Error(
      `No account found for "${cleanEmail}". Citizens can create a Reporter account; Maintenance Staff and Admin accounts must be provisioned by the Higher Authority.`
    );
  }

  const credentials = readLocal<Record<string, string>>(
    STORAGE_KEYS.CREDENTIALS,
    {}
  );
  const storedHash = credentials[cleanEmail];
  if (storedHash) {
    if (storedHash !== hashPassword(password)) {
      throw new Error('Invalid email or password. Please check your credentials.');
    }
  } else {
    // Legacy reporter account created before password store: bind first login password
    if (user.role !== 'reporter') {
      throw new Error(
        'This Staff/Admin account does not have a password set. Ask the Higher Authority to reset your password.'
      );
    }
    credentials[cleanEmail] = hashPassword(password);
    writeLocal(STORAGE_KEYS.CREDENTIALS, credentials);
  }

  writeLocal(STORAGE_KEYS.ACTIVE_USER, user);
  return user;
}

export async function authenticateAuthorityCredentials(
  email: string,
  password: string
): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter your administrator email ID.');
  }
  if (!password) {
    throw new Error('Please enter your master password.');
  }

  // 1. Production server-side verification via Vercel Serverless Function (/api/authority)
  try {
    const res = await fetch('/api/authority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify-credentials',
        email: cleanEmail,
        password,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        ensureLocalInitialized();
        const profiles = readLocal<UserProfile[]>(STORAGE_KEYS.PROFILES, DEFAULT_PROFILES);
        const idx = profiles.findIndex((p) => p.email.toLowerCase() === cleanEmail);
        if (idx >= 0) {
          profiles[idx] = { ...profiles[idx], ...data.user };
        } else {
          profiles.push(data.user);
        }
        writeLocal(STORAGE_KEYS.PROFILES, profiles);
        writeLocal(STORAGE_KEYS.ACTIVE_USER, data.user);
        return data.user as UserProfile;
      }
    } else if (res.status === 401 || res.status === 400 || res.status === 429) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Invalid administrator credentials. Please check your password.');
    }
  } catch (err) {
    if (err instanceof Error && (err.message.includes('Invalid administrator credentials') || err.message.includes('Access denied'))) {
      throw err;
    }
    // Network / offline fallback for local standalone development
  }

  // 2. Offline / local testing fallback
  return authenticateLocalUser(cleanEmail, password);
}

export async function sendAuthorityOtp(email: string): Promise<{
  success: boolean;
  expiresAt: number;
  emailProviderError?: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) throw new Error('Email is required.');

  // Generate a random 6-digit OTP
  const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

  const otpPayload: StoredOtpData = {
    email: cleanEmail,
    code: rawCode,
    expiresAt,
  };

  localStorage.setItem('proofbridge_authority_otp_v1', JSON.stringify(otpPayload));

  let emailProviderError: string | undefined;

  // 1. Dispatch through Supabase Auth (sends real email to Gmail inbox when SMTP configured)
  if (isSupabaseConfigured && !isLocalModeForced()) {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) {
        emailProviderError = error.message;
      }
    } catch (err) {
      emailProviderError = err instanceof Error ? err.message : 'Supabase mailer error';
    }
  }

  return {
    success: true,
    expiresAt,
    emailProviderError,
  };
}

export async function verifyAuthorityOtp(
  email: string,
  enteredCode: string
): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = enteredCode.trim();

  if (!cleanCode) {
    throw new Error('Please enter the 6-digit OTP code or Master PIN.');
  }

  // 1. Production server-side verification via Vercel Serverless Function (/api/authority)
  try {
    const res = await fetch('/api/authority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify-otp',
        email: cleanEmail,
        otp: cleanCode,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.verified) {
        localStorage.removeItem('proofbridge_authority_otp_v1');
        return true;
      }
    } else if (res.status === 400 || res.status === 401 || res.status === 429) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Invalid verification code. Please check your Gmail or use your Master PIN.');
    }
  } catch (err) {
    if (err instanceof Error && (err.message.includes('Invalid verification code') || err.message.includes('expired'))) {
      throw err;
    }
    // Network / offline fallback for local dev
  }

  // 2. Node test environment / offline dev fallback
  if (isNodeEnv && HIGHER_AUTHORITY_BACKUP_PIN && cleanCode === HIGHER_AUTHORITY_BACKUP_PIN) {
    localStorage.removeItem('proofbridge_authority_otp_v1');
    return true;
  }

  // 3. Local storage OTP fallback for offline dev
  const raw = localStorage.getItem('proofbridge_authority_otp_v1');
  if (raw) {
    try {
      const data = JSON.parse(raw) as StoredOtpData;
      if (data.email === cleanEmail && data.code === cleanCode) {
        if (Date.now() > data.expiresAt) {
          localStorage.removeItem('proofbridge_authority_otp_v1');
          throw new Error('OTP code has expired. Please request a new one.');
        }
        localStorage.removeItem('proofbridge_authority_otp_v1');
        return true;
      }
    } catch (err) {
      if (err instanceof Error) throw err;
    }
  }

  // 4. Supabase cloud OTP verification if configured
  if (isSupabaseConfigured && !isLocalModeForced()) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: 'email',
      });
      if (!error && (data?.session || data?.user)) {
        localStorage.removeItem('proofbridge_authority_otp_v1');
        return true;
      }
    } catch {}
  }

  throw new Error('Invalid verification code. Please check your Gmail or enter your confidential master code.');
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();

  // Authoritative verification against MongoDB Atlas so Staff/Admin roles and IDs are always accurate
  if (!isNodeEnv) {
    try {
      const res = await fetch('/api/authority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: cleanEmail, password }),
      });
      if (res.ok) {
        const { user } = await res.json();
        if (user) {
          const adminGrants = readLocal<Record<string, UserRole>>(
            STORAGE_KEYS.ADMIN_GRANTS,
            {}
          );
          if (user.role === 'admin' || user.role === 'maintenance') {
            adminGrants[cleanEmail] = user.role;
            writeLocal(STORAGE_KEYS.ADMIN_GRANTS, adminGrants);
          }
          const profiles = readLocal<UserProfile[]>(
            STORAGE_KEYS.PROFILES,
            DEFAULT_PROFILES
          );
          const idx = profiles.findIndex(
            (p) => p.email.toLowerCase() === cleanEmail
          );
          if (idx >= 0) profiles[idx] = user;
          else profiles.push(user);
          writeLocal(STORAGE_KEYS.PROFILES, profiles);
          const credentials = readLocal<Record<string, string>>(
            STORAGE_KEYS.CREDENTIALS,
            {}
          );
          credentials[cleanEmail] = hashPassword(password);
          writeLocal(STORAGE_KEYS.CREDENTIALS, credentials);
          writeLocal(STORAGE_KEYS.ACTIVE_USER, user);
          return user;
        }
      } else if (res.status === 401 || res.status === 400) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Invalid email or password.');
      }
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes('Invalid email or password') ||
          err.message.includes('No account found'))
      ) {
        throw err;
      }
      // Network / offline fallback below
    }
  }

  return authenticateLocalUser(cleanEmail, password);
}

export async function registerReporterUser(params: {
  fullName: string;
  email: string;
  password: string;
  phoneNumber?: string;
}): Promise<UserProfile> {
  const cleanEmail = params.email.trim().toLowerCase();
  // Fast path (<1ms): validate & create immediately in local store, sync to MongoDB Atlas in background
  const user = registerReporterLocalUser(params);
  if (!isNodeEnv) {
    fetch('/api/authority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        id: user.id,
        fullName: params.fullName,
        email: cleanEmail,
        password: params.password,
        phoneNumber: params.phoneNumber,
      }),
    }).catch(() => {});
  }
  return user;
}

export function registerReporterLocalUser(params: {
  fullName: string;
  email: string;
  password: string;
  phoneNumber?: string;
}): UserProfile {
  ensureLocalInitialized();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.fullName.trim();

  if (!cleanName || cleanName.length < 2) {
    throw new Error('Please enter your full name (at least 2 characters).');
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!params.password || params.password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  if (
    OFFICIAL_ADMIN_EMAILS.has(cleanEmail) ||
    OFFICIAL_MAINTENANCE_EMAILS.has(cleanEmail)
  ) {
    throw new Error(
      'This email is reserved for an official Staff/Admin account. Please use "Log in".'
    );
  }

  const profiles = readLocal<UserProfile[]>(
    STORAGE_KEYS.PROFILES,
    DEFAULT_PROFILES
  );
  const existing = profiles.find((p) => p.email.toLowerCase() === cleanEmail);
  if (existing) {
    throw new Error(
      `An account with "${cleanEmail}" already exists. Please switch to "Log in".`
    );
  }

  const newUser: UserProfile = {
    id: `user-${Date.now()}`,
    email: cleanEmail,
    fullName: cleanName,
    role: 'reporter',
    phoneNumber: params.phoneNumber?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  profiles.push(newUser);
  writeLocal(STORAGE_KEYS.PROFILES, profiles);

  const credentials = readLocal<Record<string, string>>(
    STORAGE_KEYS.CREDENTIALS,
    {}
  );
  credentials[cleanEmail] = hashPassword(params.password);
  writeLocal(STORAGE_KEYS.CREDENTIALS, credentials);

  writeLocal(STORAGE_KEYS.ACTIVE_USER, newUser);
  return newUser;
}

export async function provisionOfficialAccount(params: {
  actor: UserProfile;
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'maintenance';
  phoneNumber?: string;
}): Promise<UserProfile[]> {
  if (params.actor.role !== 'admin') {
    throw new Error(
      'Unauthorized: Only the Higher Authority or an authorized Admin can create Staff and Admin accounts.'
    );
  }

  const cleanName = params.fullName.trim();
  const cleanEmail = params.email.trim().toLowerCase();
  const rawPassword = params.password;

  if (!cleanName || cleanName.length < 2) {
    throw new Error('Please provide the staff/admin full name.');
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please provide a valid official email address (Login ID).');
  }
  if (!rawPassword || rawPassword.length < 6) {
    throw new Error('Initial password must be at least 6 characters.');
  }
  if (params.role !== 'admin' && params.role !== 'maintenance') {
    throw new Error('Invalid role for official provisioning.');
  }

  // Always persist in local credential & profile store so login works seamlessly
  ensureLocalInitialized();
  const profiles = readLocal<UserProfile[]>(
    STORAGE_KEYS.PROFILES,
    DEFAULT_PROFILES
  );
  const adminGrants = readLocal<Record<string, UserRole>>(
    STORAGE_KEYS.ADMIN_GRANTS,
    {}
  );
  const credentials = readLocal<Record<string, string>>(
    STORAGE_KEYS.CREDENTIALS,
    {}
  );

  adminGrants[cleanEmail] = params.role;
  writeLocal(STORAGE_KEYS.ADMIN_GRANTS, adminGrants);

  credentials[cleanEmail] = hashPassword(rawPassword);
  writeLocal(STORAGE_KEYS.CREDENTIALS, credentials);

  const existingIdx = profiles.findIndex(
    (p) => p.email.toLowerCase() === cleanEmail
  );

  if (existingIdx >= 0) {
    profiles[existingIdx] = {
      ...profiles[existingIdx],
      fullName: cleanName,
      role: params.role,
      phoneNumber:
        params.phoneNumber?.trim() || profiles[existingIdx].phoneNumber,
    };
  } else {
    profiles.push({
      id: `user-${params.role}-${Date.now()}`,
      email: cleanEmail,
      fullName: cleanName,
      role: params.role,
      phoneNumber: params.phoneNumber?.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
  }
  writeLocal(STORAGE_KEYS.PROFILES, profiles);

  if (!isNodeEnv) {
    try {
      const res = await fetch('/api/authority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'provision',
          fullName: cleanName,
          email: cleanEmail,
          password: rawPassword,
          role: params.role,
          phoneNumber: params.phoneNumber,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.profiles)) {
          writeLocal(STORAGE_KEYS.PROFILES, data.profiles);
          return data.profiles;
        }
      }
    } catch {
      // Local store already updated
    }
  }

  return profiles;
}

export async function resetUserPasswordByAuthority(params: {
  actor: UserProfile;
  targetUserId: string;
  newPassword: string;
}): Promise<void> {
  if (params.actor.role !== 'admin') {
    throw new Error(
      'Unauthorized: Only the Higher Authority or an Admin can reset account passwords.'
    );
  }
  if (!params.newPassword || params.newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }

  ensureLocalInitialized();
  const profiles = readLocal<UserProfile[]>(
    STORAGE_KEYS.PROFILES,
    DEFAULT_PROFILES
  );
  const target = profiles.find((p) => p.id === params.targetUserId);
  if (!target) {
    throw new Error('Target user account not found.');
  }
  if (
    target.email.toLowerCase() === HIGHER_AUTHORITY_EMAIL &&
    params.actor.email.toLowerCase() !== HIGHER_AUTHORITY_EMAIL
  ) {
    throw new Error(
      'Only the Higher Authority account itself can change its master password.'
    );
  }

  const credentials = readLocal<Record<string, string>>(
    STORAGE_KEYS.CREDENTIALS,
    {}
  );
  credentials[target.email.toLowerCase()] = hashPassword(params.newPassword);
  writeLocal(STORAGE_KEYS.CREDENTIALS, credentials);

  if (!isNodeEnv) {
    await fetch('/api/authority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reset-password',
        targetUserId: params.targetUserId,
        newPassword: params.newPassword,
      }),
    }).catch(() => {});
  }
}

export async function deleteUserAccountByAuthority(params: {
  actor: UserProfile;
  targetUserId: string;
}): Promise<UserProfile[]> {
  if (params.actor.role !== 'admin') {
    throw new Error('Unauthorized: Only an Admin can remove user accounts.');
  }
  ensureLocalInitialized();
  const profiles = readLocal<UserProfile[]>(
    STORAGE_KEYS.PROFILES,
    DEFAULT_PROFILES
  );
  const target = profiles.find((p) => p.id === params.targetUserId);
  if (!target) {
    throw new Error('Account not found.');
  }
  if (target.id === params.actor.id) {
    throw new Error('You cannot delete your own active account.');
  }
  if (target.email.toLowerCase() === HIGHER_AUTHORITY_EMAIL) {
    throw new Error('The Higher Authority master account cannot be deleted.');
  }

  const cleanEmail = target.email.toLowerCase();
  const nextProfiles = profiles.filter((p) => p.id !== params.targetUserId);
  writeLocal(STORAGE_KEYS.PROFILES, nextProfiles);

  const adminGrants = readLocal<Record<string, UserRole>>(
    STORAGE_KEYS.ADMIN_GRANTS,
    {}
  );
  delete adminGrants[cleanEmail];
  writeLocal(STORAGE_KEYS.ADMIN_GRANTS, adminGrants);

  const credentials = readLocal<Record<string, string>>(
    STORAGE_KEYS.CREDENTIALS,
    {}
  );
  delete credentials[cleanEmail];
  writeLocal(STORAGE_KEYS.CREDENTIALS, credentials);

  if (!isNodeEnv) {
    try {
      const res = await fetch('/api/authority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-user', targetUserId: params.targetUserId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.profiles)) {
          writeLocal(STORAGE_KEYS.PROFILES, data.profiles);
          return data.profiles;
        }
      }
    } catch {}
  }

  return nextProfiles;
}

export async function getOrCreateProfile(
  userId: string,
  email: string,
  defaultName?: string
): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const fullName = defaultName?.trim() || formatNameFromEmail(cleanEmail);
  const assignedRole = resolveProvisionedRole(cleanEmail);

  if (!(await isSupabaseSchemaReady())) {
    return signInOrCreateLocalUser(cleanEmail, fullName);
  }

  try {
    const { data: existing, error: selectErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!selectErr && existing) {
      const mapped = mapProfile(existing)!;
      writeLocal(STORAGE_KEYS.ACTIVE_USER, mapped);
      const profiles = readLocal<UserProfile[]>(STORAGE_KEYS.PROFILES, DEFAULT_PROFILES);
      const idx = profiles.findIndex((p) => p.email.toLowerCase() === cleanEmail);
      if (idx >= 0) {
        profiles[idx] = mapped;
      } else {
        profiles.push(mapped);
      }
      writeLocal(STORAGE_KEYS.PROFILES, profiles);
      return mapped;
    }

    const { data: created, error: insertErr } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: cleanEmail,
        full_name: fullName,
        role: assignedRole,
      })
      .select('*')
      .maybeSingle();

    if (!insertErr && created) {
      const mapped = mapProfile(created)!;
      writeLocal(STORAGE_KEYS.ACTIVE_USER, mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('Supabase profile query failed, using local profile fallback:', err);
  }

  return signInOrCreateLocalUser(cleanEmail, fullName);
}

export async function adminAssignUserRole(params: {
  actor: UserProfile;
  targetUserId: string;
  newRole: UserRole;
}): Promise<UserProfile[]> {
  if (params.actor.role !== 'admin') {
    throw new Error('Only an authorized Admin can modify user account roles.');
  }

  if (!(await isSupabaseSchemaReady())) {
    const profiles = readLocal<UserProfile[]>(STORAGE_KEYS.PROFILES, DEFAULT_PROFILES);
    const target = profiles.find((p) => p.id === params.targetUserId);
    if (target) {
      const adminGrants = readLocal<Record<string, UserRole>>(
        'proofbridge_admin_grants_v1',
        {}
      );
      adminGrants[target.email.toLowerCase()] = params.newRole;
      writeLocal('proofbridge_admin_grants_v1', adminGrants);
    }
    const updatedList = profiles.map((p) =>
      p.id === params.targetUserId ? { ...p, role: params.newRole } : p
    );
    writeLocal(STORAGE_KEYS.PROFILES, updatedList);
    if (params.actor.id === params.targetUserId) {
      const updatedSelf = updatedList.find((p) => p.id === params.actor.id);
      if (updatedSelf) writeLocal(STORAGE_KEYS.ACTIVE_USER, updatedSelf);
    }
    return updatedList;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: params.newRole, updated_at: new Date().toISOString() })
    .eq('id', params.targetUserId);

  if (error) throw new Error(error.message);
  return listProfiles();
}

export async function updateMyProfile(
  userId: string,
  updates: { fullName: string; phoneNumber?: string }
): Promise<UserProfile> {
  const cleanName = updates.fullName.trim();
  if (!cleanName) throw new Error('Full name cannot be empty.');

  if (!(await isSupabaseSchemaReady())) {
    const profiles = readLocal<UserProfile[]>(STORAGE_KEYS.PROFILES, DEFAULT_PROFILES);
    const updatedList = profiles.map((p) =>
      p.id === userId
        ? { ...p, fullName: cleanName, phoneNumber: updates.phoneNumber?.trim() || undefined }
        : p
    );
    writeLocal(STORAGE_KEYS.PROFILES, updatedList);
    const updated = updatedList.find((p) => p.id === userId) || {
      ...profiles[0],
      fullName: cleanName,
      phoneNumber: updates.phoneNumber?.trim() || undefined,
    };
    writeLocal(STORAGE_KEYS.ACTIVE_USER, updated);
    return updated;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: cleanName,
      phone_number: updates.phoneNumber?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  const mapped = mapProfile(data)!;
  writeLocal(STORAGE_KEYS.ACTIVE_USER, mapped);
  return mapped;
}

async function syncIssueToMongo(payload: {
  issue: Issue;
  evidence?: IssueEvidence;
  event?: IssueEvent;
}): Promise<void> {
  if (isNodeEnv) return;
  try {
    const res = await fetch('/api/authority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save-issue', ...payload }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('MongoDB save-issue error:', errData.error || res.statusText);
    }
  } catch (err) {
    console.error('MongoDB save-issue network error:', err);
  }
}

export async function listRecentEvents(
  limit = 60
): Promise<Array<IssueEvent & { issueCode?: string; issueTitle?: string }>> {
  ensureLocalInitialized();
  if (!isNodeEnv) {
    try {
      const res = await fetch('/api/authority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list-events', limit }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.events) && data.events.length > 0) {
          writeLocal(STORAGE_KEYS.EVENTS, data.events);
        }
      }
    } catch {}
  }
  const events = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
  const issues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []);
  return events
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map((ev) => {
      const parent = issues.find((i) => i.id === ev.issueId);
      return {
        ...ev,
        issueCode: parent?.code,
        issueTitle: parent?.title,
      };
    });
}

export async function listProfiles(): Promise<UserProfile[]> {
  ensureLocalInitialized();
  if (!isNodeEnv) {
    try {
      const res = await fetch('/api/authority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list-users' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.profiles) && data.profiles.length > 0) {
          const remoteProfiles: UserProfile[] = data.profiles;
          const adminGrants = readLocal<Record<string, UserRole>>(
            STORAGE_KEYS.ADMIN_GRANTS,
            {}
          );
          for (const rp of remoteProfiles) {
            if (rp.role === 'admin' || rp.role === 'maintenance') {
              adminGrants[rp.email.toLowerCase()] = rp.role;
            }
          }
          writeLocal(STORAGE_KEYS.ADMIN_GRANTS, adminGrants);
          writeLocal(STORAGE_KEYS.PROFILES, remoteProfiles);

          const active = readLocal<UserProfile | null>(
            STORAGE_KEYS.ACTIVE_USER,
            null
          );
          if (active) {
            const matched = remoteProfiles.find(
              (p) => p.email.toLowerCase() === active.email.toLowerCase()
            );
            if (
              matched &&
              (matched.role !== active.role || matched.id !== active.id)
            ) {
              writeLocal(STORAGE_KEYS.ACTIVE_USER, matched);
            }
          }
          return remoteProfiles;
        }
      }
    } catch {}
  }
  return readLocal<UserProfile[]>(STORAGE_KEYS.PROFILES, DEFAULT_PROFILES);
}

export async function listIssues(): Promise<Issue[]> {
  ensureLocalInitialized();
  const profiles = readLocal<UserProfile[]>(STORAGE_KEYS.PROFILES, DEFAULT_PROFILES);
  const localIssues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []).filter((i) => !i.isDemo);

  if (!isNodeEnv) {
    try {
      const res = await fetch('/api/authority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list-issues' }),
      });
      if (res.ok) {
        const data = await res.json();
        const remoteIssues: Issue[] = Array.isArray(data.issues) ? data.issues : [];
        const remoteIds = new Set(remoteIssues.map((i) => i.id));
        const allEv = readLocal<IssueEvidence[]>(STORAGE_KEYS.EVIDENCE, []);
        const allEvents = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);

        // Backfill any previously local-only browser issues to MongoDB Atlas challenges collection in background
        const unsynced = localIssues.filter((i) => !remoteIds.has(i.id));
        for (const item of unsynced) {
          void syncIssueToMongo({
            issue: item,
            evidence: allEv.find((e) => e.issueId === item.id),
            event: allEvents.find((ev) => ev.issueId === item.id),
          });
        }

        const mergedMap = new Map<string, Issue>();
        for (const item of [...remoteIssues, ...unsynced]) {
          mergedMap.set(item.id, item);
        }
        for (const localItem of localIssues) {
          const existing = mergedMap.get(localItem.id);
          if (
            !existing ||
            new Date(localItem.updatedAt).getTime() >
              new Date(existing.updatedAt).getTime()
          ) {
            mergedMap.set(localItem.id, {
              ...existing,
              ...localItem,
              createdByEmail:
                localItem.createdByEmail || existing?.createdByEmail,
              createdByName:
                localItem.createdByName || existing?.createdByName,
            });
          }
        }
        const merged = Array.from(mergedMap.values());
        writeLocal(STORAGE_KEYS.ISSUES, merged);
        return merged
          .map((i) => hydrateLocalIssue(i, profiles, allEvents))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } catch {}
  }

  return localIssues
    .map((i) => hydrateLocalIssue(i, profiles))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getIssueDetails(issueId: string): Promise<{
  issue: Issue;
  evidence: IssueEvidence[];
  timeline: IssueEvent[];
}> {
  const profiles = readLocal<UserProfile[]>(STORAGE_KEYS.PROFILES, DEFAULT_PROFILES);
  const localIssues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []);
  const localFound = localIssues.find((i) => i.id === issueId);
  const localEvidence = readLocal<IssueEvidence[]>(STORAGE_KEYS.EVIDENCE, []).filter(
    (e) => e.issueId === issueId
  );
  const localTimeline = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, [])
    .filter((e) => e.issueId === issueId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Fast path (<1ms): return local state immediately if present, and sync remote evidence in background
  if (localFound && localEvidence.length > 0) {
    if (!isNodeEnv) {
      fetch('/api/authority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-issue-details', issueId }),
      }).catch(() => {});
    }
    return {
      issue: hydrateLocalIssue(localFound, profiles),
      evidence: localEvidence,
      timeline: localTimeline,
    };
  }

  if (!isNodeEnv) {
    try {
      const res = await fetch('/api/authority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-issue-details', issueId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.issue) {
          return {
            issue: hydrateLocalIssue(data.issue, profiles),
            evidence: Array.isArray(data.evidence) && data.evidence.length > 0 ? data.evidence : localEvidence,
            timeline: Array.isArray(data.timeline) && data.timeline.length > 0 ? data.timeline : localTimeline,
          };
        }
      }
    } catch {}
  }

  if (!localFound) throw new Error('Issue not found.');
  return {
    issue: hydrateLocalIssue(localFound, profiles),
    evidence: localEvidence,
    timeline: localTimeline,
  };
}

export async function uploadEvidenceFile(params: {
  issueId: string;
  userId: string;
  userName?: string;
  userRole?: UserRole;
  file: File;
  evidenceType: EvidenceType;
  caption?: string;
}): Promise<IssueEvidence> {
  const validationError = validateEvidenceFile(params.file);
  if (validationError) throw new Error(validationError);

  const dataUrl = await fileToDataUrl(params.file);
  const newEv: IssueEvidence = {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    issueId: params.issueId,
    uploadedBy: params.userId,
    uploaderName: params.userName,
    uploaderRole: params.userRole,
    evidenceType: params.evidenceType,
    filePath: dataUrl,
    fileName: params.file.name,
    fileSizeBytes: params.file.size,
    mimeType: params.file.type,
    caption: params.caption?.trim() || undefined,
    createdAt: new Date().toISOString(),
    signedUrl: dataUrl,
  };
  const allEv = readLocal<IssueEvidence[]>(STORAGE_KEYS.EVIDENCE, []);
  allEv.push(newEv);
  writeLocal(STORAGE_KEYS.EVIDENCE, allEv);
  return newEv;
}

export async function createIssue(params: {
  user: UserProfile;
  title: string;
  description: string;
  category: IssueCategory;
  locationBuilding: string;
  locationRoom?: string;
  urgency: IssueUrgency;
  imageFile?: File | null;
  imageCaption?: string;
}): Promise<Issue> {
  if (params.imageFile) {
    const fileErr = validateEvidenceFile(params.imageFile);
    if (fileErr) throw new Error(fileErr);
  }

  const now = new Date().toISOString();
  const newIssue: Issue = {
    id: `issue-${Date.now()}`,
    code: nextIssueCode(),
    title: params.title.trim(),
    description: params.description.trim(),
    category: params.category,
    locationBuilding: params.locationBuilding.trim(),
    locationRoom: params.locationRoom?.trim() || undefined,
    urgency: params.urgency,
    status: 'submitted',
    isDemo: false,
    createdBy: params.user.id,
    createdByEmail: params.user.email.trim().toLowerCase(),
    createdByName: params.user.fullName.trim(),
    createdAt: now,
    updatedAt: now,
  };

  const issues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []);
  writeLocal(STORAGE_KEYS.ISSUES, [newIssue, ...issues]);

  let uploadedEv: IssueEvidence | undefined;
  if (params.imageFile) {
    uploadedEv = await uploadEvidenceFile({
      issueId: newIssue.id,
      userId: params.user.id,
      userName: params.user.fullName,
      userRole: params.user.role,
      file: params.imageFile,
      evidenceType: 'report_attachment',
      caption: params.imageCaption || 'Initial report photograph',
    });
  }

  const newEvent: IssueEvent = {
    id: `evt-${Date.now()}`,
    issueId: newIssue.id,
    actorId: params.user.id,
    actorName: params.user.fullName,
    actorRole: params.user.role,
    eventType: 'issue_created',
    toStatus: 'submitted',
    message: `Issue reported by ${params.user.fullName}${
      params.imageFile ? ' with initial photo evidence' : ''
    }.`,
    createdAt: now,
  };
  const events = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
  events.push(newEvent);
  writeLocal(STORAGE_KEYS.EVENTS, events);

  // Sync to MongoDB Atlas in background so UI submission responds in 1ms–10ms
  void syncIssueToMongo({
    issue: newIssue,
    evidence: uploadedEv,
    event: newEvent,
  });

  return newIssue;
}

export async function assignIssueToStaff(params: {
  issue: Issue;
  actor: UserProfile;
  assigneeId: string;
  assigneeName: string;
}): Promise<void> {
  const check = canTransitionStatus(params.issue.status, 'assigned', params.actor.role);
  if (!check.allowed) throw new Error(check.reason);

  const now = new Date().toISOString();
  const updatedIssue: Issue = {
    ...params.issue,
    createdByEmail:
      params.issue.createdByEmail ||
      params.issue.creator?.email?.toLowerCase() ||
      undefined,
    createdByName:
      params.issue.createdByName || params.issue.creator?.fullName || undefined,
    assignedTo: params.assigneeId,
    status: 'assigned',
    updatedAt: now,
  };
  const existingIssues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []);
  const issues = existingIssues.some((i) => i.id === params.issue.id)
    ? existingIssues.map((i) => (i.id === params.issue.id ? updatedIssue : i))
    : [updatedIssue, ...existingIssues];
  writeLocal(STORAGE_KEYS.ISSUES, issues);

  const newEvent: IssueEvent = {
    id: `evt-${Date.now()}`,
    issueId: params.issue.id,
    actorId: params.actor.id,
    actorName: params.actor.fullName,
    actorRole: params.actor.role,
    eventType: 'issue_assigned',
    fromStatus: params.issue.status,
    toStatus: 'assigned',
    message: `Assigned to maintenance staff: ${params.assigneeName}.`,
    createdAt: now,
  };
  const events = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
  events.push(newEvent);
  writeLocal(STORAGE_KEYS.EVENTS, events);

  await syncIssueToMongo({ issue: updatedIssue, event: newEvent });
}

export async function startMaintenanceWork(params: {
  issue: Issue;
  actor: UserProfile;
}): Promise<void> {
  const check = canTransitionStatus(params.issue.status, 'in_progress', params.actor.role);
  if (!check.allowed) throw new Error(check.reason);

  const now = new Date().toISOString();
  const updatedIssue: Issue = {
    ...params.issue,
    status: 'in_progress',
    updatedAt: now,
  };
  const issues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []).map((i) =>
    i.id === params.issue.id ? updatedIssue : i
  );
  writeLocal(STORAGE_KEYS.ISSUES, issues);

  const newEvent: IssueEvent = {
    id: `evt-${Date.now()}`,
    issueId: params.issue.id,
    actorId: params.actor.id,
    actorName: params.actor.fullName,
    actorRole: params.actor.role,
    eventType: 'work_started',
    fromStatus: params.issue.status,
    toStatus: 'in_progress',
    message: `${params.actor.fullName} started maintenance work.`,
    createdAt: now,
  };
  const events = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
  events.push(newEvent);
  writeLocal(STORAGE_KEYS.EVENTS, events);

  void syncIssueToMongo({ issue: updatedIssue, event: newEvent });
}

export async function submitRepairForVerification(params: {
  issue: Issue;
  actor: UserProfile;
  workNotes: string;
  evidenceFile?: File | null;
  caption?: string;
}): Promise<void> {
  if (!params.workNotes.trim()) {
    throw new Error('Work notes describing the action taken are required.');
  }

  const check = canTransitionStatus(
    params.issue.status,
    'awaiting_verification',
    params.actor.role
  );
  if (!check.allowed) throw new Error(check.reason);

  const isResubmission =
    params.issue.status === 'more_evidence_required' || Boolean(params.issue.reviewNotes);

  let uploadedEv: IssueEvidence | undefined;
  if (params.evidenceFile) {
    uploadedEv = await uploadEvidenceFile({
      issueId: params.issue.id,
      userId: params.actor.id,
      userName: params.actor.fullName,
      userRole: params.actor.role,
      file: params.evidenceFile,
      evidenceType: isResubmission ? 'subsequent_submission' : 'work_completion',
      caption: params.caption || params.workNotes.trim(),
    });
  }

  const now = new Date().toISOString();
  const updatedIssue: Issue = {
    ...params.issue,
    status: 'awaiting_verification',
    workNotes: params.workNotes.trim(),
    updatedAt: now,
  };
  const issues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []).map((i) =>
    i.id === params.issue.id ? updatedIssue : i
  );
  writeLocal(STORAGE_KEYS.ISSUES, issues);

  const newEvent: IssueEvent = {
    id: `evt-${Date.now()}`,
    issueId: params.issue.id,
    actorId: params.actor.id,
    actorName: params.actor.fullName,
    actorRole: params.actor.role,
    eventType: 'completion_claimed',
    fromStatus: params.issue.status,
    toStatus: 'awaiting_verification',
    message: `Repair claimed by ${params.actor.fullName}: "${params.workNotes.trim()}". Moved to Awaiting Verification.`,
    createdAt: now,
  };
  const events = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
  events.push(newEvent);
  writeLocal(STORAGE_KEYS.EVENTS, events);

  void syncIssueToMongo({ issue: updatedIssue, evidence: uploadedEv, event: newEvent });
}

export async function recordVerificationDecision(params: {
  issue: Issue;
  reviewer: UserProfile;
  decision: 'verified_resolved' | 'resolution_disputed' | 'more_evidence_required';
  reviewNotes: string;
}): Promise<void> {
  const check = canTransitionStatus(
    params.issue.status,
    params.decision,
    params.reviewer.role
  );
  if (!check.allowed) throw new Error(check.reason);

  if (
    (params.decision === 'resolution_disputed' ||
      params.decision === 'more_evidence_required') &&
    !params.reviewNotes.trim()
  ) {
    throw new Error(
      'A clear reason is mandatory when disputing a repair or requesting more evidence.'
    );
  }

  const notes = params.reviewNotes.trim() || 'Evidence reviewed and accepted as resolved.';
  const labelMap = {
    verified_resolved: 'Verified Resolved',
    resolution_disputed: 'Resolution Disputed',
    more_evidence_required: 'More Evidence Required',
  };

  const now = new Date().toISOString();
  const updatedIssue: Issue = {
    ...params.issue,
    status: params.decision,
    reviewedBy: params.reviewer.id,
    reviewNotes: notes,
    updatedAt: now,
    resolvedAt: params.decision === 'verified_resolved' ? now : params.issue.resolvedAt,
  };
  const issues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []).map((i) =>
    i.id === params.issue.id ? updatedIssue : i
  );
  writeLocal(STORAGE_KEYS.ISSUES, issues);

  const newEvent: IssueEvent = {
    id: `evt-${Date.now()}`,
    issueId: params.issue.id,
    actorId: params.reviewer.id,
    actorName: params.reviewer.fullName,
    actorRole: params.reviewer.role,
    eventType: params.decision,
    fromStatus: params.issue.status,
    toStatus: params.decision,
    message: `Reviewer decision (${labelMap[params.decision]}): "${notes}"`,
    createdAt: now,
  };
  const events = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
  events.push(newEvent);
  writeLocal(STORAGE_KEYS.EVENTS, events);

  void syncIssueToMongo({ issue: updatedIssue, event: newEvent });
}

export async function linkRecurringIssue(params: {
  issueId: string;
  parentIssueId: string | null;
  parentCode?: string;
  actor: UserProfile;
}): Promise<void> {
  const now = new Date().toISOString();
  let updatedIssue: Issue | undefined;
  const issues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []).map((i) => {
    if (i.id === params.issueId) {
      updatedIssue = { ...i, parentRecurringIssueId: params.parentIssueId ?? undefined, updatedAt: now };
      return updatedIssue;
    }
    return i;
  });
  writeLocal(STORAGE_KEYS.ISSUES, issues);

  const newEvent: IssueEvent = {
    id: `evt-${Date.now()}`,
    issueId: params.issueId,
    actorId: params.actor.id,
    actorName: params.actor.fullName,
    actorRole: params.actor.role,
    eventType: params.parentIssueId ? 'recurring_linked' : 'recurring_unlinked',
    message: params.parentIssueId
      ? `Human reviewer confirmed recurring link to earlier incident ${
          params.parentCode || params.parentIssueId
        }.`
      : 'Recurring incident link dismissed.',
    createdAt: now,
  };
  const events = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
  events.push(newEvent);
  writeLocal(STORAGE_KEYS.EVENTS, events);

  if (updatedIssue) {
    void syncIssueToMongo({ issue: updatedIssue, event: newEvent });
  }
}

export async function triageIssueUnderReview(params: {
  issue: Issue;
  actor: UserProfile;
}): Promise<void> {
  const check = canTransitionStatus(params.issue.status, 'under_review', params.actor.role);
  if (!check.allowed) throw new Error(check.reason);

  const now = new Date().toISOString();
  const updatedIssue: Issue = {
    ...params.issue,
    status: 'under_review',
    updatedAt: now,
  };
  const issues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []).map((i) =>
    i.id === params.issue.id ? updatedIssue : i
  );
  writeLocal(STORAGE_KEYS.ISSUES, issues);

  const newEvent: IssueEvent = {
    id: `evt-${Date.now()}`,
    issueId: params.issue.id,
    actorId: params.actor.id,
    actorName: params.actor.fullName,
    actorRole: params.actor.role,
    eventType: 'triage_under_review',
    fromStatus: params.issue.status,
    toStatus: 'under_review',
    message: `${params.actor.fullName} marked issue Under Review for triage.`,
    createdAt: now,
  };
  const events = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
  events.push(newEvent);
  writeLocal(STORAGE_KEYS.EVENTS, events);

  void syncIssueToMongo({ issue: updatedIssue, event: newEvent });
}

export async function cancelIssueWithReason(params: {
  issue: Issue;
  actor: UserProfile;
  reason: string;
}): Promise<void> {
  if (!params.reason.trim()) {
    throw new Error('A cancellation reason is mandatory.');
  }
  const check = canTransitionStatus(params.issue.status, 'canceled', params.actor.role);
  if (!check.allowed) throw new Error(check.reason);

  const now = new Date().toISOString();
  const updatedIssue: Issue = {
    ...params.issue,
    status: 'canceled',
    reviewNotes: `Canceled: ${params.reason.trim()}`,
    updatedAt: now,
  };
  const issues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []).map((i) =>
    i.id === params.issue.id ? updatedIssue : i
  );
  writeLocal(STORAGE_KEYS.ISSUES, issues);

  const newEvent: IssueEvent = {
    id: `evt-${Date.now()}`,
    issueId: params.issue.id,
    actorId: params.actor.id,
    actorName: params.actor.fullName,
    actorRole: params.actor.role,
    eventType: 'issue_canceled',
    fromStatus: params.issue.status,
    toStatus: 'canceled',
    message: `Issue canceled by ${params.actor.fullName}: "${params.reason.trim()}"`,
    createdAt: now,
  };
  const events = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
  events.push(newEvent);
  writeLocal(STORAGE_KEYS.EVENTS, events);

  void syncIssueToMongo({ issue: updatedIssue, event: newEvent });
}
