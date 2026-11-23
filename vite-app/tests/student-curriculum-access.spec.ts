import { expect, test } from "@playwright/test";

test.describe("Student curriculum access contract", () => {
  test("exposes only unique, valid module IDs with an active assignment", async ({ page }) => {
    await page.goto("/");
    const moduleIds = await page.evaluate(async () => {
      const { resolveActiveStudentModuleIds } =
        await import("/src/data/curriculum-access-contract.ts");

      return resolveActiveStudentModuleIds([
        { module_id: 12, status: "active" },
        { module_id: 12, status: "active" },
        { module_id: 18, status: "paused" },
        { module_id: 21, status: "inactive" },
        { module_id: 0, status: "active" },
        { module_id: -4, status: "active" },
        { module_id: Number.NaN, status: "active" },
        { module_id: Number.POSITIVE_INFINITY, status: "active" },
        { module_id: "25", status: "active" },
        { module_id: 26, status: null }
      ] as never);
    });

    expect(moduleIds).toEqual([12]);
  });

  test("returns no accessible modules when there are no active assignments", async ({ page }) => {
    await page.goto("/");
    const moduleIds = await page.evaluate(async () => {
      const { resolveActiveStudentModuleIds } =
        await import("/src/data/curriculum-access-contract.ts");

      return resolveActiveStudentModuleIds([
        { module_id: 18, status: "paused" },
        { module_id: 21, status: "inactive" }
      ]);
    });

    expect(moduleIds).toEqual([]);
  });

  test("queries the real curriculum contract and prevents access to an unassigned module", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createSupabaseCurriculumRepository } = await import(
        "/src/data/supabase-curriculum-repository.ts"
      );
      const queryLog: Array<{ table: string; method: string; args: unknown[] }> = [];
      const modules = [
        { id: 29, title: "Scratch Beginner", description: "12 topics", is_active: true },
        { id: 30, title: "Tinkercad", description: "12 topics", is_active: true }
      ];
      const topics = [
        { id: 146, module_id: 29, title: "Topik 1", description: null, order_index: 0, lesson_content: { learningPath: [] }, status: "published" },
        { id: 147, module_id: 29, title: "Topik 2", description: null, order_index: 1, lesson_content: { learningPath: [] }, status: "published" },
        { id: 999, module_id: 30, title: "Topik rahasia modul lain", description: null, order_index: 0, lesson_content: {}, status: "published" },
        { id: 148, module_id: 29, title: "Draft", description: null, order_index: 2, lesson_content: {}, status: "draft" }
      ];
      const assignments = [
        { module_id: 29, status: "active" },
        { module_id: 29, status: "active" },
        { module_id: 30, status: "paused" }
      ];

      function makeBuilder(table: string) {
        let selected = "";
        const filters: Array<[string, string, unknown]> = [];
        const orders: Array<[string, boolean]> = [];
        const builder: Record<string, unknown> = {};
        const rows = () => {
          let data: any[] = table === "profiles"
            ? [{ id: "student-1", role: "student" }]
            : table === "student_modules"
              ? assignments
              : table === "modules"
                ? modules
                : table === "topics"
                  ? topics
                  : [];
          data = data.filter((row) => filters.every(([method, key, value]) => {
            if (method === "eq") return row[key] === value;
            if (method === "in") return (value as unknown[]).includes(row[key]);
            return true;
          }));
          for (const [key, ascending] of orders) {
            data = data.slice().sort((a, b) => {
              const left = a[key];
              const right = b[key];
              return (left < right ? -1 : left > right ? 1 : 0) * (ascending ? 1 : -1);
            });
          }
          if (table === "modules" && selected === "id") return data.map((row) => ({ id: row.id }));
          return data;
        };
        for (const method of ["select", "eq", "in", "order"]) {
          builder[method] = (...args: unknown[]) => {
            queryLog.push({ table, method, args });
            if (method === "select") selected = String(args[0] ?? "");
            if (method === "eq") filters.push(["eq", String(args[0]), args[1]]);
            if (method === "in") filters.push(["in", String(args[0]), args[1]]);
            if (method === "order") orders.push([String(args[0]), Boolean((args[1] as { ascending?: boolean })?.ascending)]);
            return builder;
          };
        }
        builder.maybeSingle = async () => {
          const result = rows();
          return { data: result[0] ?? null, error: null };
        };
        builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve({ data: rows(), error: null }).then(resolve, reject);
        return builder;
      }

      const client = {
        auth: { getUser: async () => ({ data: { user: { id: "student-1" } }, error: null }) },
        from: (table: string) => makeBuilder(table)
      };
      const repository = createSupabaseCurriculumRepository(client as never);
      const visibleModules = await repository.listModules();
      const visibleTopics = await repository.listTopics(29);
      const blockedTopic = await repository.getTopic(999);

      return {
        moduleIds: visibleModules.map((module) => module.id),
        topicIds: visibleTopics.map((topic) => topic.id),
        blockedTopic,
        studentFilter: queryLog.some((item) => item.table === "student_modules" && item.method === "eq" && item.args[0] === "student_id" && item.args[1] === "student-1"),
        activeFilter: queryLog.some((item) => item.table === "student_modules" && item.method === "eq" && item.args[0] === "status" && item.args[1] === "active"),
        assignedModuleFilter: queryLog.some((item) => item.table === "modules" && item.method === "in" && item.args[0] === "id" && JSON.stringify(item.args[1]) === "[29]"),
        publishedTopicFilter: queryLog.some((item) => item.table === "topics" && item.method === "eq" && item.args[0] === "status" && item.args[1] === "published")
      };
    });

    expect(result).toEqual({
      moduleIds: [29],
      topicIds: [146, 147],
      blockedTopic: null,
      studentFilter: true,
      activeFilter: true,
      assignedModuleFilter: true,
      publishedTopicFilter: true
    });
  });
});
