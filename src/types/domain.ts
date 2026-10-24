export type UserRole = 'reporter' | 'maintenance' | 'admin';

export type IssueStatus =
  | 'submitted'
  | 'under_review'
  | 'assigned'
  | 'in_progress'
  | 'awaiting_verification'
  | 'resolution_disputed'
  | 'more_evidence_required'
  | 'verified_resolved'
  | 'canceled';

export type IssueUrgency = 'low' | 'medium' | 'high' | 'critical';

export type IssueCategory =
  | 'electrical'
  | 'plumbing'
  | 'hvac'
  | 'furniture_civil'
  | 'sanitation'
  | 'safety_grounds'
  | 'other';

export type EvidenceType =
  | 'report_attachment'
  | 'work_completion'
  | 'subsequent_submission';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phoneNumber?: string;
  createdAt: string;
}

export interface IssueEvidence {
  id: string;
  issueId: string;
  uploadedBy: string;
  uploaderName?: string;
  uploaderRole?: UserRole;
  evidenceType: EvidenceType;
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  caption?: string;
  createdAt: string;
  signedUrl?: string;
}

export interface IssueEvent {
  id: string;
  issueId: string;
  actorId?: string;
  actorName?: string;
  actorRole?: UserRole;
  eventType: string;
  fromStatus?: IssueStatus;
  toStatus?: IssueStatus;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Issue {
  id: string;
  code: string;
  title: string;
  description: string;
  category: IssueCategory;
  locationBuilding: string;
  locationRoom?: string;
  urgency: IssueUrgency;
  status: IssueStatus;
  isDemo: boolean;
  createdBy: string;
  assignedTo?: string;
  reviewedBy?: string;
  workNotes?: string;
  reviewNotes?: string;
  parentRecurringIssueId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;

  creator?: UserProfile;
  assignee?: UserProfile;
  reviewer?: UserProfile;
  evidence?: IssueEvidence[];
}

export const STATUS_META: Record<
  IssueStatus,
  { label: string; shortLabel: string; badgeClass: string; dotColor: string; summary: string }
> = {
  submitted: {
    label: 'Submitted',
    shortLabel: 'Submitted',
    badgeClass: 'bg-[#222731] text-[#F5F5F5]',
    dotColor: 'bg-[#A1A1AA]',
    summary: 'Reported and awaiting coordinator triage',
  },
  under_review: {
    label: 'Under Review',
    shortLabel: 'Under Review',
    badgeClass: 'bg-[#60A5FA]/10 text-[#60A5FA]',
    dotColor: 'bg-[#60A5FA]',
    summary: 'Coordinator reviewing issue scope and priority',
  },
  assigned: {
    label: 'Assigned',
    shortLabel: 'Assigned',
    badgeClass: 'bg-[#60A5FA]/10 text-[#60A5FA]',
    dotColor: 'bg-[#60A5FA]',
    summary: 'Assigned to maintenance staff',
  },
  in_progress: {
    label: 'In Progress',
    shortLabel: 'In Progress',
    badgeClass: 'bg-[#FBBF24]/10 text-[#FBBF24]',
    dotColor: 'bg-[#FBBF24]',
    summary: 'Maintenance staff actively repairing issue',
  },
  awaiting_verification: {
    label: 'Awaiting Verification (Repair Claimed)',
    shortLabel: 'Awaiting Verification',
    badgeClass: 'bg-[#FBBF24]/12 text-[#FBBF24] font-medium',
    dotColor: 'bg-[#FBBF24]',
    summary: 'Repair claimed complete; awaiting human reviewer verification',
  },
  resolution_disputed: {
    label: 'Resolution Disputed',
    shortLabel: 'Disputed',
    badgeClass: 'bg-[#F87171]/12 text-[#F87171] font-medium',
    dotColor: 'bg-[#F87171]',
    summary: 'Reviewer disputed claimed repair; returned for rework',
  },
  more_evidence_required: {
    label: 'More Evidence Required',
    shortLabel: 'Needs Evidence',
    badgeClass: 'bg-[#FBBF24]/12 text-[#FBBF24] font-medium',
    dotColor: 'bg-[#FBBF24]',
    summary: 'Reviewer requested clearer completion proof',
  },
  verified_resolved: {
    label: 'Verified Resolved',
    shortLabel: 'Verified Resolved',
    badgeClass: 'bg-[#22C55E]/12 text-[#22C55E] font-medium',
    dotColor: 'bg-[#22C55E]',
    summary: 'Authorized human reviewer verified evidence and closed issue',
  },
  canceled: {
    label: 'Canceled',
    shortLabel: 'Canceled',
    badgeClass: 'bg-[#222731] text-[#71717A]',
    dotColor: 'bg-[#71717A]',
    summary: 'Closed as invalid or duplicate',
  },
};

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  furniture_civil: 'Roads & Potholes',
  electrical: 'Streetlights',
  sanitation: 'Waste & Sanitation',
  plumbing: 'Water Supply',
  safety_grounds: 'Public Safety',
  other: 'Other Issues',
  hvac: 'HVAC & Facilities',
};

