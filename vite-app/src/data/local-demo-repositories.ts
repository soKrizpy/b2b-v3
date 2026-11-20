/**
 * Typed facade over the single local-demo repository composition root.
 *
 * The imported gateway owns all local-demo service wiring. This facade only
 * narrows the legacy JavaScript API to the React portal's login contract.
 * It is not production authentication or an authorization boundary.
 */

// @ts-ignore - JavaScript gateway remains the runtime composition root during migration.
import { WorkspaceRepositories } from "../../../js/services/workspace-repositories.js";
import type { AppRepositories, DemoSession, RoleId } from "./repositories";

export const localDemoRepositories: AppRepositories = {
  auth: {
    async getSession() {
      return await WorkspaceRepositories.auth.getSession() as DemoSession;
    },
    async signIn(accountId) {
      const result = await WorkspaceRepositories.auth.signIn(accountId);
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
      await WorkspaceRepositories.auth.signOut();
    },
    subscribe(callback) {
      return WorkspaceRepositories.auth.subscribe((session: DemoSession) => callback(session));
    }
  },
  identity: {
    async initializeDemo() {
      await WorkspaceRepositories.identity.initializeDemo();
    },
    async listActiveAccounts(role: RoleId) {
      return await WorkspaceRepositories.identity.listActiveAccounts(role);
    }
  }
};
