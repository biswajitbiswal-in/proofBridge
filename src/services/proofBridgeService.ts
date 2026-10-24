import { isSupabaseConfigured, isSupabaseSchemaReady, supabase } from '../lib/supabase';
import {
  canTransitionStatus,
  EvidenceType,
  Issue,
  IssueCategory,
  IssueEvent,
  IssueEvidence,
  IssueStatus,
  IssueUrgency,
  UserProfile,
  UserRole,
  validateEvidenceFile,
} from '../types/domain';

// ============================================================================
// LOCAL PERSISTENT DATABASE FALLBACK (Works with zero SQL / Supabase setup)
// ============================================================================
const STORAGE_KEYS = {
  PROFILES: 'proofbridge_profiles_v1',
  ACTIVE_USER: 'proofbridge_active_user_v1',
  ISSUES: 'proofbridge_issues_v1',
  EVIDENCE: 'proofbridge_evidence_v1',
  EVENTS: 'proofbridge_events_v1',
  SEQ: 'proofbridge_seq_v1',
};

const DEFAULT_PROFILES: UserProfile[] = [
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
    id: 'user-admin-1',
    email: 'priya.warden@campus.edu',
    fullName: 'Dr. Priya Nair',
    role: 'admin',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

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
  const current = readLocal<number>(STORAGE_KEYS.SEQ, 1001);
  writeLocal(STORAGE_KEYS.SEQ, current + 1);
  return `PB-${current}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
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
  }

  // Always purge any legacy demo issues, demo evidence, or demo events
  const existingIssues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []);
  const cleanIssues = existingIssues.filter(
    (i) =>
      !i.isDemo &&
      !i.id.startsWith('demo-issue-') &&
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
  return active || profiles[0];
}

function hydrateLocalIssue(issue: Issue, profiles: UserProfile[]): Issue {
  return {
    ...issue,
    creator: profiles.find((p) => p.id === issue.createdBy),
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
  fullName?: string,
  role?: UserRole
): UserProfile {
  ensureLocalInitialized();
  const cleanEmail = email.trim().toLowerCase();
  const profiles = readLocal<UserProfile[]>(STORAGE_KEYS.PROFILES, DEFAULT_PROFILES);
  let user = profiles.find((p) => p.email.toLowerCase() === cleanEmail);
  if (!user) {
    user = {
      id: `user-${Date.now()}`,
      email: cleanEmail,
      fullName: fullName?.trim() || formatNameFromEmail(cleanEmail),
      role: role || 'reporter',
      createdAt: new Date().toISOString(),
    };
    profiles.push(user);
    writeLocal(STORAGE_KEYS.PROFILES, profiles);
  } else {
    if (fullName?.trim()) {
      user.fullName = fullName.trim();
    }
    if (role) {
      user.role = role;
    }
    writeLocal(STORAGE_KEYS.PROFILES, profiles);
  }
  writeLocal(STORAGE_KEYS.ACTIVE_USER, user);
  return user;
}

export async function getOrCreateProfile(
  userId: string,
  email: string,
  defaultName?: string,
  preferredRole?: UserRole
): Promise<UserProfile> {
  if (!(await isSupabaseSchemaReady())) {
    return signInOrCreateLocalUser(email, defaultName, preferredRole);
  }

  const { data: existing, error: selectErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (selectErr) throw new Error(selectErr.message);
  if (existing) {
    if (preferredRole && existing.role !== preferredRole) {
      const { data: updatedRole } = await supabase
        .from('profiles')
        .update({ role: preferredRole, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('*')
        .single();
      if (updatedRole) {
        const mapped = mapProfile(updatedRole)!;
        writeLocal(STORAGE_KEYS.ACTIVE_USER, mapped);
        return mapped;
      }
    }
    const mapped = mapProfile(existing)!;
    writeLocal(STORAGE_KEYS.ACTIVE_USER, mapped);
    return mapped;
  }

  const fullName = defaultName?.trim() || formatNameFromEmail(email);
  const { data: created, error: insertErr } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      full_name: fullName,
      role: preferredRole || 'reporter',
    })
    .select('*')
    .single();

  if (insertErr) throw new Error(insertErr.message);
  const mapped = mapProfile(created)!;
  writeLocal(STORAGE_KEYS.ACTIVE_USER, mapped);
  return mapped;
}

export async function updateMyRole(userId: string, role: UserRole): Promise<UserProfile> {
  if (!(await isSupabaseSchemaReady())) {
    const profiles = readLocal<UserProfile[]>(STORAGE_KEYS.PROFILES, DEFAULT_PROFILES);
    const updatedList = profiles.map((p) =>
      p.id === userId ? { ...p, role } : p
    );
    writeLocal(STORAGE_KEYS.PROFILES, updatedList);
    const updated = updatedList.find((p) => p.id === userId) || {
      ...profiles[0],
      id: userId,
      role,
    };
    writeLocal(STORAGE_KEYS.ACTIVE_USER, updated);
    return updated;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  const mapped = mapProfile(data)!;
  writeLocal(STORAGE_KEYS.ACTIVE_USER, mapped);
  return mapped;
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

export async function listRecentEvents(
  limit = 60
): Promise<Array<IssueEvent & { issueCode?: string; issueTitle?: string }>> {
  if (!(await isSupabaseSchemaReady())) {
    ensureLocalInitialized();
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

  const { data, error } = await supabase
    .from('issue_events')
    .select(
      `
      *,
      actor:profiles!issue_events_actor_id_fkey(id, full_name, role),
      issue:issues!issue_events_issue_id_fkey(id, code, title)
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    issueId: row.issue_id,
    actorId: row.actor_id ?? undefined,
    actorName: row.actor?.full_name ?? 'System',
    actorRole: row.actor?.role ?? undefined,
    eventType: row.event_type,
    fromStatus: row.from_status ?? undefined,
    toStatus: row.to_status ?? undefined,
    message: row.message,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    issueCode: row.issue?.code,
    issueTitle: row.issue?.title,
  }));
}

