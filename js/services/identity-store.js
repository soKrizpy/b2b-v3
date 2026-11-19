/**
 * B2B LEARNING ENGINE - IDENTITY & USER STORE (PHASE 4)
 * Local Identity Store with Role-Based Access Control (RBAC).
 * Manages users, tutor-student assignments, and parent-student links.
 *
 * Adheres strictly to Section 5, 10, 14, 15 of PROJECT_RULES.md:
 * - 100% Client-side simulation for local demo mode.
 * - Does NOT store plaintext passwords or fake production auth.
 * - Enforces strict role & relation validations.
 */

export const IDENTITY_USERS_KEY = 'b2b_identity_users';
export const TUTOR_ASSIGNMENTS_KEY = 'b2b_tutor_student_assignments';
export const PARENT_LINKS_KEY = 'b2b_parent_student_links';
export const IDENTITY_CHANGE_EVENT = 'b2b_identity_change';

export const VALID_ROLES = ['admin', 'tutor', 'student', 'parent'];
export const VALID_STATUSES = ['active', 'inactive'];

// Default Seed Accounts for Local Demo Simulation
export const INITIAL_DEMO_USERS = [
  {
    id: 'usr_adm_001',
    email: 'admin@b2b.edu',
    displayName: 'Admin B2B',
    role: 'admin',
    status: 'active',
    avatar: 'AD',
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z'
  },
  {
    id: 'usr_tea_001',
    email: 'sarah@b2b.edu',
    displayName: 'Kak Sarah',
    role: 'tutor',
    status: 'active',
    avatar: 'KS',
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z'
  },
  {
    id: 'usr_stu_001',
    email: 'alex.pratama@example.edu',
    displayName: 'Alex Pratama',
    role: 'student',
    status: 'active',
    avatar: 'AP',
    gradeLevel: 'Grade 5',
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z'
  },
  {
    id: 'usr_stu_002',
    email: 'budi.santoso@example.edu',
    displayName: 'Budi Santoso',
    role: 'student',
    status: 'active',
    avatar: 'BS',
    gradeLevel: 'Grade 5',
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z'
  },
  {
    id: 'usr_stu_003',
    email: 'citra.lestari@example.edu',
    displayName: 'Citra Lestari',
    role: 'student',
    status: 'active',
    avatar: 'CL',
    gradeLevel: 'Grade 5',
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z'
  },
  {
    id: 'usr_stu_004',
    email: 'doni.wijaya@example.edu',
    displayName: 'Doni Wijaya',
    role: 'student',
    status: 'active',
    avatar: 'DW',
    gradeLevel: 'Grade 5',
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z'
  },
  {
    id: 'usr_stu_005',
    email: 'eva.rahma@example.edu',
    displayName: 'Eva Rahma',
    role: 'student',
    status: 'active',
    avatar: 'ER',
    gradeLevel: 'Grade 5',
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z'
  },
  {
    id: 'usr_stu_006',
    email: 'fajar.nugraha@example.edu',
    displayName: 'Fajar Nugraha',
    role: 'student',
    status: 'inactive',
    avatar: 'FN',
    gradeLevel: 'Grade 5',
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z'
  },
  {
    id: 'usr_par_001',
    email: 'hendra.pratama@example.com',
    displayName: 'Bpk. Hendra Pratama (Ayah Alex)',
    role: 'parent',
    status: 'active',
    avatar: 'HP',
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z'
  },
  {
    id: 'usr_par_002',
    email: 'dewi.santoso@example.com',
    displayName: 'Ibu Dewi Santoso (Ibu Budi)',
    role: 'parent',
    status: 'active',
    avatar: 'DS',
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z'
  }
];

