declare const process: { exit: (code?: number) => never; env: Record<string, string | undefined> };

// Set test environment secrets before importing proofBridgeService
process.env.AUTHORITY_PASSWORD = process.env.AUTHORITY_PASSWORD || 'Biswajit@2026';
process.env.AUTHORITY_BACKUP_PIN = process.env.AUTHORITY_BACKUP_PIN || '792026';

const {
  authenticateLocalUser,
  registerReporterLocalUser,
  provisionOfficialAccount,
  resetUserPasswordByAuthority,
  deleteUserAccountByAuthority,
  sendAuthorityOtp,
  verifyAuthorityOtp,
  HIGHER_AUTHORITY_EMAIL,
  HIGHER_AUTHORITY_DEFAULT_PASSWORD,
  HIGHER_AUTHORITY_BACKUP_PIN,
  isHigherAuthority,
} = await import('../services/proofBridgeService.ts');

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// Mock localStorage for node test runner
const mockStore: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => mockStore[key] || null,
  setItem: (key: string, value: string) => {
    mockStore[key] = String(value);
  },
  removeItem: (key: string) => {
    delete mockStore[key];
  },
  clear: () => {
    for (const k in mockStore) delete mockStore[k];
  },
  length: 0,
  key: () => null,
};

async function runTests() {
  console.log('Running ProofBridge Role Separation, Credential & OTP Tests...');

  // TEST 1: Default Higher Authority Credentials & Role
  const authorityUser = authenticateLocalUser(
    HIGHER_AUTHORITY_EMAIL,
    HIGHER_AUTHORITY_DEFAULT_PASSWORD
  );
  assert(authorityUser.role === 'admin', 'Higher Authority must hold admin role');
  assert(isHigherAuthority(authorityUser) === true, 'isHigherAuthority must return true for master email');

  // TEST 2: Higher Authority 2-Step OTP Verification
  const otpRes = await sendAuthorityOtp(HIGHER_AUTHORITY_EMAIL);
  assert(otpRes.success === true, 'OTP generation must succeed');

  // 2A: Verify with stored payload code
  const storedOtpRaw = JSON.parse(mockStore['proofbridge_authority_otp_v1']);
  const otpVerified = await verifyAuthorityOtp(HIGHER_AUTHORITY_EMAIL, storedOtpRaw.code);
  assert(otpVerified === true, 'Valid 6-digit OTP must pass verification');

  // 2B: Verify with Emergency Master Backup PIN
  await sendAuthorityOtp(HIGHER_AUTHORITY_EMAIL);
  const pinVerified = await verifyAuthorityOtp(HIGHER_AUTHORITY_EMAIL, HIGHER_AUTHORITY_BACKUP_PIN);
  assert(pinVerified === true, 'Master Backup PIN must pass verification');

  // 2C: Invalid OTP rejection
  await sendAuthorityOtp(HIGHER_AUTHORITY_EMAIL);
  let caughtInvalidOtp = false;
  try {
    await verifyAuthorityOtp(HIGHER_AUTHORITY_EMAIL, '000000');
  } catch {
    caughtInvalidOtp = true;
  }
  assert(caughtInvalidOtp, 'Incorrect OTP must be rejected');

  // TEST 3: Public Reporter Registration (Strictly creates Reporter role)
  const testReporterEmail = `citizen.${Date.now()}@campus.edu`;
  const reporter = registerReporterLocalUser({
    fullName: 'Test Citizen',
    email: testReporterEmail,
    password: 'Password@123',
  });
  assert(reporter.role === 'reporter', 'Public registration must ONLY create Reporter role');

  // Test Reporter Login with valid password
  const reporterLogin = authenticateLocalUser(testReporterEmail, 'Password@123');
  assert(reporterLogin.email === testReporterEmail, 'Reporter login must succeed with correct password');

  // Test Reporter Login with wrong password
  let caughtWrongPassword = false;
  try {
    authenticateLocalUser(testReporterEmail, 'WrongPass123');
  } catch {
    caughtWrongPassword = true;
  }
  assert(caughtWrongPassword, 'Incorrect password must be rejected');

  // TEST 4: Official Staff & Admin Accounts
  const adminUser = authenticateLocalUser('priya.warden@campus.edu', 'Admin@2026');
  assert(adminUser.role === 'admin', 'Official admin must authenticate with correct role');

  const staffUser = authenticateLocalUser('ramesh.maint@campus.edu', 'Staff@2026');
  assert(staffUser.role === 'maintenance', 'Official staff must authenticate with correct role');

  // TEST 5: Higher Authority Provisions New Staff & Admin Account with ID & Password
  const newStaffEmail = `tech.suresh.${Date.now()}@campus.edu`;
  const provisionedProfiles = await provisionOfficialAccount({
    actor: authorityUser,
    fullName: 'Suresh Kumar',
    email: newStaffEmail,
    password: 'CustomStaff@2026',
    role: 'maintenance',
    phoneNumber: '+91 9876543210',
  });

  const provisionedStaff = provisionedProfiles.find((p) => p.email === newStaffEmail);
  assert(Boolean(provisionedStaff), 'Newly provisioned staff must exist in directory');
  assert(provisionedStaff!.role === 'maintenance', 'Provisioned role must be maintenance');

  // Verify newly provisioned staff can immediately log in with assigned password
  const newStaffLogin = authenticateLocalUser(newStaffEmail, 'CustomStaff@2026');
  assert(newStaffLogin.fullName === 'Suresh Kumar', 'Staff can log in with assigned credentials');

  // TEST 6: Higher Authority Password Reset
  await resetUserPasswordByAuthority({
    actor: authorityUser,
    targetUserId: provisionedStaff!.id,
    newPassword: 'UpdatedStaffPass@99',
  });

  const staffLoginAfterReset = authenticateLocalUser(newStaffEmail, 'UpdatedStaffPass@99');
  assert(staffLoginAfterReset.email === newStaffEmail, 'Staff can log in with reset password');

  // TEST 7: Higher Authority Revokes/Deletes Account
  const remainingAfterDelete = await deleteUserAccountByAuthority({
    actor: authorityUser,
    targetUserId: provisionedStaff!.id,
  });
  assert(
    !remainingAfterDelete.some((p) => p.email === newStaffEmail),
    'Deleted staff account must be removed from directory'
  );

  console.log('All ProofBridge authentication, role separation & OTP tests passed successfully!');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