export const PRIMARY_CATEGORIES: IssueCategory[] = [
  'furniture_civil',
  'electrical',
  'sanitation',
  'plumbing',
  'safety_grounds',
  'other',
];

export const URGENCY_META: Record<
  IssueUrgency,
  { label: string; badgeClass: string; rank: number }
> = {
  low: {
    label: 'Low',
    badgeClass: 'bg-[#222731] text-[#A1A1AA]',
    rank: 1,
  },
  medium: {
    label: 'Medium',
    badgeClass: 'bg-[#60A5FA]/10 text-[#60A5FA]',
    rank: 2,
  },
  high: {
    label: 'High',
    badgeClass: 'bg-[#FBBF24]/10 text-[#FBBF24]',
    rank: 3,
  },
  critical: {
    label: 'Critical',
    badgeClass: 'bg-[#F87171]/12 text-[#F87171] font-medium',
    rank: 4,
  },
};

export const CAMPUS_BUILDINGS = [
  'Hostel Block A',
  'Hostel Block B',
  'Main Academic Building',
  'Science & Engineering Lab',
  'Dining Hall & Mess',
  'Central Library',
  'Campus Grounds & Walkways',
];

const ALLOWED_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  submitted: ['under_review', 'assigned', 'canceled'],
  under_review: ['assigned', 'canceled'],
  assigned: ['in_progress', 'assigned', 'canceled'],
  in_progress: ['awaiting_verification'],
  awaiting_verification: [
    'verified_resolved',
    'resolution_disputed',
    'more_evidence_required',
  ],
  more_evidence_required: ['in_progress', 'awaiting_verification'],
  resolution_disputed: ['in_progress', 'awaiting_verification', 'assigned'],
  verified_resolved: ['in_progress'],
  canceled: [],
};

export function canTransitionStatus(
  from: IssueStatus,
  to: IssueStatus,
  role: UserRole
): { allowed: boolean; reason?: string } {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    return {
      allowed: false,
      reason: `Cannot transition directly from "${STATUS_META[from].label}" to "${STATUS_META[to].label}".`,
    };
  }

  // Core ProofBridge invariant: Only an authorized reviewer (admin) can verify, dispute, or request more evidence
  if (
    to === 'verified_resolved' ||
    to === 'resolution_disputed' ||
    to === 'more_evidence_required' ||
    to === 'under_review' ||
    to === 'assigned' ||
    to === 'canceled'
  ) {
    if (role !== 'admin') {
      return {
        allowed: false,
        reason: `Role "${role}" is not authorized to set status "${STATUS_META[to].label}". Reviewer/Admin required.`,
      };
    }
  }

  if (
    (to === 'in_progress' || to === 'awaiting_verification') &&
    role === 'reporter'
  ) {
    return {
      allowed: false,
      reason: 'Reporters cannot update maintenance work status.',
    };
  }

  return { allowed: true };
}

export function validateEvidenceFile(file: File): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return 'Only JPG, PNG, and WebP images are allowed.';
  }
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return 'Image size must be 5 MB or smaller.';
  }
  return null;
}
