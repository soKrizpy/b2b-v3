export type LockRpcResult = { data: boolean | null; error: unknown | null };

export type AdminDeactivationLockResult<T> =
  | { acquired: false; reason: "unavailable" | "busy" }
  | { acquired: true; value: T; releaseFailed: boolean };

export async function withAdminDeactivationLock<T>(input: {
  acquire: () => Promise<LockRpcResult>;
  release: () => Promise<{ error: unknown | null }>;
  run: () => Promise<T>;
}): Promise<AdminDeactivationLockResult<T>> {
  let acquired: LockRpcResult;
  try {
    acquired = await input.acquire();
  } catch {
    return { acquired: false, reason: "unavailable" };
  }

  if (acquired.error) return { acquired: false, reason: "unavailable" };
  if (acquired.data !== true) return { acquired: false, reason: "busy" };

  let value: T;
  try {
    value = await input.run();
  } catch (error) {
    try {
      await input.release();
    } catch {
      // The database lease expires automatically if release cannot be confirmed.
    }
    throw error;
  }

  let releaseFailed = false;
  try {
    const released = await input.release();
    releaseFailed = Boolean(released.error);
  } catch {
    releaseFailed = true;
  }

  return { acquired: true, value, releaseFailed };
}
