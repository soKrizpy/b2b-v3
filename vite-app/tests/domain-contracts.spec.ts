import { expect, test } from "@playwright/test";

test.describe("Canonical local-demo identity adapter", () => {
  test("maps legacy identity records and normalizes role and optional fields", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createLocalDemoIdentityRepository } = await import("/src/data/local-demo-identity-repository.ts");
      const users = [{
        id: "identity-student",
        email: "student@example.test",
        displayName: "Student Demo",
        role: "student",
        status: "active",
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z"
      }];
      const assignments = [{
        id: "assignment-1",
        tutorId: "tutor-1",
        studentId: "identity-student",
        status: "active",
        createdAt: "2026-11-01T00:00:00.000Z"
      }];
      let notify;
      const store = {
        getAllUsers: () => users,
        getUserById: id => users.find(user => user.id === id) || null,
        getAllAssignments: () => assignments,
        createUser: input => {
          const user = {
            id: "created-user",
            email: input.email,
            displayName: input.displayName,
            role: input.role,
            status: input.status,
            createdAt: "2026-11-02T00:00:00.000Z",
            updatedAt: "2026-11-02T00:00:00.000Z"
          };
          users.push(user);
          return { user };
        },
        updateUser: (id, changes) => {
          const user = users.find(item => item.id === id);
          if (!user) return { error: "USER_NOT_FOUND", message: "Missing" };
          Object.assign(user, changes);
          return { user };
        },
        activateUser: id => {
          const user = users.find(item => item.id === id);
          if (!user) return { error: "USER_NOT_FOUND", message: "Missing" };
          user.status = "active";
          return { user };
        },
        deactivateUser: id => {
          const user = users.find(item => item.id === id);
          if (!user) return { error: "USER_NOT_FOUND", message: "Missing" };
          user.status = "inactive";
          return { user };
        },
        assignStudentToTutor: (tutorId, studentId) => {
          const assignment = {
            id: "assignment-new",
            tutorId,
            studentId,
            status: "active",
            createdAt: "2026-11-02T00:00:00.000Z"
          };
          assignments.push(assignment);
          return { assignment };
        },
        removeTutorStudentAssignment: (tutorId, studentId) => {
          const assignment = assignments.find(item =>
            item.tutorId === tutorId && item.studentId === studentId && item.status === "active"
          );
          if (!assignment) return false;
          assignment.status = "inactive";
          assignment.endedAt = "2026-11-03T00:00:00.000Z";
          return true;
        },
        subscribe: callback => {
          notify = callback;
          return () => { notify = undefined; };
        }
      };

      const repository = createLocalDemoIdentityRepository(store);
      const listed = await repository.listUsers();
      const created = await repository.createUser({
        email: "new@example.test",
        displayName: "New Student",
        role: "student",
        status: "active"
      });
      const ended = await repository.endAssignment("tutor-1", "identity-student");
      let event;
      const unsubscribe = repository.subscribe(value => { event = value; });
      notify?.({ action: "users_updated", meta: { userId: "created-user" }, timestamp: "2026-11-04T00:00:00.000Z" });
      unsubscribe();

      return {
        listedAvatarIsNull: listed[0].avatar === null,
        listedGradeIsNull: listed[0].gradeLevel === null,
        created: created.success && created.data.id === "created-user",
        ended: ended.success && ended.data.endedAt === "2026-11-03T00:00:00.000Z",
        event: event && {
          domain: event.domain,
          action: event.action,
          entityId: event.entityId,
          occurredAt: event.occurredAt
        }
      };
    });

    expect(result.listedAvatarIsNull).toBe(true);
    expect(result.listedGradeIsNull).toBe(true);
    expect(result.created).toBe(true);
    expect(result.ended).toBe(true);
    expect(result.event).toEqual({
      domain: "identity",
      action: "users_updated",
      entityId: "created-user",
      occurredAt: "2026-11-04T00:00:00.000Z"
    });
  });

  test("converts legacy teacher role to tutor and returns structured errors", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const { createLocalDemoIdentityRepository } = await import("/src/data/local-demo-identity-repository.ts");
      const store = {
        getAllUsers: () => [{
          id: "legacy-teacher",
          email: "teacher@example.test",
          displayName: "Legacy Teacher",
          role: "teacher",
          status: "active",
          createdAt: "2026-11-01T00:00:00.000Z",
          updatedAt: "2026-11-01T00:00:00.000Z"
        }],
        getUserById: () => null,
        getAllAssignments: () => [],
        createUser: () => ({ error: "DUPLICATE_EMAIL", message: "Email already exists" }),
        updateUser: () => ({ error: "USER_NOT_FOUND", message: "Missing" }),
        activateUser: () => ({ error: "USER_NOT_FOUND", message: "Missing" }),
        deactivateUser: () => ({ error: "USER_NOT_FOUND", message: "Missing" }),
        assignStudentToTutor: () => ({ error: "INVALID_TUTOR_ROLE", message: "Invalid tutor" }),
        removeTutorStudentAssignment: () => false,
        subscribe: () => () => {}
      };
      const repository = createLocalDemoIdentityRepository(store);
      const teacher = await repository.listUsers();
      const failed = await repository.createUser({
        email: "teacher@example.test",
        displayName: "Duplicate",
        role: "tutor",
        status: "active"
      });
      return { role: teacher[0].role, failed };
    });

    expect(result.role).toBe("tutor");
    expect(result.failed).toEqual({
      success: false,
      error: { code: "DUPLICATE_EMAIL", message: "Email already exists" }
    });
  });
});
