/**
 * Local-demo adapters for the portal repositories.
 *
 * This module deliberately wraps the existing localStorage stores. It is not
 * production authentication, persistence, or an authorization boundary.
 * A future Supabase adapter must implement the same interfaces without
 * accepting caller-supplied identity as proof of authority.
 */

// @ts-ignore - Existing JavaScript demo identity store is retained during migration.
import { IdentityStore } from "../../../js/services/identity-store.js";
// @ts-ignore - Existing JavaScript demo auth service is retained during migration.
import { AuthService } from "../../../js/services/auth-service.js";
import type { AppRepositories, DemoSession, RoleId } from "./repositories";

export const localDemoRepositories: AppRepositories = {
  auth: {
    async getSession() {
      return AuthService.getCurrentSession() as DemoSession;
    },

    async signIn(accountId) {
      const result = AuthService.signInDemo(accountId);
      if (!result?.success) {
        return {
          success: false as const,
          error: result?.error,
          message: result?.message
        };
      }
      return { success: true as const, session: result.session as DemoSession };
    },

    async signOut() {
      AuthService.signOut();
    },

    subscribe(callback) {
      return AuthService.subscribe((session: DemoSession) => callback(session));
    }
  },

  identity: {
    async initializeDemo() {
      IdentityStore.seedIfEmpty();
    },

    async listActiveAccounts(role: RoleId) {
      return IdentityStore.getAllUsers({ role, status: "active" });
    }
  }
};
