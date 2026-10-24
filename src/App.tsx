import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  BarChart3,
  Bell,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Construction,
  Droplets,
  FileWarning,
  Hammer,
  HelpCircle,
  History,
  LayoutDashboard,
  Lightbulb,
  ListFilter,
  LogOut,
  Menu,
  Mic,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Trash2,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import { ProofBridgeLogo, ProofBridgeMark } from './components/ProofBridgeLogo';
import {
  isLocalModeForced,
  isSupabaseConfigured,
  isSupabaseSchemaReady,
  setForceLocalMode,
  supabase,
} from './lib/supabase';
import {
  assignIssueToStaff,
  cancelIssueWithReason,
  clearLocalSession,
  createIssue,
  getCachedWorkspaceSnapshot,
  getIssueDetails,
  getOrCreateProfile,
  getSavedLocalSession,
  linkRecurringIssue,
  listIssues,
  listProfiles,
  listRecentEvents,
  recordVerificationDecision,
  signInOrCreateLocalUser,
  startMaintenanceWork,
  submitRepairForVerification,
  triageIssueUnderReview,
  updateMyProfile,
  updateMyRole,
} from './services/proofBridgeService';
import {
  CAMPUS_BUILDINGS,
  CATEGORY_LABELS,
  Issue,
  IssueCategory,
  IssueEvent,
  IssueEvidence,
  IssueStatus,
  IssueUrgency,
  PRIMARY_CATEGORIES,
  STATUS_META,
  URGENCY_META,
  UserProfile,
  UserRole,
  validateEvidenceFile,
} from './types/domain';
import { IssueDetailDrawer } from './components/IssueDetailDrawer';
import {
  ActivityTimelineView,
  AnalyticsView,
  EvidenceReviewsView,
  SettingsView,
} from './components/SecondaryViews';

type AppStage = 'landing' | 'auth' | 'app';

type NavTab =
  | 'dashboard'
  | 'issues'
  | 'report'
  | 'my-reports'
  | 'assignments'
  | 'reviews'
  | 'timeline'
  | 'analytics'
  | 'settings';

type SortOption = 'newest' | 'oldest' | 'priority' | 'updated';
type DateRangeFilter = 'all' | '7d' | '30d';

const PAGE_TITLES: Record<NavTab, { eyebrow: string; title: string }> = {
  dashboard: { eyebrow: 'COMMAND CENTER', title: 'Dashboard' },
  issues: { eyebrow: 'COMMUNITY WATCH', title: 'Explore Issues' },
  report: { eyebrow: "LET'S FIX SOMETHING", title: 'Report an Issue' },
  'my-reports': { eyebrow: 'YOUR CONTRIBUTION', title: 'My Reports' },
  assignments: { eyebrow: 'FIELD OPERATIONS', title: 'Assignments' },
  reviews: { eyebrow: 'VERIFICATION QUEUE', title: 'Evidence & Reviews' },
  timeline: { eyebrow: 'AUDIT TRAIL', title: 'Activity Timeline' },
  analytics: { eyebrow: 'THE IMPACT SO FAR', title: 'Analytics' },
  settings: { eyebrow: 'WORKSPACE', title: 'Settings' },
};

const CATEGORY_ICONS: Record<
  IssueCategory,
  React.ComponentType<{ className?: string }>
> = {
  furniture_civil: Construction,
  electrical: Lightbulb,
  sanitation: Trash2,
  plumbing: Droplets,
  safety_grounds: Shield,
  other: HelpCircle,
  hvac: Wrench,
};

const ROLE_DESCRIPTIONS: Record<
  UserRole,
  { label: string; short: string; desc: string; defaultEmail: string; defaultName: string }
> = {
  reporter: {
    label: 'Reporter',
    short: 'Citizen / Resident',
    desc: 'Report issues with photos and track resolution progress.',
    defaultEmail: 'aarav.student@campus.edu',
    defaultName: 'Aarav Sharma',
  },
  maintenance: {
    label: 'Maintenance Staff',
    short: 'Field Technician',
    desc: 'Accept assigned tasks and upload completion evidence.',
    defaultEmail: 'ramesh.maint@campus.edu',
    defaultName: 'Ramesh Verma',
  },
  admin: {
    label: 'Admin / Reviewer',
    short: 'Verifier & Coordinator',
    desc: 'Triage issues, assign staff, and verify or dispute repairs.',
    defaultEmail: 'priya.warden@campus.edu',
    defaultName: 'Dr. Priya Nair',
  },
};

const STAGE_CACHE_KEY = 'proofbridge_stage_cache_v1';
const TAB_CACHE_KEY = 'proofbridge_tab_cache_v1';

