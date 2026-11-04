import React from 'react';
import {
  Camera,
  CheckCircle2,
  Clock,
  FileWarning,
  GitCompareArrows,
  History,
  Info,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserCheck,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  Issue,
  IssueEvent,
  IssueEvidence,
  IssueStatus,
  STATUS_META,
  URGENCY_META,
  UserProfile,
} from '../types/domain';

interface IssueDetailDrawerProps {
  detailLoading: boolean;
  detailIssue: Issue | null;
  detailEvidence: IssueEvidence[];
  detailTimeline: IssueEvent[];
  detailRecurringCandidates: Issue[];
  profile: UserProfile;
  allProfiles: UserProfile[];
  actionBusy: boolean;
  selectedAssigneeId: string;
  setSelectedAssigneeId: (id: string) => void;
  workNotesInput: string;
  setWorkNotesInput: (val: string) => void;
  workFile: File | null;
  workPreview: string | null;
  onWorkFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenLiveCamera?: () => void;
  reviewDecision: 'verified_resolved' | 'resolution_disputed' | 'more_evidence_required';
  setReviewDecision: (
    d: 'verified_resolved' | 'resolution_disputed' | 'more_evidence_required'
  ) => void;
  reviewReasonInput: string;
  setReviewReasonInput: (val: string) => void;
  cancelReasonInput: string;
  setCancelReasonInput: (val: string) => void;
  onClose: () => void;
  onTriageUnderReview: () => void;
  onAssignIssue: () => void;
  onCancelIssue: (e: React.FormEvent) => void;
  onStartWork: () => void;
  onClaimCompletion: (e: React.FormEvent) => void;
  onVerificationSubmit: (e: React.FormEvent) => void;
  onToggleRecurringLink: (parent: Issue | null) => void;
}

const WORKFLOW_STEPS: Array<{ key: IssueStatus; label: string }> = [
  { key: 'submitted', label: 'Reported' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'awaiting_verification', label: 'Awaiting Verification' },
  { key: 'verified_resolved', label: 'Verified Resolved' },
];

function getStepIndex(status: IssueStatus): number {
  switch (status) {
    case 'submitted':
    case 'under_review':
      return 0;
    case 'assigned':
      return 1;
    case 'in_progress':
    case 'resolution_disputed':
    case 'more_evidence_required':
      return 2;
    case 'awaiting_verification':
      return 3;
    case 'verified_resolved':
      return 4;
    case 'canceled':
      return -1;
  }
}

