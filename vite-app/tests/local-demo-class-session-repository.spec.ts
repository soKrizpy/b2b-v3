import { expect, test } from "@playwright/test";
const base={"id":"session-1","seriesId":"series-1","sessionNumber":1,"studentId":"student-1","tutorId":"tutor-1","scheduledStartAt":"2026-11-20T02:00:00.000Z","durationMinutes":60,"meetingUrl":null,"status":"scheduled","attendanceStatus":"not_recorded","attendanceRecordedBy":null,"attendanceRecordedAt":null,"cancellation":null,"replacementRequired":false,"replacementSessionId":null,"replacementForSessionId":null,"deletedAt":null,"deletedBy":null,"createdAt":"2026-11-01T00:00:00.000Z","updatedAt":"2026-11-01T00:00:00.000Z","version":1};
const makeSession=(overrides:Record<string,unknown>={})=>({...base,...overrides});
test.describe("Canonical local-demo class session adapter",()=>{
 test("filters sessions and billable period using Jakarta calendar month",async({page})=>{
  await page.goto("/");
  const result=await page.evaluate(async()=>{
   const {createLocalDemoClassSessionRepository}=await import("/src/data/local-demo-class-session-repository.ts");
   const rows=[{"id":"nov","seriesId":"series-1","sessionNumber":1,"studentId":"student-1","tutorId":"tutor-1","scheduledStartAt":"2026-11-30T16:59:00.000Z","durationMinutes":60,"meetingUrl":null,"status":"held","attendanceStatus":"present","attendanceRecordedBy":null,"attendanceRecordedAt":null,"cancellation":null,"replacementRequired":false,"replacementSessionId":null,"replacementForSessionId":null,"deletedAt":null,"deletedBy":null,"createdAt":"2026-11-01T00:00:00.000Z","updatedAt":"2026-11-01T00:00:00.000Z","version":1},{"id":"dec","seriesId":"series-1","sessionNumber":1,"studentId":"student-1","tutorId":"tutor-1","scheduledStartAt":"2026-11-30T17:00:00.000Z","durationMinutes":60,"meetingUrl":null,"status":"held","attendanceStatus":"late","attendanceRecordedBy":null,"attendanceRecordedAt":null,"cancellation":null,"replacementRequired":false,"replacementSessionId":null,"replacementForSessionId":null,"deletedAt":null,"deletedBy":null,"createdAt":"2026-11-01T00:00:00.000Z","updatedAt":"2026-11-01T00:00:00.000Z","version":1},{"id":"absent","seriesId":"series-1","sessionNumber":1,"studentId":"student-1","tutorId":"tutor-1","scheduledStartAt":"2026-11-30T17:30:00.000Z","durationMinutes":60,"meetingUrl":null,"status":"not_held","attendanceStatus":"absent","attendanceRecordedBy":null,"attendanceRecordedAt":null,"cancellation":null,"replacementRequired":false,"replacementSessionId":null,"replacementForSessionId":null,"deletedAt":null,"deletedBy":null,"createdAt":"2026-11-01T00:00:00.000Z","updatedAt":"2026-11-01T00:00:00.000Z","version":1}];
   const store={getAllSessions:()=>rows,getSession:id=>rows.find(row=>row.id===id)??null,getBillableSessions:id=>rows.filter(row=>row.studentId===id&&row.status==="held"&&["present","late"].includes(row.attendanceStatus)),createRecurringSessionSeries:()=>({success:true,sessions:[]}),recordAttendance:()=>({success:false,error:"NOOP"}),cancelSession:()=>({success:false,error:"NOOP"}),softDeleteSession:()=>({success:false,error:"NOOP"}),createReplacementSession:()=>({success:false,error:"NOOP"}),subscribe:()=>()=>{}};
   const repo=createLocalDemoClassSessionRepository(store,()=>({id:"admin-1",role:"admin"}));
   return {filtered:(await repo.listSessions({studentId:"student-1",status:"held"})).map(row=>row.id),november:(await repo.listBillableSessions("student-1","2026-11")).map(row=>row.id),december:(await repo.listBillableSessions("student-1","2026-12")).map(row=>row.id)};
  });
  expect(result.filtered).toEqual(["nov","dec"]);expect(result.november).toEqual(["nov"]);expect(result.december).toEqual(["dec"]);
 });
 test("derives mutation actor from active session and normalizes legacy failures",async({page})=>{
  await page.goto("/");
  const result=await page.evaluate(async()=>{
   const {createLocalDemoClassSessionRepository}=await import("/src/data/local-demo-class-session-repository.ts");
   let recordedActor=null;const row={"id":"session-1","seriesId":"series-1","sessionNumber":1,"studentId":"student-1","tutorId":"tutor-1","scheduledStartAt":"2026-11-20T02:00:00.000Z","durationMinutes":60,"meetingUrl":null,"status":"scheduled","attendanceStatus":"not_recorded","attendanceRecordedBy":null,"attendanceRecordedAt":null,"cancellation":null,"replacementRequired":false,"replacementSessionId":null,"replacementForSessionId":null,"deletedAt":null,"deletedBy":null,"createdAt":"2026-11-01T00:00:00.000Z","updatedAt":"2026-11-01T00:00:00.000Z","version":1};
   const store={getAllSessions:()=>[row],getSession:()=>row,getBillableSessions:()=>[],createRecurringSessionSeries:()=>({success:true,sessions:[row]}),recordAttendance:(_id,_status,actor)=>{recordedActor=actor;return {success:true,session:{...row,status:"held",attendanceStatus:"present"}};},cancelSession:()=>({success:false,error:"NOT_ASSIGNED_TUTOR",message:"Tutor bukan penanggung jawab."}),softDeleteSession:()=>({success:true,session:{...row,status:"soft_deleted"}}),createReplacementSession:()=>({success:false,error:"REPLACEMENT_NOT_ALLOWED"}),subscribe:()=>()=>{}};
   const repo=createLocalDemoClassSessionRepository(store,()=>({id:"tutor-1",role:"tutor"}));
   return {attendance:await repo.recordAttendance("session-1","present"),cancel:await repo.cancelSession("session-1","alasan"),recordedActor};
  });
  expect(result.attendance.success).toBe(true);expect(result.recordedActor).toEqual({id:"tutor-1",role:"tutor"});expect(result.cancel.success).toBe(false);expect(result.cancel.error.code).toBe("NOT_ASSIGNED_TUTOR");
 });
 test("blocks unauthorized mutations and maps series and replacement results",async({page})=>{
  await page.goto("/");
  const result=await page.evaluate(async()=>{
   const {createLocalDemoClassSessionRepository}=await import("/src/data/local-demo-class-session-repository.ts");const row={"id":"session-1","seriesId":"series-1","sessionNumber":1,"studentId":"student-1","tutorId":"tutor-1","scheduledStartAt":"2026-11-20T02:00:00.000Z","durationMinutes":60,"meetingUrl":null,"status":"scheduled","attendanceStatus":"not_recorded","attendanceRecordedBy":null,"attendanceRecordedAt":null,"cancellation":null,"replacementRequired":false,"replacementSessionId":null,"replacementForSessionId":null,"deletedAt":null,"deletedBy":null,"createdAt":"2026-11-01T00:00:00.000Z","updatedAt":"2026-11-01T00:00:00.000Z","version":1};
   const store={getAllSessions:()=>[row],getSession:()=>row,getBillableSessions:()=>[],createRecurringSessionSeries:()=>({success:true,sessions:[row]}),recordAttendance:()=>({success:true,session:row}),cancelSession:()=>({success:true,session:row}),softDeleteSession:()=>({success:true,session:row}),createReplacementSession:()=>({success:true,original:row,replacement:{...row,id:"replacement-1"}}),subscribe:()=>()=>{}};
   const student=createLocalDemoClassSessionRepository(store,()=>({id:"student-1",role:"student"}));const admin=createLocalDemoClassSessionRepository(store,()=>({id:"admin-1",role:"admin"}));
   return {denied:await student.createRecurringSeries({studentId:"student-1",tutorId:"tutor-1",startDate:"2026-11-21",startTime:"09:00",weekdays:[6],targetCount:1,durationMinutes:60}),created:await admin.createRecurringSeries({studentId:"student-1",tutorId:"tutor-1",startDate:"2026-11-21",startTime:"09:00",weekdays:[6],targetCount:1,durationMinutes:60}),replacement:await admin.createReplacement("session-1",{scheduledStartAt:"2026-11-22T02:00:00.000Z"})};
  });
  expect(result.denied.success).toBe(false);expect(result.denied.error.code).toBe("FORBIDDEN");expect(result.created.success).toBe(true);expect(result.created.data).toHaveLength(1);expect(result.replacement.success).toBe(true);expect(result.replacement.data.replacement.id).toBe("replacement-1");
 });
});


