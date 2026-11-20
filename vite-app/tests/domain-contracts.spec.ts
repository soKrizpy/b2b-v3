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

      const repository = createLocalDemoIdentityRepository(store, () => ({ id: "admin-1", role: "admin" }));
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
      const repository = createLocalDemoIdentityRepository(store, () => ({ id: "admin-1", role: "admin" }));
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


test("identity adapter scopes reads and mutations by active role",async({page})=>{
 await page.goto("/");
 const result=await page.evaluate(async()=>{
  const {createLocalDemoIdentityRepository}=await import("/src/data/local-demo-identity-repository.ts");
  const users=[
   {id:"t1",email:"t1@test",displayName:"Tutor",role:"tutor",status:"active",createdAt:"2026-11-01T00:00:00Z",updatedAt:"2026-11-01T00:00:00Z"},
   {id:"s1",email:"s1@test",displayName:"Assigned",role:"student",status:"active",createdAt:"2026-11-01T00:00:00Z",updatedAt:"2026-11-01T00:00:00Z"},
   {id:"s2",email:"s2@test",displayName:"Other",role:"student",status:"active",createdAt:"2026-11-01T00:00:00Z",updatedAt:"2026-11-01T00:00:00Z"}
  ];
  const assignments=[{id:"a1",tutorId:"t1",studentId:"s1",status:"active",createdAt:"2026-11-01T00:00:00Z"}];
  const store={getAllUsers:()=>users,getUserById:(id:string)=>users.find(x=>x.id===id)??null,getAllAssignments:()=>assignments,createUser:()=>({error:"NOOP",message:"no"}),updateUser:()=>({error:"NOOP",message:"no"}),activateUser:()=>({error:"NOOP",message:"no"}),deactivateUser:()=>({error:"NOOP",message:"no"}),assignStudentToTutor:()=>({error:"NOOP",message:"no"}),removeTutorStudentAssignment:()=>false,subscribe:()=>()=>{}};
  const tutor=createLocalDemoIdentityRepository(store,()=>({id:"t1",role:"tutor"}));
  const student=createLocalDemoIdentityRepository(store,()=>({id:"s1",role:"student"}));
  return {tutorUsers:(await tutor.listUsers()).map(x=>x.id),tutorOther:await tutor.getUser("s2"),studentUsers:(await student.listUsers()).map(x=>x.id),studentAssignments:(await student.listAssignments()).length,blocked:(await tutor.createUser({email:"x@test",displayName:"X",role:"student",status:"active"})).success};
 });
 expect(result.tutorUsers.sort()).toEqual(["s1","t1"]);expect(result.tutorOther).toBeNull();
 expect(result.studentUsers).toEqual(["s1"]);expect(result.studentAssignments).toBe(1);expect(result.blocked).toBe(false);
});