export async function listProfiles(): Promise<UserProfile[]> {
  if (!(await isSupabaseSchemaReady())) {
    ensureLocalInitialized();
    return readLocal<UserProfile[]>(STORAGE_KEYS.PROFILES, DEFAULT_PROFILES);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapProfile(r)!);
}

export async function listIssues(): Promise<Issue[]> {
  if (!(await isSupabaseSchemaReady())) {
    ensureLocalInitialized();
    const profiles = readLocal<UserProfile[]>(STORAGE_KEYS.PROFILES, DEFAULT_PROFILES);
    const rawIssues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []).filter(
      (i) => !i.isDemo
    );
    return rawIssues
      .map((i) => hydrateLocalIssue(i, profiles))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const { data, error } = await supabase
    .from('issues')
    .select(
      `
      *,
      creator:profiles!issues_created_by_fkey(id, email, full_name, role, created_at),
      assignee:profiles!issues_assigned_to_fkey(id, email, full_name, role, created_at),
      reviewer:profiles!issues_reviewed_by_fkey(id, email, full_name, role, created_at)
    `
    )
    .eq('is_demo', false)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapIssue);
}

export async function getIssueDetails(issueId: string): Promise<{
  issue: Issue;
  evidence: IssueEvidence[];
  timeline: IssueEvent[];
}> {
  if (!(await isSupabaseSchemaReady())) {
    const profiles = readLocal<UserProfile[]>(STORAGE_KEYS.PROFILES, DEFAULT_PROFILES);
    const issues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []);
    const found = issues.find((i) => i.id === issueId);
    if (!found) throw new Error('Issue not found.');
    const evidence = readLocal<IssueEvidence[]>(STORAGE_KEYS.EVIDENCE, []).filter(
      (e) => e.issueId === issueId
    );
    const timeline = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, [])
      .filter((e) => e.issueId === issueId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return {
      issue: hydrateLocalIssue(found, profiles),
      evidence,
      timeline,
    };
  }

  const { data: issueRow, error: issueErr } = await supabase
    .from('issues')
    .select(
      `
      *,
      creator:profiles!issues_created_by_fkey(id, email, full_name, role, created_at),
      assignee:profiles!issues_assigned_to_fkey(id, email, full_name, role, created_at),
      reviewer:profiles!issues_reviewed_by_fkey(id, email, full_name, role, created_at)
    `
    )
    .eq('id', issueId)
    .single();

  if (issueErr) throw new Error(issueErr.message);

  const { data: evidenceRows, error: evErr } = await supabase
    .from('issue_evidence')
    .select(
      `
      *,
      uploader:profiles!issue_evidence_uploaded_by_fkey(id, full_name, role)
    `
    )
    .eq('issue_id', issueId)
    .order('created_at', { ascending: true });

  if (evErr) throw new Error(evErr.message);

  const evidence: IssueEvidence[] = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (evidenceRows ?? []).map(async (row: any) => {
      let signedUrl: string | undefined;
      if (
        row.file_path.startsWith('http://') ||
        row.file_path.startsWith('https://') ||
        row.file_path.startsWith('data:')
      ) {
        signedUrl = row.file_path;
      } else {
        const { data: signed } = await supabase.storage
          .from('evidence-files')
          .createSignedUrl(row.file_path, 3600);
        signedUrl = signed?.signedUrl;
      }

      return {
        id: row.id,
        issueId: row.issue_id,
        uploadedBy: row.uploaded_by,
        uploaderName: row.uploader?.full_name,
        uploaderRole: row.uploader?.role,
        evidenceType: row.evidence_type as EvidenceType,
        filePath: row.file_path,
        fileName: row.file_name,
        fileSizeBytes: row.file_size_bytes,
        mimeType: row.mime_type,
        caption: row.caption ?? undefined,
        createdAt: row.created_at,
        signedUrl,
      };
    })
  );

  const { data: eventRows, error: eventErr } = await supabase
    .from('issue_events')
    .select(
      `
      *,
      actor:profiles!issue_events_actor_id_fkey(id, full_name, role)
    `
    )
    .eq('issue_id', issueId)
    .order('created_at', { ascending: true });

  if (eventErr) throw new Error(eventErr.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timeline: IssueEvent[] = (eventRows ?? []).map((row: any) => ({
    id: row.id,
    issueId: row.issue_id,
    actorId: row.actor_id ?? undefined,
    actorName: row.actor?.full_name ?? 'System',
    actorRole: row.actor?.role ?? undefined,
    eventType: row.event_type,
    fromStatus: row.from_status ?? undefined,
    toStatus: row.to_status ?? undefined,
    message: row.message,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }));

  return {
    issue: mapIssue(issueRow),
    evidence,
    timeline,
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
}): Promise<void> {
  const validationError = validateEvidenceFile(params.file);
  if (validationError) throw new Error(validationError);

  if (!(await isSupabaseSchemaReady())) {
    const dataUrl = await fileToDataUrl(params.file);
    const allEv = readLocal<IssueEvidence[]>(STORAGE_KEYS.EVIDENCE, []);
    allEv.push({
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
    });
    writeLocal(STORAGE_KEYS.EVIDENCE, allEv);
    return;
  }

  const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${params.evidenceType}/${params.issueId}/${Date.now()}_${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from('evidence-files')
    .upload(storagePath, params.file, {
      contentType: params.file.type,
      upsert: false,
    });

  if (uploadErr) {
    throw new Error(`Storage upload failed: ${uploadErr.message}`);
  }

  const { error: dbErr } = await supabase.from('issue_evidence').insert({
    issue_id: params.issueId,
    uploaded_by: params.userId,
    evidence_type: params.evidenceType,
    file_path: storagePath,
    file_name: params.file.name,
    file_size_bytes: params.file.size,
    mime_type: params.file.type,
    caption: params.caption?.trim() || null,
  });

  if (dbErr) {
    await supabase.storage.from('evidence-files').remove([storagePath]);
    throw new Error(`Evidence metadata save failed: ${dbErr.message}`);
  }
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

  if (!(await isSupabaseSchemaReady())) {
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
      createdAt: now,
      updatedAt: now,
    };

    const issues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []);
    writeLocal(STORAGE_KEYS.ISSUES, [newIssue, ...issues]);

    if (params.imageFile) {
      await uploadEvidenceFile({
        issueId: newIssue.id,
        userId: params.user.id,
        userName: params.user.fullName,
        userRole: params.user.role,
        file: params.imageFile,
        evidenceType: 'report_attachment',
        caption: params.imageCaption || 'Initial report photograph',
      });
    }

    const events = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
    events.push({
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
    });
    writeLocal(STORAGE_KEYS.EVENTS, events);
    return newIssue;
  }

  const { data: created, error: createErr } = await supabase
    .from('issues')
    .insert({
      code: '',
      title: params.title.trim(),
      description: params.description.trim(),
      category: params.category,
      location_building: params.locationBuilding.trim(),
      location_room: params.locationRoom?.trim() || null,
      urgency: params.urgency,
      status: 'submitted',
      created_by: params.user.id,
      is_demo: false,
    })
    .select('*')
    .single();

  if (createErr) throw new Error(createErr.message);

  if (params.imageFile) {
    await uploadEvidenceFile({
      issueId: created.id,
      userId: params.user.id,
      file: params.imageFile,
      evidenceType: 'report_attachment',
      caption: params.imageCaption || 'Initial report photograph',
    });
  }

  await supabase.from('issue_events').insert({
    issue_id: created.id,
    actor_id: params.user.id,
    event_type: 'issue_created',
    to_status: 'submitted',
    message: `Issue reported by ${params.user.fullName}${
      params.imageFile ? ' with initial photo evidence' : ''
    }.`,
  });

  return mapIssue(created);
}