export const INITIAL_TUTOR_ASSIGNMENTS = [
  { id: 'tsa_001', tutorId: 'usr_tea_001', studentId: 'usr_stu_001', status: 'active', createdAt: '2026-11-01T08:00:00.000Z' },
  { id: 'tsa_002', tutorId: 'usr_tea_001', studentId: 'usr_stu_002', status: 'active', createdAt: '2026-11-01T08:00:00.000Z' },
  { id: 'tsa_003', tutorId: 'usr_tea_001', studentId: 'usr_stu_003', status: 'active', createdAt: '2026-11-01T08:00:00.000Z' },
  { id: 'tsa_004', tutorId: 'usr_tea_001', studentId: 'usr_stu_004', status: 'active', createdAt: '2026-11-01T08:00:00.000Z' }
  // usr_stu_005 (Eva) & usr_stu_006 (Fajar) are intentionally unassigned to test tutor isolation!
];

export const INITIAL_PARENT_LINKS = [
  { id: 'psl_001', parentId: 'usr_par_001', studentId: 'usr_stu_001', relationship: 'Ayah', status: 'active', createdAt: '2026-11-01T08:00:00.000Z' },
  { id: 'psl_002', parentId: 'usr_par_002', studentId: 'usr_stu_002', relationship: 'Ibu', status: 'active', createdAt: '2026-11-01T08:00:00.000Z' }
];