export default function App() {
  const initialCache = useMemo(() => getCachedWorkspaceSnapshot(), []);
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    getSavedLocalSession()
  );
  const [stage, setStage] = useState<AppStage>(() => {
    const savedUser = getSavedLocalSession();
    const savedStage = localStorage.getItem(STAGE_CACHE_KEY) as AppStage | null;
    if (savedUser && savedStage === 'app') return 'app';
    return 'landing';
  });
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>(
    initialCache.profiles
  );
  const [issues, setIssues] = useState<Issue[]>(initialCache.issues);
  const [recentEvents, setRecentEvents] = useState<
    Array<IssueEvent & { issueCode?: string; issueTitle?: string }>
  >(initialCache.events);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    const savedTab = localStorage.getItem(TAB_CACHE_KEY) as NavTab | null;
    return savedTab && savedTab in PAGE_TITLES ? savedTab : 'dashboard';
  });
  const [pendingTabAfterAuth, setPendingTabAfterAuth] =
    useState<NavTab>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Auth form state (with 3 account types: reporter | maintenance | admin)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [selectedRole, setSelectedRole] = useState<UserRole>('reporter');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Explore Issues filters, sorting & pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Report form state
  const [reportTitle, setReportTitle] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportCategory, setReportCategory] = useState<IssueCategory>('furniture_civil');
  const [reportBuilding, setReportBuilding] = useState(CAMPUS_BUILDINGS[0]);
  const [reportRoom, setReportRoom] = useState('');
  const [reportUrgency, setReportUrgency] = useState<IssueUrgency>('medium');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportPreview, setReportPreview] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportFieldError, setReportFieldError] = useState<string | null>(null);
  const [dictating, setDictating] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<Issue | null>(null);

  // Detail modal state
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [detailIssue, setDetailIssue] = useState<Issue | null>(null);
  const [detailEvidence, setDetailEvidence] = useState<IssueEvidence[]>([]);
  const [detailTimeline, setDetailTimeline] = useState<IssueEvent[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  // Detail action inputs
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [workNotesInput, setWorkNotesInput] = useState('');
  const [workFile, setWorkFile] = useState<File | null>(null);
  const [workPreview, setWorkPreview] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState<
    'verified_resolved' | 'resolution_disputed' | 'more_evidence_required'
  >('verified_resolved');
  const [reviewReasonInput, setReviewReasonInput] = useState('');
  const [cancelReasonInput, setCancelReasonInput] = useState('');

  function notify(type: 'success' | 'error', text: string) {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  }

  async function refreshAllData() {
    setLoadingIssues(true);
    try {
      const [fetchedIssues, fetchedProfiles, fetchedEvents] = await Promise.all([
        listIssues(),
        listProfiles(),
        listRecentEvents(60),
      ]);
      setIssues(fetchedIssues);
      setAllProfiles(fetchedProfiles);
      setRecentEvents(fetchedEvents);
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'Failed to load workspace data.'
      );
    } finally {
      setLoadingIssues(false);
    }
  }

  async function openIssueDetail(issueId: string) {
    if (!profile) {
      requireLoginForTab('issues');
      return;
    }
    setSelectedIssueId(issueId);
    setDetailLoading(true);
    setWorkFile(null);
    setWorkPreview(null);
    setReviewReasonInput('');
    setCancelReasonInput('');
    try {
      const data = await getIssueDetails(issueId);
      setDetailIssue(data.issue);
      setDetailEvidence(data.evidence);
      setDetailTimeline(data.timeline);
      const defaultMaintStaff = allProfiles.find((p) => p.role === 'maintenance');
      setSelectedAssigneeId(
        data.issue.assignedTo || defaultMaintStaff?.id || profile.id
      );
      setWorkNotesInput(data.issue.workNotes || '');
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'Failed to load issue details.'
      );
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    localStorage.setItem(STAGE_CACHE_KEY, stage);
  }, [stage]);

  useEffect(() => {
    localStorage.setItem(TAB_CACHE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    refreshAllData();

    isSupabaseSchemaReady().then((ready) => {
      if (!ready) return;
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          try {
            const p = await getOrCreateProfile(
              session.user.id,
              session.user.email || 'user@campus.edu',
              session.user.user_metadata?.full_name,
              session.user.user_metadata?.role
            );
            setProfile(p);
          } catch {
            // Keep cached local session
          }
        }
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!(await isSupabaseSchemaReady())) return;
      if (session?.user) {
        try {
          const p = await getOrCreateProfile(
            session.user.id,
            session.user.email || 'user@campus.edu',
            session.user.user_metadata?.full_name,
            session.user.user_metadata?.role
          );
          setProfile(p);
          await refreshAllData();
        } catch {
          // Handled
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter, dateFilter, buildingFilter, sortBy]);

  // Uses cached session if already logged in; only redirects to Auth page when signed out
  function requireLoginForTab(
    targetTab: NavTab,
    preferredMode: 'signin' | 'signup' = 'signin'
  ) {
    if (targetTab === 'report') setSubmittedReport(null);
    if (profile) {
      setActiveTab(targetTab);
      setStage('app');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setPendingTabAfterAuth(targetTab);
    setAuthMode(preferredMode);
    setStage('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const reportRecurringMatches = useMemo(() => {
    return issues.filter(
      (i) =>
        i.locationBuilding === reportBuilding &&
        i.category === reportCategory &&
        i.status !== 'canceled'
    );
  }, [issues, reportBuilding, reportCategory]);

  const detailRecurringCandidates = useMemo(() => {
    if (!detailIssue) return [];
    return issues.filter(
      (i) =>
        i.id !== detailIssue.id &&
        i.locationBuilding === detailIssue.locationBuilding &&
        i.category === detailIssue.category &&
        i.status !== 'canceled'
    );
  }, [issues, detailIssue]);

  const myReportedIssues = useMemo(() => {
    if (!profile) return [];
    return issues.filter((i) => i.createdBy === profile.id);
  }, [issues, profile]);

  const filteredIssues = useMemo(() => {
    const now = Date.now();
    const base = issues.filter((issue) => {
      if (statusFilter !== 'all' && issue.status !== statusFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && issue.category !== categoryFilter) {
        return false;
      }
      if (buildingFilter !== 'all' && issue.locationBuilding !== buildingFilter) {
        return false;
      }
      if (dateFilter !== 'all') {
        const createdMs = new Date(issue.createdAt).getTime();
        const maxAgeMs =
          dateFilter === '7d' ? 7 * 86400 * 1000 : 30 * 86400 * 1000;
        if (now - createdMs > maxAgeMs) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = issue.code.toLowerCase().includes(q);
        const matchTitle = issue.title.toLowerCase().includes(q);
        const matchDesc = issue.description.toLowerCase().includes(q);
        const matchRoom = (issue.locationRoom || '').toLowerCase().includes(q);
        const matchBuilding = issue.locationBuilding.toLowerCase().includes(q);
        if (
          !matchCode &&
          !matchTitle &&
          !matchDesc &&
          !matchRoom &&
          !matchBuilding
        ) {
          return false;
        }
      }
      return true;
    });

    return base.slice().sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'updated') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return URGENCY_META[b.urgency].rank - URGENCY_META[a.urgency].rank;
    });
  }, [issues, statusFilter, categoryFilter, buildingFilter, dateFilter, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / pageSize));
  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredIssues.slice(start, start + pageSize);
  }, [filteredIssues, currentPage]);

  const stats = useMemo(() => {
    const total = issues.length;
    const openIssues = issues.filter((i) =>
      [
        'submitted',
        'under_review',
        'assigned',
        'resolution_disputed',
        'more_evidence_required',
      ].includes(i.status)
    ).length;
    const inProgress = issues.filter((i) => i.status === 'in_progress').length;
    const awaitingVerification = issues.filter(
      (i) => i.status === 'awaiting_verification'
    ).length;
    const verifiedResolutions = issues.filter(
      (i) => i.status === 'verified_resolved'
    ).length;
    const beingAddressed = issues.filter((i) =>
      [
        'under_review',
        'assigned',
        'in_progress',
        'awaiting_verification',
        'resolution_disputed',
        'more_evidence_required',
      ].includes(i.status)
    ).length;
    const disputed = issues.filter(
      (i) =>
        i.status === 'resolution_disputed' ||
        i.status === 'more_evidence_required'
    ).length;
    const unassigned = issues.filter(
      (i) =>
        (i.status === 'submitted' || i.status === 'under_review') &&
        !i.assignedTo
    ).length;

    return {
      total,
      openIssues,
      inProgress,
      awaitingVerification,
      verifiedResolutions,
      beingAddressed,
      disputed,
      unassigned,
    };
  }, [issues]);

  const needsAttentionIssues = useMemo(() => {
    return issues
      .filter((i) =>
        [
          'awaiting_verification',
          'resolution_disputed',
          'more_evidence_required',
          'submitted',
          'under_review',
          'assigned',
        ].includes(i.status)
      )
      .slice()
      .sort((a, b) => {
        const weight = (s: IssueStatus) => {
          if (s === 'awaiting_verification') return 5;
          if (s === 'resolution_disputed' || s === 'more_evidence_required') return 4;
          if (s === 'submitted' || s === 'under_review') return 3;
          return 1;
        };
        return weight(b.status) - weight(a.status);
      })
      .slice(0, 5);
  }, [issues]);

  const maintenanceQueue = useMemo(() => {
    if (!profile) return [];
    return issues.filter(
      (i) =>
        [
          'assigned',
          'in_progress',
          'resolution_disputed',
          'more_evidence_required',
        ].includes(i.status) &&
        (profile.role === 'admin' ||
          profile.role === 'maintenance' ||
          i.assignedTo === profile.id)
    );
  }, [issues, profile]);

  function defaultTabForRole(role: UserRole): NavTab {
    if (pendingTabAfterAuth !== 'dashboard') {
      if (
        role === 'reporter' &&
        ['assignments', 'reviews', 'analytics'].includes(pendingTabAfterAuth)
      ) {
        return 'dashboard';
      }
      if (
        role === 'maintenance' &&
        ['reviews', 'analytics'].includes(pendingTabAfterAuth)
      ) {
        return 'assignments';
      }
      return pendingTabAfterAuth;
    }
    if (role === 'maintenance') return 'assignments';
    return 'dashboard';
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim() || cleanEmail.split('@')[0];

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { full_name: cleanName, role: selectedRole },
          },
        });
        if (error) throw error;
        if (data.user) {
          const userProfile = await getOrCreateProfile(
            data.user.id,
            cleanEmail,
            cleanName,
            selectedRole
          );
          setProfile(userProfile);
          await refreshAllData();
          setActiveTab(defaultTabForRole(userProfile.role));
          setStage('app');
          notify(
            'success',
            `Welcome, ${userProfile.fullName} (${ROLE_DESCRIPTIONS[userProfile.role].label}).`
          );
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        if (data.user) {
          const userProfile = await getOrCreateProfile(
            data.user.id,
            cleanEmail,
            undefined,
            selectedRole
          );
          setProfile(userProfile);
          await refreshAllData();
          setActiveTab(defaultTabForRole(userProfile.role));
          setStage('app');
          notify(
            'success',
            `Signed in as ${userProfile.fullName} (${ROLE_DESCRIPTIONS[userProfile.role].label}).`
          );
          return;
        }
      }
    } catch {
      // Seamless local persistence when Supabase auth is offline or unconfirmed
      setForceLocalMode(true);
      const localUser = signInOrCreateLocalUser(
        cleanEmail,
        authMode === 'signup' ? cleanName : undefined,
        selectedRole
      );
      setProfile(localUser);
      await refreshAllData();
      setActiveTab(defaultTabForRole(localUser.role));
      setStage('app');
      notify(
        'success',
        `Signed in as ${localUser.fullName} (${ROLE_DESCRIPTIONS[localUser.role].label}).`
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleQuickRoleSignIn(role: UserRole) {
    const preset = ROLE_DESCRIPTIONS[role];
    setForceLocalMode(true);
    const localUser = signInOrCreateLocalUser(
      preset.defaultEmail,
      preset.defaultName,
      role
    );
    setProfile(localUser);
    await refreshAllData();
    setActiveTab(defaultTabForRole(role));
    setStage('app');
    notify('success', `Signed in as ${localUser.fullName} (${preset.label}).`);
  }

  function handleSignOut() {
    clearLocalSession();
    localStorage.removeItem(STAGE_CACHE_KEY);
    localStorage.removeItem(TAB_CACHE_KEY);
    setForceLocalMode(false);
    setProfile(null);
    supabase.auth.signOut();
    setStage('landing');
    notify('success', 'Signed out of ProofBridge.');
  }

  async function handleRoleSwitch(newRole: UserRole) {
    if (!profile) return;
    try {
      const updated = await updateMyRole(profile.id, newRole);
      setProfile(updated);
      if (
        newRole === 'reporter' &&
        ['assignments', 'reviews', 'analytics'].includes(activeTab)
      ) {
        setActiveTab('dashboard');
      } else if (
        newRole === 'maintenance' &&
        ['reviews', 'analytics'].includes(activeTab)
      ) {
        setActiveTab('assignments');
      }
      await refreshAllData();
      notify('success', `Account role updated to ${ROLE_DESCRIPTIONS[newRole].label}.`);
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'Could not update role.'
      );
    }
  }

  async function handleSaveProfile(updates: {
    fullName: string;
    phoneNumber?: string;
  }) {
    if (!profile) return;
    try {
      const updated = await updateMyProfile(profile.id, updates);
      setProfile(updated);
      await refreshAllData();
      notify('success', 'Profile saved.');
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'Failed to update profile.'
      );
    }
  }

  function handleReportFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setReportFile(null);
      setReportPreview(null);
      return;
    }
    const err = validateEvidenceFile(file);
    if (err) {
      setReportFieldError(err);
      notify('error', err);
      e.target.value = '';
      return;
    }
    setReportFieldError(null);
    setReportFile(file);
    setReportPreview(URL.createObjectURL(file));
  }

  function handleWorkFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setWorkFile(null);
      setWorkPreview(null);
      return;
    }
    const err = validateEvidenceFile(file);
    if (err) {
      notify('error', err);
      e.target.value = '';
      return;
    }
    setWorkFile(file);
    setWorkPreview(URL.createObjectURL(file));
  }

  async function handleCreateIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || reportSubmitting) return;
    if (reportTitle.trim().length < 5) {
      setReportFieldError('Please enter a clear title (at least 5 characters).');
      return;
    }
    if (reportDesc.trim().length < 10) {
      setReportFieldError('Please describe what happened (at least 10 characters).');
      return;
    }

    setReportFieldError(null);
    setReportSubmitting(true);
    try {
      const created = await createIssue({
        user: profile,
        title: reportTitle,
        description: reportDesc,
        category: reportCategory,
        locationBuilding: reportBuilding,
        locationRoom: reportRoom,
        urgency: reportUrgency,
        imageFile: reportFile,
      });
      setReportTitle('');
      setReportDesc('');
      setReportRoom('');
      setReportFile(null);
      setReportPreview(null);
      await refreshAllData();
      setSubmittedReport(created);
      notify('success', `Report ${created.code} received.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit report.';
      setReportFieldError(msg);
      notify('error', msg);
    } finally {
      setReportSubmitting(false);
    }
  }

  async function handleTriageUnderReview() {
    if (!profile || !detailIssue) return;
    setActionBusy(true);
    try {
      await triageIssueUnderReview({ issue: detailIssue, actor: profile });
      await openIssueDetail(detailIssue.id);
      await refreshAllData();
      notify('success', `Issue ${detailIssue.code} marked Under Review.`);
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'Triage update failed.'
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleAssignIssue() {
    if (!profile || !detailIssue || !selectedAssigneeId) return;
    setActionBusy(true);
    try {
      const targetUser =
        allProfiles.find((p) => p.id === selectedAssigneeId) || profile;
      await assignIssueToStaff({
        issue: detailIssue,
        actor: profile,
        assigneeId: targetUser.id,
        assigneeName: targetUser.fullName,
      });
      await openIssueDetail(detailIssue.id);
      await refreshAllData();
      notify(
        'success',
        `Issue ${detailIssue.code} assigned to ${targetUser.fullName}.`
      );
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'Assignment failed.'
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCancelIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !detailIssue) return;
    setActionBusy(true);
    try {
      await cancelIssueWithReason({
        issue: detailIssue,
        actor: profile,
        reason: cancelReasonInput,
      });
      setCancelReasonInput('');
      await openIssueDetail(detailIssue.id);
      await refreshAllData();
      notify(
        'success',
        `Issue ${detailIssue.code} closed and logged in timeline.`
      );
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'Could not cancel issue.'
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleStartWork() {
    if (!profile || !detailIssue) return;
    setActionBusy(true);
    try {
      await startMaintenanceWork({ issue: detailIssue, actor: profile });
      await openIssueDetail(detailIssue.id);
      await refreshAllData();
      notify('success', `Issue ${detailIssue.code} marked In Progress.`);
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'Could not update status.'
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleClaimCompletion(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !detailIssue) return;
    setActionBusy(true);
    try {
      await submitRepairForVerification({
        issue: detailIssue,
        actor: profile,
        workNotes: workNotesInput,
        evidenceFile: workFile,
      });
      setWorkFile(null);
      setWorkPreview(null);
      await openIssueDetail(detailIssue.id);
      await refreshAllData();
      notify(
        'success',
        `Repair claimed for ${detailIssue.code}. Now Awaiting Verification.`
      );
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'Could not submit repair claim.'
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleVerificationSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !detailIssue) return;
    setActionBusy(true);
    try {
      await recordVerificationDecision({
        issue: detailIssue,
        reviewer: profile,
        decision: reviewDecision,
        reviewNotes: reviewReasonInput,
      });
      setReviewReasonInput('');
      await openIssueDetail(detailIssue.id);
      await refreshAllData();
      notify(
        'success',
        `Review decision saved: ${STATUS_META[reviewDecision].label}.`
      );
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'Verification decision failed.'
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleToggleRecurringLink(parentIssue: Issue | null) {
    if (!profile || !detailIssue) return;
    setActionBusy(true);
    try {
      await linkRecurringIssue({
        issueId: detailIssue.id,
        parentIssueId: parentIssue ? parentIssue.id : null,
        parentCode: parentIssue?.code,
        actor: profile,
      });
      await openIssueDetail(detailIssue.id);
      await refreshAllData();
      notify(
        'success',
        parentIssue
          ? `Confirmed recurring relationship with ${parentIssue.code}.`
          : 'Recurring link removed.'
      );
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'Failed to update recurring link.'
      );
    } finally {
      setActionBusy(false);
    }
  }

  function handleVoiceDictation() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      notify(
        'error',
        'Browser speech recognition unavailable; use OS dictation.'
      );
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    setDictating(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        setReportDesc((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
      setDictating(false);
    };
    recognition.onerror = () => setDictating(false);
    recognition.onend = () => setDictating(false);
    recognition.start();
  }

  const isCloudActive = isSupabaseConfigured && !isLocalModeForced();

  // ===========================================================================
  // STAGE 1: PUBLIC EDITORIAL LANDING PAGE (No internal dashboard exposed)
  // ===========================================================================
  if (stage === 'landing') {
    return (
      <div className="min-h-screen flex flex-col bg-[#111318] text-[#F5F5F5] selection:bg-[#FF8A32]/30">
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 max-w-md px-4 py-3 rounded-control bg-[#1C2028] border text-xs font-medium flex items-center gap-2.5 ${
              toast.type === 'error'
                ? 'border-[#F87171]/40 text-[#F87171]'
                : 'border-[#2B303A] text-[#F5F5F5]'
            }`}
          >
            {toast.text}
          </div>
        )}

        {/* Minimalist Public Header (Only Brand + Anchor Links + Sign In / Get Started) */}
        <header className="sticky top-0 z-30 bg-[#111318]/95 border-b border-[#2B303A]">
          <div className="max-w-[1200px] mx-auto px-5 sm:px-10 h-20 flex items-center justify-between gap-6">
            <ProofBridgeLogo size="md" />

            <nav className="hidden md:flex items-center gap-8 text-sm text-[#A1A1AA]">
              <a href="#impact" className="hover:text-[#F5F5F5] transition">
                Impact
              </a>
              <a href="#categories" className="hover:text-[#F5F5F5] transition">
                Categories
              </a>
              <a href="#how-it-works" className="hover:text-[#F5F5F5] transition">
                How it works
              </a>
            </nav>

            <div className="flex items-center gap-3">
              {profile ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setStage('app');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-5 py-2.5 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] text-[#111318] text-xs font-semibold transition"
                  >
                    Open Dashboard ↗
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="px-4 py-2.5 rounded-control bg-[#1C2028] hover:bg-[#222731] border border-[#2B303A] text-xs font-medium text-[#A1A1AA] hover:text-[#F5F5F5] transition"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingTabAfterAuth('dashboard');
                      setAuthMode('signin');
                      setStage('auth');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-4 py-2.5 rounded-control bg-[#1C2028] hover:bg-[#222731] border border-[#2B303A] text-xs font-medium text-[#F5F5F5] transition"
                  >
                    Log in
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPendingTabAfterAuth('dashboard');
                      setAuthMode('signup');
                      setStage('auth');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-5 py-2.5 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] text-[#111318] text-xs font-semibold transition"
                  >
                    Create account ↗
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Editorial Public Landing Page */}
        <main className="flex-1 max-w-[1200px] w-full mx-auto px-5 sm:px-10">
          {/* 1. HERO SECTION */}
          <section className="py-20 sm:py-32 border-b border-[#2B303A]">
            <div className="max-w-4xl space-y-8">
              <p className="pb-eyebrow">YOUR COMMUNITY. YOUR SAY.</p>

              <h1 className="pb-display-hero text-[54px] sm:text-[84px] lg:text-[108px] text-[#F5F5F5]">
                Small issues.
                <br />
                <span className="text-[#FF8A32]">BIG CHANGE.</span>
              </h1>

              <div className="max-w-xl space-y-4 pt-2">
                <p className="font-display text-xl sm:text-2xl font-medium text-[#F5F5F5] tracking-tight leading-snug">
                  Your city. Your voice. Your chance to make a difference.
                </p>

                <p className="text-base text-[#A1A1AA] leading-relaxed">
                  Spot something that needs fixing? Report it, follow its progress, and help make your community better.
                </p>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-8">
                <button
                  type="button"
                  onClick={() => requireLoginForTab('report')}
                  className="px-7 py-4 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] text-[#111318] text-sm font-semibold transition"
                >
                  Report an Issue ↗
                </button>

                <button
                  type="button"
                  onClick={() => requireLoginForTab('issues')}
                  className="text-sm font-medium text-[#F5F5F5] hover:text-[#FF8A32] transition"
                >
                  Explore Reported Issues →
                </button>
              </div>
            </div>
          </section>

          {/* 2. INTRODUCTION & STATISTICS SECTION */}
          <section
            id="impact"
            className="py-20 sm:py-28 border-b border-[#2B303A] grid grid-cols-1 lg:grid-cols-12 gap-12 items-start"
          >
            <div className="lg:col-span-6 space-y-6">
              <p className="pb-eyebrow">BETTER STREETS START HERE</p>

              <h2 className="pb-display-section text-4xl sm:text-6xl text-[#F5F5F5]">
                Notice it.
                <br />
                Report it.
                <br />
                <span className="text-[#FF8A32]">Improve it.</span>
              </h2>

              <p className="text-base text-[#A1A1AA] max-w-md leading-relaxed">
                From broken streetlights to overflowing bins, every report brings your community one step closer to better.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => requireLoginForTab('report')}
                  className="text-sm font-semibold text-[#FF8A32] hover:text-[#FF9E54] transition"
                >
                  Make Your First Report ↗
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 lg:border-l lg:border-[#2B303A] lg:pl-12 space-y-10">
              <p className="pb-eyebrow">THE IMPACT SO FAR</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
                <div className="space-y-3">
                  <p className="pb-stat-number text-6xl sm:text-7xl text-[#F5F5F5]">
                    {stats.total}
                  </p>
                  <span className="block text-xs font-medium text-[#A1A1AA]">
                    Issues Reported
                  </span>
                </div>

                <div className="space-y-3">
                  <p className="pb-stat-number text-6xl sm:text-7xl text-[#F5F5F5]">
                    {stats.beingAddressed}
                  </p>
                  <span className="block text-xs font-medium text-[#A1A1AA]">
                    Being Addressed
                  </span>
                </div>

                <div className="space-y-3">
                  <p className="pb-stat-number text-6xl sm:text-7xl text-[#FF8A32]">
                    {stats.verifiedResolutions}
                  </p>
                  <span className="block text-xs font-medium text-[#A1A1AA]">
                    Issues Resolved
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 3. CATEGORIES SECTION */}
          <section
            id="categories"
            className="py-20 sm:py-28 border-b border-[#2B303A] space-y-12"
          >
            <div className="max-w-2xl space-y-3">
              <p className="pb-eyebrow">WHAT NEEDS ATTENTION?</p>
              <h2 className="pb-display-section text-4xl sm:text-5xl text-[#F5F5F5]">
                Every problem deserves to be{' '}
                <span className="text-[#FF8A32]">seen.</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-[#2B303A]">
              {PRIMARY_CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat] || HelpCircle;
                const count = issues.filter((i) => i.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(cat);
                      requireLoginForTab('issues');
                    }}
                    className="p-8 bg-[#111318] hover:bg-[#1C2028] border-r border-b border-[#2B303A] text-left transition group flex flex-col justify-between gap-10"
                  >
                    <div className="flex items-center justify-between w-full">
                      <Icon className="w-5 h-5 text-[#A1A1AA] group-hover:text-[#FF8A32] transition" />
                      <span className="font-mono text-xs text-[#A1A1AA] tabular-nums">
                        {count}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between w-full">
                      <span className="font-display text-xl font-semibold text-[#F5F5F5] group-hover:text-[#FF8A32] transition">
                        {CATEGORY_LABELS[cat]}
                      </span>
                      <span className="text-sm text-[#A1A1AA] group-hover:text-[#F5F5F5] transition">
                        →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 4. RECENT REPORTS SECTION */}
          <section className="py-20 sm:py-28 border-b border-[#2B303A] space-y-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div className="space-y-3 max-w-xl">
                <p className="pb-eyebrow">FROM YOUR COMMUNITY</p>
                <h2 className="pb-display-section text-4xl sm:text-5xl text-[#F5F5F5]">
                  Reported. Seen.{' '}
                  <span className="text-[#FF8A32]">Getting fixed.</span>
                </h2>
                <p className="text-base text-[#A1A1AA]">
                  See what people are reporting and follow the progress.
                </p>
              </div>

              <button
                type="button"
                onClick={() => requireLoginForTab('issues')}
                className="text-sm font-medium text-[#FF8A32] hover:text-[#FF9E54] shrink-0 transition"
              >
                View All Reports →
              </button>
            </div>

            {issues.length === 0 ? (
              <div className="py-16 border-t border-[#2B303A] space-y-4">
                <p className="font-display text-2xl font-semibold text-[#F5F5F5]">
                  Nothing reported. Yet.
                </p>
                <p className="text-sm text-[#A1A1AA] max-w-md">
                  Seen something that needs attention? Your first report can start the change.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => requireLoginForTab('report')}
                    className="px-6 py-3.5 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] text-[#111318] text-xs font-semibold transition"
                  >
                    Report Your First Issue ↗
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-[#2B303A] divide-y divide-[#2B303A]">
                {issues.slice(0, 5).map((issue) => (
                  <div
                    key={issue.id}
                    onClick={() => requireLoginForTab('issues')}
                    className="py-6 px-4 -mx-4 hover:bg-[#1C2028] rounded-control cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-xs text-[#A1A1AA] tabular-nums">
                          {issue.code}
                        </span>
                        <h3 className="font-display text-lg font-semibold text-[#F5F5F5] truncate">
                          {issue.title}
                        </h3>
                      </div>
                      <p className="text-xs text-[#A1A1AA]">
                        {issue.locationBuilding}
                        {issue.locationRoom ? ` • ${issue.locationRoom}` : ''} •{' '}
                        {CATEGORY_LABELS[issue.category]} •{' '}
                        <span className="tabular-nums">
                          {new Date(issue.createdAt).toLocaleDateString(
                            undefined,
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }
                          )}
                        </span>
                      </p>
                    </div>

                    <span
                      className={`text-xs px-3 py-1 rounded shrink-0 inline-flex items-center gap-1.5 ${
                        STATUS_META[issue.status].badgeClass
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          STATUS_META[issue.status].dotColor
                        }`}
                      />
                      {STATUS_META[issue.status].shortLabel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 5. HOW IT WORKS SECTION */}
          <section
            id="how-it-works"
            className="py-20 sm:py-28 border-b border-[#2B303A] space-y-14"
          >
            <div className="max-w-2xl space-y-3">
              <p className="pb-eyebrow">THREE STEPS. REAL IMPACT.</p>
              <h2 className="pb-display-section text-4xl sm:text-5xl text-[#F5F5F5]">
                Making a difference shouldn't be{' '}
                <span className="text-[#FF8A32]">complicated.</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4 border-t border-[#2B303A] pt-8">
                <span className="font-display text-5xl font-normal text-[#FF8A32] tabular-nums block">
                  01
                </span>
                <h3 className="font-display text-2xl font-semibold text-[#F5F5F5]">
                  Spot It
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed max-w-xs">
                  See something that needs attention? Start with what you noticed.
                </p>
              </div>

              <div className="space-y-4 border-t border-[#2B303A] pt-8">
                <span className="font-display text-5xl font-normal text-[#FF8A32] tabular-nums block">
                  02
                </span>
                <h3 className="font-display text-2xl font-semibold text-[#F5F5F5]">
                  Report It
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed max-w-xs">
                  Share the details, add a photo, and tell us where it happened.
                </p>
              </div>

              <div className="space-y-4 border-t border-[#2B303A] pt-8">
                <span className="font-display text-5xl font-normal text-[#FF8A32] tabular-nums block">
                  03
                </span>
                <h3 className="font-display text-2xl font-semibold text-[#F5F5F5]">
                  Track It
                </h3>
                <p className="text-sm text-[#A1A1AA] leading-relaxed max-w-xs">
                  Follow the status and see your report move toward resolution.
                </p>
              </div>
            </div>
          </section>

          {/* 6. FINAL CALL TO ACTION */}
          <section className="py-24 sm:py-32">
            <div className="max-w-3xl space-y-6">
              <p className="pb-eyebrow">YOUR CITY CAN BE BETTER</p>

              <h2 className="pb-display-section text-5xl sm:text-7xl text-[#F5F5F5]">
                Don't just notice it.
                <br />
                <span className="text-[#FF8A32]">Make it count.</span>
              </h2>

              <p className="text-base text-[#A1A1AA] max-w-md">
                One report can start a change. Take the first step today.
              </p>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => requireLoginForTab('report')}
                  className="px-7 py-4 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] text-[#111318] text-sm font-semibold transition"
                >
                  Report an Issue ↗
                </button>
              </div>
            </div>
          </section>
        </main>

        {/* Minimalist Footer */}
        <footer className="border-t border-[#2B303A]">
          <div className="max-w-[1200px] mx-auto px-5 sm:px-10 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-xs text-[#A1A1AA]">
            <ProofBridgeLogo size="md" showTagline />
            <div className="flex flex-wrap items-center gap-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setSelectedRole('reporter');
                  setStage('auth');
                }}
                className="hover:text-[#F5F5F5] transition"
              >
                Reporter Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setSelectedRole('maintenance');
                  setStage('auth');
                }}
                className="hover:text-[#F5F5F5] transition"
              >
                Maintenance Staff Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setSelectedRole('admin');
                  setStage('auth');
                }}
                className="hover:text-[#F5F5F5] transition"
              >
                Admin / Reviewer Login
              </button>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ===========================================================================
  // STAGE 2: LOGIN & CREATE ACCOUNT PAGE (With 3 Account Types)
  // ===========================================================================
  if (stage === 'auth' || !profile) {
    return (
      <div className="min-h-screen bg-[#111318] text-[#F5F5F5] flex flex-col justify-between p-6 sm:p-10">
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-control bg-[#1C2028] border text-xs font-medium flex items-center gap-2 ${
              toast.type === 'error'
                ? 'border-[#F87171]/40 text-[#F87171]'
                : 'border-[#2B303A] text-[#F5F5F5]'
            }`}
          >
            {toast.text}
          </div>
        )}

        {/* Top Bar with Back to Landing */}
        <div className="max-w-[1160px] w-full mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStage('landing')}
            className="text-xs font-medium text-[#A1A1AA] hover:text-[#F5F5F5] flex items-center gap-2 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Landing Page
          </button>

          <span className="pb-eyebrow">THREE ROLE PORTALS</span>
        </div>

        {/* Center Split Editorial Auth */}
        <div className="max-w-[1160px] w-full mx-auto my-auto py-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Editorial Column + Role Explanation */}
          <div className="lg:col-span-6 space-y-8">
            <div className="space-y-4">
              <p className="pb-eyebrow">YOUR COMMUNITY. YOUR SAY.</p>
              <h1 className="pb-display-hero text-5xl sm:text-6xl text-[#F5F5F5]">
                Small issues.
                <br />
                <span className="text-[#FF8A32]">BIG CHANGE.</span>
              </h1>
              <p className="text-sm text-[#A1A1AA] max-w-md leading-relaxed">
                Select your account type to access the Reporter, Maintenance Staff, or Admin Reviewer workspace.
              </p>
            </div>

            {/* 3 Role Portals Overview */}
            <div className="border-t border-[#2B303A] divide-y divide-[#2B303A]">
              {(['reporter', 'maintenance', 'admin'] as UserRole[]).map(
                (roleKey, idx) => {
                  const info = ROLE_DESCRIPTIONS[roleKey];
                  const active = selectedRole === roleKey;
                  return (
                    <div
                      key={roleKey}
                      onClick={() => setSelectedRole(roleKey)}
                      className={`py-4 px-3 -mx-3 rounded-control cursor-pointer transition flex items-center justify-between gap-4 ${
                        active ? 'bg-[#1C2028]' : 'hover:bg-[#1C2028]/50'
                      }`}
                    >
                      <div className="flex items-baseline gap-4">
                        <span className="font-display text-sm font-bold text-[#FF8A32] tabular-nums">
                          0{idx + 1}
                        </span>
                        <div>
                          <p className="font-display text-base font-semibold text-[#F5F5F5]">
                            {info.label}{' '}
                            <span className="text-xs font-normal text-[#A1A1AA]">
                              — {info.short}
                            </span>
                          </p>
                          <p className="text-xs text-[#A1A1AA] mt-0.5">
                            {info.desc}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickRoleSignIn(roleKey);
                        }}
                        className="px-3 py-1.5 rounded-control bg-[#111318] hover:bg-[#FF8A32] hover:text-[#111318] border border-[#2B303A] text-xs font-medium text-[#F5F5F5] shrink-0 transition"
                      >
                        Sign in as {info.label.split(' ')[0]} →
                      </button>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Right Auth Form Card */}
          <div className="lg:col-span-6 bg-[#1C2028] border border-[#2B303A] rounded-panel p-8 space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ProofBridgeMark className="w-9 h-9 shrink-0" />
                <div>
                  <h2 className="font-display font-bold text-lg text-[#F5F5F5] tracking-tight">
                    {authMode === 'signin'
                      ? 'Log in to ProofBridge'
                      : 'Create an account'}
                  </h2>
                  <p className="text-[#A1A1AA] text-xs">
                    Portal: {ROLE_DESCRIPTIONS[selectedRole].label} • Destination:{' '}
                    <span className="text-[#FF8A32] font-medium">
                      {PAGE_TITLES[pendingTabAfterAuth].title}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Log In / Create Account Toggle */}
            <div className="grid grid-cols-2 gap-1 bg-[#111318] p-1 rounded-control border border-[#2B303A]">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`py-2 text-xs font-medium rounded-[4px] transition ${
                  authMode === 'signin'
                    ? 'bg-[#1C2028] text-[#F5F5F5]'
                    : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`py-2 text-xs font-medium rounded-[4px] transition ${
                  authMode === 'signup'
                    ? 'bg-[#1C2028] text-[#F5F5F5]'
                    : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
                }`}
              >
                Create account
              </button>
            </div>

            {/* Account Type Selector */}
            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-2">
                Select account type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['reporter', 'maintenance', 'admin'] as UserRole[]).map(
                  (roleKey) => {
                    const active = selectedRole === roleKey;
                    return (
                      <button
                        key={roleKey}
                        type="button"
                        onClick={() => setSelectedRole(roleKey)}
                        className={`py-2.5 px-2.5 rounded-control border text-left transition ${
                          active
                            ? 'bg-[#111318] border-[#FF8A32] text-[#FF8A32]'
                            : 'bg-[#111318] border-[#2B303A] text-[#A1A1AA] hover:text-[#F5F5F5]'
                        }`}
                      >
                        <span className="font-display text-xs font-bold block">
                          {roleKey === 'admin'
                            ? 'Admin'
                            : roleKey === 'maintenance'
                            ? 'Staff'
                            : 'Reporter'}
                        </span>
                        <span className="text-[10px] text-[#A1A1AA] block truncate">
                          {ROLE_DESCRIPTIONS[roleKey].short}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                    Full name
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Aarav Sharma"
                    className="w-full rounded-control bg-[#111318] border border-[#2B303A] px-3.5 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#A1A1AA]/50 focus:border-[#FF8A32]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={ROLE_DESCRIPTIONS[selectedRole].defaultEmail}
                  className="w-full rounded-control bg-[#111318] border border-[#2B303A] px-3.5 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#A1A1AA]/50 focus:border-[#FF8A32]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={
                    authMode === 'signin' ? 'current-password' : 'new-password'
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-control bg-[#111318] border border-[#2B303A] px-3.5 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#A1A1AA]/50 focus:border-[#FF8A32]"
                />
              </div>

              <button
                type="submit"
                disabled={authBusy}
                className="w-full py-3 px-4 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] disabled:opacity-50 font-semibold text-sm text-[#111318] transition"
              >
                {authBusy
                  ? 'Signing in...'
                  : authMode === 'signin'
                  ? `Sign in as ${ROLE_DESCRIPTIONS[selectedRole].label} ↗`
                  : `Create ${ROLE_DESCRIPTIONS[selectedRole].label} Account ↗`}
              </button>
            </form>
          </div>
        </div>

        <div className="max-w-[1160px] w-full mx-auto text-xs text-[#A1A1AA] flex items-center justify-between">
          <span>ProofBridge — Minimalist Civic & Facility SaaS</span>
          <span>Claimed Repair ≠ Verified Outcome</span>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // STAGE 3: AUTHENTICATED SAAS WORKSPACE (Only visible after login)
  // ===========================================================================
  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'issues', label: 'Explore issues', icon: ListFilter, badge: issues.length || undefined },
    { id: 'report', label: 'Report an issue', icon: Plus },
    {
      id: 'my-reports',
      label: 'My reports',
      icon: UserCheck,
      badge: myReportedIssues.length || undefined,
    },
    ...(profile.role === 'maintenance' || profile.role === 'admin'
      ? [
          {
            id: 'assignments' as NavTab,
            label: 'Assignments',
            icon: Wrench,
            badge: maintenanceQueue.length || undefined,
          },
        ]
      : []),
    ...(profile.role === 'admin'
      ? [
          {
            id: 'reviews' as NavTab,
            label: 'Evidence & reviews',
            icon: ClipboardCheck,
            badge: stats.awaitingVerification || undefined,
          },
          { id: 'analytics' as NavTab, label: 'Analytics', icon: BarChart3 },
        ]
      : []),
    { id: 'timeline', label: 'Activity timeline', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-[#111318] text-[#F5F5F5]">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-md px-4 py-3 rounded-control bg-[#1C2028] border text-xs font-medium flex items-center gap-2.5 ${
            toast.type === 'error'
              ? 'border-[#F87171]/40 text-[#F87171]'
              : 'border-[#2B303A] text-[#F5F5F5]'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-[#F87171] shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
          )}
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="ml-auto text-[#A1A1AA] hover:text-[#F5F5F5]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Click-outside catcher for topbar dropdowns */}
      {(notifOpen || accountMenuOpen) && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => {
            setNotifOpen(false);
            setAccountMenuOpen(false);
          }}
        />
      )}

      {/* =================================================================== */}
      {/* SAAS SIDEBAR NAVIGATION                                             */}
      {/* =================================================================== */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-60 bg-[#14171E] border-r border-[#2B303A] flex flex-col justify-between shrink-0 transition-transform duration-150 ${
          mobileSidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-5">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('dashboard');
                setMobileSidebarOpen(false);
              }}
              className="flex items-center gap-2.5 text-left"
            >
              <ProofBridgeLogo
                size="sm"
                subtitle={ROLE_DESCRIPTIONS[profile.role].label}
              />
            </button>

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close navigation menu"
              className="lg:hidden p-1.5 rounded-control text-[#A1A1AA] hover:text-[#F5F5F5]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary CTA */}
          <div className="px-1">
            <button
              type="button"
              onClick={() => {
                setSubmittedReport(null);
                setActiveTab('report');
                setMobileSidebarOpen(false);
              }}
              className="w-full py-2.5 px-3 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] text-[#111318] text-xs font-semibold flex items-center justify-between transition"
            >
              <span>Report an Issue</span>
              <span>↗</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-0.5" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'report') setSubmittedReport(null);
                    setActiveTab(item.id);
                    setMobileSidebarOpen(false);
                  }}
                  className={`relative w-full px-3 py-2 rounded-control text-xs font-medium flex items-center justify-between transition ${
                    isActive
                      ? 'bg-[#1C2028] text-[#F5F5F5]'
                      : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1C2028]/60'
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[#FF8A32]"
                    />
                  )}
                  <span className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-[#FF8A32]' : 'text-[#A1A1AA]'
                      }`}
                    />
                    {item.label}
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded tabular-nums ${
                        isActive
                          ? 'text-[#FF8A32] font-semibold'
                          : 'text-[#A1A1AA]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Account Summary & Sign Out */}
        <div className="p-4 border-t border-[#2B303A] space-y-3">
          <div className="px-2 py-1.5 rounded-control bg-[#1C2028] border border-[#2B303A] space-y-0.5">
            <p className="text-xs font-semibold text-[#F5F5F5] truncate">
              {profile.fullName}
            </p>
            <p className="text-[11px] text-[#FF8A32] font-medium">
              {ROLE_DESCRIPTIONS[profile.role].label}
            </p>
          </div>

          <div className="flex items-center justify-between px-1 text-[11px] text-[#A1A1AA]">
            <button
              type="button"
              onClick={() => setStage('landing')}
              className="hover:text-[#F5F5F5] transition"
            >
              ← Landing Page
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-[#F87171] hover:underline font-medium transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* =================================================================== */}
      {/* MAIN SAAS CONTENT SHELL                                             */}
      {/* =================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-[#111318] border-b border-[#2B303A] px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-1.5 rounded-control bg-[#1C2028] border border-[#2B303A] text-[#A1A1AA] hover:text-[#F5F5F5]"
            >
              <Menu className="w-4 h-4" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs truncate">
              <span className="hidden sm:inline text-[#A1A1AA]">
                ProofBridge
              </span>
              <span className="hidden sm:inline text-[#A1A1AA]">/</span>
              <span className="font-medium text-[#F5F5F5] truncate">
                {PAGE_TITLES[activeTab].title}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative hidden md:block w-60">
              <Search className="w-3.5 h-3.5 text-[#A1A1AA] absolute left-3 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== 'issues') setActiveTab('issues');
                }}
                placeholder="Search issues or locations..."
                aria-label="Search issues or locations"
                className="w-full pl-8 pr-3 py-1.5 rounded-control bg-[#1C2028] border border-[#2B303A] text-xs text-[#F5F5F5] placeholder:text-[#A1A1AA] focus:border-[#FF8A32]"
              />
            </div>

            <div className="hidden md:block h-4 w-px bg-[#2B303A]" />

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((prev) => !prev);
                  setAccountMenuOpen(false);
                }}
                aria-label="Toggle notifications"
                className="relative p-1.5 rounded-control bg-[#1C2028] hover:bg-[#222731] border border-[#2B303A] text-[#A1A1AA] hover:text-[#F5F5F5] transition"
              >
                <Bell className="w-4 h-4" />
                {stats.awaitingVerification + stats.disputed > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A32] absolute top-1.5 right-1.5" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-card bg-[#1C2028] border border-[#2B303A] p-3 z-50 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2B303A]">
                    <span className="text-xs font-semibold text-[#F5F5F5]">
                      Needs Review / Action
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-[11px] text-[#A1A1AA] hover:text-[#F5F5F5]"
                    >
                      Close
                    </button>
                  </div>

                  {needsAttentionIssues.length === 0 ? (
                    <p className="text-xs text-[#A1A1AA] py-4 text-center">
                      No pending items require action.
                    </p>
                  ) : (
                    <div className="divide-y divide-[#2B303A] max-h-64 overflow-y-auto">
                      {needsAttentionIssues.slice(0, 4).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            openIssueDetail(item.id);
                          }}
                          className="w-full text-left py-2 px-2 hover:bg-[#222731] rounded-control transition space-y-0.5"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-medium text-[#FF8A32] tabular-nums">
                              {item.code}
                            </span>
                            <span className="text-[#A1A1AA]">
                              {STATUS_META[item.status].shortLabel}
                            </span>
                          </div>
                          <p className="text-xs text-[#F5F5F5] truncate">
                            {item.title}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Avatar & Account Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen((prev) => !prev);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-control bg-[#1C2028] hover:bg-[#222731] border border-[#2B303A] transition"
              >
                <span className="w-5 h-5 rounded-full bg-[#222731] text-[#FF8A32] text-[11px] font-semibold flex items-center justify-center">
                  {profile.fullName.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline text-xs font-medium text-[#F5F5F5] max-w-[120px] truncate">
                  {profile.fullName}
                </span>
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-card bg-[#1C2028] border border-[#2B303A] p-2 z-50 space-y-1">
                  <div className="px-2.5 py-2 border-b border-[#2B303A]">
                    <p className="text-xs font-semibold text-[#F5F5F5] truncate">
                      {profile.fullName}
                    </p>
                    <p className="text-[11px] text-[#FF8A32] truncate">
                      {ROLE_DESCRIPTIONS[profile.role].label}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setActiveTab('settings');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-control text-xs text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#222731] flex items-center gap-2"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Account settings
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-control text-xs text-[#F87171] hover:bg-[#F87171]/10 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Workspace Container */}
        <main className="flex-1 max-w-[1320px] w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
          {/* =============================================================== */}
          {/* VIEW 1: SAAS BENTO DASHBOARD                                    */}
          {/* =============================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#2B303A] pb-6">
                <div className="space-y-1.5">
                  <p className="pb-eyebrow">COMMAND CENTER</p>
                  <h1 className="pb-display-section text-3xl sm:text-5xl text-[#F5F5F5]">
                    Track issues.{' '}
                    <span className="text-[#FF8A32]">Verify outcomes.</span>
                  </h1>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => refreshAllData()}
                    aria-label="Refresh dashboard"
                    className="p-2.5 rounded-control bg-[#1C2028] hover:bg-[#222731] border border-[#2B303A] text-[#A1A1AA] hover:text-[#F5F5F5] transition"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        loadingIssues ? 'animate-spin text-[#FF8A32]' : ''
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedReport(null);
                      setActiveTab('report');
                    }}
                    className="px-5 py-2.5 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] text-[#111318] text-xs font-semibold transition"
                  >
                    Report an Issue ↗
                  </button>
                </div>
              </div>

              {/* Row 1: 4 Minimalist Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setActiveTab('issues');
                  }}
                  className="bg-[#1C2028] hover:bg-[#222731] border border-[#2B303A] rounded-card p-6 text-left transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="pb-eyebrow">OPEN ISSUES</span>
                    <AlertTriangle className="w-4 h-4 text-[#A1A1AA]" />
                  </div>
                  <p className="pb-stat-number text-4xl sm:text-5xl text-[#F5F5F5]">
                    {stats.openIssues}
                  </p>
                  <p className="text-xs text-[#A1A1AA]">
                    {stats.unassigned} unassigned • {stats.disputed} disputed
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('in_progress');
                    setActiveTab('issues');
                  }}
                  className="bg-[#1C2028] hover:bg-[#222731] border border-[#2B303A] rounded-card p-6 text-left transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="pb-eyebrow">BEING ADDRESSED</span>
                    <Hammer className="w-4 h-4 text-[#60A5FA]" />
                  </div>
                  <p className="pb-stat-number text-4xl sm:text-5xl text-[#F5F5F5]">
                    {stats.beingAddressed}
                  </p>
                  <p className="text-xs text-[#A1A1AA]">
                    {stats.inProgress} active repairs in progress
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      profile.role === 'admin' ? 'reviews' : 'issues'
                    )
                  }
                  className="bg-[#1C2028] hover:bg-[#222731] border border-[#2B303A] rounded-card p-6 text-left transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="pb-eyebrow text-[#FBBF24]">
                      AWAITING VERIFICATION
                    </span>
                    <ClipboardCheck className="w-4 h-4 text-[#FBBF24]" />
                  </div>
                  <p className="pb-stat-number text-4xl sm:text-5xl text-[#FBBF24]">
                    {stats.awaitingVerification}
                  </p>
                  <p className="text-xs text-[#A1A1AA]">
                    Repair claimed — needs human review
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('verified_resolved');
                    setActiveTab('issues');
                  }}
                  className="bg-[#1C2028] hover:bg-[#222731] border border-[#2B303A] rounded-card p-6 text-left transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="pb-eyebrow text-[#22C55E]">
                      VERIFIED RESOLVED
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                  </div>
                  <p className="pb-stat-number text-4xl sm:text-5xl text-[#22C55E]">
                    {stats.verifiedResolutions}
                  </p>
                  <p className="text-xs text-[#A1A1AA]">
                    Evidence reviewed & approved
                  </p>
                </button>
              </div>

              {/* Row 2: Needs Attention (60%) & Verification Overview (40%) */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <section className="lg:col-span-3 bg-[#1C2028] border border-[#2B303A] rounded-card p-6 flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="pb-eyebrow">PRIORITY QUEUE</p>
                      <h2 className="font-display text-xl font-bold text-[#F5F5F5] mt-1">
                        Needs Attention
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTab(
                          profile.role === 'admin' ? 'reviews' : 'issues'
                        )
                      }
                      className="text-xs font-semibold text-[#FF8A32] hover:text-[#FF9E54] shrink-0"
                    >
                      View Queue →
                    </button>
                  </div>

                  {needsAttentionIssues.length === 0 ? (
                    <div className="py-10 text-center space-y-1">
                      <p className="font-display text-base font-semibold text-[#F5F5F5]">
                        No pending items.
                      </p>
                      <p className="text-xs text-[#A1A1AA]">
                        Reported issues requiring triage, repair, or verification appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#2B303A]">
                      {needsAttentionIssues.map((issue) => {
                        const actionLabel =
                          issue.status === 'awaiting_verification'
                            ? 'Verify Evidence'
                            : issue.status === 'resolution_disputed' ||
                              issue.status === 'more_evidence_required'
                            ? 'Submit Rework'
                            : !issue.assignedTo
                            ? 'Assign Staff'
                            : 'Inspect';

                        return (
                          <div
                            key={issue.id}
                            onClick={() => openIssueDetail(issue.id)}
                            className="py-3.5 px-2 -mx-2 hover:bg-[#222731] rounded-control cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs text-[#A1A1AA] tabular-nums">
                                  {issue.code}
                                </span>
                                <span className="font-display text-sm font-semibold text-[#F5F5F5] truncate">
                                  {issue.title}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-[#A1A1AA]">
                                <span>
                                  {issue.locationBuilding}
                                  {issue.locationRoom
                                    ? ` • ${issue.locationRoom}`
                                    : ''}
                                </span>
                                <span>•</span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1.5 ${
                                    STATUS_META[issue.status].badgeClass
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      STATUS_META[issue.status].dotColor
                                    }`}
                                  />
                                  {STATUS_META[issue.status].shortLabel}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openIssueDetail(issue.id);
                              }}
                              className={`px-3 py-1.5 rounded-control text-xs font-semibold shrink-0 transition ${
                                issue.status === 'awaiting_verification'
                                  ? 'bg-[#FF8A32] hover:bg-[#FF9E54] text-[#111318]'
                                  : 'bg-[#111318] hover:bg-[#222731] text-[#F5F5F5] border border-[#2B303A]'
                              }`}
                            >
                              {actionLabel}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Verification Overview (40%) */}
                <section className="lg:col-span-2 bg-[#1C2028] border border-[#2B303A] rounded-card p-6 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <p className="pb-eyebrow text-[#FF8A32]">
                      VERIFICATION PRINCIPLE
                    </p>
                    <h2 className="font-display text-xl font-bold text-[#F5F5F5]">
                      Claimed Repair ≠ Verified Outcome
                    </h2>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed">
                      Maintenance staff can submit completion evidence, but an authorized human reviewer must verify the resolution before it is marked resolved.
                    </p>
                  </div>

                  <div className="divide-y divide-[#2B303A] border-t border-[#2B303A]">
                    <div className="py-2.5 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-[#A1A1AA]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#A1A1AA]" />
                        1. Reported & Assigned
                      </span>
                      <span className="font-mono font-semibold text-[#F5F5F5] tabular-nums">
                        {
                          issues.filter((i) =>
                            ['submitted', 'under_review', 'assigned'].includes(
                              i.status
                            )
                          ).length
                        }
                      </span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-[#A1A1AA]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#60A5FA]" />
                        2. Repair in Progress
                      </span>
                      <span className="font-mono font-semibold text-[#60A5FA] tabular-nums">
                        {stats.inProgress}
                      </span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-[#FBBF24] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24]" />
                        3. Awaiting Human Verification
                      </span>
                      <span className="font-mono font-semibold text-[#FBBF24] tabular-nums">
                        {stats.awaitingVerification}
                      </span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-[#A1A1AA]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F87171]" />
                        4. Disputed / Needs Evidence
                      </span>
                      <span className="font-mono font-semibold text-[#F87171] tabular-nums">
                        {stats.disputed}
                      </span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-[#A1A1AA]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                        5. Verified Resolved
                      </span>
                      <span className="font-mono font-semibold text-[#22C55E] tabular-nums">
                        {stats.verifiedResolutions}
                      </span>
                    </div>
                  </div>
                </section>
              </div>

              {/* Row 3: Recent Issues (60%) & Recent Activity (40%) */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <section className="lg:col-span-3 bg-[#1C2028] border border-[#2B303A] rounded-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="pb-eyebrow">FROM YOUR COMMUNITY</p>
                      <h2 className="font-display text-xl font-bold text-[#F5F5F5] mt-1">
                        Recent Issues
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('issues')}
                      className="text-xs font-semibold text-[#FF8A32] hover:text-[#FF9E54]"
                    >
                      View All ({issues.length}) →
                    </button>
                  </div>

                  {issues.length === 0 ? (
                    <div className="py-10 text-center space-y-3">
                      <p className="text-xs text-[#A1A1AA]">
                        No issues reported yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('report')}
                        className="px-4 py-2 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] text-[#111318] text-xs font-semibold transition"
                      >
                        Report First Issue ↗
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#2B303A]">
                      {issues.slice(0, 5).map((issue) => (
                        <div
                          key={issue.id}
                          onClick={() => openIssueDetail(issue.id)}
                          className="py-3.5 px-2 -mx-2 hover:bg-[#222731] rounded-control cursor-pointer transition flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-[#A1A1AA] tabular-nums">
                                {issue.code}
                              </span>
                              <span className="font-display text-sm font-semibold text-[#F5F5F5] truncate">
                                {issue.title}
                              </span>
                            </div>
                            <p className="text-xs text-[#A1A1AA]">
                              {CATEGORY_LABELS[issue.category]} •{' '}
                              {issue.locationBuilding} •{' '}
                              {new Date(issue.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded shrink-0 inline-flex items-center gap-1.5 ${
                              STATUS_META[issue.status].badgeClass
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                STATUS_META[issue.status].dotColor
                              }`}
                            />
                            {STATUS_META[issue.status].shortLabel}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="lg:col-span-2 bg-[#1C2028] border border-[#2B303A] rounded-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="pb-eyebrow">LIVE AUDIT</p>
                      <h2 className="font-display text-xl font-bold text-[#F5F5F5] mt-1">
                        Recent Activity
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('timeline')}
                      className="text-xs font-semibold text-[#FF8A32] hover:text-[#FF9E54]"
                    >
                      Full Timeline →
                    </button>
                  </div>

                  {recentEvents.length === 0 ? (
                    <div className="py-10 text-center text-xs text-[#A1A1AA]">
                      No recorded events yet.
                    </div>
                  ) : (
                    <ol className="relative border-l border-[#2B303A] ml-2 space-y-4">
                      {recentEvents.slice(0, 5).map((ev) => (
                        <li
                          key={ev.id}
                          onClick={() => openIssueDetail(ev.issueId)}
                          className="ml-4 space-y-0.5 cursor-pointer group"
                        >
                          <span className="absolute -left-[5px] mt-1.5 w-2 h-2 rounded-full bg-[#222731] border border-[#FF8A32]" />
                          <div className="flex items-center justify-between text-[11px] text-[#A1A1AA]">
                            <span className="font-medium text-[#F5F5F5] group-hover:text-[#FF8A32] transition">
                              {ev.actorName || 'System'}
                              {ev.issueCode ? ` • ${ev.issueCode}` : ''}
                            </span>
                            <time className="tabular-nums">
                              {new Date(ev.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </time>
                          </div>
                          <p className="text-xs text-[#A1A1AA] line-clamp-2">
                            {ev.message}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* VIEW 2: EXPLORE ISSUES PAGE (Section 7)                         */}
          {/* =============================================================== */}
          {activeTab === 'issues' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#2B303A] pb-6">
                <div className="space-y-2 max-w-2xl">
                  <p className="pb-eyebrow">COMMUNITY WATCH</p>
                  <h1 className="pb-display-section text-3xl sm:text-5xl text-[#F5F5F5]">
                    See what's happening{' '}
                    <span className="text-[#FF8A32]">around you.</span>
                  </h1>
                  <p className="text-sm text-[#A1A1AA]">
                    Explore reported issues, discover local concerns, and follow the progress toward a better community.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSubmittedReport(null);
                    setActiveTab('report');
                  }}
                  className="px-5 py-2.5 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] text-[#111318] text-xs font-semibold transition shrink-0"
                >
                  Report an Issue ↗
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="relative lg:col-span-2">
                  <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search issues or locations..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-control bg-[#1C2028] border border-[#2B303A] text-xs text-[#F5F5F5] placeholder:text-[#A1A1AA] focus:border-[#FF8A32]"
                  />
                </div>

                <select
                  aria-label="Filter by category"
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(e.target.value as IssueCategory | 'all')
                  }
                  className="rounded-control bg-[#1C2028] border border-[#2B303A] px-3 py-2.5 text-xs text-[#F5F5F5]"
                >
                  <option value="all">All categories</option>
                  {(Object.keys(CATEGORY_LABELS) as IssueCategory[]).map(
                    (c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    )
                  )}
                </select>

                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as IssueStatus | 'all')
                  }
                  className="rounded-control bg-[#1C2028] border border-[#2B303A] px-3 py-2.5 text-xs text-[#F5F5F5]"
                >
                  <option value="all">All statuses</option>
                  {(Object.keys(STATUS_META) as IssueStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <select
                    aria-label="Filter by date"
                    value={dateFilter}
                    onChange={(e) =>
                      setDateFilter(e.target.value as DateRangeFilter)
                    }
                    className="flex-1 rounded-control bg-[#1C2028] border border-[#2B303A] px-3 py-2.5 text-xs text-[#F5F5F5]"
                  >
                    <option value="all">Any time</option>
                    <option value="7d">Past 7 days</option>
                    <option value="30d">Past 30 days</option>
                  </select>

                  <div className="inline-flex items-center gap-1 bg-[#1C2028] border border-[#2B303A] px-2.5 py-2 rounded-control text-xs">
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#A1A1AA]" />
                    <select
                      aria-label="Sort issues"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="bg-transparent text-[#F5F5F5] focus:outline-none"
                    >
                      <option value="newest" className="bg-[#1C2028]">
                        Newest
                      </option>
                      <option value="priority" className="bg-[#1C2028]">
                        Priority
                      </option>
                      <option value="updated" className="bg-[#1C2028]">
                        Updated
                      </option>
                      <option value="oldest" className="bg-[#1C2028]">
                        Oldest
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {filteredIssues.length === 0 ? (
                <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-12 text-center space-y-2">
                  <h2 className="font-display text-xl font-semibold text-[#F5F5F5]">
                    No reports found.
                  </h2>
                  <p className="text-sm text-[#A1A1AA]">
                    Try changing your filters or explore a different category.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-[#1C2028] border border-[#2B303A] rounded-card divide-y divide-[#2B303A]">
                    {paginatedIssues.map((issue) => (
                      <div
                        key={issue.id}
                        onClick={() => openIssueDetail(issue.id)}
                        className="p-5 hover:bg-[#222731] transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 min-w-0 max-w-2xl">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-mono text-xs text-[#A1A1AA] tabular-nums">
                              {issue.code}
                            </span>
                            <h3 className="font-display text-base font-semibold text-[#F5F5F5] truncate">
                              {issue.title}
                            </h3>
                          </div>
                          <p className="text-xs text-[#A1A1AA] line-clamp-1">
                            {issue.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#A1A1AA]">
                            <span className="text-[#F5F5F5]">
                              {issue.locationBuilding}
                              {issue.locationRoom ? ` • ${issue.locationRoom}` : ''}
                            </span>
                            <span>•</span>
                            <span>{CATEGORY_LABELS[issue.category]}</span>
                            <span>•</span>
                            <span className="tabular-nums">
                              {new Date(issue.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              URGENCY_META[issue.urgency].badgeClass
                            }`}
                          >
                            {URGENCY_META[issue.urgency].label}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded text-xs inline-flex items-center gap-1.5 ${
                              STATUS_META[issue.status].badgeClass
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                STATUS_META[issue.status].dotColor
                              }`}
                            />
                            {STATUS_META[issue.status].shortLabel}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2 text-xs text-[#A1A1AA]">
                      <span className="tabular-nums">
                        Showing {(currentPage - 1) * pageSize + 1}–
                        {Math.min(
                          currentPage * pageSize,
                          filteredIssues.length
                        )}{' '}
                        of {filteredIssues.length} reports
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={currentPage <= 1}
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          className="p-1.5 rounded-control bg-[#1C2028] border border-[#2B303A] disabled:opacity-40"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-2 tabular-nums">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={currentPage >= totalPages}
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          className="p-1.5 rounded-control bg-[#1C2028] border border-[#2B303A] disabled:opacity-40"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* VIEW 3: REPORT ISSUE PAGE (Section 5)                           */}
          {/* =============================================================== */}
          {activeTab === 'report' && (
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="space-y-2 border-b border-[#2B303A] pb-6">
                <p className="pb-eyebrow">LET'S FIX SOMETHING</p>
                <h1 className="pb-display-section text-4xl sm:text-5xl text-[#F5F5F5]">
                  What's the <span className="text-[#FF8A32]">issue?</span>
                </h1>
                <p className="text-sm text-[#A1A1AA]">
                  Tell us what's happening. The more we know, the easier it is to take action.
                </p>
              </div>

              {submittedReport ? (
                <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-8 space-y-6">
                  <span className="font-mono text-xs text-[#FF8A32] tabular-nums">
                    {submittedReport.code}
                  </span>
                  <h2 className="pb-display-section text-3xl text-[#F5F5F5]">
                    Report received.
                  </h2>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">
                    Thanks for speaking up. Your report has been submitted successfully.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        const id = submittedReport.id;
                        setSubmittedReport(null);
                        setActiveTab('my-reports');
                        openIssueDetail(id);
                      }}
                      className="px-5 py-2.5 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] text-[#111318] text-xs font-semibold transition"
                    >
                      Track My Report →
                    </button>

                    <button
                      type="button"
                      onClick={() => setSubmittedReport(null)}
                      className="text-xs font-medium text-[#A1A1AA] hover:text-[#F5F5F5] transition"
                    >
                      Submit another report
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {reportRecurringMatches.length > 0 && (
                    <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#FF8A32]">
                        <History className="w-4 h-4 shrink-0" />
                        Similar reports at {reportBuilding} (
                        {reportRecurringMatches.length}{' '}
                        {CATEGORY_LABELS[reportCategory]})
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {reportRecurringMatches.slice(0, 3).map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => openIssueDetail(m.id)}
                            className="text-xs bg-[#111318] hover:bg-[#222731] border border-[#2B303A] px-2.5 py-1 rounded-control text-[#F5F5F5]"
                          >
                            <span className="font-mono text-[#FF8A32]">
                              {m.code}
                            </span>{' '}
                            — {m.title.slice(0, 40)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <form
                    onSubmit={handleCreateIssue}
                    className="bg-[#1C2028] border border-[#2B303A] rounded-card p-6 sm:p-8 space-y-6"
                  >
                    {reportFieldError && (
                      <div className="bg-[#F87171]/10 border border-[#F87171]/40 rounded-control p-3 text-xs text-[#F87171] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{reportFieldError}</span>
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="report-title"
                        className="block text-sm font-medium text-[#F5F5F5] mb-2"
                      >
                        Give it a title
                      </label>
                      <input
                        id="report-title"
                        type="text"
                        required
                        maxLength={150}
                        value={reportTitle}
                        onChange={(e) => setReportTitle(e.target.value)}
                        placeholder="e.g., Broken streetlight on Main Walkway"
                        className="w-full rounded-control bg-[#111318] border border-[#2B303A] px-3.5 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#A1A1AA]/60 focus:border-[#FF8A32]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="report-category"
                          className="block text-sm font-medium text-[#F5F5F5] mb-2"
                        >
                          Choose a category
                        </label>
                        <select
                          id="report-category"
                          value={reportCategory}
                          onChange={(e) =>
                            setReportCategory(e.target.value as IssueCategory)
                          }
                          className="w-full rounded-control bg-[#111318] border border-[#2B303A] px-3.5 py-2.5 text-sm text-[#F5F5F5]"
                        >
                          {PRIMARY_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {CATEGORY_LABELS[cat]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#F5F5F5] mb-2">
                          Urgency
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {(
                            ['low', 'medium', 'high', 'critical'] as IssueUrgency[]
                          ).map((u) => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => setReportUrgency(u)}
                              className={`py-2 px-2 rounded-control text-xs font-medium capitalize border transition ${
                                reportUrgency === u
                                  ? 'bg-[#222731] border-[#FF8A32] text-[#FF8A32]'
                                  : 'bg-[#111318] border-[#2B303A] text-[#A1A1AA]'
                              }`}
                            >
                              {u}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          htmlFor="report-desc"
                          className="block text-sm font-medium text-[#F5F5F5]"
                        >
                          Tell us what happened
                        </label>
                        <button
                          type="button"
                          onClick={handleVoiceDictation}
                          className={`text-xs px-2.5 py-1 rounded-control border flex items-center gap-1.5 transition ${
                            dictating
                              ? 'border-[#FF8A32] text-[#FF8A32] animate-pulse'
                              : 'bg-[#111318] border-[#2B303A] text-[#A1A1AA] hover:text-[#F5F5F5]'
                          }`}
                        >
                          <Mic className="w-3.5 h-3.5" />
                          {dictating ? 'Listening...' : 'Voice input'}
                        </button>
                      </div>
                      <textarea
                        id="report-desc"
                        required
                        rows={4}
                        value={reportDesc}
                        onChange={(e) => setReportDesc(e.target.value)}
                        placeholder="Describe what needs attention and any helpful context..."
                        className="w-full rounded-control bg-[#111318] border border-[#2B303A] px-3.5 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#A1A1AA]/60 focus:border-[#FF8A32]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="report-building"
                        className="block text-sm font-medium text-[#F5F5F5] mb-2"
                      >
                        Where is it happening?
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                          id="report-building"
                          value={reportBuilding}
                          onChange={(e) => setReportBuilding(e.target.value)}
                          className="w-full rounded-control bg-[#111318] border border-[#2B303A] px-3.5 py-2.5 text-sm text-[#F5F5F5]"
                        >
                          {CAMPUS_BUILDINGS.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                        <input
                          id="report-room"
                          type="text"
                          value={reportRoom}
                          onChange={(e) => setReportRoom(e.target.value)}
                          placeholder="Specific street, floor, or landmark"
                          className="w-full rounded-control bg-[#111318] border border-[#2B303A] px-3.5 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#A1A1AA]/60"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#F5F5F5] mb-2">
                        Add a photo (optional)
                      </label>
                      <div className="bg-[#111318] border border-dashed border-[#2B303A] rounded-card p-6 text-center space-y-2">
                        {reportPreview ? (
                          <div className="space-y-3">
                            <img
                              src={reportPreview}
                              alt="Report upload preview"
                              className="max-h-52 mx-auto rounded-control border border-[#2B303A] object-contain"
                            />
                            <div className="flex items-center justify-center gap-4 text-xs">
                              <span className="text-[#A1A1AA] tabular-nums">
                                {reportFile?.name} (
                                {Math.round((reportFile?.size || 0) / 1024)} KB)
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setReportFile(null);
                                  setReportPreview(null);
                                }}
                                className="text-[#F87171] hover:underline font-medium"
                              >
                                Remove photo
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center justify-center py-3 space-y-1.5">
                            <Camera className="w-6 h-6 text-[#FF8A32]" />
                            <span className="text-sm font-medium text-[#F5F5F5]">
                              Got a photo? Drop it here.
                            </span>
                            <span className="text-xs text-[#A1A1AA]">
                              PNG, JPG or WEBP
                            </span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handleReportFileSelect}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-4">
                      <button
                        type="button"
                        onClick={() => setActiveTab('dashboard')}
                        className="px-4 py-2.5 text-xs font-medium text-[#A1A1AA] hover:text-[#F5F5F5] transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={reportSubmitting}
                        className="px-6 py-3 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] disabled:opacity-50 text-[#111318] text-sm font-semibold transition"
                      >
                        {reportSubmitting ? 'Submitting...' : 'Submit Report ↗'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* VIEW 4: MY REPORTS PAGE (Section 6)                             */}
          {/* =============================================================== */}
          {activeTab === 'my-reports' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#2B303A] pb-6">
                <div className="space-y-2 max-w-xl">
                  <p className="pb-eyebrow">YOUR CONTRIBUTION</p>
                  <h1 className="pb-display-section text-3xl sm:text-5xl text-[#F5F5F5]">
                    Every report <span className="text-[#FF8A32]">matters.</span>
                  </h1>
                  <p className="text-sm text-[#A1A1AA]">
                    Keep track of the issues you've reported and see what's happening next.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSubmittedReport(null);
                    setActiveTab('report');
                  }}
                  className="px-5 py-2.5 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] text-[#111318] text-xs font-semibold transition shrink-0"
                >
                  Report an Issue ↗
                </button>
              </div>

              {myReportedIssues.length === 0 ? (
                <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-12 text-center space-y-4">
                  <h2 className="pb-display-section text-2xl sm:text-3xl text-[#F5F5F5]">
                    Nothing reported. Yet.
                  </h2>
                  <p className="text-sm text-[#A1A1AA] max-w-md mx-auto">
                    Seen something that needs attention? Your first report can start the change.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmittedReport(null);
                        setActiveTab('report');
                      }}
                      className="px-5 py-3 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] text-[#111318] text-xs font-semibold transition"
                    >
                      Report Your First Issue ↗
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#1C2028] border border-[#2B303A] rounded-card divide-y divide-[#2B303A]">
                  {myReportedIssues.map((issue) => (
                    <div
                      key={issue.id}
                      onClick={() => openIssueDetail(issue.id)}
                      className="p-5 hover:bg-[#222731] cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono text-xs text-[#A1A1AA] tabular-nums">
                            {issue.code}
                          </span>
                          <h3 className="font-display text-base font-semibold text-[#F5F5F5] truncate">
                            {issue.title}
                          </h3>
                        </div>
                        <p className="text-xs text-[#A1A1AA]">
                          {issue.locationBuilding}
                          {issue.locationRoom ? ` • ${issue.locationRoom}` : ''}{' '}
                          • {CATEGORY_LABELS[issue.category]} •{' '}
                          <span className="tabular-nums">
                            {new Date(issue.createdAt).toLocaleDateString()}
                          </span>
                        </p>
                      </div>

                      <span
                        className={`text-xs px-2.5 py-1 rounded shrink-0 inline-flex items-center gap-1.5 ${
                          STATUS_META[issue.status].badgeClass
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            STATUS_META[issue.status].dotColor
                          }`}
                        />
                        {STATUS_META[issue.status].shortLabel}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* VIEW 5: ASSIGNMENTS                                             */}
          {/* =============================================================== */}
          {activeTab === 'assignments' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#2B303A] pb-6">
                <div className="space-y-2 max-w-xl">
                  <p className="pb-eyebrow">FIELD OPERATIONS</p>
                  <h1 className="pb-display-section text-3xl sm:text-5xl text-[#F5F5F5]">
                    Assigned <span className="text-[#FF8A32]">repairs.</span>
                  </h1>
                  <p className="text-sm text-[#A1A1AA]">
                    Update repair progress and upload completion evidence for review.
                  </p>
                </div>
              </div>

              {maintenanceQueue.length === 0 ? (
                <div className="bg-[#1C2028] border border-[#2B303A] rounded-card p-12 text-center space-y-2">
                  <Wrench className="w-6 h-6 text-[#A1A1AA] mx-auto" />
                  <p className="font-display text-lg font-semibold text-[#F5F5F5]">
                    No active maintenance assignments.
                  </p>
                  <p className="text-xs text-[#A1A1AA]">
                    Assigned tasks, disputed repairs, and evidence requests appear here.
                  </p>
                </div>
              ) : (
                <div className="bg-[#1C2028] border border-[#2B303A] rounded-card divide-y divide-[#2B303A]">
                  {maintenanceQueue.map((issue) => (
                    <div
                      key={issue.id}
                      onClick={() => openIssueDetail(issue.id)}
                      className="p-5 hover:bg-[#222731] cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-medium text-[#A1A1AA] tabular-nums">
                            {issue.code}
                          </span>
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded inline-flex items-center gap-1.5 ${
                              STATUS_META[issue.status].badgeClass
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                STATUS_META[issue.status].dotColor
                              }`}
                            />
                            {STATUS_META[issue.status].shortLabel}
                          </span>
                        </div>

                        <h3 className="font-display text-base font-semibold text-[#F5F5F5] truncate">
                          {issue.title}
                        </h3>
                        <p className="text-xs text-[#A1A1AA]">
                          {issue.locationBuilding}
                          {issue.locationRoom ? ` • ${issue.locationRoom}` : ''}{' '}
                          • {CATEGORY_LABELS[issue.category]}
                        </p>

                        {(issue.status === 'resolution_disputed' ||
                          issue.status === 'more_evidence_required') &&
                          issue.reviewNotes && (
                            <p className="text-xs text-[#F87171] flex items-center gap-1.5 pt-1">
                              <FileWarning className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">
                                Reviewer note: {issue.reviewNotes}
                              </span>
                            </p>
                          )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openIssueDetail(issue.id);
                        }}
                        className="px-4 py-2 rounded-control bg-[#FF8A32] hover:bg-[#FF9E54] text-[#111318] text-xs font-semibold shrink-0 transition"
                      >
                        {issue.status === 'assigned'
                          ? 'Start Repair Work →'
                          : 'Submit Evidence →'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* VIEW 6–9: SECONDARY VIEWS                                       */}
          {/* =============================================================== */}
          {activeTab === 'reviews' && (
            <EvidenceReviewsView
              issues={issues}
              profile={profile}
              onOpenIssue={openIssueDetail}
              onSwitchRole={handleRoleSwitch}
            />
          )}

          {activeTab === 'timeline' && (
            <ActivityTimelineView
              events={recentEvents}
              loading={loadingIssues}
              onOpenIssue={openIssueDetail}
              onRefresh={() => refreshAllData()}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView issues={issues} onOpenIssue={openIssueDetail} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              profile={profile}
              isCloudConnected={isCloudActive}
              onSaveProfile={handleSaveProfile}
              onSwitchRole={handleRoleSwitch}
              onSignOut={handleSignOut}
            />
          )}
        </main>
      </div>

      {/* =================================================================== */}
      {/* ISSUE DETAILS MODAL / DRAWER                                        */}
      {/* =================================================================== */}
      {selectedIssueId && (
        <IssueDetailDrawer
          detailLoading={detailLoading}
          detailIssue={detailIssue}
          detailEvidence={detailEvidence}
          detailTimeline={detailTimeline}
          detailRecurringCandidates={detailRecurringCandidates}
          profile={profile}
          allProfiles={allProfiles}
          actionBusy={actionBusy}
          selectedAssigneeId={selectedAssigneeId}
          setSelectedAssigneeId={setSelectedAssigneeId}
          workNotesInput={workNotesInput}
          setWorkNotesInput={setWorkNotesInput}
          workFile={workFile}
          workPreview={workPreview}
          onWorkFileSelect={handleWorkFileSelect}
          reviewDecision={reviewDecision}
          setReviewDecision={setReviewDecision}
          reviewReasonInput={reviewReasonInput}
          setReviewReasonInput={setReviewReasonInput}
          cancelReasonInput={cancelReasonInput}
          setCancelReasonInput={setCancelReasonInput}
          onClose={() => {
            setSelectedIssueId(null);
            setDetailIssue(null);
          }}
          onRoleSwitch={handleRoleSwitch}
          onTriageUnderReview={handleTriageUnderReview}
          onAssignIssue={handleAssignIssue}
          onCancelIssue={handleCancelIssue}
          onStartWork={handleStartWork}
          onClaimCompletion={handleClaimCompletion}
          onVerificationSubmit={handleVerificationSubmit}
          onToggleRecurringLink={handleToggleRecurringLink}
        />
      )}
    </div>
  );
}