export async function assignIssueToStaff(params: {
  issue: Issue;
  actor: UserProfile;
  assigneeId: string;
  assigneeName: string;
}): Promise<void> {
  const check = canTransitionStatus(params.issue.status, 'assigned', params.actor.role);
  if (!check.allowed) throw new Error(check.reason);

  if (!(await isSupabaseSchemaReady())) {
    const now = new Date().toISOString();
    const issues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []).map((i) =>
      i.id === params.issue.id
        ? { ...i, assignedTo: params.assigneeId, status: 'assigned' as IssueStatus, updatedAt: now }
        : i
    );
    writeLocal(STORAGE_KEYS.ISSUES, issues);

    const events = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
    events.push({
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
    });
    writeLocal(STORAGE_KEYS.EVENTS, events);
    return;
  }

  const { error } = await supabase
    .from('issues')
    .update({
      assigned_to: params.assigneeId,
      status: 'assigned',
    })
    .eq('id', params.issue.id);

  if (error) throw new Error(error.message);

  await supabase.from('issue_events').insert({
    issue_id: params.issue.id,
    actor_id: params.actor.id,
    event_type: 'issue_assigned',
    from_status: params.issue.status,
    to_status: 'assigned',
    message: `Assigned to maintenance staff: ${params.assigneeName}.`,
    metadata: { assigned_to: params.assigneeId },
  });
}