export const IdentityStore = {
  isAvailable() {
    try {
      return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    } catch {
      return false;
    }
  },

  _getStorage() {
    if (this.isAvailable()) return window.localStorage;
    if (typeof global !== 'undefined' && global.localStorage) return global.localStorage;
    return null;
  },

  _notifyChange(action, meta = null) {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      const evt = new CustomEvent(IDENTITY_CHANGE_EVENT, {
        detail: { action, meta, timestamp: new Date().toISOString() }
      });
      window.dispatchEvent(evt);
    }
  },

  /* --------------------------------------------------------------------------
     SEEDING & RAW ACCESS
     -------------------------------------------------------------------------- */
  seedIfEmpty() {
    const storage = this._getStorage();
    if (!storage) return;

    if (!storage.getItem(IDENTITY_USERS_KEY)) {
      storage.setItem(IDENTITY_USERS_KEY, JSON.stringify(INITIAL_DEMO_USERS));
    }
    if (!storage.getItem(TUTOR_ASSIGNMENTS_KEY)) {
      storage.setItem(TUTOR_ASSIGNMENTS_KEY, JSON.stringify(INITIAL_TUTOR_ASSIGNMENTS));
    }
    if (!storage.getItem(PARENT_LINKS_KEY)) {
      storage.setItem(PARENT_LINKS_KEY, JSON.stringify(INITIAL_PARENT_LINKS));
    }
  },

  _getUsersRaw() {
    this.seedIfEmpty();
    const storage = this._getStorage();
    if (!storage) return [];
    try {
      const raw = storage.getItem(IDENTITY_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('IdentityStore: Gagal parse users JSON:', e);
      return [];
    }
  },

  _setUsersRaw(users) {
    const storage = this._getStorage();
    if (!storage) return false;
    try {
      storage.setItem(IDENTITY_USERS_KEY, JSON.stringify(users));
      this._notifyChange('users_updated');
      return true;
    } catch (e) {
      console.error('IdentityStore: Gagal simpan users:', e);
      return false;
    }
  },

  _getAssignmentsRaw() {
    this.seedIfEmpty();
    const storage = this._getStorage();
    if (!storage) return [];
    try {
      const raw = storage.getItem(TUTOR_ASSIGNMENTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('IdentityStore: Gagal parse tutor assignments:', e);
      return [];
    }
  },

  _setAssignmentsRaw(assignments) {
    const storage = this._getStorage();
    if (!storage) return false;
    try {
      storage.setItem(TUTOR_ASSIGNMENTS_KEY, JSON.stringify(assignments));
      this._notifyChange('assignments_updated');
      return true;
    } catch (e) {
      console.error('IdentityStore: Gagal simpan tutor assignments:', e);
      return false;
    }
  },

  _getParentLinksRaw() {
    this.seedIfEmpty();
    const storage = this._getStorage();
    if (!storage) return [];
    try {
      const raw = storage.getItem(PARENT_LINKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('IdentityStore: Gagal parse parent links:', e);
      return [];
    }
  },

  _setParentLinksRaw(links) {
    const storage = this._getStorage();
    if (!storage) return false;
    try {
      storage.setItem(PARENT_LINKS_KEY, JSON.stringify(links));
      this._notifyChange('parent_links_updated');
      return true;
    } catch (e) {
      console.error('IdentityStore: Gagal simpan parent links:', e);
      return false;
    }
  },

  /* --------------------------------------------------------------------------
     USER ACCOUNT CRUD
     -------------------------------------------------------------------------- */
  getAllUsers(filter = {}) {
    let users = this._getUsersRaw();
    if (filter.role) {
      const normRole = filter.role === 'teacher' ? 'tutor' : filter.role;
      users = users.filter((u) => u.role === normRole || (normRole === 'tutor' && u.role === 'teacher'));
    }
    if (filter.status) {
      users = users.filter((u) => u.status === filter.status);
    }
    return users;
  },

  getUserById(id) {
    if (!id) return null;
    const users = this._getUsersRaw();
    return users.find((u) => u.id === id) || null;
  },

  getUserByEmail(email) {
    if (!email) return null;
    const normEmail = String(email).trim().toLowerCase();
    const users = this._getUsersRaw();
    return users.find((u) => u.email.toLowerCase() === normEmail) || null;
  },

  createUser(userData) {
    if (!userData || typeof userData !== 'object') {
      return { error: 'INVALID_DATA', message: 'Data pengguna tidak valid.' };
    }

    const displayName = (userData.displayName || userData.name || '').trim();
    if (!displayName) {
      return { error: 'VALIDATION_ERROR', message: 'Nama tampilan (displayName) wajib diisi.' };
    }

    const email = (userData.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return { error: 'VALIDATION_ERROR', message: 'Format email tidak valid.' };
    }

    // Check unique email
    const existing = this.getUserByEmail(email);
    if (existing) {
      return { error: 'DUPLICATE_EMAIL', message: `Email ${email} sudah terdaftar.` };
    }

    // Role validation
    let role = (userData.role || 'student').toLowerCase();
    if (role === 'teacher') role = 'tutor';
    if (!VALID_ROLES.includes(role)) {
      return { error: 'INVALID_ROLE', message: `Role '${role}' tidak valid. Pilihan: ${VALID_ROLES.join(', ')}.` };
    }

    // Status validation
    const status = (userData.status || 'active').toLowerCase();
    if (!VALID_STATUSES.includes(status)) {
      return { error: 'INVALID_STATUS', message: `Status '${status}' tidak valid. Pilihan: ${VALID_STATUSES.join(', ')}.` };
    }

    const now = new Date().toISOString();
    const id = userData.id || `usr_${role.slice(0, 3)}_${Date.now().toString().slice(-6)}`;
    const avatar = userData.avatar || displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

    const newUser = {
      id,
      email,
      displayName,
      role,
      status,
      avatar,
      gradeLevel: role === 'student' ? (userData.gradeLevel || 'Grade 5') : undefined,
      createdAt: now,
      updatedAt: now
    };

    const users = this._getUsersRaw();
    users.push(newUser);
    this._setUsersRaw(users);

    return { user: newUser };
  },

  updateUser(id, changes) {
    if (!id) return { error: 'INVALID_ID', message: 'ID pengguna tidak valid.' };
    const users = this._getUsersRaw();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) {
      return { error: 'USER_NOT_FOUND', message: `Pengguna dengan ID ${id} tidak ditemukan.` };
    }

    const user = { ...users[idx] };

    // Email update & unique check
    if (changes.email) {
      const nextEmail = String(changes.email).trim().toLowerCase();
      if (nextEmail !== user.email) {
        const dup = this.getUserByEmail(nextEmail);
        if (dup && dup.id !== id) {
          return { error: 'DUPLICATE_EMAIL', message: `Email ${nextEmail} sudah digunakan oleh akun lain.` };
        }
        user.email = nextEmail;
      }
    }

    if (changes.displayName) {
      user.displayName = String(changes.displayName).trim();
    }
    if (changes.role) {
      let r = String(changes.role).toLowerCase();
      if (r === 'teacher') r = 'tutor';
      if (!VALID_ROLES.includes(r)) {
        return { error: 'INVALID_ROLE', message: `Role '${r}' tidak valid.` };
      }
      user.role = r;
    }
    if (changes.status) {
      const s = String(changes.status).toLowerCase();
      if (!VALID_STATUSES.includes(s)) {
        return { error: 'INVALID_STATUS', message: `Status '${s}' tidak valid.` };
      }
      user.status = s;
    }
    if (changes.avatar) {
      user.avatar = String(changes.avatar).trim();
    }
    if (changes.gradeLevel !== undefined) {
      user.gradeLevel = changes.gradeLevel;
    }

    user.updatedAt = new Date().toISOString();
    users[idx] = user;
    this._setUsersRaw(users);

    return { user };
  },

  deactivateUser(id) {
    return this.updateUser(id, { status: 'inactive' });
  },

  activateUser(id) {
    return this.updateUser(id, { status: 'active' });
  },

  /* --------------------------------------------------------------------------
     RELATIONS: TUTOR-STUDENT ASSIGNMENTS
     -------------------------------------------------------------------------- */
  getAllAssignments() {
    return this._getAssignmentsRaw();
  },

  getTutorStudents(tutorId) {
    if (!tutorId) return [];
    const tutor = this.getUserById(tutorId);
    if (!tutor || (tutor.role !== 'tutor' && tutor.role !== 'teacher')) {
      console.warn(`IdentityStore: getTutorStudents dipanggil untuk akun bukan tutor: ${tutorId}`);
      return [];
    }

    const assignments = this._getAssignmentsRaw().filter((a) => a.tutorId === tutorId && a.status === 'active');
    const studentIds = assignments.map((a) => a.studentId);
    const users = this._getUsersRaw();
    return users.filter((u) => studentIds.includes(u.id) && u.status === 'active');
  },

  assignStudentToTutor(tutorId, studentId) {
    if (!tutorId || !studentId) {
      return { error: 'VALIDATION_ERROR', message: 'tutorId dan studentId wajib diisi.' };
    }

    const tutor = this.getUserById(tutorId);
    if (!tutor || (tutor.role !== 'tutor' && tutor.role !== 'teacher')) {
      return { error: 'INVALID_TUTOR_ROLE', message: `Akun ${tutorId} bukan tutor/guru yang valid.` };
    }
    if (tutor.status !== 'active') {
      return { error: 'INACTIVE_TUTOR', message: 'Tutor harus berstatus aktif sebelum menerima siswa.' };
    }

    const student = this.getUserById(studentId);
    if (!student || student.role !== 'student') {
      return { error: 'INVALID_STUDENT_ROLE', message: `Akun ${studentId} bukan siswa yang valid.` };
    }
    if (student.status !== 'active') {
      return { error: 'INACTIVE_STUDENT', message: 'Siswa harus berstatus aktif sebelum ditugaskan.' };
    }

    const assignments = this._getAssignmentsRaw();
    const activeOtherTutor = assignments.find((a) =>
      a.studentId === studentId && a.status === 'active' && a.tutorId !== tutorId
    );
    if (activeOtherTutor) {
      const currentTutor = this.getUserById(activeOtherTutor.tutorId);
      return {
        error: 'STUDENT_ALREADY_ASSIGNED',
        message: `Siswa ini masih memiliki tutor aktif: ${currentTutor?.displayName || activeOtherTutor.tutorId}. Lepas penugasan lama terlebih dahulu.`
      };
    }

    const existing = assignments.find((a) => a.tutorId === tutorId && a.studentId === studentId);
    if (existing) {
      if (existing.status !== 'active') {
        existing.status = 'active';
        this._setAssignmentsRaw(assignments);
      }
      return { assignment: existing };
    }

    const newAssignment = {
      id: `tsa_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 1000)}`,
      tutorId,
      studentId,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    assignments.push(newAssignment);
    this._setAssignmentsRaw(assignments);
    return { assignment: newAssignment };
  },

  removeTutorStudentAssignment(tutorId, studentId) {
    const assignments = this._getAssignmentsRaw();
    const assignment = assignments.find((a) =>
      a.tutorId === tutorId && a.studentId === studentId && a.status === 'active'
    );
    if (!assignment) return false;

    // Keep the assignment record for history; only end the active relationship.
    assignment.status = 'inactive';
    assignment.endedAt = new Date().toISOString();
    this._setAssignmentsRaw(assignments);
    return true;
  },

  /* --------------------------------------------------------------------------
     RELATIONS: PARENT-STUDENT LINKS
     -------------------------------------------------------------------------- */
  getAllParentLinks() {
    return this._getParentLinksRaw();
  },

  getParentStudents(parentId) {
    if (!parentId) return [];
    const parent = this.getUserById(parentId);
    if (!parent || parent.role !== 'parent') {
      console.warn(`IdentityStore: getParentStudents dipanggil untuk akun bukan orang tua: ${parentId}`);
      return [];
    }

    const links = this._getParentLinksRaw().filter((l) => l.parentId === parentId && l.status === 'active');
    const studentIds = links.map((l) => l.studentId);
    const users = this._getUsersRaw();
    return users.filter((u) => studentIds.includes(u.id) && u.status === 'active');
  },

  linkParentToStudent(parentId, studentId, relationship = 'Orang Tua') {
    if (!parentId || !studentId) {
      return { error: 'VALIDATION_ERROR', message: 'parentId dan studentId wajib diisi.' };
    }

    const parent = this.getUserById(parentId);
    if (!parent || parent.role !== 'parent') {
      return { error: 'INVALID_PARENT_ROLE', message: `Akun ${parentId} bukan akun orang tua yang valid.` };
    }

    const student = this.getUserById(studentId);
    if (!student || student.role !== 'student') {
      return { error: 'INVALID_STUDENT_ROLE', message: `Akun ${studentId} bukan siswa yang valid.` };
    }

    const links = this._getParentLinksRaw();
    const existing = links.find((l) => l.parentId === parentId && l.studentId === studentId);
    if (existing) {
      if (existing.status !== 'active' || existing.relationship !== relationship) {
        existing.status = 'active';
        existing.relationship = relationship;
        this._setParentLinksRaw(links);
      }
      return { link: existing };
    }

    const newLink = {
      id: `psl_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 1000)}`,
      parentId,
      studentId,
      relationship,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    links.push(newLink);
    this._setParentLinksRaw(links);
    return { link: newLink };
  },

  removeParentStudentLink(parentId, studentId) {
    const links = this._getParentLinksRaw();
    const next = links.filter((l) => !(l.parentId === parentId && l.studentId === studentId));
    if (next.length !== links.length) {
      this._setParentLinksRaw(links);
      return true;
    }
    return false;
  },

  /* --------------------------------------------------------------------------
     EVENT SUBSCRIPTION
     -------------------------------------------------------------------------- */
  subscribe(callback) {
    if (typeof window === 'undefined') return () => {};
    const handler = (e) => callback(e.detail);
    window.addEventListener(IDENTITY_CHANGE_EVENT, handler);
    return () => window.removeEventListener(IDENTITY_CHANGE_EVENT, handler);
  }
};