export function IssueDetailDrawer({
  detailLoading,
  detailIssue,
  detailEvidence,
  detailTimeline,
  detailRecurringCandidates,
  profile,
  allProfiles,
  actionBusy,
  selectedAssigneeId,
  setSelectedAssigneeId,
  workNotesInput,
  setWorkNotesInput,
  workFile,
  workPreview,
  onWorkFileSelect,
  onOpenLiveCamera,
  reviewDecision,
  setReviewDecision,
  reviewReasonInput,
  setReviewReasonInput,
  cancelReasonInput,
  setCancelReasonInput,
  onClose,
  onTriageUnderReview,
  onAssignIssue,
  onCancelIssue,
  onStartWork,
  onClaimCompletion,
  onVerificationSubmit,
  onToggleRecurringLink,
}: IssueDetailDrawerProps) {
  const activeStep = detailIssue ? getStepIndex(detailIssue.status) : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="issue-detail-heading"
    >
      <div className="bg-pb-card border border-pb-border rounded-panel max-w-4xl w-full max-h-[92vh] overflow-y-auto flex flex-col animate-scale-in shadow-2xl">
        {/* Top Sticky Header */}
        <div className="sticky top-0 z-20 bg-pb-card border-b border-pb-border px-6 py-4 flex items-center justify-between gap-4">
          {detailLoading || !detailIssue ? (
            <div className="text-sm text-pb-textSecondary flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-pb-primary" />
              Loading issue record...
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-control bg-pb-elevated text-pb-textPrimary tabular-nums">
                {detailIssue.code}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-control inline-flex items-center gap-1.5 ${
                  STATUS_META[detailIssue.status].badgeClass
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    STATUS_META[detailIssue.status].dotColor
                  } ${
                    detailIssue.status === 'in_progress' ||
                    detailIssue.status === 'under_review' ||
                    detailIssue.status === 'awaiting_verification'
                      ? 'live-pulse-dot'
                      : ''
                  }`}
                />
                {STATUS_META[detailIssue.status].label}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-control ${
                  URGENCY_META[detailIssue.urgency].badgeClass
                }`}
              >
                {URGENCY_META[detailIssue.urgency].label} Priority
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close issue details"
            className="p-1.5 rounded-control bg-pb-elevated hover:bg-pb-border text-pb-textSecondary hover:text-pb-textPrimary transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {detailIssue && !detailLoading && (
          <div className="p-6 space-y-6 divide-y divide-pb-border">
            {/* Title, Description, Pipeline & Core Banners */}
            <div className="space-y-4">
              <div>
                <h2
                  id="issue-detail-heading"
                  className="font-display text-2xl font-bold text-pb-textPrimary tracking-tight"
                >
                  {detailIssue.title}
                </h2>
                <p className="text-sm text-pb-textSecondary mt-1.5 whitespace-pre-line leading-relaxed">
                  {detailIssue.description}
                </p>
              </div>

              {/* Minimalist Metadata Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-pb-border text-xs">
                <div>
                  <span className="text-pb-textMuted block">Location</span>
                  <strong className="text-pb-textPrimary font-medium mt-0.5 block">
                    {detailIssue.locationBuilding}
                    {detailIssue.locationRoom
                      ? ` • ${detailIssue.locationRoom}`
                      : ''}
                  </strong>
                </div>
                <div>
                  <span className="text-pb-textMuted block">Category</span>
                  <strong className="text-pb-textPrimary font-medium mt-0.5 block">
                    {CATEGORY_LABELS[detailIssue.category]}
                  </strong>
                </div>
                <div>
                  <span className="text-pb-textMuted block">Reported By</span>
                  <strong className="text-pb-textPrimary font-medium mt-0.5 block">
                    {detailIssue.creator?.fullName || 'Campus Reporter'}
                  </strong>
                </div>
                <div>
                  <span className="text-pb-textMuted block">Assigned Staff</span>
                  <strong className="text-pb-textPrimary font-medium mt-0.5 block">
                    {detailIssue.assignee?.fullName || 'Unassigned'}
                  </strong>
                </div>
              </div>

              {/* Minimalist Workflow Stepper */}
              {detailIssue.status !== 'canceled' && (
                <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                  {WORKFLOW_STEPS.map((step, idx) => {
                    const isCompleted =
                      idx < activeStep ||
                      detailIssue.status === 'verified_resolved';
                    const isCurrent =
                      idx === activeStep &&
                      detailIssue.status !== 'verified_resolved';
                    return (
                      <React.Fragment key={step.key}>
                        <div
                          className={`px-2.5 py-1 rounded-control flex items-center gap-1.5 ${
                            isCompleted
                              ? 'bg-pb-success/10 text-pb-success font-medium'
                              : isCurrent
                              ? 'bg-pb-elevated text-pb-textPrimary font-semibold border border-pb-border'
                              : 'text-pb-textMuted'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCompleted
                                ? 'bg-pb-success'
                                : isCurrent
                                ? 'bg-pb-primary'
                                : 'bg-pb-border'
                            }`}
                          />
                          <span>{step.label}</span>
                        </div>
                        {idx < WORKFLOW_STEPS.length - 1 && (
                          <span className="text-pb-textMuted">→</span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* Distinction Callout */}
              {detailIssue.status === 'awaiting_verification' && (
                <div className="bg-pb-elevated border-l-2 border-pb-warning px-4 py-3 rounded-r-control space-y-1">
                  <p className="text-xs font-semibold text-pb-warning flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    Repair Claimed Complete — Not Yet Verified Resolved
                  </p>
                  <p className="text-xs text-pb-textSecondary">
                    Maintenance staff submitted completion notes and evidence. An authorized human reviewer must inspect the evidence below before this issue can reach Verified Resolved.
                  </p>
                </div>
              )}

              {(detailIssue.status === 'resolution_disputed' ||
                detailIssue.status === 'more_evidence_required') && (
                <div className="bg-pb-elevated border-l-2 border-pb-danger px-4 py-3 rounded-r-control space-y-1">
                  <p className="text-xs font-semibold text-pb-danger flex items-center gap-2">
                    <FileWarning className="w-4 h-4 shrink-0" />
                    {detailIssue.status === 'resolution_disputed'
                      ? 'Resolution Disputed by Reviewer'
                      : 'Additional Evidence Requested by Reviewer'}
                  </p>
                  {detailIssue.reviewNotes && (
                    <p className="text-xs text-pb-textPrimary">
                      Reason: “{detailIssue.reviewNotes}”
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Side-by-Side Evidence Comparison */}
            <div className="pt-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-pb-textPrimary flex items-center gap-2">
                  <GitCompareArrows className="w-4 h-4 text-pb-primary" />
                  Evidence Comparison
                </h3>
                <span className="text-xs text-pb-textMuted flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Human review required before final verification
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Issue Evidence */}
                <div className="bg-pb-bg border border-pb-border rounded-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-pb-textPrimary">
                      Original Report Evidence
                    </span>
                    <span className="text-[11px] text-pb-textMuted">
                      Reporter Submitted
                    </span>
                  </div>

                  {detailEvidence.filter(
                    (e) => e.evidenceType === 'report_attachment'
                  ).length === 0 ? (
                    <div className="py-8 text-center text-xs text-pb-textMuted">
                      No initial photograph attached.
                    </div>
                  ) : (
                    detailEvidence
                      .filter((e) => e.evidenceType === 'report_attachment')
                      .map((ev) => (
                        <div key={ev.id} className="space-y-2">
                          {ev.signedUrl && (
                            <img
                              src={ev.signedUrl}
                              alt={ev.caption || ev.fileName}
                              className="w-full max-h-56 object-contain rounded-control bg-pb-card border border-pb-border"
                            />
                          )}
                          <div className="flex items-center justify-between text-xs text-pb-textSecondary">
                            <span>{ev.uploaderName || 'Reporter'}</span>
                            <span className="text-pb-textMuted tabular-nums">
                              {new Date(ev.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                {/* Submitted Repair Evidence & Notes */}
                <div className="bg-pb-bg border border-pb-border rounded-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-pb-textPrimary">
                      Submitted Repair Evidence
                    </span>
                    <span
                      className={`text-[11px] ${
                        detailIssue.status === 'verified_resolved'
                          ? 'text-pb-success font-medium'
                          : 'text-pb-warning font-medium'
                      }`}
                    >
                      {detailIssue.status === 'verified_resolved'
                        ? 'Reviewer Verified'
                        : 'Staff Claimed'}
                    </span>
                  </div>

                  {detailIssue.workNotes && (
                    <div className="bg-pb-card border border-pb-border rounded-control p-3 text-xs space-y-1">
                      <span className="text-pb-textMuted block">
                        Repair Notes:
                      </span>
                      <p className="text-pb-textPrimary">
                        {detailIssue.workNotes}
                      </p>
                    </div>
                  )}

                  {detailEvidence.filter(
                    (e) => e.evidenceType !== 'report_attachment'
                  ).length === 0 ? (
                    <div className="py-8 text-center text-xs text-pb-textMuted">
                      No repair completion evidence uploaded yet.
                    </div>
                  ) : (
                    detailEvidence
                      .filter((e) => e.evidenceType !== 'report_attachment')
                      .map((ev) => (
                        <div key={ev.id} className="space-y-2">
                          {ev.signedUrl && (
                            <img
                              src={ev.signedUrl}
                              alt={ev.caption || ev.fileName}
                              className="w-full max-h-56 object-contain rounded-control bg-pb-card border border-pb-border"
                            />
                          )}
                          <div className="flex items-center justify-between text-xs text-pb-textSecondary">
                            <span>
                              {ev.evidenceType === 'subsequent_submission'
                                ? 'Additional Evidence'
                                : 'Completion Evidence'}
                            </span>
                            <span className="text-pb-textMuted tabular-nums">
                              {new Date(ev.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))
                  )}

                  {detailIssue.reviewNotes && (
                    <div className="bg-pb-card border border-pb-border rounded-control p-3 text-xs space-y-1">
                      <span className="text-pb-textMuted block">
                        Reviewer Decision Note:
                      </span>
                      <p className="text-pb-textPrimary">
                        {detailIssue.reviewNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Role-Gated Workflow Action Panels */}
            <div className="pt-6 space-y-4">
              {/* Role status guidance for non-admin on newly submitted issues */}
              {profile.role !== 'admin' &&
                ['submitted', 'under_review'].includes(detailIssue.status) && (
                  <div className="bg-pb-bg border border-pb-border rounded-card p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-pb-textPrimary">
                        Awaiting Coordinator Triage & Staff Assignment
                      </p>
                      <p className="text-xs text-pb-textSecondary">
                        An authorized Admin / Reviewer will triage this report and assign it to Maintenance Staff.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-pb-card border border-pb-border text-[11px] font-medium text-pb-textSecondary">
                      Admin Action Required
                    </span>
                  </div>
                )}

              {/* Role status guidance for reporter on active maintenance issues */}
              {profile.role === 'reporter' &&
                [
                  'assigned',
                  'in_progress',
                  'resolution_disputed',
                  'more_evidence_required',
                ].includes(detailIssue.status) && (
                  <div className="bg-pb-bg border border-pb-border rounded-card p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-pb-textPrimary">
                        Assigned to Maintenance Staff
                      </p>
                      <p className="text-xs text-pb-textSecondary">
                        Maintenance Staff is responsible for updating repair status and uploading completion evidence.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-pb-card border border-pb-border text-[11px] font-medium text-pb-textSecondary">
                      Staff In Progress
                    </span>
                  </div>
                )}

              {/* 1. Admin Triage & Assignment */}
              {profile.role === 'admin' &&
                ['submitted', 'under_review', 'assigned', 'resolution_disputed'].includes(
                  detailIssue.status
                ) && (
                  <div className="bg-pb-bg border border-pb-border rounded-card p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-pb-textPrimary flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-pb-primary" />
                        Coordinator Triage & Assignment
                      </h4>
                      {detailIssue.status === 'submitted' && (
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={onTriageUnderReview}
                          className="px-3 py-1 rounded-control bg-pb-elevated hover:bg-pb-border text-pb-textPrimary text-xs font-medium transition"
                        >
                          Mark Under Review
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <select
                        aria-label="Select maintenance staff"
                        value={selectedAssigneeId}
                        onChange={(e) => setSelectedAssigneeId(e.target.value)}
                        className="flex-1 min-w-[220px] rounded-control bg-pb-card border border-pb-border px-3 py-2 text-xs text-pb-textPrimary"
                      >
                        {allProfiles
                          .filter(
                            (p) =>
                              p.role === 'maintenance' || p.role === 'admin'
                          )
                          .sort((a, b) =>
                            a.role === 'maintenance' && b.role !== 'maintenance'
                              ? -1
                              : 1
                          )
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.fullName} (
                              {p.role === 'maintenance'
                                ? 'Maintenance Staff'
                                : 'Admin / Coordinator'}
                              )
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={onAssignIssue}
                        className="px-4 py-2 rounded-control bg-pb-primary hover:bg-pb-primaryHover text-white text-xs font-semibold transition"
                      >
                        Assign Staff
                      </button>
                    </div>

                    {['submitted', 'under_review', 'assigned'].includes(
                      detailIssue.status
                    ) && (
                      <form
                        onSubmit={onCancelIssue}
                        className="pt-3 border-t border-pb-border flex flex-wrap gap-2 items-center"
                      >
                        <input
                          type="text"
                          required
                          value={cancelReasonInput}
                          onChange={(e) => setCancelReasonInput(e.target.value)}
                          placeholder="Enter reason to close as invalid or duplicate..."
                          className="flex-1 min-w-[220px] rounded-control bg-pb-card border border-pb-border px-3 py-1.5 text-xs text-pb-textPrimary placeholder:text-pb-textMuted"
                        />
                        <button
                          type="submit"
                          disabled={actionBusy}
                          className="px-3 py-1.5 rounded-control bg-pb-elevated hover:bg-pb-danger/15 hover:text-pb-danger text-pb-textSecondary text-xs font-medium transition"
                        >
                          Cancel Issue
                        </button>
                      </form>
                    )}
                  </div>
                )}

              {/* 2. Maintenance Work Update & Completion Submission */}
              {(profile.role === 'maintenance' || profile.role === 'admin') &&
                [
                  'assigned',
                  'in_progress',
                  'resolution_disputed',
                  'more_evidence_required',
                ].includes(detailIssue.status) && (
                  <div className="bg-pb-bg border border-pb-border rounded-card p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-pb-textPrimary flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-pb-primary" />
                        Maintenance Execution — Record Repair & Submit Evidence
                      </h4>
                      {detailIssue.status !== 'in_progress' && (
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={onStartWork}
                          className="px-3.5 py-1.5 rounded-control bg-pb-primary hover:bg-pb-primaryHover text-white text-xs font-semibold transition"
                        >
                          Start Work (In Progress)
                        </button>
                      )}
                    </div>

                    {detailIssue.status === 'in_progress' ||
                    detailIssue.status === 'more_evidence_required' ||
                    detailIssue.status === 'resolution_disputed' ? (
                      <form onSubmit={onClaimCompletion} className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-pb-textSecondary mb-1">
                            Repair Notes / Corrective Action Taken *
                          </label>
                          <textarea
                            required
                            rows={2}
                            value={workNotesInput}
                            onChange={(e) => setWorkNotesInput(e.target.value)}
                            placeholder="Document the exact repair completed..."
                            className="w-full rounded-control bg-pb-card border border-pb-border px-3 py-2 text-xs text-pb-textPrimary placeholder:text-pb-textMuted"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {onOpenLiveCamera && (
                              <button
                                type="button"
                                onClick={onOpenLiveCamera}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-control border border-pb-border bg-pb-card hover:bg-pb-elevated text-xs font-medium text-pb-textPrimary transition"
                              >
                                <Camera className="w-4 h-4 text-pb-primary" />
                                Take Live Photo
                              </button>
                            )}
                            <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-control border border-pb-border bg-pb-card hover:bg-pb-elevated text-xs font-medium text-pb-textPrimary transition">
                              <Upload className="w-4 h-4 text-pb-primary" />
                              {workFile
                                ? `Attached: ${workFile.name}`
                                : 'Upload Photo File'}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={onWorkFileSelect}
                                className="hidden"
                              />
                            </label>
                          </div>

                          <button
                            type="submit"
                            disabled={actionBusy}
                            className="px-4 py-2 rounded-control bg-pb-primary hover:bg-pb-primaryHover disabled:opacity-50 text-white text-xs font-semibold transition"
                          >
                            Submit Repair for Verification
                          </button>
                        </div>

                        {workPreview && (
                          <img
                            src={workPreview}
                            alt="Repair completion preview"
                            className="max-h-40 rounded-control border border-pb-border"
                          />
                        )}
                      </form>
                    ) : (
                      <p className="text-xs text-pb-textSecondary">
                        Click{' '}
                        <strong className="text-pb-textPrimary">
                          Start Work
                        </strong>{' '}
                        when physical repair begins to unlock completion evidence submission.
                      </p>
                    )}
                  </div>
                )}

              {/* 3. Authorized Human Reviewer Decision Gateway */}
              {detailIssue.status === 'awaiting_verification' && (
                <div className="bg-pb-bg border border-pb-border rounded-card p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-pb-textPrimary flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-pb-primary" />
                        Authorized Reviewer Verification Decision
                      </h4>
                      <p className="text-xs text-pb-textSecondary mt-0.5">
                        A human reviewer makes the final verification decision after comparing the original issue and repair evidence.
                      </p>
                    </div>
                    {profile.role !== 'admin' && (
                      <span className="px-2.5 py-1 rounded bg-pb-card border border-pb-border text-[11px] font-medium text-pb-textSecondary">
                        Admin Reviewer Only
                      </span>
                    )}
                  </div>

                  {profile.role === 'admin' && (
                    <form onSubmit={onVerificationSubmit} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setReviewDecision('verified_resolved')}
                          className={`p-3 rounded-control border text-left transition ${
                            reviewDecision === 'verified_resolved'
                              ? 'border-pb-success bg-pb-success/10 text-pb-textPrimary'
                              : 'border-pb-border bg-pb-card text-pb-textSecondary hover:border-pb-borderHover'
                          }`}
                        >
                          <div className="font-semibold text-xs flex items-center gap-1.5 text-pb-success">
                            <CheckCircle2 className="w-4 h-4" />
                            Verify Resolution
                          </div>
                          <p className="text-[11px] text-pb-textSecondary mt-1">
                            Evidence confirms the issue is resolved.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setReviewDecision('more_evidence_required')
                          }
                          className={`p-3 rounded-control border text-left transition ${
                            reviewDecision === 'more_evidence_required'
                              ? 'border-pb-warning bg-pb-warning/10 text-pb-textPrimary'
                              : 'border-pb-border bg-pb-card text-pb-textSecondary hover:border-pb-borderHover'
                          }`}
                        >
                          <div className="font-semibold text-xs flex items-center gap-1.5 text-pb-warning">
                            <Camera className="w-4 h-4" />
                            Request Additional Evidence
                          </div>
                          <p className="text-[11px] text-pb-textSecondary mt-1">
                            Proof is unclear; require better photo or details.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setReviewDecision('resolution_disputed')
                          }
                          className={`p-3 rounded-control border text-left transition ${
                            reviewDecision === 'resolution_disputed'
                              ? 'border-pb-danger bg-pb-danger/10 text-pb-textPrimary'
                              : 'border-pb-border bg-pb-card text-pb-textSecondary hover:border-pb-borderHover'
                          }`}
                        >
                          <div className="font-semibold text-xs flex items-center gap-1.5 text-pb-danger">
                            <XCircle className="w-4 h-4" />
                            Dispute Resolution
                          </div>
                          <p className="text-[11px] text-pb-textSecondary mt-1">
                            Issue remains unresolved; return to maintenance.
                          </p>
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-pb-textSecondary mb-1">
                          Review Decision Notes{' '}
                          {reviewDecision !== 'verified_resolved'
                            ? '* (Required for Dispute or Additional Evidence)'
                            : '(Optional)'}
                        </label>
                        <textarea
                          rows={2}
                          required={reviewDecision !== 'verified_resolved'}
                          value={reviewReasonInput}
                          onChange={(e) => setReviewReasonInput(e.target.value)}
                          placeholder={
                            reviewDecision === 'verified_resolved'
                              ? 'Optional verification note...'
                              : 'Provide a clear reason for disputing or requesting more evidence...'
                          }
                          className="w-full rounded-control bg-pb-card border border-pb-border px-3 py-2 text-xs text-pb-textPrimary placeholder:text-pb-textMuted"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={actionBusy}
                          className="px-4 py-2 rounded-control bg-pb-primary hover:bg-pb-primaryHover text-white text-xs font-semibold transition"
                        >
                          Confirm Review Decision
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Recurring Issue Detection & Human Confirmation */}
            {detailRecurringCandidates.length > 0 && (
              <div className="pt-6 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-pb-textPrimary flex items-center gap-2">
                    <History className="w-4 h-4 text-pb-primary" />
                    Related Incidents at {detailIssue.locationBuilding} (
                    {CATEGORY_LABELS[detailIssue.category]})
                  </h4>
                  {detailIssue.parentRecurringIssueId && (
                    <button
                      type="button"
                      onClick={() => onToggleRecurringLink(null)}
                      className="text-xs text-pb-danger hover:underline"
                    >
                      Unlink Recurring Status
                    </button>
                  )}
                </div>
                <div className="divide-y divide-pb-border border border-pb-border rounded-card bg-pb-bg">
                  {detailRecurringCandidates.map((cand) => {
                    const isLinked =
                      detailIssue.parentRecurringIssueId === cand.id;
                    return (
                      <div
                        key={cand.id}
                        className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div className="text-pb-textPrimary">
                          <span className="font-mono font-semibold text-pb-textSecondary tabular-nums">
                            {cand.code}
                          </span>{' '}
                          — {cand.title}{' '}
                          <span className="text-pb-textMuted tabular-nums">
                            ({new Date(cand.createdAt).toLocaleDateString()})
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={actionBusy || isLinked}
                          onClick={() => onToggleRecurringLink(cand)}
                          className={`px-2.5 py-1 rounded-control text-xs font-medium transition ${
                            isLinked
                              ? 'bg-pb-success/12 text-pb-success'
                              : 'bg-pb-elevated hover:bg-pb-border text-pb-textPrimary'
                          }`}
                        >
                          {isLinked ? '✓ Linked Recurring' : 'Confirm Recurring'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Vertical Activity Timeline */}
            <div className="pt-6 space-y-3">
              <h3 className="text-sm font-semibold text-pb-textPrimary flex items-center gap-2">
                <Clock className="w-4 h-4 text-pb-textSecondary" />
                Activity History
              </h3>
              {detailTimeline.length === 0 ? (
                <p className="text-xs text-pb-textMuted">
                  No activity recorded yet.
                </p>
              ) : (
                <ol className="relative border-l border-pb-border ml-2 space-y-4">
                  {detailTimeline.map((ev) => (
                    <li key={ev.id} className="ml-4 space-y-0.5">
                      <span className="absolute -left-1.5 mt-1.5 w-2.5 h-2.5 rounded-full bg-pb-elevated border border-pb-borderHover" />
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-pb-textPrimary">
                            {ev.actorName || 'System'}
                          </span>
                          {ev.actorRole && (
                            <span className="text-[11px] text-pb-textMuted capitalize">
                              ({ev.actorRole})
                            </span>
                          )}
                          {ev.fromStatus && ev.toStatus && (
                            <span className="text-pb-textSecondary">
                              {STATUS_META[ev.fromStatus].shortLabel} →{' '}
                              <strong className="text-pb-textPrimary font-medium">
                                {STATUS_META[ev.toStatus].shortLabel}
                              </strong>
                            </span>
                          )}
                        </div>
                        <time className="text-[11px] text-pb-textMuted tabular-nums">
                          {new Date(ev.createdAt).toLocaleString()}
                        </time>
                      </div>
                      <p className="text-xs text-pb-textSecondary leading-relaxed">
                        {ev.message}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