export async function startMaintenanceWork(params: {
  issue: Issue;
  actor: UserProfile;
}): Promise<void> {
  const check = canTransitionStatus(params.issue.status, 'in_progress', params.actor.role);
  if (!check.allowed) throw new Error(check.reason);

  if (!(await isSupabaseSchemaReady())) {
    const now = new Date().toISOString();
    const issues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []).map((i) =>
      i.id === params.issue.id ? { ...i, status: 'in_progress' as IssueStatus, updatedAt: now } : i
    );
    writeLocal(STORAGE_KEYS.ISSUES, issues);

    const events = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
    events.push({
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
    });
    writeLocal(STORAGE_KEYS.EVENTS, events);
    return;
  }

  const { error } = await supabase
    .from('issues')
    .update({ status: 'in_progress' })
    .eq('id', params.issue.id);

  if (error) throw new Error(error.message);

  await supabase.from('issue_events').insert({
    issue_id: params.issue.id,
    actor_id: params.actor.id,
    event_type: 'work_started',
    from_status: params.issue.status,
    to_status: 'in_progress',
    message: `${params.actor.fullName} started maintenance work.`,
  });
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

  if (params.evidenceFile) {
    await uploadEvidenceFile({
      issueId: params.issue.id,
      userId: params.actor.id,
      userName: params.actor.fullName,
      userRole: params.actor.role,
      file: params.evidenceFile,
      evidenceType: isResubmission ? 'subsequent_submission' : 'work_completion',
      caption: params.caption || params.workNotes.trim(),
    });
  }

  if (!(await isSupabaseSchemaReady())) {
    const now = new Date().toISOString();
    const issues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []).map((i) =>
      i.id === params.issue.id
        ? {
            ...i,
            status: 'awaiting_verification' as IssueStatus,
            workNotes: params.workNotes.trim(),
            updatedAt: now,
          }
        : i
    );
    writeLocal(STORAGE_KEYS.ISSUES, issues);

    const events = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
    events.push({
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
    });
    writeLocal(STORAGE_KEYS.EVENTS, events);
    return;
  }

  const { error } = await supabase
    .from('issues')
    .update({
      status: 'awaiting_verification',
      work_notes: params.workNotes.trim(),
    })
    .eq('id', params.issue.id);

  if (error) throw new Error(error.message);

  await supabase.from('issue_events').insert({
    issue_id: params.issue.id,
    actor_id: params.actor.id,
    event_type: 'completion_claimed',
    from_status: params.issue.status,
    to_status: 'awaiting_verification',
    message: `Repair claimed by ${params.actor.fullName}: "${params.workNotes.trim()}". Moved to Awaiting Verification.`,
    metadata: { has_photo: Boolean(params.evidenceFile) },
  });
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

  if (!(await isSupabaseSchemaReady())) {
    const now = new Date().toISOString();
    const issues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []).map((i) =>
      i.id === params.issue.id
        ? {
            ...i,
            status: params.decision,
            reviewedBy: params.reviewer.id,
            reviewNotes: notes,
            updatedAt: now,
            resolvedAt: params.decision === 'verified_resolved' ? now : i.resolvedAt,
          }
        : i
    );
    writeLocal(STORAGE_KEYS.ISSUES, issues);

    const events = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
    events.push({
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
    });
    writeLocal(STORAGE_KEYS.EVENTS, events);
    return;
  }

  const { error } = await supabase
    .from('issues')
    .update({
      status: params.decision,
      reviewed_by: params.reviewer.id,
      review_notes: notes,
    })
    .eq('id', params.issue.id);

  if (error) throw new Error(error.message);

  await supabase.from('issue_events').insert({
    issue_id: params.issue.id,
    actor_id: params.reviewer.id,
    event_type: params.decision,
    from_status: params.issue.status,
    to_status: params.decision,
    message: `Reviewer decision (${labelMap[params.decision]}): "${notes}"`,
    metadata: { decision: params.decision, reason: notes },
  });
}

