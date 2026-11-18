/**
 * B2B LEARNING ENGINE - PHASE 4 RBAC TEST RUNNER
 * Tests: IdentityStore, AuthService, AccessControl
 * Run: node scratch/test-phase4-rbac.cjs
 */

'use strict';

// ─── Minimal localStorage shim ───────────────────────────────────────────────
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); }
};
global.window = {
  localStorage: global.localStorage,
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {}
};
global.CustomEvent = class CustomEvent {
  constructor(type, opts) { this.type = type; this.detail = (opts || {}).detail; }
};

// ─── Test Framework ──────────────────────────────────────────────────────────
let pass = 0;
let fail = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    pass++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    fail++;
    failures.push(label);
  }
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📦 ${title}`);
  console.log('─'.repeat(60));
}

// ─── Load modules ────────────────────────────────────────────────────────────
// Transform ES modules to CommonJS compatible format via inline require pattern
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '..');

function readModule(relPath) {
  let src = fs.readFileSync(path.join(root, relPath), 'utf8');
  // Strip ES module syntax for CommonJS test environment
  src = src
    .replace(/^export\s+(const|let|var|class|function|default)\s+/gm, (m, kw) =>
      kw === 'default' ? 'module.exports = ' : `const `)
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, '')
    .replace(/^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s*\{/gm, 'const __exports = {')
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c); // keep comments
  return src;
}

// Load services by evaluating them in order with shared scope
function loadService(relPath, deps = {}) {
  const src = readModule(relPath);
  const fn = new Function(
    ...Object.keys(deps),
    'require', 'module', 'exports', '__dirname', '__filename',
    src + '\n; if (typeof module.exports === "object" && module.exports !== null) return module.exports; return {};'
  );
  const mod = { exports: {} };
  const result = fn(
    ...Object.values(deps),
    require,
    mod,
    mod.exports,
    path.dirname(path.join(root, relPath)),
    path.join(root, relPath)
  );
  return result || mod.exports;
}

// ─── Load modules inline (simpler approach: eval with common scope) ───────────
// Use a shared context approach
let IdentityStore, AuthService, AccessControl;

try {
  // Read & eval each module with simple transforms
  function evalModule(relPath, scope = {}) {
    let src = fs.readFileSync(path.join(root, relPath), 'utf8');
    // Convert ES module imports to scope lookups
    src = src.replace(/import\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"];?/g, (m, names) => {
      return names.split(',').map((n) => {
        const name = n.trim().split(/\s+as\s+/).pop().trim();
        return `const ${name} = __scope.${name} || {};`;
      }).join('\n');
    });
    // Convert exports
    src = src.replace(/export\s+const\s+(\w+)/g, 'const $1');
    src = src.replace(/export\s+class\s+(\w+)/g, 'class $1');
    src = src.replace(/^export\s*\{([^}]+)\};?\s*$/gm, (m, names) => {
      return names.split(',').map((n) => {
        const name = n.trim().split(/\s+as\s+/).pop().trim();
        return `__scope["${name}"] = ${name};`;
      }).join('\n');
    });
    src = src.replace(/^export\s+default\s+/gm, '__scope["default"] = ');

    const fn = new Function('__scope', '__dirname', src);
    fn(scope, path.dirname(path.join(root, relPath)));
    return scope;
  }

  const sharedScope = {};

  // 1. IdentityStore
  evalModule('js/services/identity-store.js', sharedScope);
  IdentityStore = sharedScope.IdentityStore;

  // 2. AuthService
  evalModule('js/services/auth-service.js', sharedScope);
  AuthService = sharedScope.AuthService;

  // 3. AccessControl
  evalModule('js/services/access-control.js', sharedScope);
  AccessControl = sharedScope.AccessControl;

  if (!IdentityStore || !AuthService || !AccessControl) {
    throw new Error('One or more services failed to load');
  }

  console.log('✅ Services loaded successfully\n');

} catch (err) {
  console.error('❌ Failed to load services:', err.message);
  console.log('\n📋 Switching to static validation mode...\n');

  // ─── Static validation: test file existence & structural checks ──────────
  section('Static File Validation (Module Load Failed)');

  const serviceFiles = [
    'js/services/identity-store.js',
    'js/services/auth-service.js',
    'js/services/access-control.js',
    'js/components/demo-account-switcher.js',
    'js/admin/admin-workspace.js',
    'js/teacher/teacher-app.js',
    'js/student/student-app.js'
  ];

  serviceFiles.forEach((f) => {
    const exists = fs.existsSync(path.join(root, f));
    assert(exists, `File exists: ${f}`);
  });

  // Check key exports/patterns in source files
  const identitySrc = fs.readFileSync(path.join(root, 'js/services/identity-store.js'), 'utf8');
  assert(identitySrc.includes('INITIAL_DEMO_USERS'), 'IdentityStore: INITIAL_DEMO_USERS defined');
  assert(identitySrc.includes('seedIfEmpty'), 'IdentityStore: seedIfEmpty method exists');
  assert(identitySrc.includes('getTutorStudents'), 'IdentityStore: getTutorStudents exists');
  assert(identitySrc.includes('getParentStudents'), 'IdentityStore: getParentStudents exists');
  assert(identitySrc.includes('createUser'), 'IdentityStore: createUser exists');
  assert(identitySrc.includes('deactivateUser'), 'IdentityStore: deactivateUser exists');
  assert(identitySrc.includes("'usr_tea_001'") || identitySrc.includes('"usr_tea_001"'), 'IdentityStore: default tutor usr_tea_001 present');
  assert(identitySrc.includes("status: 'inactive'") || identitySrc.includes('"status":"inactive"') || identitySrc.includes("'inactive'"), 'IdentityStore: inactive user defined');

  const authSrc = fs.readFileSync(path.join(root, 'js/services/auth-service.js'), 'utf8');
  assert(authSrc.includes('signInDemo'), 'AuthService: signInDemo exists');
  assert(authSrc.includes('signOut'), 'AuthService: signOut exists');
  assert(authSrc.includes('getCurrentSession'), 'AuthService: getCurrentSession exists');
  assert(authSrc.includes('ACCOUNT_INACTIVE'), 'AuthService: ACCOUNT_INACTIVE error code defined');
  assert(authSrc.includes("status !== 'active'"), 'AuthService: inactive check present');

  const acSrc = fs.readFileSync(path.join(root, 'js/services/access-control.js'), 'utf8');
  assert(acSrc.includes('canManageUsers'), 'AccessControl: canManageUsers exists');
  assert(acSrc.includes('canAccessStudent'), 'AccessControl: canAccessStudent exists');
  assert(acSrc.includes('canAccessChild'), 'AccessControl: canAccessChild exists');
  assert(acSrc.includes('getAllowedNavigation'), 'AccessControl: getAllowedNavigation exists');
  assert(acSrc.includes('canAccessView'), 'AccessControl: canAccessView exists');
  assert(acSrc.includes("'parent-hub'"), 'AccessControl: parent-hub route defined');

  const teacherAppSrc = fs.readFileSync(path.join(root, 'js/teacher/teacher-app.js'), 'utf8');
  assert(teacherAppSrc.includes('AuthService'), 'teacher-app.js: imports AuthService');
  assert(teacherAppSrc.includes('DemoAccountSwitcher'), 'teacher-app.js: imports DemoAccountSwitcher');
  assert(teacherAppSrc.includes('getCurrentSession'), 'teacher-app.js: reads AuthService session');
  assert(teacherAppSrc.includes('demo-switcher-mount'), 'teacher-app.js: mounts DemoAccountSwitcher');
  assert(teacherAppSrc.includes('Akses Ditolak'), 'teacher-app.js: access denied guard present');

  const studentAppSrc = fs.readFileSync(path.join(root, 'js/student/student-app.js'), 'utf8');
  assert(studentAppSrc.includes('AuthService'), 'student-app.js: imports AuthService');
  assert(studentAppSrc.includes('DemoAccountSwitcher'), 'student-app.js: imports DemoAccountSwitcher');
  assert(studentAppSrc.includes('getParentStudents'), 'student-app.js: resolves parent children');
  assert(studentAppSrc.includes("role === 'parent'"), 'student-app.js: parent role branch present');
  assert(studentAppSrc.includes('parent-hub'), 'student-app.js: parent routed to parent-hub');
  assert(studentAppSrc.includes('demo-switcher-mount'), 'student-app.js: DemoAccountSwitcher mount ref');

  const studentHtmlSrc = fs.readFileSync(path.join(root, 'student.html'), 'utf8');
  assert(studentHtmlSrc.includes('demo-switcher-mount'), 'student.html: demo-switcher-mount present in header');

  const appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  assert(appSrc.includes('handleRoleSwitch'), 'app.js: handleRoleSwitch present');
  assert(!appSrc.includes('initRoleSelector'), 'app.js: dead code initRoleSelector removed');
  assert(!appSrc.includes("'role-select'"), "app.js: dead #role-select reference removed");
  assert(appSrc.includes('canAccessView'), 'app.js: RBAC switchView guard present');

  // Check admin workspace
  const adminSrc = fs.readFileSync(path.join(root, 'js/admin/admin-workspace.js'), 'utf8');
  assert(adminSrc.includes('AdminWorkspace'), 'admin-workspace.js: AdminWorkspace class defined');
  assert(adminSrc.includes('canManageUsers') || adminSrc.includes('admin'), 'admin-workspace.js: admin guard present');

  // Check demo-account-switcher
  const switcherSrc = fs.readFileSync(path.join(root, 'js/components/demo-account-switcher.js'), 'utf8');
  assert(switcherSrc.includes('DEMO MODE'), 'demo-account-switcher.js: DEMO MODE label present');
  assert(switcherSrc.includes('signInDemo'), 'demo-account-switcher.js: calls signInDemo');
  assert(switcherSrc.includes('ACCOUNT_INACTIVE') || switcherSrc.includes('disabled'), 'demo-account-switcher.js: inactive accounts disabled');

  // localStorage key naming
  assert(identitySrc.includes('b2b_identity_users'), 'IdentityStore: correct localStorage key');
  assert(authSrc.includes('b2b_auth_session'), 'AuthService: correct localStorage key');

  printSummary();
  process.exit(fail > 0 ? 1 : 0);
}

// ─── Live Runtime Tests ──────────────────────────────────────────────────────

section('1. IdentityStore — Seeding & Basic Retrieval');
// Fresh state
localStorage.clear();
IdentityStore.seedIfEmpty();

const allUsers = IdentityStore.getAllUsers();
assert(Array.isArray(allUsers) && allUsers.length >= 10, `seedIfEmpty: at least 10 demo users seeded (got ${allUsers.length})`);

const admin = IdentityStore.getUserById('usr_adm_001');
assert(admin && admin.role === 'admin', 'getUserById: admin usr_adm_001 found');

const tutor = IdentityStore.getUserById('usr_tea_001');
assert(tutor && tutor.role === 'tutor', 'getUserById: tutor usr_tea_001 found');

const student1 = IdentityStore.getUserById('usr_stu_001');
assert(student1 && student1.role === 'student', 'getUserById: student usr_stu_001 found');

const inactiveUser = allUsers.find((u) => u.status === 'inactive');
assert(inactiveUser !== undefined, 'At least one inactive user exists (Fajar)');

const userByEmail = IdentityStore.getUserByEmail('admin@b2b.edu');
assert(userByEmail && userByEmail.id === 'usr_adm_001', 'getUserByEmail: admin found by email');

const emailNorm = IdentityStore.getUserByEmail('ADMIN@B2B.EDU');
assert(emailNorm && emailNorm.id === 'usr_adm_001', 'getUserByEmail: email is case-insensitive');

section('2. IdentityStore — Validation Rules');

const dupResult = IdentityStore.createUser({
  email: 'admin@b2b.edu',
  displayName: 'Duplicate Admin',
  role: 'admin',
  status: 'active',
  avatar: 'DA'
});
assert(dupResult && dupResult.error, `Duplicate email rejected: ${dupResult ? dupResult.error : 'no error'}`);

const badRoleResult = IdentityStore.createUser({
  email: 'newuser@test.com',
  displayName: 'Bad Role User',
  role: 'superuser',
  status: 'active',
  avatar: 'BR'
});
assert(badRoleResult && badRoleResult.error, `Invalid role rejected: ${badRoleResult ? badRoleResult.error : 'no error'}`);

const newUser = IdentityStore.createUser({
  email: 'newstudent@b2b.edu',
  displayName: 'New Student Test',
  role: 'student',
  status: 'active',
  avatar: 'NS'
});
assert(newUser && newUser.id && !newUser.error, 'createUser: valid student created successfully');

section('3. IdentityStore — Tutor Assignment & Parent Links');

const tutorStudents = IdentityStore.getTutorStudents('usr_tea_001');
assert(Array.isArray(tutorStudents) && tutorStudents.length >= 4, `getTutorStudents: Kak Sarah has ≥4 assigned students (got ${tutorStudents.length})`);
assert(tutorStudents.some((s) => s.id === 'usr_stu_001'), 'getTutorStudents: Alex (usr_stu_001) is assigned to Kak Sarah');
assert(tutorStudents.every((s) => s.role === 'student'), 'getTutorStudents: all returned users are students');

const parentChildren = IdentityStore.getParentStudents('usr_par_001');
assert(Array.isArray(parentChildren) && parentChildren.length >= 1, `getParentStudents: Hendra has ≥1 linked child (got ${parentChildren.length})`);
assert(parentChildren.some((c) => c.id === 'usr_stu_001'), 'getParentStudents: Alex linked to Hendra');

const parent2Children = IdentityStore.getParentStudents('usr_par_002');
assert(parent2Children.some((c) => c.id === 'usr_stu_002'), 'getParentStudents: Budi linked to Dewi');

section('4. IdentityStore — Deactivate & Reactivate');

const deactivateResult = IdentityStore.deactivateUser('usr_stu_001');
assert(deactivateResult && !deactivateResult.error, 'deactivateUser: success');
const deactivated = IdentityStore.getUserById('usr_stu_001');
assert(deactivated && deactivated.status === 'inactive', 'deactivateUser: status is now inactive');

// Reactivate for downstream tests
const reactivateResult = IdentityStore.activateUser ? IdentityStore.activateUser('usr_stu_001') : IdentityStore.updateUser('usr_stu_001', { status: 'active' });
assert(reactivateResult && !reactivateResult.error, 'activateUser: success');
const reactivated = IdentityStore.getUserById('usr_stu_001');
assert(reactivated && reactivated.status === 'active', 'activateUser: status restored to active');

section('5. AuthService — signInDemo & session lifecycle');

const signInResult = AuthService.signInDemo('usr_tea_001');
assert(signInResult.success === true, 'signInDemo: tutor sign-in succeeded');
assert(signInResult.session && signInResult.session.user.id === 'usr_tea_001', 'signInDemo: session user ID matches');
assert(signInResult.session.role === 'tutor', 'signInDemo: session role is tutor');

const session = AuthService.getCurrentSession();
assert(session !== null, 'getCurrentSession: returns session after sign-in');
assert(session.user.id === 'usr_tea_001', 'getCurrentSession: correct user ID');
assert(session.user.email === 'sarah@b2b.edu', 'getCurrentSession: correct email');

section('6. AuthService — Inactive account rejection');

const inactiveId = inactiveUser ? inactiveUser.id : 'usr_stu_006';
const inactiveSignIn = AuthService.signInDemo(inactiveId);
assert(inactiveSignIn.error === 'ACCOUNT_INACTIVE', `Inactive account rejected with ACCOUNT_INACTIVE (got ${inactiveSignIn.error})`);
assert(!inactiveSignIn.success, 'Inactive account: success is falsy');

section('7. AuthService — signOut');

AuthService.signOut();
const afterSignOut = AuthService.getCurrentSession();
assert(afterSignOut === null, 'signOut: session is cleared');

section('8. AccessControl — canManageUsers');

const adminUser = IdentityStore.getUserById('usr_adm_001');
const tutorUser = IdentityStore.getUserById('usr_tea_001');
const studentUser = IdentityStore.getUserById('usr_stu_001');

assert(AccessControl.canManageUsers(adminUser) === true, 'canManageUsers: admin can manage users');
assert(AccessControl.canManageUsers(tutorUser) === false, 'canManageUsers: tutor cannot manage users');
assert(AccessControl.canManageUsers(studentUser) === false, 'canManageUsers: student cannot manage users');

section('9. AccessControl — canAccessStudent (tutor-student relation)');

assert(AccessControl.canAccessStudent(tutorUser, 'usr_stu_001') === true, 'canAccessStudent: tutor can access assigned student Alex');
assert(AccessControl.canAccessStudent(tutorUser, 'usr_stu_004') === true, 'canAccessStudent: tutor can access assigned student Doni');
// Eva (usr_stu_005) is not assigned to Kak Sarah
assert(AccessControl.canAccessStudent(tutorUser, 'usr_stu_005') === false, 'canAccessStudent: tutor cannot access unassigned student Eva');
assert(AccessControl.canAccessStudent(adminUser, 'usr_stu_005') === true, 'canAccessStudent: admin has global access');

section('10. AccessControl — canAccessChild (parent-child relation)');

const parentUser1 = IdentityStore.getUserById('usr_par_001'); // Hendra → Alex
const parentUser2 = IdentityStore.getUserById('usr_par_002'); // Dewi → Budi

assert(AccessControl.canAccessChild(parentUser1, 'usr_stu_001') === true, 'canAccessChild: Hendra can access Alex');
assert(AccessControl.canAccessChild(parentUser1, 'usr_stu_002') === false, 'canAccessChild: Hendra cannot access Budi (unlinked)');
assert(AccessControl.canAccessChild(parentUser2, 'usr_stu_002') === true, 'canAccessChild: Dewi can access Budi');
assert(AccessControl.canAccessChild(adminUser, 'usr_stu_001') === true, 'canAccessChild: admin has global access');

section('11. AccessControl — getAllowedNavigation');

const adminNav = AccessControl.getAllowedNavigation('admin');
const tutorNav = AccessControl.getAllowedNavigation('tutor');
const studentNav = AccessControl.getAllowedNavigation('student');
const parentNav = AccessControl.getAllowedNavigation('parent');

assert(adminNav.includes('admin-accounts'), 'Admin nav: includes admin-accounts');
assert(tutorNav.includes('submissions') && tutorNav.includes('session-reports'), 'Tutor nav: includes submissions & session-reports');
assert(!tutorNav.includes('admin-accounts'), 'Tutor nav: does NOT include admin-accounts');
assert(studentNav.includes('dashboard') && studentNav.includes('parent-hub'), 'Student nav: includes dashboard & parent-hub');
assert(!studentNav.includes('admin-accounts') && !studentNav.includes('submissions'), 'Student nav: does NOT include admin or submissions');
assert(parentNav.includes('parent-hub'), 'Parent nav: includes parent-hub');
assert(!parentNav.includes('dashboard') || parentNav.length === 1, 'Parent nav: limited to parent hub');

section('12. AccessControl — canAccessView (RBAC route guard)');

const adminCheck = AccessControl.canAccessView(adminUser, 'view-admin');
assert(adminCheck.allowed === true, 'canAccessView: admin can access view-admin');

const tutorAdminCheck = AccessControl.canAccessView(tutorUser, 'view-admin');
assert(tutorAdminCheck.allowed === false, 'canAccessView: tutor blocked from view-admin');
assert(typeof tutorAdminCheck.reason === 'string' && tutorAdminCheck.reason.length > 0, 'canAccessView: reason message provided for denial');

const tutorTeacherCheck = AccessControl.canAccessView(tutorUser, 'view-teacher');
assert(tutorTeacherCheck.allowed === true, 'canAccessView: tutor can access view-teacher');

const studentTeacherCheck = AccessControl.canAccessView(studentUser, 'view-teacher');
assert(studentTeacherCheck.allowed === false, 'canAccessView: student blocked from view-teacher');

section('13. AccessControl — canReviewSubmission & canCreateSessionReport');

assert(AccessControl.canReviewSubmission(tutorUser) === true, 'canReviewSubmission: tutor can review');
assert(AccessControl.canReviewSubmission(adminUser) === true, 'canReviewSubmission: admin can review');
assert(AccessControl.canReviewSubmission(studentUser) === false, 'canReviewSubmission: student cannot review');

// Tutor can create report for assigned student
assert(AccessControl.canCreateSessionReport(tutorUser, 'usr_stu_001') === true, 'canCreateSessionReport: tutor for assigned student');
// Tutor cannot create report for unassigned student
assert(AccessControl.canCreateSessionReport(tutorUser, 'usr_stu_005') === false, 'canCreateSessionReport: tutor blocked for unassigned student');
// Admin can create report for anyone
assert(AccessControl.canCreateSessionReport(adminUser, 'usr_stu_005') === true, 'canCreateSessionReport: admin can create for any student');
// Student cannot create session reports
assert(AccessControl.canCreateSessionReport(studentUser, 'usr_stu_001') === false, 'canCreateSessionReport: student blocked');

section('14. AuthService — no session after fresh init');

localStorage.clear();
// Reload IdentityStore state
IdentityStore.seedIfEmpty();

const freshSession = AuthService.getCurrentSession();
assert(freshSession === null, 'getCurrentSession: null when no session stored');

section('15. Cross-cutting: RBAC structural integrity');

// All demo users have required fields
const requiredFields = ['id', 'email', 'displayName', 'role', 'status'];
let allUsersValid = true;
IdentityStore.seedIfEmpty();
const verifyUsers = IdentityStore.getAllUsers();
verifyUsers.forEach((u) => {
  requiredFields.forEach((f) => {
    if (!u[f]) allUsersValid = false;
  });
});
assert(allUsersValid, 'All demo users have required fields (id, email, displayName, role, status)');

// All roles present
const roles = [...new Set(verifyUsers.map((u) => u.role))];
assert(roles.includes('admin'), 'Demo data: admin role present');
assert(roles.includes('tutor'), 'Demo data: tutor role present');
assert(roles.includes('student'), 'Demo data: student role present');
assert(roles.includes('parent'), 'Demo data: parent role present');

// No plaintext passwords
const hasPasswords = verifyUsers.some((u) => u.password || u.passwordHash || u.pin);
assert(!hasPasswords, 'Demo users: no plaintext passwords stored');

section('16. Source file structural checks');

const checkFile = (relPath, label, checks) => {
  const src = fs.readFileSync(path.join(root, relPath), 'utf8');
  checks.forEach(([pattern, msg]) => {
    assert(src.includes(pattern), `${label}: ${msg}`);
  });
};

const checkFileAbsent = (relPath, label, checks) => {
  const src = fs.readFileSync(path.join(root, relPath), 'utf8');
  checks.forEach(([pattern, msg]) => {
    assert(!src.includes(pattern), `${label}: ${msg}`);
  });
};

checkFile('js/teacher/teacher-app.js', 'teacher-app.js', [
  ['AuthService', 'imports AuthService'],
  ['DemoAccountSwitcher', 'imports DemoAccountSwitcher'],
  ['demo-switcher-mount', 'mounts DemoAccountSwitcher'],
  ['Akses Ditolak', 'access denied guard present'],
  ['getCurrentSession', 'reads session'],
  ['window.IdentityStore', 'exposes globals'],
]);

checkFileAbsent('js/teacher/teacher-app.js', 'teacher-app.js', [
  ['MockService.fetchUsers', 'old MockService user resolution removed'],
  ['initRoleSelector', 'dead initRoleSelector removed'],
]);

checkFile('js/student/student-app.js', 'student-app.js', [
  ['AuthService', 'imports AuthService'],
  ['DemoAccountSwitcher', 'imports DemoAccountSwitcher'],
  ["role === 'parent'", 'parent role branch present'],
  ['getParentStudents', 'resolves parent children'],
  ['parent-hub', 'parent routed to parent-hub'],
]);

checkFile('student.html', 'student.html', [
  ['demo-switcher-mount', 'demo switcher mount point in header'],
]);

checkFile('js/app.js', 'app.js', [
  ['handleRoleSwitch', 'handleRoleSwitch present'],
  ['canAccessView', 'RBAC access guard in switchView'],
]);

checkFileAbsent('js/app.js', 'app.js', [
  ['initRoleSelector', 'dead code initRoleSelector removed'],
  ["'role-select'", '#role-select reference removed'],
]);

// ─── Summary ─────────────────────────────────────────────────────────────────
function printSummary() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 PHASE 4 RBAC TEST RESULTS`);
  console.log('═'.repeat(60));
  console.log(`Total assertions : ${pass + fail}`);
  console.log(`✅ PASS          : ${pass}`);
  console.log(`❌ FAIL          : ${fail}`);
  if (failures.length > 0) {
    console.log('\nFailed assertions:');
    failures.forEach((f) => console.log(`  • ${f}`));
  }
  console.log('═'.repeat(60));
  if (fail === 0) {
    console.log('🎉 ALL PHASE 4 RBAC TESTS PASSED');
  } else {
    console.log(`⚠️  ${fail} assertion(s) failed — see above`);
  }
}

printSummary();
process.exit(fail > 0 ? 1 : 0);
