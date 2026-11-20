import type { LearningRepository, LessonProgress, LessonProgressState, RepositoryChangeEvent, RepositoryResult, StudentSubmission, SubmissionStatus } from "./domain-contracts";
type DemoActor = { id: string; role: "admin" | "tutor" | "student"; displayName?: string };
type LegacyProgress = Partial<LessonProgress>;
type LegacySubmission = { id:string; studentId:string; lessonId:string; status:SubmissionStatus; studentName?:string; studentGrade?:string; studentAvatar?:string; lessonTitle?:string; projectUrl?:string; studentNotes?:string; checkpointsPassed?:number; checkpointsTotal?:number; quizScore?:string|null; reviewerId?:string|null; reviewerName?:string|null; reviewedAt?:string|null; teacherFeedback?:string|null; version?:number; submittedAt?:string; updatedAt?:string };
type ReviewFailure = {success:false;error:string;message?:string;currentVersion?:number};
export interface LocalDemoLearningStorePort {
 getProgress(studentId:string,lessonKey:string):Promise<LegacyProgress|null>;
 saveProgress(studentId:string,lessonKey:string,updates:Partial<LessonProgress>):Promise<LegacyProgress>;
 getAllSubmissions():Promise<LegacySubmission[]>;
 getSubmission(id:string):Promise<LegacySubmission|null>;
 saveSubmission(input:Record<string,unknown>):Promise<LegacySubmission|null>;
 updateSubmissionStatus(id:string,status:"approved"|"revision-required",actor:{reviewerId:string;reviewerName:string;teacherFeedback:string},expectedVersion:number):Promise<LegacySubmission|ReviewFailure|null>;
 subscribe(callback:(event:{action?:string;meta?:Record<string,unknown>|null;timestamp?:string;lessonKey?:string})=>void):()=>void;
}
const states=new Set<LessonProgressState>(["not-started","in-progress","practice-completed","submitted","revision-required","approved"]);
const iso=(v:unknown,fallback=new Date(0).toISOString())=>typeof v==="string"&&!Number.isNaN(Date.parse(v))?new Date(v).toISOString():fallback;
function progressDto(v:LegacyProgress|null,studentId:string,lessonKey:string):LessonProgress|null {
 if(!v)return null;
 const draft=v.submissionDraft;
 return {studentId,lessonKey,topicId:Number.isInteger(v.topicId)?v.topicId as number:null,state:states.has(v.state as LessonProgressState)?v.state as LessonProgressState:"not-started",checkpoints:v.checkpoints&&typeof v.checkpoints==="object"?v.checkpoints:{},submissionDraft:draft&&typeof draft.link==="string"&&typeof draft.notes==="string"?{link:draft.link,notes:draft.notes}:null,slideIndex:Number.isInteger(v.slideIndex)&&Number(v.slideIndex)>=0?Number(v.slideIndex):0,updatedAt:iso(v.updatedAt),version:Number.isInteger(v.version)&&Number(v.version)>0?Number(v.version):1};
}
function submissionDto(v:LegacySubmission):StudentSubmission {
 const submittedAt=iso(v.submittedAt);
 return {id:v.id,studentId:v.studentId,...(v.studentName?{studentName:v.studentName}:{}),...(v.studentGrade?{studentGrade:v.studentGrade}:{}),...(v.studentAvatar?{studentAvatar:v.studentAvatar}:{}),lessonKey:v.lessonId,...(v.lessonTitle?{lessonTitle:v.lessonTitle}:{}),projectUrl:v.projectUrl??"",studentNotes:v.studentNotes??"",status:v.status,checkpointsPassed:Number.isFinite(v.checkpointsPassed)?v.checkpointsPassed as number:0,checkpointsTotal:Number.isFinite(v.checkpointsTotal)?v.checkpointsTotal as number:0,quizScore:v.quizScore??null,reviewerId:v.reviewerId??null,reviewerName:v.reviewerName??null,reviewedAt:v.reviewedAt?iso(v.reviewedAt):null,teacherFeedback:v.teacherFeedback??null,version:Number.isInteger(v.version)&&v.version!>0?v.version!:1,submittedAt,updatedAt:iso(v.updatedAt,submittedAt)};
}
const fail=<T>(code:string,message:string,details?:unknown):RepositoryResult<T>=>({success:false,error:{code,message,...(details===undefined?{}:{details})}});
function isReviewFailure(value:LegacySubmission|ReviewFailure):value is ReviewFailure{return "success" in value && value.success===false;}
export function createLocalDemoLearningRepository(
 store:LocalDemoLearningStorePort,
 getActor:()=>DemoActor|null=()=>null,
 isTutorAssigned:(tutorId:string,studentId:string)=>boolean=()=>false
):LearningRepository {
 const canReadStudent=(studentId:string):boolean=>{
  const actor=getActor();
  return Boolean(actor&&(actor.role==="admin"||actor.role==="student"&&actor.id===studentId||actor.role==="tutor"&&isTutorAssigned(actor.id,studentId)));
 };
 return {
  async getLessonProgress(studentId,lessonKey){if(!studentId||!lessonKey||!canReadStudent(studentId))return null;return progressDto(await store.getProgress(studentId,lessonKey),studentId,lessonKey);},
  async saveLessonProgress(value){const actor=getActor();if(!actor||actor.role!=="student"||actor.id!==value.studentId)return fail("FORBIDDEN","Siswa hanya dapat menyimpan progres miliknya sendiri.");if(!value.lessonKey)return fail("INVALID_PROGRESS","lessonKey wajib diisi.");try{const saved=progressDto(await store.saveProgress(value.studentId,value.lessonKey,value),value.studentId,value.lessonKey);return saved?{success:true,data:saved}:fail("SAVE_FAILED","Hasil penyimpanan progres tidak valid.");}catch(e){return fail("SAVE_FAILED",e instanceof Error?e.message:"Gagal menyimpan progres.");}},
  async listSubmissions(filters){const actor=getActor();if(!actor)return [];return (await store.getAllSubmissions()).filter(x=>canReadStudent(x.studentId)).map(submissionDto).filter(x=>!filters?.studentId||x.studentId===filters.studentId).filter(x=>!filters?.status||x.status===filters.status).sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt));},
  async getSubmission(id){const actor=getActor();if(!actor)return null;const v=await store.getSubmission(id);return v&&canReadStudent(v.studentId)?submissionDto(v):null;},
  async saveSubmission(input){
   const actor=getActor();
   if(!actor||actor.role!=="student"||actor.id!==input.studentId)return fail("FORBIDDEN","Siswa hanya dapat mengirim karya atas namanya sendiri.");
   if(!input.studentId||!input.lessonKey)return fail("INVALID_SUBMISSION","studentId dan lessonKey wajib diisi.");
   if(input.status!=="submitted")return fail("INVALID_STATUS","Siswa hanya dapat mengirim submission dengan status submitted.");
   if(input.id){const existing=await store.getSubmission(input.id);if(existing&&existing.studentId!==actor.id)return fail("FORBIDDEN","Submission milik siswa lain tidak dapat diubah.");if(existing?.status==="approved")return fail("INVALID_TRANSITION","Submission yang sudah disetujui tidak dapat dikirim ulang.");}
   if(input.expectedVersion!==undefined){if(!input.id)return fail("INVALID_VERSION","expectedVersion hanya berlaku saat memperbarui submission.");const current=await store.getSubmission(input.id);if(!current)return fail("NOT_FOUND","Submission tidak ditemukan.");const version=Number(current.version)||1;if(version!==input.expectedVersion)return fail("STALE_UPDATE_CONFLICT","Submission telah berubah. Muat ulang sebelum menyimpan.",{expectedVersion:input.expectedVersion,currentVersion:version});}
   const payload:Record<string,unknown>={...(input.id?{id:input.id}:{}),studentId:actor.id,studentName:input.studentName,studentGrade:input.studentGrade,studentAvatar:input.studentAvatar,lessonId:input.lessonKey,lessonTitle:input.lessonTitle,projectUrl:input.projectUrl,studentNotes:input.studentNotes,status:input.status,checkpointsPassed:input.checkpointsPassed,checkpointsTotal:input.checkpointsTotal,quizScore:input.quizScore,submittedAt:input.submittedAt};
   try{const saved=await store.saveSubmission(payload);return saved?{success:true,data:submissionDto(saved)}:fail("SAVE_FAILED","Submission gagal disimpan.");}catch(e){return fail("SAVE_FAILED",e instanceof Error?e.message:"Gagal menyimpan submission.");}
  },
  async reviewSubmission(id,status,feedback,expectedVersion){
   const actor=getActor();if(!actor||actor.role!=="tutor")return fail("FORBIDDEN","Sesi tutor aktif diperlukan untuk meninjau submission.");
   if(status==="revision-required"&&!feedback.trim())return fail("FEEDBACK_REQUIRED","Catatan revisi wajib diisi.");
   const current=await store.getSubmission(id);if(!current)return fail("NOT_FOUND","Submission tidak ditemukan.");
   if(!["submitted","revision-required"].includes(current.status))return fail("INVALID_TRANSITION","Hanya submission yang menunggu peninjauan atau revisi yang dapat ditinjau.");
   if(!isTutorAssigned(actor.id,current.studentId))return fail("NOT_ASSIGNED_TUTOR","Tutor tidak memiliki penugasan aktif untuk siswa ini.");
   try{const result=await store.updateSubmissionStatus(id,status,{reviewerId:actor.id,reviewerName:actor.displayName??actor.id,teacherFeedback:feedback},expectedVersion);if(!result)return fail("REVIEW_FAILED","Review gagal disimpan atau data tidak valid.");if(isReviewFailure(result))return fail(result.error,result.message??"Review ditolak.",{currentVersion:result.currentVersion});return {success:true,data:submissionDto(result)};}catch(e){return fail("REVIEW_FAILED",e instanceof Error?e.message:"Gagal menyimpan review.");}
  },
  subscribe(listener){return store.subscribe(event=>{const when=event.timestamp&& !Number.isNaN(Date.parse(event.timestamp))?new Date(event.timestamp).toISOString():new Date().toISOString();const id=typeof event.meta?.submissionId==="string"?event.meta.submissionId:typeof event.lessonKey==="string"?event.lessonKey:undefined;const change:RepositoryChangeEvent={domain:"learning",action:event.action??"changed",...(id?{entityId:id}:{}),occurredAt:when};listener(change);});}
 };
}