test("scopes session reads to the active student or tutor",async({page})=>{
 await page.goto("/");
 const result=await page.evaluate(async()=>{
  const {createLocalDemoClassSessionRepository}=await import("/src/data/local-demo-class-session-repository.ts");
  const row=(id:string,studentId:string,tutorId:string)=>({id,seriesId:"series-1",sessionNumber:1,studentId,tutorId,scheduledStartAt:"2026-11-20T02:00:00.000Z",durationMinutes:60,meetingUrl:null,status:"scheduled",attendanceStatus:"not_recorded",attendanceRecordedBy:null,attendanceRecordedAt:null,cancellation:null,replacementRequired:false,replacementSessionId:null,replacementForSessionId:null,deletedAt:null,deletedBy:null,createdAt:"2026-11-01T00:00:00.000Z",updatedAt:"2026-11-01T00:00:00.000Z",version:1});
  const rows=[row("s1","student-1","tutor-1"),row("s2","student-2","tutor-2")];
  const store={getAllSessions:()=>rows,getSession:(id:string)=>rows.find(x=>x.id===id)??null,getBillableSessions:()=>rows,createRecurringSessionSeries:()=>({success:true,sessions:[]}),recordAttendance:()=>({success:false,error:"NOOP"}),cancelSession:()=>({success:false,error:"NOOP"}),softDeleteSession:()=>({success:false,error:"NOOP"}),createReplacementSession:()=>({success:false,error:"NOOP"}),subscribe:()=>()=>{}};
  const student=createLocalDemoClassSessionRepository(store,()=>({id:"student-1",role:"student"}));
  const tutor=createLocalDemoClassSessionRepository(store,()=>({id:"tutor-1",role:"tutor"}));
  return {studentRows:(await student.listSessions()).map(x=>x.id),studentForeign:await student.getSession("s2"),tutorRows:(await tutor.listSessions()).map(x=>x.id),tutorForeignFilter:(await tutor.listSessions({tutorId:"tutor-2"})).length,tutorOwn:(await tutor.getSession("s1"))?.id};
 });
 expect(result.studentRows).toEqual(["s1"]);expect(result.studentForeign).toBeNull();
 expect(result.tutorRows).toEqual(["s1"]);expect(result.tutorForeignFilter).toBe(0);expect(result.tutorOwn).toBe("s1");
});
