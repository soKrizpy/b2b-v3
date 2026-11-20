import {expect,test} from "@playwright/test";
test.describe("Canonical local-demo learning adapter",()=>{
 test("scopes progress and submissions to the active student",async({page})=>{
  await page.goto("/");
  const r=await page.evaluate(async()=>{
   const {createLocalDemoLearningRepository}=await import("/src/data/local-demo-learning-repository.ts");
   const map=new Map<string,Record<string,unknown>>();
   const row={id:"sub1",studentId:"s1",lessonId:"lesson1",status:"submitted" as const,version:3,submittedAt:"2026-11-20T00:00:00Z",updatedAt:"2026-11-20T00:00:00Z"};
   const store={getProgress:async(s:string,l:string)=>map.get(s+":"+l)??null,saveProgress:async(s:string,l:string,u:Record<string,unknown>)=>{const v={...u,updatedAt:"2026-11-20T01:00:00Z",version:2};map.set(s+":"+l,v);return v;},getAllSubmissions:async()=>[row],getSubmission:async(id:string)=>id==="sub1"?row:null,saveSubmission:async()=>row,updateSubmissionStatus:async()=>row,subscribe:()=>()=>{}};
   const own=createLocalDemoLearningRepository(store,()=>({id:"s1",role:"student"}));
   const other=createLocalDemoLearningRepository(store,()=>({id:"s2",role:"student"}));
   const input={studentId:"s1",lessonKey:"l1",topicId:7,state:"in-progress" as const,checkpoints:{move:true},submissionDraft:null,slideIndex:2,updatedAt:"2026-11-20T00:00:00Z",version:1};
   const saved=await own.saveLessonProgress(input);
   return {saved:saved.success,ownProgress:await own.getLessonProgress("s1","l1"),foreignProgress:await own.getLessonProgress("s2","l1"),ownSubmissions:(await own.listSubmissions()).length,foreignSubmissions:(await other.listSubmissions()).length,foreignRead:await other.getSubmission("sub1"),foreignWrite:await other.saveSubmission({...input,lessonKey:"l1"})};
  });
  expect(r.saved).toBe(true);expect(r.ownProgress?.version).toBe(2);expect(r.foreignProgress).toBeNull();
  expect(r.ownSubmissions).toBe(1);expect(r.foreignSubmissions).toBe(0);expect(r.foreignRead).toBeNull();
  expect(r.foreignWrite.success).toBe(false);
 });
 test("maps legacy lessonId and rejects stale submission updates",async({page})=>{
  await page.goto("/");
  const r=await page.evaluate(async()=>{
   const {createLocalDemoLearningRepository}=await import("/src/data/local-demo-learning-repository.ts");
   const row={id:"sub1",studentId:"s1",lessonId:"lesson1",status:"submitted" as const,version:3,submittedAt:"2026-11-20T00:00:00Z",updatedAt:"2026-11-20T00:00:00Z"};
   const store={getProgress:async()=>null,saveProgress:async()=>null,getAllSubmissions:async()=>[row],getSubmission:async()=>row,saveSubmission:async()=>null,updateSubmissionStatus:async()=>null,subscribe:()=>()=>{}};
   const repo=createLocalDemoLearningRepository(store,()=>({id:"s1",role:"student"}));
   const stale=await repo.saveSubmission({id:"sub1",expectedVersion:2,studentId:"s1",lessonKey:"lesson1",projectUrl:"",studentNotes:"",status:"submitted",checkpointsPassed:0,checkpointsTotal:0,quizScore:null,reviewerId:null,reviewerName:null,reviewedAt:null,teacherFeedback:null,submittedAt:"2026-11-20T00:00:00Z"});
   return {list:await repo.listSubmissions({studentId:"s1"}),stale};
  });
  expect(r.list[0].lessonKey).toBe("lesson1");expect(r.stale.success).toBe(false);expect(r.stale.error.code).toBe("STALE_UPDATE_CONFLICT");
 });
 test("requires an assigned active tutor and preserves delegated version conflict",async({page})=>{
  await page.goto("/");
  const r=await page.evaluate(async()=>{
   const {createLocalDemoLearningRepository}=await import("/src/data/local-demo-learning-repository.ts");
   const row={id:"sub1",studentId:"s1",lessonId:"lesson1",status:"submitted" as const,version:3,submittedAt:"2026-11-20T00:00:00Z",updatedAt:"2026-11-20T00:00:00Z"};
   const store={getProgress:async()=>null,saveProgress:async()=>null,getAllSubmissions:async()=>[row],getSubmission:async()=>row,saveSubmission:async()=>null,updateSubmissionStatus:async(_id:string,_s:"approved"|"revision-required",_a:unknown,v:number)=>({success:false as const,error:"STALE_UPDATE_CONFLICT",message:"Conflict",currentVersion:v+1}),subscribe:()=>()=>{}};
   const anonymous=await createLocalDemoLearningRepository(store).reviewSubmission("sub1","approved","",1);
   const unassigned=await createLocalDemoLearningRepository(store,()=>({id:"t1",role:"tutor",displayName:"Tutor"})).reviewSubmission("sub1","approved","",1);
   const assigned=await createLocalDemoLearningRepository(store,()=>({id:"t1",role:"tutor",displayName:"Tutor"}),()=>true).reviewSubmission("sub1","approved","",1);
   return {anonymous,unassigned,assigned};
  });
  expect(r.anonymous.success).toBe(false);expect(r.anonymous.error.code).toBe("FORBIDDEN");
  expect(r.unassigned.success).toBe(false);expect(r.unassigned.error.code).toBe("NOT_ASSIGNED_TUTOR");
  expect(r.assigned.success).toBe(false);expect(r.assigned.error.code).toBe("STALE_UPDATE_CONFLICT");
 });
});
