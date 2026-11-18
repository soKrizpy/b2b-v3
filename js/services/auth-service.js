/**
 * B2B LEARNING ENGINE - AUTHENTICATION & SESSION SERVICE (PHASE 4)
 * Local Demo Session Manager.
 *
 * Adheres strictly to Section 5, 10, 14, 15 of PROJECT_RULES.md:
 * - Local demo session simulation ONLY.
 * - Does NOT store or verify passwords.
 * - Enforces account status checks (inactive accounts cannot sign in).
 * - Notifies application reactively on session change.
 */

import { IdentityStore } from './identity-store.js';

export const AUTH_SESSION_KEY = 'b2b_auth_session';
export const AUTH_CHANGE_EVENT = 'b2b_auth_change';

export const AuthService = {
  isAvailable() {
    return IdentityStore.isAvailable();
  },

  _getStorage() {
    if (this.isAvailable()) return window.localStorage;
    if (typeof global !== 'undefined' && global.localStorage) return global.localStorage;
    return null;
  },

  /**
   * Get current active session
   * Verifies account validity with IdentityStore
   * @returns {Object|null}
   */
  getCurrentSession() {
    const storage = this._getStorage();
    if (!storage) return null;

    try {
      const raw = storage.getItem(AUTH_SESSION_KEY);
      if (!raw) return null;

      const session = JSON.parse(raw);
      if (!session || !session.user || !session.user.id) {
        this.signOut();
        return null;
      }

      // Live verification against IdentityStore: ensure account is still active and exists
      const liveUser = IdentityStore.getUserById(session.user.id);
      if (!liveUser || liveUser.status !== 'active') {
        console.warn('AuthService: Sesi kadaluarsa karena akun tidak aktif atau telah dihapus.');
        this.signOut();
        return null;
      }

      // Keep user profile up to date
      session.user = {
        id: liveUser.id,
        email: liveUser.email,
        displayName: liveUser.displayName,
        role: liveUser.role,
        avatar: liveUser.avatar,
        status: liveUser.status,
        gradeLevel: liveUser.gradeLevel
      };
      session.role = liveUser.role;

      return session;
    } catch (e) {
      console.error('AuthService: Gagal membaca auth session:', e);
      return null;
    }
  },

  /**
   * Sign in using demo account (Local simulation)
   * @param {string} userId
   * @returns {{success: boolean, session?: Object, error?: string, message?: string}}
   */
  signInDemo(userId) {
    if (!userId) {
      return { error: 'INVALID_CREDENTIALS', message: 'ID pengguna diperlukan untuk masuk demo.' };
    }

    const user = IdentityStore.getUserById(userId);
    if (!user) {
      return { error: 'USER_NOT_FOUND', message: `Pengguna dengan ID ${userId} tidak ditemukan.` };
    }

    if (user.status !== 'active') {
      return { error: 'ACCOUNT_INACTIVE', message: `Akun ${user.displayName} berstatus nonaktif. Hubungi Admin.` };
    }

    const session = {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatar: user.avatar,
        status: user.status,
        gradeLevel: user.gradeLevel
      },
      role: user.role,
      token: `demo-token-${user.id}-${Date.now()}`,
      signedInAt: new Date().toISOString()
    };

    const storage = this._getStorage();
    if (storage) {
      storage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    }

    this._notifyChange(session);
    return { success: true, session };
  },

  /**
   * Sign out and clear active session
   * @returns {{success: boolean}}
   */
  signOut() {
    const storage = this._getStorage();
    if (storage) {
      storage.removeItem(AUTH_SESSION_KEY);
    }
    this._notifyChange(null);
    return { success: true };
  },

  _notifyChange(session) {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      const evt = new CustomEvent(AUTH_CHANGE_EVENT, {
        detail: { session, timestamp: new Date().toISOString() }
      });
      window.dispatchEvent(evt);
    }
  },

  /**
   * Subscribe to session changes (in-tab and cross-tab)
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    if (typeof window === 'undefined') return () => {};

    const localHandler = (e) => callback(e.detail ? e.detail.session : null);
    const storageHandler = (e) => {
      if (e.key === AUTH_SESSION_KEY) {
        callback(this.getCurrentSession());
      }
    };

    window.addEventListener(AUTH_CHANGE_EVENT, localHandler);
    window.addEventListener('storage', storageHandler);

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, localHandler);
      window.removeEventListener('storage', storageHandler);
    };
  }
};
