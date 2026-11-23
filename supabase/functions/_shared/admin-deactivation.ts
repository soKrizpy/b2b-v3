export type AdminDeactivationResult =
  | { allowed: true }
  | { allowed: false; reason: "self" | "last_admin" | "verification_failed" };

type AdminListResult = { ids: string[] | null; error?: unknown };
type AdminAuthResult = { exists: boolean; bannedUntil: string | null; error?: unknown };

export async function verifyAdminDeactivation(input: {
  actorId: string;
  targetId: string;
  listAdminIds: () => Promise<AdminListResult>;
  readAuthStatus: (adminId: string) => Promise<AdminAuthResult>;
  nowMs?: number;
}): Promise<AdminDeactivationResult> {
  if (input.actorId === input.targetId) return { allowed: false, reason: "self" };

  const listed = await input.listAdminIds();
  if (listed.error || !listed.ids) {
    return { allowed: false, reason: "verification_failed" };
  }

  let activeCount = 0;
  for (const adminId of listed.ids) {
    const auth = await input.readAuthStatus(adminId);
    if (auth.error || !auth.exists) {
      return { allowed: false, reason: "verification_failed" };
    }

    if (!auth.bannedUntil) {
      activeCount += 1;
      continue;
    }

    const bannedUntilMs = Date.parse(auth.bannedUntil);
    if (!Number.isFinite(bannedUntilMs)) {
      return { allowed: false, reason: "verification_failed" };
    }
    if (bannedUntilMs <= (input.nowMs ?? Date.now())) activeCount += 1;
  }

  return activeCount > 1
    ? { allowed: true }
    : { allowed: false, reason: "last_admin" };
}
