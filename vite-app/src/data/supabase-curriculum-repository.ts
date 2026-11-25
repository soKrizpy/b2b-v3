import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase-client";
import { resolveActiveStudentModuleIds } from "./curriculum-access-contract";
import type {
  CurriculumModule,
  CurriculumRepository,
  CurriculumTopic,
  JsonValue,
  ModuleId,
  TopicId
} from "./domain-contracts";

type ModuleRow = {
  id: number;
  title: string;
  description: string | null;
  is_active: boolean | null;
};

type TopicRow = {
  id: number;
  module_id: number;
  title: string;
  description: string | null;
  order_index: number;
  lesson_content: unknown;
  status: string;
};

function requireClient(client: SupabaseClient | null): SupabaseClient {
  if (!client) throw new Error("Konfigurasi Supabase belum tersedia.");
  return client;
}

function mapModule(row: ModuleRow): CurriculumModule {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    // The production modules table has no explicit ordering column.
    sortOrder: row.id,
    isPublished: row.is_active === true
  };
}

function mapTopic(row: TopicRow): CurriculumTopic {
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    description: row.description,
    sortOrder: row.order_index,
    lessonContent: (row.lesson_content ?? {}) as JsonValue
  };
}

async function getActor(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Sesi pengguna tidak valid. Silakan masuk kembali.");
  return data.user;
}

async function getReleasedTopicIdsForStudent(
  client: SupabaseClient,
  moduleId: ModuleId
): Promise<Set<number> | null> {
  const actor = await getActor(client);
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", actor.id)
    .maybeSingle();

  if (profileError || !profile) throw new Error("Profil pengguna tidak dapat diverifikasi.");
  if (profile.role !== "student") return null;

  const { data, error } = await client.rpc("list_my_released_topic_ids", {
    p_module_id: moduleId
  });
  if (error) throw new Error("Topik yang terbuka berdasarkan jadwal tidak dapat dimuat.");
  if (!Array.isArray(data)) throw new Error("Respons akses topik dari server tidak valid.");

  const ids = data.map((row: { topic_id?: unknown }) => row.topic_id);
  if (ids.some((id) => !Number.isSafeInteger(id) || Number(id) <= 0)) {
    throw new Error("Respons akses topik dari server tidak valid.");
  }
  return new Set(ids as number[]);
}

async function listAccessibleModuleIds(client: SupabaseClient): Promise<number[]> {
  const actor = await getActor(client);
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", actor.id)
    .maybeSingle();

  if (profileError || !profile) throw new Error("Profil pengguna tidak dapat diverifikasi.");

  if (profile.role === "student") {
    const { data, error } = await client
      .from("student_modules")
      .select("module_id, status")
      .eq("student_id", actor.id)
      .eq("status", "active");
    if (error) throw new Error("Modul belajar siswa tidak dapat dimuat.");
    return resolveActiveStudentModuleIds(data ?? []);
  }

  if (profile.role !== "admin" && profile.role !== "teacher") {
    throw new Error("Peran pengguna tidak memiliki akses ke katalog kurikulum.");
  }

  const { data, error } = await client
    .from("modules")
    .select("id")
    .eq("is_active", true);
  if (error) throw new Error("Daftar kurikulum tidak dapat dimuat.");

  return (data ?? [])
    .map((row) => Number(row.id))
    .filter((id) => Number.isSafeInteger(id) && id > 0);
}

/**
 * Production curriculum repository. The client is injectable so its query
 * contract can be tested without coupling tests to a live Supabase session.
 * Database RLS remains the final authorization boundary.
 */
export function createSupabaseCurriculumRepository(
  suppliedClient: SupabaseClient | null = supabase
): CurriculumRepository {
  const client = suppliedClient;

  const repository: CurriculumRepository = {
    async listModules(): Promise<CurriculumModule[]> {
      const db = requireClient(client);
      const moduleIds = await listAccessibleModuleIds(db);
      if (moduleIds.length === 0) return [];

      const { data, error } = await db
        .from("modules")
        .select("id, title, description, is_active")
        .in("id", moduleIds)
        .eq("is_active", true)
        .order("id", { ascending: true });

      if (error) throw new Error("Kurikulum aktif tidak dapat dimuat.");
      return ((data ?? []) as ModuleRow[]).map(mapModule);
    },

    async getModule(moduleId: ModuleId): Promise<CurriculumModule | null> {
      const db = requireClient(client);
      const accessibleIds = await listAccessibleModuleIds(db);
      if (!accessibleIds.includes(moduleId)) return null;

      const { data, error } = await db
        .from("modules")
        .select("id, title, description, is_active")
        .eq("id", moduleId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw new Error("Modul tidak dapat dimuat.");
      return data ? mapModule(data as ModuleRow) : null;
    },

    async listTopics(moduleId: ModuleId): Promise<CurriculumTopic[]> {
      const db = requireClient(client);
      if (!(await repository.getModule(moduleId))) return [];

      const { data, error } = await db
        .from("topics")
        .select("id, module_id, title, description, order_index, lesson_content, status")
        .eq("module_id", moduleId)
        .eq("status", "published")
        .order("order_index", { ascending: true });

      if (error) throw new Error("Materi topik tidak dapat dimuat.");
      const releasedIds = await getReleasedTopicIdsForStudent(db, moduleId);
      return ((data ?? []) as TopicRow[])
        .filter((row) => releasedIds === null || releasedIds.has(row.id))
        .map(mapTopic);
    },

    async getTopic(topicId: TopicId): Promise<CurriculumTopic | null> {
      const db = requireClient(client);
      const { data, error } = await db
        .from("topics")
        .select("id, module_id, title, description, order_index, lesson_content, status")
        .eq("id", topicId)
        .eq("status", "published")
        .maybeSingle();

      if (error) throw new Error("Materi topik tidak dapat dimuat.");
      if (!data) return null;
      const topic = data as TopicRow;
      if (!(await repository.getModule(topic.module_id))) return null;
      const releasedIds = await getReleasedTopicIdsForStudent(db, topic.module_id);
      if (releasedIds !== null && !releasedIds.has(topic.id)) return null;
      return mapTopic(topic);
    }
  };

  return repository;
}

export const supabaseCurriculumRepository = createSupabaseCurriculumRepository();
