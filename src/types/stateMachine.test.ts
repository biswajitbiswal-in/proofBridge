import { canTransitionStatus } from './domain.ts';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// 1. Maintenance worker can claim repair (in_progress -> awaiting_verification)
assert(
  canTransitionStatus('in_progress', 'awaiting_verification', 'maintenance').allowed === true,
  'Maintenance should be allowed to move in_progress -> awaiting_verification'
);

// 2. Maintenance worker can NEVER directly verify resolution
assert(
  canTransitionStatus('in_progress', 'verified_resolved', 'maintenance').allowed === false,
  'Maintenance must not bypass verification from in_progress'
);
assert(
  canTransitionStatus('awaiting_verification', 'verified_resolved', 'maintenance').allowed === false,
  'Maintenance must not verify their own claimed repair'
);

// 3. Authorized admin/reviewer can verify, dispute, or request more evidence from awaiting_verification
assert(
  canTransitionStatus('awaiting_verification', 'verified_resolved', 'admin').allowed === true,
  'Admin should be allowed to verify_resolved'
);
assert(
  canTransitionStatus('awaiting_verification', 'resolution_disputed', 'admin').allowed === true,
  'Admin should be allowed to dispute resolution'
);
assert(
  canTransitionStatus('awaiting_verification', 'more_evidence_required', 'admin').allowed === true,
  'Admin should be allowed to request more evidence'
);

// 4. Disputed issue returns to actionable state (in_progress, awaiting_verification, or assigned)
assert(
  canTransitionStatus('resolution_disputed', 'in_progress', 'maintenance').allowed === true,
  'Maintenance should be able to resume work on disputed resolution'
);
assert(
  canTransitionStatus('resolution_disputed', 'awaiting_verification', 'maintenance').allowed === true,
  'Maintenance should be able to submit rework evidence from disputed resolution'
);

// 5. Reporter role restrictions: Reporter cannot assign, start work, or verify
assert(
  canTransitionStatus('submitted', 'assigned', 'reporter').allowed === false,
  'Reporter must not be allowed to assign issues'
);
assert(
  canTransitionStatus('assigned', 'in_progress', 'reporter').allowed === false,
  'Reporter must not be allowed to start maintenance work'
);
assert(
  canTransitionStatus('awaiting_verification', 'verified_resolved', 'reporter').allowed === false,
  'Reporter must not be allowed to verify resolutions'
);

// 6. Admin role capabilities: Triage & Assign
assert(
  canTransitionStatus('submitted', 'under_review', 'admin').allowed === true,
  'Admin should be allowed to mark submitted issue Under Review'
);
assert(
  canTransitionStatus('submitted', 'assigned', 'admin').allowed === true,
  'Admin should be allowed to assign submitted issue to Maintenance Staff'
);

console.log('All ProofBridge state machine checks passed.');
