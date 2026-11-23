import { withAdminDeactivationLock } from "./admin-deactivation-lock.ts";

Deno.test("runs guarded mutation while holding the database lock and releases it", async () => {
  const calls: string[] = [];
  const result = await withAdminDeactivationLock({
    acquire: async () => { calls.push("acquire"); return { data: true, error: null }; },
    run: async () => { calls.push("run"); return "updated"; },
    release: async () => { calls.push("release"); return { error: null }; },
  });
  if (!result.acquired || result.value !== "updated" || result.releaseFailed ||
      calls.join(",") !== "acquire,run,release") {
    throw new Error("Expected acquire, mutation, and release in order");
  }
});

Deno.test("does not run mutation when another deactivation owns the lock", async () => {
  let ran = false;
  const result = await withAdminDeactivationLock({
    acquire: async () => ({ data: false, error: null }),
    run: async () => { ran = true; },
    release: async () => ({ error: null }),
  });
  if (result.acquired || result.reason !== "busy" || ran) {
    throw new Error("A contending request must not mutate Auth");
  }
});

Deno.test("fails closed when lock acquisition cannot be verified", async () => {
  let ran = false;
  const result = await withAdminDeactivationLock({
    acquire: async () => ({ data: null, error: new Error("database unavailable") }),
    run: async () => { ran = true; },
    release: async () => ({ error: null }),
  });
  if (result.acquired || result.reason !== "unavailable" || ran) {
    throw new Error("Lock acquisition errors must block the mutation");
  }
});

Deno.test("releases lock after mutation throws", async () => {
  let released = false;
  let threw = false;
  try {
    await withAdminDeactivationLock({
      acquire: async () => ({ data: true, error: null }),
      run: async () => { throw new Error("mutation failed"); },
      release: async () => { released = true; return { error: null }; },
    });
  } catch {
    threw = true;
  }
  if (!threw || !released) throw new Error("Lock must be released after a failed mutation");
});

Deno.test("reports an unconfirmed release while preserving mutation result", async () => {
  const result = await withAdminDeactivationLock({
    acquire: async () => ({ data: true, error: null }),
    run: async () => "updated",
    release: async () => ({ error: new Error("release failed") }),
  });
  if (!result.acquired || result.value !== "updated" || !result.releaseFailed) {
    throw new Error("Expected successful mutation with lease expiry fallback");
  }
});
