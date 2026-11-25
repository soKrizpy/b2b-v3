import { supabase } from "./supabase-client";

export type ParentHubModule = {
  topics: Array<{
    id: number; title: string; order: number; lessonState: string; updatedAt: string | null;
    stages: Record<string, string>;
    quizAttempts: Array<{ attemptNumber: number; score: number; submittedAt: string }>;
    projects: Array<{ id: number; title: string; url: string | null; status: string; submittedAt: string; reviewNote: string | null }>;
  }>;
  finalBoss: { attemptNumber: number; score: number; bestScore: number; submittedAt: string } | null;
  certificate: { number: string; tier: string; score: number; issuedAt: string } | null;
};

export const supabaseParentHubRepository = {
  async getMyModule(moduleId: number): Promise<ParentHubModule> {
    if (!supabase) throw new Error("Koneksi Supabase belum dikonfigurasi.");
    if (!Number.isSafeInteger(moduleId) || moduleId <= 0) throw new Error("Modul Parent Hub tidak valid.");
    const { data, error } = await supabase.rpc("get_my_parent_hub_module", { p_module_id: moduleId });
    if (error || !data || typeof data !== "object") throw new Error("Ringkasan belajar belum dapat dimuat.");
    return data as ParentHubModule;
  }
};
