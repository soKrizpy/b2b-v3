import { expect, test } from "@playwright/test";

test.describe("Canonical local-demo learning record adapters", () => {
  test("session reports enforce actor scope and map unsupported session link explicitly", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createLocalDemoSessionReportRepository } = await import("/src/data/local-demo-session-report-repository.ts");
      const row = { id:"report-1", studentId:"student-1", studentName:"Student", tutorId:"tutor-1", tutorName:"Tutor", sessionDate:"2026-11-20", sessionNumber:2, topic:"Motion", moduleName:"Scratch", activities:"Build", achievements:"Completed", difficulties:"", solutions:"", parentRecommendations:"", competencies:{}, status:"submitted" as const, version:2, createdAt:"2026-11-01T00:00:00Z", updatedAt:"2026-11-20T00:00:00Z", submittedAt:"2026-11-20T00:00:00Z" };
      let savedTutorId: unknown = null;
      const rows = [row];
      const store = {
        getTutorReports: (id: string) => rows.filter(item => item.tutorId === id),
        getAllReports: () => rows,
        getReportById: (id: string) => rows.find(item => item.id === id) ?? null,
        getStudentSubmittedReports: (id: string) => rows.filter(item => item.studentId === id && item.status === "submitted"),
        saveReport: (data: Record<string, unknown>, status: "draft" | "submitted") => {
          savedTutorId = data.tutorId;
          return { success: true as const, report: { ...row, ...data, status, version: 3 } };
        },
        deleteDraft: () => false,
        subscribe: () => () => {}
      };
      const tutor = createLocalDemoSessionReportRepository(store, () => ({ id:"tutor-1", role:"tutor" }), () => true);
      const other = createLocalDemoSessionReportRepository(store, () => ({ id:"tutor-2", role:"tutor" }));
      const student = createLocalDemoSessionReportRepository(store, () => ({ id:"student-1", role:"student" }));
      const input = { ...row, id:undefined, sessionId:null, expectedVersion:undefined };
      const saved = await tutor.saveReport(input);
      const linked = await tutor.saveReport({ ...input, sessionId:"session-1" });
      return {
        ownList:(await tutor.listTutorReports("tutor-1")).length,
        foreignList:(await other.listTutorReports("tutor-1")).length,
        studentList:(await student.listStudentSubmittedReports("student-1")).length,
        foreignRead:await other.getReport("report-1"),
        studentRead:(await student.getReport("report-1"))?.status,
        saved:saved.success, savedTutorId, linkedCode:linked.success ? null : linked.error.code
      };
    });
    expect(result.ownList).toBe(1);
    expect(result.foreignList).toBe(0);
    expect(result.studentList).toBe(1);
    expect(result.foreignRead).toBeNull();
    expect(result.studentRead).toBe("submitted");
    expect(result.saved).toBe(true);
    expect(result.savedTutorId).toBe("tutor-1");
    expect(result.linkedCode).toBe("SESSION_LINK_UNSUPPORTED");
  });

  test("monthly evaluations enforce actor scope and preserve canonical rating", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createLocalDemoMonthlyEvaluationRepository } = await import("/src/data/local-demo-monthly-evaluation-repository.ts");
      const row = { id:"evaluation-1", studentId:"student-1", studentName:"Student", tutorId:"tutor-1", tutorName:"Tutor", period:"2026-11" as const, rating:"Baik", summary:"Good progress", strengths:"Persistence", nextGoals:"Practice", status:"published" as const, version:1, createdAt:"2026-11-20T00:00:00Z", updatedAt:"2026-11-20T00:00:00Z", publishedAt:"2026-11-20T00:00:00Z" };
      let savedTutorId: unknown = null;
      const rows = [row];
      const store = {
        getAll: () => rows,
        getTutorEvaluations: (id:string) => rows.filter(item => item.tutorId === id),
        getStudentPublished: (id:string) => rows.filter(item => item.studentId === id && item.status === "published"),
        save: (data:Record<string,unknown>, status:"draft"|"published") => {
          savedTutorId = data.tutorId;
          return { success:true as const, evaluation:{ ...row, ...data, status, version:2 } };
        },
        subscribe: () => () => {}
      };
      const tutor = createLocalDemoMonthlyEvaluationRepository(store, () => ({ id:"tutor-1", role:"tutor" }), () => true);
      const student = createLocalDemoMonthlyEvaluationRepository(store, () => ({ id:"student-1", role:"student" }));
      const blocked = await student.saveEvaluation(row);
      const missingVersion = await tutor.saveEvaluation(row);
      const staleVersion = await tutor.saveEvaluation({ ...row, expectedVersion: 0 });
      const saved = await tutor.saveEvaluation({ ...row, expectedVersion: 1 });
      return {
        tutorList:(await tutor.listTutorEvaluations("tutor-1")).length,
        studentList:(await student.listStudentPublished("student-1")).length,
        blockedCode:blocked.success ? null : blocked.error.code,
        missingVersionCode:missingVersion.success ? null : missingVersion.error.code,
        staleVersionCode:staleVersion.success ? null : staleVersion.error.code,
        saved:saved.success, savedTutorId,
        rating:saved.success ? saved.data.rating : null
      };
    });
    expect(result.tutorList).toBe(1);
    expect(result.studentList).toBe(1);
    expect(result.blockedCode).toBe("FORBIDDEN");
    expect(result.missingVersionCode).toBe("MISSING_EXPECTED_VERSION");
    expect(result.staleVersionCode).toBe("STALE_UPDATE_CONFLICT");
    expect(result.saved).toBe(true);
    expect(result.savedTutorId).toBe("tutor-1");
    expect(result.rating).toBe("Baik");
  });
});
