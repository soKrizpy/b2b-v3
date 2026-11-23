import { verifyAdminDeactivation } from "./admin-deactivation.ts";

Deno.test("rejects self-deactivation before reading admin records", async () => {
  let reads = 0;
  const result = await verifyAdminDeactivation({
    actorId: "admin-a",
    targetId: "admin-a",
    listAdminIds: async () => { reads += 1; return { ids: ["admin-a"] }; },
    readAuthStatus: async () => { reads += 1; return { exists: true, bannedUntil: null }; },
    nowMs: 1_800_000_000_000,
  });
  if (result.allowed || result.reason !== "self" || reads !== 0) {
    throw new Error("Self-deactivation must be rejected without querying admin status");
  }
});

Deno.test("allows deactivation only when another active admin remains", async () => {
  const result = await verifyAdminDeactivation({
    actorId: "admin-a",
    targetId: "admin-b",
    listAdminIds: async () => ({ ids: ["admin-a", "admin-b", "admin-c"] }),
    readAuthStatus: async (id) => ({
      exists: true,
      bannedUntil: id === "admin-c" ? "2020-01-01T00:00:00.000Z" : null,
    }),
    nowMs: 1_800_000_000_000,
  });
  if (!result.allowed) throw new Error("Expected another active admin to remain");
});

Deno.test("rejects deactivation of the last active admin", async () => {
  const result = await verifyAdminDeactivation({
    actorId: "admin-a",
    targetId: "admin-a-target",
    listAdminIds: async () => ({ ids: ["admin-a", "admin-b"] }),
    readAuthStatus: async (id) => ({
      exists: true,
      bannedUntil: id === "admin-b" ? "2030-01-01T00:00:00.000Z" : null,
    }),
    nowMs: 1_800_000_000_000,
  });
  if (result.allowed || result.reason !== "last_admin") {
    throw new Error("Expected last active admin protection");
  }
});

Deno.test("fails closed when any admin Auth status cannot be verified", async () => {
  const result = await verifyAdminDeactivation({
    actorId: "admin-a",
    targetId: "admin-b",
    listAdminIds: async () => ({ ids: ["admin-a", "admin-b"] }),
    readAuthStatus: async (id) => id === "admin-b"
      ? { exists: false, bannedUntil: null }
      : { exists: true, bannedUntil: null },
    nowMs: 1_800_000_000_000,
  });
  if (result.allowed || result.reason !== "verification_failed") {
    throw new Error("Expected fail-closed verification result");
  }
});

Deno.test("fails closed for malformed ban timestamps", async () => {
  const result = await verifyAdminDeactivation({
    actorId: "admin-a",
    targetId: "admin-b",
    listAdminIds: async () => ({ ids: ["admin-a", "admin-b"] }),
    readAuthStatus: async (id) => ({
      exists: true,
      bannedUntil: id === "admin-b" ? "not-a-date" : null,
    }),
    nowMs: 1_800_000_000_000,
  });
  if (result.allowed || result.reason !== "verification_failed") {
    throw new Error("Malformed Auth status must fail closed");
  }
});
