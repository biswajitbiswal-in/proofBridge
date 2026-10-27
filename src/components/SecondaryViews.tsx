import React, { useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ClipboardCheck,
  GitCompareArrows,
  KeyRound,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  HIGHER_AUTHORITY_EMAIL,
  isHigherAuthority,
} from '../services/proofBridgeService';
import {
  CAMPUS_BUILDINGS,
  CATEGORY_LABELS,
  Issue,
  IssueCategory,
  IssueEvent,
  STATUS_META,
  URGENCY_META,
  UserProfile,
  UserRole,
} from '../types/domain';

// ============================================================================
// 1. EVIDENCE & REVIEWS WORKSPACE (Editorial Minimalist Theme)
// ============================================================================
export function EvidenceReviewsView({
  issues,
  onOpenIssue,
}: {
  issues: Issue[];
  onOpenIssue: (id: string) => void;
}) {
  const [filterMode, setFilterMode] = useState<'pending' | 'disputed' | 'verified'>('pending');

  const awaitingList = useMemo(
    () => issues.filter((i) => i.status === 'awaiting_verification'),
    [issues]
  );
  const disputedList = useMemo(
    () =>
      issues.filter(
        (i) =>
          i.status === 'resolution_disputed' ||
          i.status === 'more_evidence_required'
      ),
    [issues]
  );
  const verifiedList = useMemo(
    () => issues.filter((i) => i.status === 'verified_resolved'),
    [issues]
  );

  const displayed =
    filterMode === 'pending'
      ? awaitingList
      : filterMode === 'disputed'
      ? disputedList
      : verifiedList;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#2B303A] pb-6">
        <div className="space-y-2 max-w-xl">
          <p className="pb-eyebrow">VERIFICATION QUEUE</p>
          <h1 className="pb-display-section text-3xl sm:text-5xl text-[#F5F5F5]">
            Evidence & <span className="text-[#FF8A32]">reviews.</span>
          </h1>
          <p className="text-sm text-[#A1A1AA]">
            Compare original report evidence against submitted repair proof before verifying an outcome.
          </p>
        </div>
      </div>

      {/* Filter Bar & Accountability Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex rounded-control bg-[#1C2028] p-1 border border-[#2B303A] self-start">
          <button
            type="button"
            onClick={() => setFilterMode('pending')}
            className={`px-3.5 py-2 rounded-[4px] text-xs font-medium transition flex items-center gap-2 ${
              filterMode === 'pending'
                ? 'bg-[#111318] text-[#F5F5F5]'
                : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24]" />
            Pending Review
            <span className="font-mono tabular-nums text-[#A1A1AA]">
              {awaitingList.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('disputed')}
            className={`px-3.5 py-2 rounded-[4px] text-xs font-medium transition flex items-center gap-2 ${
              filterMode === 'disputed'
                ? 'bg-[#111318] text-[#F5F5F5]'
                : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#F87171]" />
            Disputed / Needs Proof
            <span className="font-mono tabular-nums text-[#A1A1AA]">
              {disputedList.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('verified')}
            className={`px-3.5 py-2 rounded-[4px] text-xs font-medium transition flex items-center gap-2 ${
              filterMode === 'verified'
                ? 'bg-[#111318] text-[#F5F5F5]'
                : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
            Verified
            <span className="font-mono tabular-nums text-[#A1A1AA]">
              {verifiedList.length}
            </span>
          </button>
        </div>

        <p className="text-xs text-[#A1A1AA] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#FF8A32] shrink-0" />
          Claimed Repair ≠ Verified Outcome: human review required.
        </p>
      </div>

      {displayed.length === 0 ? (
        <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-12 text-center space-y-2">
          <ClipboardCheck className="w-6 h-6 text-[#A1A1AA] mx-auto" />
          <p className="font-display text-lg font-semibold text-[#F5F5F5]">
            No issues in this review queue.
          </p>
          <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
            When maintenance staff submit repair notes and completion evidence, the issue appears here for human verification.
          </p>
        </div>
      ) : (
        <div className="bg-[#1C2028] border border-[#2B303A] rounded-card divide-y divide-[#2B303A]">
          {displayed.map((issue) => (
            <div
              key={issue.id}
              onClick={() => onOpenIssue(issue.id)}
              className="p-5 hover:bg-[#222731] transition-all duration-200 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 card-hover"
            >
              <div className="space-y-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-xs text-[#A1A1AA] tabular-nums">
                    {issue.code}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded inline-flex items-center gap-1.5 ${
                      STATUS_META[issue.status].badgeClass
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        STATUS_META[issue.status].dotColor
                      } ${
                        issue.status === 'awaiting_verification' ||
                        issue.status === 'resolution_disputed'
                          ? 'live-pulse-dot'
                          : ''
                      }`}
                    />
                    {STATUS_META[issue.status].shortLabel}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      URGENCY_META[issue.urgency].badgeClass
                    }`}
                  >
                    {URGENCY_META[issue.urgency].label}
                  </span>
                  <span className="text-xs text-[#A1A1AA]">
                    {issue.locationBuilding}
                    {issue.locationRoom ? ` • ${issue.locationRoom}` : ''}
                  </span>
                </div>

                <h3 className="font-display text-base font-semibold text-[#F5F5F5]">
                  {issue.title}
                </h3>

                {issue.workNotes && (
                  <p className="text-xs text-[#A1A1AA]">
                    <strong className="text-[#F5F5F5] font-medium">
                      Claimed Repair:{' '}
                    </strong>
                    {issue.workNotes}
                  </p>
                )}

                {issue.reviewNotes && (
                  <p className="text-xs text-[#A1A1AA]">
                    <strong className="text-[#F5F5F5] font-medium">
                      Reviewer Note:{' '}
                    </strong>
                    {issue.reviewNotes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenIssue(issue.id);
                  }}
                  className="px-4 py-2 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] text-[#111318] text-xs font-semibold flex items-center gap-1.5 transition btn-interact"
                >
                  <GitCompareArrows className="w-3.5 h-3.5" />
                  Review Evidence →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. ACTIVITY TIMELINE VIEW (Editorial Minimalist Theme)
// ============================================================================
export function ActivityTimelineView({
  events,
  loading,
  onOpenIssue,
  onRefresh,
}: {
  events: Array<IssueEvent & { issueCode?: string; issueTitle?: string }>;
  loading: boolean;
  onOpenIssue: (issueId: string) => void;
  onRefresh: () => void;
}) {
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return events;
    return events.filter((ev) => ev.eventType.includes(typeFilter));
  }, [events, typeFilter]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#2B303A] pb-6">
        <div className="space-y-2 max-w-xl">
          <p className="pb-eyebrow">AUDIT TRAIL</p>
          <h1 className="pb-display-section text-3xl sm:text-5xl text-[#F5F5F5]">
            Activity <span className="text-[#FF8A32]">timeline.</span>
          </h1>
          <p className="text-sm text-[#A1A1AA]">
            Chronological history of reported issues, assignments, evidence submissions, and verification decisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Filter timeline events"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-control bg-[#1C2028] border border-[#2B303A] px-3 py-2 text-xs text-[#F5F5F5]"
          >
            <option value="all">All recorded events</option>
            <option value="created">Issue reported</option>
            <option value="assigned">Staff assigned</option>
            <option value="work_started">Work started</option>
            <option value="completion_claimed">Repair evidence submitted</option>
            <option value="verified_resolved">Resolution verified</option>
            <option value="resolution_disputed">Resolution disputed</option>
            <option value="more_evidence">Additional evidence requested</option>
          </select>

          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh timeline"
            className="p-2 rounded-control bg-[#1C2028] hover:bg-[#222731] border border-[#2B303A] text-[#A1A1AA] hover:text-[#F5F5F5] transition"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loading ? 'animate-spin text-[#FF8A32]' : ''
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-6 sm:p-8">
        {filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Activity className="w-6 h-6 text-[#A1A1AA] mx-auto" />
            <p className="font-display text-lg font-semibold text-[#F5F5F5]">
              No recorded activity events yet.
            </p>
            <p className="text-xs text-[#A1A1AA]">
              Events are recorded automatically as issues move through reporting, repair, and verification.
            </p>
          </div>
        ) : (
          <ol className="relative border-l border-[#2B303A] ml-2 space-y-6">
            {filtered.map((ev) => {
              const dotClass =
                ev.toStatus === 'verified_resolved'
                  ? 'bg-[#22C55E]'
                  : ev.toStatus === 'resolution_disputed'
                  ? 'bg-[#F87171]'
                  : ev.toStatus === 'awaiting_verification'
                  ? 'bg-[#FBBF24]'
                  : 'bg-[#FF8A32]';

              return (
                <li key={ev.id} className="ml-6 space-y-1">
                  <span
                    className={`absolute -left-1.5 mt-1.5 w-2.5 h-2.5 rounded-full ${dotClass}`}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-[#F5F5F5]">
                        {ev.actorName || 'System'}
                      </span>
                      {ev.issueCode && (
                        <button
                          type="button"
                          onClick={() => onOpenIssue(ev.issueId)}
                          className="font-mono font-semibold text-[#FF8A32] hover:underline tabular-nums"
                        >
                          {ev.issueCode}
                        </button>
                      )}
                      {ev.fromStatus && ev.toStatus && (
                        <span className="text-[#A1A1AA]">
                          {STATUS_META[ev.fromStatus].shortLabel} →{' '}
                          <span className="text-[#F5F5F5]">
                            {STATUS_META[ev.toStatus].shortLabel}
                          </span>
                        </span>
                      )}
                    </div>

                    <time className="text-xs text-[#A1A1AA] tabular-nums">
                      {new Date(ev.createdAt).toLocaleString()}
                    </time>
                  </div>

                  <p className="text-sm text-[#A1A1AA] leading-relaxed">
                    {ev.message}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 3. ANALYTICS VIEW (Editorial Minimalist Theme — Real Stored Data)
// ============================================================================
export function AnalyticsView({
  issues,
  onOpenIssue,
}: {
  issues: Issue[];
  onOpenIssue: (id: string) => void;
}) {
  const metrics = useMemo(() => {
    const total = issues.length;
    const verified = issues.filter((i) => i.status === 'verified_resolved');
    const awaiting = issues.filter((i) => i.status === 'awaiting_verification');
    const disputed = issues.filter(
      (i) =>
        i.status === 'resolution_disputed' ||
        i.status === 'more_evidence_required'
    );
    const recurring = issues.filter((i) => Boolean(i.parentRecurringIssueId));

    const durationsHours = verified
      .filter((i) => i.resolvedAt && i.createdAt)
      .map(
        (i) =>
          (new Date(i.resolvedAt!).getTime() -
            new Date(i.createdAt).getTime()) /
          3600000
      )
      .filter((h) => h >= 0);

    const avgResolutionHours =
      durationsHours.length > 0
        ? Math.round(
            (durationsHours.reduce((a, b) => a + b, 0) /
              durationsHours.length) *
              10
          ) / 10
        : null;

    const byCategory = (Object.keys(CATEGORY_LABELS) as IssueCategory[])
      .map((cat) => ({
        category: cat,
        label: CATEGORY_LABELS[cat],
        count: issues.filter((i) => i.category === cat).length,
      }))
      .sort((a, b) => b.count - a.count);

    const byBuilding = CAMPUS_BUILDINGS.map((b) => ({
      building: b,
      count: issues.filter((i) => i.locationBuilding === b).length,
      disputedCount: issues.filter(
        (i) =>
          i.locationBuilding === b &&
          (i.status === 'resolution_disputed' ||
            i.status === 'more_evidence_required')
      ).length,
    })).sort((a, b) => b.count - a.count);

    return {
      total,
      verifiedCount: verified.length,
      awaitingCount: awaiting.length,
      disputedCount: disputed.length,
      recurringCount: recurring.length,
      recurringIssues: recurring,
      avgResolutionHours,
      byCategory,
      byBuilding,
    };
  }, [issues]);

  return (
    <div className="space-y-8">
      <div className="space-y-2 border-b border-[#2B303A] pb-6">
        <p className="pb-eyebrow">THE IMPACT SO FAR</p>
        <h1 className="pb-display-section text-3xl sm:text-5xl text-[#F5F5F5]">
          Civic <span className="text-[#FF8A32]">analytics.</span>
        </h1>
        <p className="text-sm text-[#A1A1AA] max-w-xl">
          Operational metrics computed strictly from stored issue and verification records.
        </p>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-6 space-y-2 card-hover transition-all duration-200">
          <span className="pb-eyebrow">ISSUES REPORTED</span>
          <p className="pb-stat-number text-4xl sm:text-5xl text-[#F5F5F5]">
            {metrics.total}
          </p>
        </div>

        <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-6 space-y-2 card-hover transition-all duration-200">
          <span className="pb-eyebrow text-[#22C55E]">ISSUES RESOLVED</span>
          <p className="pb-stat-number text-4xl sm:text-5xl text-[#22C55E]">
            {metrics.verifiedCount}
          </p>
        </div>

        <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-6 space-y-2 card-hover transition-all duration-200">
          <span className="pb-eyebrow text-[#F87171]">DISPUTED / REWORK</span>
          <p className="pb-stat-number text-4xl sm:text-5xl text-[#F87171]">
            {metrics.disputedCount}
          </p>
        </div>

        <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-6 space-y-2 card-hover transition-all duration-200">
          <span className="pb-eyebrow">AVG VERIFICATION TIME</span>
          <p className="pb-stat-number text-4xl sm:text-5xl text-[#F5F5F5]">
            {metrics.avgResolutionHours !== null
              ? `${metrics.avgResolutionHours}h`
              : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-6 space-y-5 card-hover transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="pb-eyebrow">BY CATEGORY</p>
              <h2 className="font-display text-lg font-bold text-[#F5F5F5] mt-1">
                Category Distribution
              </h2>
            </div>
            <span className="font-mono text-xs text-[#A1A1AA] tabular-nums">
              {metrics.total} total
            </span>
          </div>

          <div className="space-y-3.5">
            {metrics.byCategory.map((item) => {
              const pct =
                metrics.total > 0
                  ? Math.round((item.count / metrics.total) * 100)
                  : 0;
              return (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#F5F5F5]">{item.label}</span>
                    <span className="font-mono text-[#A1A1AA] tabular-nums">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#111318] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF8A32] rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Verification Outcomes */}
        <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-6 space-y-5">
          <div>
            <p className="pb-eyebrow">WORKFLOW STAGES</p>
            <h2 className="font-display text-lg font-bold text-[#F5F5F5] mt-1">
              Verification Outcomes
            </h2>
          </div>

          <div className="divide-y divide-[#2B303A]">
            {(
              [
                'submitted',
                'assigned',
                'in_progress',
                'awaiting_verification',
                'resolution_disputed',
                'more_evidence_required',
                'verified_resolved',
              ] as const
            ).map((statusKey) => {
              const count = issues.filter((i) => i.status === statusKey).length;
              return (
                <div
                  key={statusKey}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${STATUS_META[statusKey].dotColor}`}
                    />
                    <span className="text-[#F5F5F5]">
                      {STATUS_META[statusKey].label}
                    </span>
                  </div>
                  <span className="font-mono text-[#A1A1AA] tabular-nums font-medium">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Location Distribution */}
        <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-6 space-y-4">
          <div>
            <p className="pb-eyebrow">LOCATIONS</p>
            <h2 className="font-display text-lg font-bold text-[#F5F5F5] mt-1">
              Reports by Location
            </h2>
          </div>

          <div className="divide-y divide-[#2B303A]">
            {metrics.byBuilding.map((b) => (
              <div
                key={b.building}
                className="py-2.5 flex items-center justify-between text-xs"
              >
                <span className="text-[#F5F5F5]">{b.building}</span>
                <div className="flex items-center gap-3 font-mono tabular-nums">
                  {b.disputedCount > 0 && (
                    <span className="text-[#F87171]">
                      {b.disputedCount} disputed
                    </span>
                  )}
                  <span className="text-[#A1A1AA] font-medium">
                    {b.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Confirmed Recurring Issues */}
        <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="pb-eyebrow">PATTERN DETECTION</p>
              <h2 className="font-display text-lg font-bold text-[#F5F5F5] mt-1">
                Confirmed Recurring Issues
              </h2>
            </div>
            <span className="font-mono text-xs text-[#A1A1AA] tabular-nums">
              {metrics.recurringCount}
            </span>
          </div>

          {metrics.recurringIssues.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#A1A1AA]">
              No recurring issues linked yet.
            </p>
          ) : (
            <div className="divide-y divide-[#2B303A]">
              {metrics.recurringIssues.map((issue) => (
                <div
                  key={issue.id}
                  onClick={() => onOpenIssue(issue.id)}
                  className="py-3 flex items-center justify-between gap-3 text-xs cursor-pointer hover:text-[#FF8A32] transition"
                >
                  <div>
                    <span className="font-mono font-semibold text-[#A1A1AA] tabular-nums">
                      {issue.code}
                    </span>{' '}
                    <span className="text-[#F5F5F5] font-medium">
                      {issue.title}
                    </span>
                  </div>
                  <span className="text-[#FF8A32] shrink-0">Inspect →</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. SETTINGS VIEW (Editorial Minimalist Theme — No Demo Clutter)
// ============================================================================
export function SettingsView({
  profile,
  allProfiles,
  isCloudConnected,
  onSaveProfile,
  onAdminAssignRole,
  onProvisionAccount,
  onResetUserPassword,
  onDeleteUserAccount,
  onSignOut,
}: {
  profile: UserProfile;
  allProfiles: UserProfile[];
  isCloudConnected: boolean;
  onSaveProfile: (updates: { fullName: string; phoneNumber?: string }) => Promise<void>;
  onAdminAssignRole: (targetUserId: string, newRole: UserRole) => Promise<void>;
  onProvisionAccount: (params: {
    fullName: string;
    email: string;
    password: string;
    role: 'admin' | 'maintenance';
    phoneNumber?: string;
  }) => Promise<void>;
  onResetUserPassword: (targetUserId: string, newPassword: string) => Promise<void>;
  onDeleteUserAccount: (targetUserId: string) => Promise<void>;
  onSignOut: () => void;
}) {
  const [nameInput, setNameInput] = useState(profile.fullName);
  const [phoneInput, setPhoneInput] = useState(profile.phoneNumber || '');
  const [saving, setSaving] = useState(false);

  // Higher Authority / Admin Provisioning Form State
  const [provName, setProvName] = useState('');
  const [provEmail, setProvEmail] = useState('');
  const [provPassword, setProvPassword] = useState('');
  const [provPhone, setProvPhone] = useState('');
  const [provRole, setProvRole] = useState<'maintenance' | 'admin'>('maintenance');
  const [provBusy, setProvBusy] = useState(false);
  const [lastProvisioned, setLastProvisioned] = useState<{
    fullName: string;
    email: string;
    password: string;
    role: 'admin' | 'maintenance';
  } | null>(null);

  // Password Reset State
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  const isMasterAuthority = isHigherAuthority(profile);

  function generateStrongPassword(prefix: 'Staff' | 'Admin') {
    const code = Math.floor(1000 + Math.random() * 9000);
    setProvPassword(`${prefix}@${code}!`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveProfile({ fullName: nameInput, phoneNumber: phoneInput });
    } finally {
      setSaving(false);
    }
  }

  async function handleProvisionSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProvBusy(true);
    try {
      const cleanEmail = provEmail.trim().toLowerCase();
      const cleanName = provName.trim();
      await onProvisionAccount({
        fullName: cleanName,
        email: cleanEmail,
        password: provPassword,
        role: provRole,
        phoneNumber: provPhone,
      });
      setLastProvisioned({
        fullName: cleanName,
        email: cleanEmail,
        password: provPassword,
        role: provRole,
      });
      setProvName('');
      setProvEmail('');
      setProvPassword('');
      setProvPhone('');
    } finally {
      setProvBusy(false);
    }
  }

  async function handleResetPasswordSubmit(e: React.FormEvent, targetId: string) {
    e.preventDefault();
    if (!resetPasswordInput || resetPasswordInput.length < 6) return;
    setResetBusy(true);
    try {
      await onResetUserPassword(targetId, resetPasswordInput);
      setResetTargetId(null);
      setResetPasswordInput('');
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-12">
      <div className="space-y-2 border-b border-[#2B303A] pb-6">
        <p className="pb-eyebrow">ACCOUNT & WORKSPACE</p>
        <h1 className="pb-display-section text-3xl sm:text-5xl text-[#F5F5F5]">
          Account <span className="text-[#FF8A32]">settings.</span>
        </h1>
        <p className="text-sm text-[#A1A1AA] max-w-xl">
          Manage your personal details, view your assigned role permissions, and control your session.
        </p>
      </div>

      {/* 01 — Personal Profile */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start border-b border-[#2B303A] pb-12">
        <div className="lg:col-span-4 space-y-2">
          <span className="font-display text-2xl text-[#FF8A32] tabular-nums block">
            01
          </span>
          <h2 className="font-display text-xl font-bold text-[#F5F5F5]">
            Personal profile
          </h2>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Your name and contact details appear on reports, maintenance logs, and verification records.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 bg-[#1C2028] border border-[#2B303A] rounded-card p-6 sm:p-8 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                Full name
              </label>
              <input
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full rounded-control bg-[#111318] border border-[#2B303A] px-3.5 py-2.5 text-sm text-[#F5F5F5] focus:border-[#FF8A32]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                Email address
              </label>
              <input
                type="email"
                disabled
                value={profile.email}
                className="w-full rounded-control bg-[#111318]/60 border border-[#2B303A] px-3.5 py-2.5 text-sm text-[#A1A1AA] cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                Phone number (optional)
              </label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-control bg-[#111318] border border-[#2B303A] px-3.5 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#A1A1AA]/50 focus:border-[#FF8A32]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                Assigned account role (Locked)
              </label>
              <input
                type="text"
                disabled
                value={
                  profile.role === 'admin'
                    ? 'Admin / Reviewer'
                    : profile.role === 'maintenance'
                    ? 'Maintenance Staff'
                    : 'Reporter (Citizen / Resident)'
                }
                className="w-full rounded-control bg-[#111318]/60 border border-[#2B303A] px-3.5 py-2.5 text-sm text-[#FF8A32] font-medium cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] disabled:opacity-50 text-[#111318] text-xs font-semibold transition"
            >
              {saving ? 'Saving changes...' : 'Save profile ↗'}
            </button>
          </div>
        </form>
      </section>

      {/* 02 — Account Role & Access Policy (Strictly Enforced, No Self-Switching) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start border-b border-[#2B303A] pb-12">
        <div className="lg:col-span-4 space-y-2">
          <span className="font-display text-2xl text-[#FF8A32] tabular-nums block">
            02
          </span>
          <h2 className="font-display text-xl font-bold text-[#F5F5F5]">
            Role permissions
          </h2>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Roles cannot be self-elevated. Reporters can only report and track issues; only authorized Admins can triage, assign staff, and verify outcomes.
          </p>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(
              [
                {
                  role: 'reporter' as UserRole,
                  title: 'Reporter',
                  desc: 'Report issues with photos and track resolution status.',
                },
                {
                  role: 'maintenance' as UserRole,
                  title: 'Maintenance Staff',
                  desc: 'Accept assigned repairs and upload completion evidence.',
                },
                {
                  role: 'admin' as UserRole,
                  title: 'Admin / Reviewer',
                  desc: 'Triage reports, assign staff, and verify or dispute repairs.',
                },
              ] as const
            ).map((item) => {
              const active = profile.role === item.role;
              return (
                <div
                  key={item.role}
                  className={`p-5 rounded-card border flex flex-col justify-between gap-4 ${
                    active
                      ? 'bg-[#1C2028] border-[#FF8A32] text-[#F5F5F5]'
                      : 'bg-[#111318]/60 border-[#2B303A] text-[#A1A1AA] opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-display text-sm font-bold text-[#F5F5F5]">
                      {item.title}
                    </span>
                    {active ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FF8A32]/15 text-[#FF8A32]">
                        Your Role
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#A1A1AA]">Locked</span>
                    )}
                  </div>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Higher Authority / Admin Provisioning & Credential Management */}
          {profile.role === 'admin' && (
            <div className="space-y-6 pt-2">
              {/* Create Staff / Admin ID & Password Card */}
              <div className="bg-[#1C2028] border border-[#FF8A32]/40 rounded-card p-6 sm:p-8 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#2B303A] pb-4">
                  <div className="space-y-1">
                    <p className="pb-eyebrow text-[#FF8A32]">
                      {isMasterAuthority
                        ? 'HIGHER AUTHORITY / SYSTEM DEVELOPER CONSOLE'
                        : 'AUTHORIZED ADMIN PROVISIONING'}
                    </p>
                    <h3 className="font-display text-lg font-bold text-[#F5F5F5]">
                      Create Maintenance Staff & Admin Credentials
                    </h3>
                    <p className="text-xs text-[#A1A1AA] max-w-xl">
                      Public users can only register as Reporters. Use this console to create official Maintenance Staff and Admin / Reviewer Login IDs with assigned passwords.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-[#FF8A32]/15 border border-[#FF8A32]/30 text-[10px] font-semibold uppercase tracking-wider text-[#FF8A32]">
                    {isMasterAuthority ? 'Higher Authority' : 'Admin Access'}
                  </span>
                </div>

                {lastProvisioned && (
                  <div className="p-4 rounded-control bg-[#22C55E]/10 border border-[#22C55E]/30 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[#22C55E] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Official {lastProvisioned.role === 'admin' ? 'Admin / Reviewer' : 'Maintenance Staff'} Account Provisioned
                      </p>
                      <button
                        type="button"
                        onClick={() => setLastProvisioned(null)}
                        className="text-[11px] text-[#A1A1AA] hover:text-[#F5F5F5]"
                      >
                        Dismiss
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs font-mono bg-[#111318] p-3 rounded border border-[#2B303A]">
                      <div>
                        <span className="text-[#A1A1AA] block text-[10px] font-sans">
                          Name & Role
                        </span>
                        <span className="text-[#F5F5F5]">
                          {lastProvisioned.fullName} ({lastProvisioned.role})
                        </span>
                      </div>
                      <div>
                        <span className="text-[#A1A1AA] block text-[10px] font-sans">
                          Login Email ID
                        </span>
                        <span className="text-[#FF8A32]">
                          {lastProvisioned.email}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#A1A1AA] block text-[10px] font-sans">
                          Assigned Password
                        </span>
                        <span className="text-[#22C55E]">
                          {lastProvisioned.password}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleProvisionSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                        Account role to provision *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setProvRole('maintenance')}
                          className={`py-2.5 px-3 rounded-control border text-left text-xs font-semibold transition ${
                            provRole === 'maintenance'
                              ? 'bg-[#111318] border-[#FF8A32] text-[#FF8A32]'
                              : 'bg-[#111318] border-[#2B303A] text-[#A1A1AA] hover:text-[#F5F5F5]'
                          }`}
                        >
                          Maintenance Staff
                        </button>
                        <button
                          type="button"
                          onClick={() => setProvRole('admin')}
                          className={`py-2.5 px-3 rounded-control border text-left text-xs font-semibold transition ${
                            provRole === 'admin'
                              ? 'bg-[#111318] border-[#FF8A32] text-[#FF8A32]'
                              : 'bg-[#111318] border-[#2B303A] text-[#A1A1AA] hover:text-[#F5F5F5]'
                          }`}
                        >
                          Admin / Reviewer
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                        Full name *
                      </label>
                      <input
                        type="text"
                        required
                        value={provName}
                        onChange={(e) => setProvName(e.target.value)}
                        placeholder={
                          provRole === 'admin'
                            ? 'Dr. Meera Krishnan'
                            : 'Suresh Kumar (Electrical)'
                        }
                        className="w-full rounded-control bg-[#111318] border border-[#2B303A] px-3.5 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#A1A1AA]/50 focus:border-[#FF8A32]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                        Official Login Email ID *
                      </label>
                      <input
                        type="email"
                        required
                        value={provEmail}
                        onChange={(e) => setProvEmail(e.target.value)}
                        placeholder={
                          provRole === 'admin'
                            ? 'meera.admin@campus.edu'
                            : 'suresh.staff@campus.edu'
                        }
                        className="w-full rounded-control bg-[#111318] border border-[#2B303A] px-3.5 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#A1A1AA]/50 focus:border-[#FF8A32]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-medium text-[#A1A1AA]">
                          Assign Login Password (min 6 chars) *
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            generateStrongPassword(
                              provRole === 'admin' ? 'Admin' : 'Staff'
                            )
                          }
                          className="text-[11px] font-medium text-[#FF8A32] hover:underline"
                        >
                          Generate password
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        minLength={6}
                        value={provPassword}
                        onChange={(e) => setProvPassword(e.target.value)}
                        placeholder={
                          provRole === 'admin' ? 'Admin@2026' : 'Staff@2026'
                        }
                        className="w-full rounded-control bg-[#111318] border border-[#2B303A] px-3.5 py-2.5 text-sm font-mono text-[#F5F5F5] placeholder:text-[#A1A1AA]/50 focus:border-[#FF8A32]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                        Phone / Department (optional)
                      </label>
                      <input
                        type="text"
                        value={provPhone}
                        onChange={(e) => setProvPhone(e.target.value)}
                        placeholder="+91 98765 00000 • Campus Facilities"
                        className="w-full rounded-control bg-[#111318] border border-[#2B303A] px-3.5 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#A1A1AA]/50 focus:border-[#FF8A32]"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={provBusy}
                      className="px-5 py-2.5 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] disabled:opacity-50 text-[#111318] text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {provBusy
                        ? 'Provisioning account...'
                        : `Create ${
                            provRole === 'admin'
                              ? 'Admin / Reviewer'
                              : 'Maintenance Staff'
                          } Account ↗`}
                    </button>
                  </div>
                </form>
              </div>

              {/* Registered User & Staff Directory with Password Reset */}
              <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-6 space-y-4">
                <div>
                  <p className="pb-eyebrow text-[#FF8A32]">ACCOUNT DIRECTORY</p>
                  <h3 className="font-display text-base font-bold text-[#F5F5F5] mt-1">
                    Manage Provisioned Staff, Admins & Reporters ({allProfiles.length})
                  </h3>
                  <p className="text-xs text-[#A1A1AA]">
                    Update roles, reset login passwords, or revoke accounts.
                  </p>
                </div>

                <div className="divide-y divide-[#2B303A] border-t border-[#2B303A]">
                  {allProfiles.map((user) => {
                    const isMaster =
                      user.email.toLowerCase() === HIGHER_AUTHORITY_EMAIL;
                    const isSelf = user.id === profile.id;
                    return (
                      <div key={user.id} className="py-3.5 space-y-3 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-[#F5F5F5]">
                                {user.fullName}
                              </span>
                              {isSelf && (
                                <span className="text-[#FF8A32] font-semibold">
                                  (You)
                                </span>
                              )}
                              {isMaster && (
                                <span className="px-2 py-0.5 rounded bg-[#FF8A32]/15 text-[#FF8A32] text-[10px] font-semibold">
                                  Higher Authority
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-[#A1A1AA]">
                              {user.email}
                              {user.phoneNumber ? ` • ${user.phoneNumber}` : ''}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              aria-label={`Assign role for ${user.fullName}`}
                              value={user.role}
                              disabled={isSelf || isMaster}
                              onChange={(e) =>
                                onAdminAssignRole(
                                  user.id,
                                  e.target.value as UserRole
                                )
                              }
                              className="rounded-control bg-[#111318] border border-[#2B303A] px-3 py-1.5 text-xs text-[#F5F5F5] disabled:opacity-50"
                            >
                              <option value="reporter">Reporter</option>
                              <option value="maintenance">
                                Maintenance Staff
                              </option>
                              <option value="admin">Admin / Reviewer</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => {
                                setResetTargetId(
                                  resetTargetId === user.id ? null : user.id
                                );
                                setResetPasswordInput('');
                              }}
                              className="px-2.5 py-1.5 rounded-control bg-[#111318] hover:bg-[#222731] border border-[#2B303A] text-[#F5F5F5] flex items-center gap-1 transition"
                            >
                              <KeyRound className="w-3 h-3 text-[#FF8A32]" />
                              Reset Password
                            </button>

                            {!isSelf && !isMaster && (
                              <button
                                type="button"
                                onClick={() => onDeleteUserAccount(user.id)}
                                title="Remove account"
                                className="p-1.5 rounded-control bg-[#F87171]/10 hover:bg-[#F87171]/20 border border-[#F87171]/30 text-[#F87171] transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {resetTargetId === user.id && (
                          <form
                            onSubmit={(e) =>
                              handleResetPasswordSubmit(e, user.id)
                            }
                            className="flex flex-wrap items-center gap-2 bg-[#111318] p-2.5 rounded-control border border-[#2B303A]"
                          >
                            <input
                              type="text"
                              required
                              minLength={6}
                              value={resetPasswordInput}
                              onChange={(e) =>
                                setResetPasswordInput(e.target.value)
                              }
                              placeholder={`New password for ${user.email}`}
                              className="flex-1 min-w-[200px] rounded-control bg-[#1C2028] border border-[#2B303A] px-3 py-1.5 text-xs font-mono text-[#F5F5F5]"
                            />
                            <button
                              type="submit"
                              disabled={resetBusy}
                              className="px-3 py-1.5 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] text-[#111318] font-semibold text-xs transition"
                            >
                              {resetBusy ? 'Saving...' : 'Save New Password'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setResetTargetId(null)}
                              className="px-2.5 py-1.5 rounded-control text-[#A1A1AA] hover:text-[#F5F5F5] text-xs"
                            >
                              Cancel
                            </button>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 03 — Session & Workspace Status */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-2">
          <span className="font-display text-2xl text-[#FF8A32] tabular-nums block">
            03
          </span>
          <h2 className="font-display text-xl font-bold text-[#F5F5F5]">
            Session & database
          </h2>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Connected workspace persistence and session controls.
          </p>
        </div>

        <div className="lg:col-span-8 bg-[#1C2028] border border-[#2B303A] rounded-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-[#F5F5F5]">
              <span
                className={`w-2 h-2 rounded-full ${
                  isCloudConnected ? 'bg-[#22C55E]' : 'bg-[#FF8A32]'
                }`}
              />
              {isCloudConnected
                ? 'Connected to Supabase PostgreSQL & Storage'
                : 'Connected to Local Persisted Database'}
            </div>
            <p className="text-xs text-[#A1A1AA]">
              Signed in as {profile.email} ({profile.role})
            </p>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="px-4 py-2.5 rounded-control bg-[#F87171]/10 hover:bg-[#F87171]/20 border border-[#F87171]/30 text-[#F87171] text-xs font-semibold flex items-center gap-2 transition shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out of ProofBridge
          </button>
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// 5. HIGHER AUTHORITY / SYSTEM ADMINISTRATOR CONTROL CENTER
// ============================================================================
export function AuthorityConsoleView({
  profile,
  allProfiles,
  issues,
  onProvisionAccount,
  onAdminAssignRole,
  onResetUserPassword,
  onDeleteUserAccount,
  onOpenIssue,
}: {
  profile: UserProfile;
  allProfiles: UserProfile[];
  issues: Issue[];
  onProvisionAccount: (params: {
    fullName: string;
    email: string;
    password: string;
    role: 'admin' | 'maintenance';
    phoneNumber?: string;
  }) => Promise<void>;
  onAdminAssignRole: (targetUserId: string, newRole: UserRole) => Promise<void>;
  onResetUserPassword: (targetUserId: string, newPassword: string) => Promise<void>;
  onDeleteUserAccount: (targetUserId: string) => Promise<void>;
  onOpenIssue: (id: string) => void;
}) {
  const [provName, setProvName] = useState('');
  const [provEmail, setProvEmail] = useState('');
  const [provPassword, setProvPassword] = useState('');
  const [provPhone, setProvPhone] = useState('');
  const [provRole, setProvRole] = useState<'admin' | 'maintenance'>('admin');
  const [provBusy, setProvBusy] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    fullName: string;
    email: string;
    password: string;
    role: 'admin' | 'maintenance';
  } | null>(null);

  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  const counts = useMemo(() => {
    return {
      admins: allProfiles.filter((u) => u.role === 'admin').length,
      staff: allProfiles.filter((u) => u.role === 'maintenance').length,
      reporters: allProfiles.filter((u) => u.role === 'reporter').length,
      openIssues: issues.filter((i) => i.status !== 'verified_resolved' && i.status !== 'canceled').length,
    };
  }, [allProfiles, issues]);

  const filteredProfiles = useMemo(() => {
    if (roleFilter === 'all') return allProfiles;
    return allProfiles.filter((u) => u.role === roleFilter);
  }, [allProfiles, roleFilter]);

  function generateStrongPassword(prefix: 'Admin' | 'Staff') {
    const code = Math.floor(1000 + Math.random() * 9000);
    setProvPassword(`${prefix}@${code}!`);
  }

  async function handleCreateOfficial(e: React.FormEvent) {
    e.preventDefault();
    setProvBusy(true);
    try {
      const cleanEmail = provEmail.trim().toLowerCase();
      const cleanName = provName.trim();
      await onProvisionAccount({
        fullName: cleanName,
        email: cleanEmail,
        password: provPassword,
        role: provRole,
        phoneNumber: provPhone,
      });
      setCreatedCredentials({
        fullName: cleanName,
        email: cleanEmail,
        password: provPassword,
        role: provRole,
      });
      setProvName('');
      setProvEmail('');
      setProvPassword('');
      setProvPhone('');
    } finally {
      setProvBusy(false);
    }
  }

  async function handlePasswordReset(e: React.FormEvent, targetId: string) {
    e.preventDefault();
    if (!resetPasswordInput || resetPasswordInput.length < 6) return;
    setResetBusy(true);
    try {
      await onResetUserPassword(targetId, resetPasswordInput);
      setResetTargetId(null);
      setResetPasswordInput('');
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#2B303A] pb-6">
        <div className="space-y-2 max-w-2xl">
          <p className="pb-eyebrow text-[#FF8A32]">
            SYSTEM AUTHORITY & CREDENTIAL PROVISIONING
          </p>
          <h1 className="pb-display-section text-3xl sm:text-5xl text-[#F5F5F5]">
            Higher Authority <span className="text-[#FF8A32]">console.</span>
          </h1>
          <p className="text-sm text-[#A1A1AA]">
            Create official Admin and Maintenance Staff Login IDs with passwords, manage role permissions, and oversee all campus operations from one place.
          </p>
        </div>

        <span className="px-3 py-1.5 rounded bg-[#FF8A32]/15 border border-[#FF8A32]/30 text-xs font-semibold text-[#FF8A32] shrink-0">
          Master Administrator: {profile.fullName}
        </span>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-5 space-y-1.5 card-hover transition-all duration-200">
          <span className="pb-eyebrow">PROVISIONED ADMINS</span>
          <p className="pb-stat-number text-4xl text-[#FF8A32]">
            {counts.admins}
          </p>
          <p className="text-xs text-[#A1A1AA]">Authorized reviewers & coordinators</p>
        </div>

        <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-5 space-y-1.5 card-hover transition-all duration-200">
          <span className="pb-eyebrow">MAINTENANCE STAFF</span>
          <p className="pb-stat-number text-4xl text-[#60A5FA]">
            {counts.staff}
          </p>
          <p className="text-xs text-[#A1A1AA]">Field repair technicians</p>
        </div>

        <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-5 space-y-1.5 card-hover transition-all duration-200">
          <span className="pb-eyebrow">CITIZEN REPORTERS</span>
          <p className="pb-stat-number text-4xl text-[#F5F5F5]">
            {counts.reporters}
          </p>
          <p className="text-xs text-[#A1A1AA]">Public registered accounts</p>
        </div>

        <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-5 space-y-1.5 card-hover transition-all duration-200">
          <span className="pb-eyebrow">ACTIVE OPEN ISSUES</span>
          <p className="pb-stat-number text-4xl text-[#FBBF24]">
            {counts.openIssues}
          </p>
          <p className="text-xs text-[#A1A1AA]">Across all campus buildings</p>
        </div>
      </div>

      {/* Main Split Grid: Left = Create Admin/Staff ID & Password, Right = Manage Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Provision New Admin / Staff Account */}
        <div className="lg:col-span-5 bg-[#1C2028] border border-[#FF8A32]/40 rounded-card p-6 space-y-5 card-hover transition-all duration-200">
          <div className="space-y-1 border-b border-[#2B303A] pb-4">
            <p className="pb-eyebrow text-[#FF8A32]">STEP 01 — CREATE CREDENTIALS</p>
            <h2 className="font-display text-lg font-bold text-[#F5F5F5]">
              Create Admin or Staff ID & Password
            </h2>
            <p className="text-xs text-[#A1A1AA]">
              Assign an official Login Email ID and Password, then share the credentials with the Admin or Staff member so they can log in.
            </p>
          </div>

          {createdCredentials && (
            <div className="p-4 rounded-control bg-[#22C55E]/10 border border-[#22C55E]/30 space-y-2.5 animate-scale-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#22C55E] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Account Ready to Share
                </span>
                <button
                  type="button"
                  onClick={() => setCreatedCredentials(null)}
                  className="text-[11px] text-[#A1A1AA] hover:text-[#F5F5F5]"
                >
                  Close
                </button>
              </div>
              <div className="bg-[#111318] border border-[#2B303A] rounded p-3 space-y-1.5 text-xs font-mono">
                <div>
                  <span className="text-[#A1A1AA] font-sans">Role: </span>
                  <span className="text-[#F5F5F5]">
                    {createdCredentials.role === 'admin'
                      ? 'Admin / Reviewer'
                      : 'Maintenance Staff'}
                  </span>
                </div>
                <div>
                  <span className="text-[#A1A1AA] font-sans">Login ID: </span>
                  <span className="text-[#FF8A32]">{createdCredentials.email}</span>
                </div>
                <div>
                  <span className="text-[#A1A1AA] font-sans">Password: </span>
                  <span className="text-[#22C55E]">{createdCredentials.password}</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleCreateOfficial} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                Select Account Type to Create *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setProvRole('admin')}
                  className={`py-2.5 px-3 rounded-control border text-left text-xs font-semibold transition ${
                    provRole === 'admin'
                      ? 'bg-[#111318] border-[#FF8A32] text-[#FF8A32]'
                      : 'bg-[#111318] border-[#2B303A] text-[#A1A1AA] hover:text-[#F5F5F5]'
                  }`}
                >
                  Admin / Reviewer
                </button>
                <button
                  type="button"
                  onClick={() => setProvRole('maintenance')}
                  className={`py-2.5 px-3 rounded-control border text-left text-xs font-semibold transition ${
                    provRole === 'maintenance'
                      ? 'bg-[#111318] border-[#FF8A32] text-[#FF8A32]'
                      : 'bg-[#111318] border-[#2B303A] text-[#A1A1AA] hover:text-[#F5F5F5]'
                  }`}
                >
                  Maintenance Staff
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={provName}
                onChange={(e) => setProvName(e.target.value)}
                placeholder={
                  provRole === 'admin'
                    ? 'e.g. Dr. Meera Krishnan'
                    : 'e.g. Suresh Kumar'
                }
                className="w-full rounded-control bg-[#111318] border border-[#2B303A] px-3.5 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#A1A1AA]/50 focus:border-[#FF8A32]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                Official Login Email ID *
              </label>
              <input
                type="email"
                required
                value={provEmail}
                onChange={(e) => setProvEmail(e.target.value)}
                placeholder={
                  provRole === 'admin'
                    ? 'admin.name@organization.com'
                    : 'staff.name@organization.com'
                }
                className="w-full rounded-control bg-[#111318] border border-[#2B303A] px-3.5 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#A1A1AA]/50 focus:border-[#FF8A32]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[#A1A1AA]">
                  Assign Login Password (min 6 chars) *
                </label>
                <button
                  type="button"
                  onClick={() =>
                    generateStrongPassword(
                      provRole === 'admin' ? 'Admin' : 'Staff'
                    )
                  }
                  className="text-[11px] font-medium text-[#FF8A32] hover:underline"
                >
                  Auto-generate password
                </button>
              </div>
              <input
                type="text"
                required
                minLength={6}
                value={provPassword}
                onChange={(e) => setProvPassword(e.target.value)}
                placeholder="Enter password to assign"
                className="w-full rounded-control bg-[#111318] border border-[#2B303A] px-3.5 py-2.5 text-sm font-mono text-[#F5F5F5] placeholder:text-[#A1A1AA]/50 focus:border-[#FF8A32]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                Department / Phone (optional)
              </label>
              <input
                type="text"
                value={provPhone}
                onChange={(e) => setProvPhone(e.target.value)}
                placeholder="Facilities & Operations"
                className="w-full rounded-control bg-[#111318] border border-[#2B303A] px-3.5 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#A1A1AA]/50 focus:border-[#FF8A32]"
              />
            </div>

            <button
              type="submit"
              disabled={provBusy}
              className="w-full py-3 px-4 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] disabled:opacity-50 text-[#111318] text-xs font-semibold flex items-center justify-center gap-1.5 transition btn-interact"
            >
              <Plus className="w-4 h-4" />
              {provBusy
                ? 'Creating Account...'
                : `Create ${
                    provRole === 'admin'
                      ? 'Admin / Reviewer'
                      : 'Maintenance Staff'
                  } Account ↗`}
            </button>
          </form>
        </div>

        {/* Right: All Provisioned Accounts & Password Management */}
        <div className="lg:col-span-7 bg-[#1C2028] border border-[#2B303A] rounded-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2B303A] pb-4">
            <div>
              <p className="pb-eyebrow text-[#FF8A32]">STEP 02 — MANAGE CREDENTIALS</p>
              <h2 className="font-display text-lg font-bold text-[#F5F5F5]">
                Provisioned Accounts Directory ({filteredProfiles.length})
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1 bg-[#111318] p-1 rounded-control border border-[#2B303A]">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'admin', label: 'Admins' },
                  { id: 'maintenance', label: 'Staff' },
                  { id: 'reporter', label: 'Reporters' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRoleFilter(tab.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                    roleFilter === tab.id
                      ? 'bg-[#1C2028] text-[#FF8A32]'
                      : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-[#2B303A]">
            {filteredProfiles.map((user) => {
              const isMaster =
                user.email.toLowerCase() === HIGHER_AUTHORITY_EMAIL;
              const isSelf = user.id === profile.id;
              return (
                <div key={user.id} className="py-3.5 space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#F5F5F5]">
                          {user.fullName}
                        </span>
                        {isMaster && (
                          <span className="px-2 py-0.5 rounded bg-[#FF8A32]/15 text-[#FF8A32] text-[10px] font-semibold">
                            Higher Authority
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[#A1A1AA]">
                        {user.email}
                        {user.phoneNumber ? ` • ${user.phoneNumber}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label={`Role for ${user.fullName}`}
                        value={user.role}
                        disabled={isSelf || isMaster}
                        onChange={(e) =>
                          onAdminAssignRole(user.id, e.target.value as UserRole)
                        }
                        className="rounded-control bg-[#111318] border border-[#2B303A] px-2.5 py-1.5 text-xs text-[#F5F5F5] disabled:opacity-50"
                      >
                        <option value="reporter">Reporter</option>
                        <option value="maintenance">Maintenance Staff</option>
                        <option value="admin">Admin / Reviewer</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          setResetTargetId(
                            resetTargetId === user.id ? null : user.id
                          );
                          setResetPasswordInput('');
                        }}
                        className="px-2.5 py-1.5 rounded-control bg-[#111318] hover:bg-[#222731] border border-[#2B303A] text-[#F5F5F5] flex items-center gap-1 transition"
                      >
                        <KeyRound className="w-3 h-3 text-[#FF8A32]" />
                        Set Password
                      </button>

                      {!isSelf && !isMaster && (
                        <button
                          type="button"
                          onClick={() => onDeleteUserAccount(user.id)}
                          title="Delete account"
                          className="p-1.5 rounded-control bg-[#F87171]/10 hover:bg-[#F87171]/20 border border-[#F87171]/30 text-[#F87171] transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {resetTargetId === user.id && (
                    <form
                      onSubmit={(e) => handlePasswordReset(e, user.id)}
                      className="flex flex-wrap items-center gap-2 bg-[#111318] p-2.5 rounded-control border border-[#2B303A]"
                    >
                      <input
                        type="text"
                        required
                        minLength={6}
                        value={resetPasswordInput}
                        onChange={(e) => setResetPasswordInput(e.target.value)}
                        placeholder={`Enter new password for ${user.email}`}
                        className="flex-1 min-w-[180px] rounded-control bg-[#1C2028] border border-[#2B303A] px-3 py-1.5 text-xs font-mono text-[#F5F5F5]"
                      />
                      <button
                        type="submit"
                        disabled={resetBusy}
                        className="px-3 py-1.5 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] text-[#111318] font-semibold text-xs transition"
                      >
                        {resetBusy ? 'Updating...' : 'Update Password'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setResetTargetId(null)}
                        className="px-2 py-1.5 text-xs text-[#A1A1AA] hover:text-[#F5F5F5]"
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom: Quick Issue Oversight Table */}
      <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="pb-eyebrow">SYSTEM OVERSIGHT</p>
            <h2 className="font-display text-lg font-bold text-[#F5F5F5]">
              Recent Reported Issues ({issues.length})
            </h2>
          </div>
        </div>

        {issues.length === 0 ? (
          <p className="text-xs text-[#A1A1AA] py-6 text-center">
            No issues reported yet.
          </p>
        ) : (
          <div className="divide-y divide-[#2B303A] border-t border-[#2B303A]">
            {issues.slice(0, 6).map((issue) => (
              <div
                key={issue.id}
                onClick={() => onOpenIssue(issue.id)}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs cursor-pointer hover:bg-[#222731] px-2 -mx-2 rounded transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-[#FF8A32] font-semibold tabular-nums">
                    {issue.code}
                  </span>
                  <span className="text-[#F5F5F5] font-medium truncate">
                    {issue.title}
                  </span>
                  <span className="text-[#A1A1AA] hidden sm:inline">
                    • {issue.locationBuilding}
                  </span>
                </div>
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded shrink-0 ${
                    STATUS_META[issue.status].badgeClass
                  }`}
                >
                  {STATUS_META[issue.status].shortLabel}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
