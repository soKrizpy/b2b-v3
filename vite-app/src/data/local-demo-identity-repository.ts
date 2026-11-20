import type {
  AccountStatus, AppUser, AppRole, IdentityRepository, RepositoryChangeEvent,
  RepositoryResult, TutorStudentAssignment
} from "./domain-contracts";
type DemoActor = { id: string; role: AppRole };
type LegacyUser = { id:string; email:string; displayName:string; role:AppRole|"teacher"; status:AccountStatus; avatar?:string; gradeLevel?:string; createdAt:string; updatedAt:string };
type LegacyAssignment = { id:string; tutorId:string; studentId:string; status:"active"|"inactive"; createdAt:string; endedAt?:string };
type LegacyUserMutation = { user:LegacyUser } | { error:string; message:string };
type LegacyAssignmentMutation = { assignment:LegacyAssignment } | { error:string; message:string };
type LegacyIdentityEvent = { action?:string; meta?:Record<string,unknown>|null; timestamp?:string };
export interface LocalDemoIdentityStorePort {
 getAllUsers(filters?:{role?:AppRole;status?:AccountStatus}):LegacyUser[];
 getUserById(userId:string):LegacyUser|null;
 getAllAssignments():LegacyAssignment[];
 createUser(input:Record<string,unknown>):LegacyUserMutation;
 updateUser(userId:string,changes:Record<string,unknown>):LegacyUserMutation;
 activateUser(userId:string):LegacyUserMutation;
 deactivateUser(userId:string):LegacyUserMutation;
 assignStudentToTutor(tutorId:string,studentId:string):LegacyAssignmentMutation;
 removeTutorStudentAssignment(tutorId:string,studentId:string):boolean;
 subscribe(callback:(event:LegacyIdentityEvent)=>void):()=>void;
}
function toAppUser(user:LegacyUser):AppUser {
 return {id:user.id,email:user.email,displayName:user.displayName,role:user.role==="teacher"?"tutor":user.role,status:user.status,avatar:user.avatar??null,gradeLevel:user.gradeLevel??null,createdAt:user.createdAt,updatedAt:user.updatedAt};
}
function toAssignment(value:LegacyAssignment):TutorStudentAssignment {
 return {id:value.id,tutorId:value.tutorId,studentId:value.studentId,status:value.status,createdAt:value.createdAt,endedAt:value.endedAt??null};
}
function failure<T>(code:string,message:string):RepositoryResult<T>{return {success:false,error:{code,message}};}
function userMutationResult(result:LegacyUserMutation):RepositoryResult<AppUser>{
 if("error" in result)return failure(result.error,result.message);
 return {success:true,data:toAppUser(result.user)};
}
export function createLocalDemoIdentityRepository(store:LocalDemoIdentityStorePort,getActor:()=>DemoActor|null=()=>null):IdentityRepository {
 const isAdmin=()=>getActor()?.role==="admin";
 const canViewUser=(user:LegacyUser,actor:DemoActor):boolean=>{
  if(actor.role==="admin")return true;
  if(actor.role==="student")return user.id===actor.id;
  if(actor.role==="tutor")return user.id===actor.id||user.role==="student"&&store.getAllAssignments().some(a=>a.tutorId===actor.id&&a.studentId===user.id&&a.status==="active");
  return false;
 };
 return {
  async listUsers(filters){
   const actor=getActor();if(!actor)return [];
   const users=store.getAllUsers().filter(user=>canViewUser(user,actor));
   return users.filter(user=>!filters?.role||(user.role==="teacher"?"tutor":user.role)===filters.role).filter(user=>!filters?.status||user.status===filters.status).map(toAppUser);
  },
  async getUser(userId){
   const actor=getActor();if(!actor)return null;
   const user=store.getUserById(userId);return user&&canViewUser(user,actor)?toAppUser(user):null;
  },
  async createUser(input){
   if(!isAdmin())return failure("FORBIDDEN","Sesi admin diperlukan untuk membuat akun.");
   return userMutationResult(store.createUser({...input}));
  },
  async updateUser(userId,changes){
   if(!isAdmin())return failure("FORBIDDEN","Sesi admin diperlukan untuk mengubah akun.");
   return userMutationResult(store.updateUser(userId,{...changes}));
  },
  async setAccountStatus(userId,status){
   if(!isAdmin())return failure("FORBIDDEN","Sesi admin diperlukan untuk mengubah status akun.");
   return userMutationResult(status==="active"?store.activateUser(userId):store.deactivateUser(userId));
  },
  async listAssignments(filters){
   const actor=getActor();if(!actor)return [];
   if(actor.role==="admin")return store.getAllAssignments().filter(a=>!filters?.tutorId||a.tutorId===filters.tutorId).filter(a=>!filters?.studentId||a.studentId===filters.studentId).filter(a=>!filters?.status||a.status===filters.status).map(toAssignment);
   const own=store.getAllAssignments().filter(a=>actor.role==="tutor"?a.tutorId===actor.id:a.studentId===actor.id);
   return own.filter(a=>!filters?.tutorId||a.tutorId===filters.tutorId).filter(a=>!filters?.studentId||a.studentId===filters.studentId).filter(a=>!filters?.status||a.status===filters.status).map(toAssignment);
  },
  async assignStudent(tutorId,studentId){
   if(!isAdmin())return failure("FORBIDDEN","Sesi admin diperlukan untuk mengatur penugasan tutor.");
   const result=store.assignStudentToTutor(tutorId,studentId);
   if("error" in result)return failure(result.error,result.message);
   return {success:true,data:toAssignment(result.assignment)};
  },
  async endAssignment(tutorId,studentId){
   if(!isAdmin())return failure("FORBIDDEN","Sesi admin diperlukan untuk mengakhiri penugasan tutor.");
   const ended=store.removeTutorStudentAssignment(tutorId,studentId);
   if(!ended)return failure("ASSIGNMENT_NOT_FOUND","Penugasan aktif tidak ditemukan.");
   const assignment=store.getAllAssignments().find(item=>item.tutorId===tutorId&&item.studentId===studentId&&item.status==="inactive");
   if(!assignment)return failure("ASSIGNMENT_NOT_FOUND","Penugasan yang diakhiri tidak dapat dibaca kembali.");
   return {success:true,data:toAssignment(assignment)};
  },
  subscribe(listener){
   return store.subscribe(event=>{
    const occurredAt=event.timestamp&&!Number.isNaN(Date.parse(event.timestamp))?new Date(event.timestamp).toISOString():new Date().toISOString();
    const entityIdValue=event.meta?.userId??event.meta?.tutorId??event.meta?.studentId;
    const change:RepositoryChangeEvent={domain:"identity",action:event.action??"changed",...(typeof entityIdValue==="string"?{entityId:entityIdValue}:{}),occurredAt};
    listener(change);
   });
  }
 };
}
