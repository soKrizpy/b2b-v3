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

function requireClient() {
  if (!supabase) throw new Error("Konfigurasi Supabase belum tersedia.");
  return supabase;
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

async function getActor() {
  const client = requireClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Sesi pengguna tidak valid. Silakan masuk kembali.");
  return data.user;
}

async function listAccessibleModuleIds(): Promise<number[] | null> {
  const client = requireClient();
  const actor = await getActor();
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", actor.id)
    .maybeSingle();

  if (profileError || !profile) throw new Error("Profil pengguna tidak dapat diverifikasi.");

  if (profile.role !== "student") {
    const { data, error } = await client
      .from("modules")
      .select("id")
      .eq("is_active", true);
    if (error) throw new Error("Daftar kurikulum tidak dapat dimuat.");
    return (data ?? []).map((row) => Number(row.id));
  }

  const { data, error } = await client
    .from("student_modules")
    .select("module_id, status")
    .eq("student_id", actor.id)
    .eq("status", "active");
  if (error) throw new Error("Modul belajar siswa tidak dapat dimuat.");
  return resolveActiveStudentModuleIds(data ?? []);
}

export const supabaseCurriculumRepository: CurriculumRepository = {
  async listModules(): Promise<CurriculumModule[]> {
    const client = requireClient();
    const moduleIds = await listAccessibleModuleIds();
    if (!moduleIds?.length) return [];

    const { data, error } = await client
      .from("modules")
      .select("id, title, description, is_active")
      .in("id", moduleIds)
      .eq("is_active", true)
      .order("id", { ascending: true });

    if (error) throw new Error("Kurikulum aktif tidak dapat dimuat.");
    return ((data ?? []) as ModuleRow[]).map(mapModule);
  },

  async getModule(moduleId: ModuleId): Promise<CurriculumModule | null> {
    const accessibleIds = await listAccessibleModuleIds();
    if (!accessibleIds?.includes(moduleId)) return null;

    const client = requireClient();
    const { data, error } = await client
      .from("modules")
      .select("id, title, description, is_active")
      .eq("id", moduleId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw new Error("Modul tidak dapat dimuat.");
    return data ? mapModule(data as ModuleRow) : null;
  },

  async listTopics(moduleId: ModuleId): Promise<CurriculumTopic[]> {
    if (!(await this.getModule(moduleId))) return [];

    const client = requireClient();
    const { data, error } = await client
      .from("topics")
      .select("id, module_id, title, description, order_index, lesson_content, status")
      .eq("module_id", moduleId)
      .eq("status", "published")
      .order("order_index", { ascending: true });

    if (error) throw new Error("Materi topik tidak dapat dimuat.");
    return ((data ?? []) as TopicRow[]).map(mapTopic);
  },

  async getTopic(topicId: TopicId): Promise<CurriculumTopic | null> {
    const client = requireClient();
    const { data, error } = await client
      .from("topics")
      .select("id, module_id, title, description, order_index, lesson_content, status")
      .eq("id", topicId)
      .eq("status", "published")
      .maybeSingle();

    if (error) throw new Error("Materi topik tidak dapat dimuat.");
    if (!data) return null;
    const topic = data as TopicRow;
    if (!(await this.getModule(topic.module_id))) return null;
    return mapTopic(topic);
  }
};