export async function linkRecurringIssue(params: {
  issueId: string;
  parentIssueId: string | null;
  parentCode?: string;
  actor: UserProfile;
}): Promise<void> {
  if (!(await isSupabaseSchemaReady())) {
    const now = new Date().toISOString();
    const issues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []).map((i) =>
      i.id === params.issueId
        ? { ...i, parentRecurringIssueId: params.parentIssueId ?? undefined, updatedAt: now }
        : i
    );
    writeLocal(STORAGE_KEYS.ISSUES, issues);

    const events = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
    events.push({
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
    });
    writeLocal(STORAGE_KEYS.EVENTS, events);
    return;
  }

  const { error } = await supabase
    .from('issues')
    .update({ parent_recurring_issue_id: params.parentIssueId })
    .eq('id', params.issueId);

  if (error) throw new Error(error.message);

  await supabase.from('issue_events').insert({
    issue_id: params.issueId,
    actor_id: params.actor.id,
    event_type: params.parentIssueId ? 'recurring_linked' : 'recurring_unlinked',
    message: params.parentIssueId
      ? `Human reviewer confirmed recurring link to earlier incident ${
          params.parentCode || params.parentIssueId
        }.`
      : 'Recurring incident link dismissed.',
  });
}

export async function triageIssueUnderReview(params: {
  issue: Issue;
  actor: UserProfile;
}): Promise<void> {
  const check = canTransitionStatus(params.issue.status, 'under_review', params.actor.role);
  if (!check.allowed) throw new Error(check.reason);

  if (!(await isSupabaseSchemaReady())) {
    const now = new Date().toISOString();
    const issues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []).map((i) =>
      i.id === params.issue.id ? { ...i, status: 'under_review' as IssueStatus, updatedAt: now } : i
    );
    writeLocal(STORAGE_KEYS.ISSUES, issues);

    const events = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
    events.push({
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
    });
    writeLocal(STORAGE_KEYS.EVENTS, events);
    return;
  }

  const { error } = await supabase
    .from('issues')
    .update({ status: 'under_review' })
    .eq('id', params.issue.id);
  if (error) throw new Error(error.message);

  await supabase.from('issue_events').insert({
    issue_id: params.issue.id,
    actor_id: params.actor.id,
    event_type: 'triage_under_review',
    from_status: params.issue.status,
    to_status: 'under_review',
    message: `${params.actor.fullName} marked issue Under Review for triage.`,
  });
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

  if (!(await isSupabaseSchemaReady())) {
    const now = new Date().toISOString();
    const issues = readLocal<Issue[]>(STORAGE_KEYS.ISSUES, []).map((i) =>
      i.id === params.issue.id
        ? {
            ...i,
            status: 'canceled' as IssueStatus,
            reviewNotes: `Canceled: ${params.reason.trim()}`,
            updatedAt: now,
          }
        : i
    );
    writeLocal(STORAGE_KEYS.ISSUES, issues);

    const events = readLocal<IssueEvent[]>(STORAGE_KEYS.EVENTS, []);
    events.push({
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
    });
    writeLocal(STORAGE_KEYS.EVENTS, events);
    return;
  }

  const { error } = await supabase
    .from('issues')
    .update({
      status: 'canceled',
      review_notes: `Canceled: ${params.reason.trim()}`,
    })
    .eq('id', params.issue.id);
  if (error) throw new Error(error.message);

  await supabase.from('issue_events').insert({
    issue_id: params.issue.id,
    actor_id: params.actor.id,
    event_type: 'issue_canceled',
    from_status: params.issue.status,
    to_status: 'canceled',
    message: `Issue canceled by ${params.actor.fullName}: "${params.reason.trim()}"`,
  });
}
