"use server";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { parse as parseCsv } from "csv-parse/sync";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { query,transaction,audit } from "@/lib/db";
import { checkPassword,startSession,endSession,requestFingerprint,limitRequest,requireRole,requireStaff } from "@/lib/auth";
import { newCertificateId,secretHash,secureToken } from "@/lib/crypto";

function field(data:FormData,key:string):string {return String(data.get(key)||"").trim();}
function notice(message:string):never { redirect("/dashboard?notice="+encodeURIComponent(message)); }
const candidateSchema=z.object({
 legalName:z.string().min(3).max(160),
 email:z.email().max(254),
 phone:z.string().max(30),
 cohort:z.string().min(2).max(120),
 score:z.number().min(0).max(100),
 outcome:z.enum(["passed","failed"]),
 programId:z.uuid()
});
export async function login(data:FormData) {
 const email=field(data,"email").toLowerCase(),password=field(data,"password");
 await limitRequest("login",await requestFingerprint()+":"+email,8,15);
 if(!email||!password||password.length>200) redirect("/login?error=invalid");
 const account=await checkPassword(email,password);
 if(!account) redirect("/login?error=invalid");
 await startSession(account.id);
 await audit(account.id,"staff.login","staff",account.id);
 redirect("/dashboard");
}
export async function logout() {await endSession();redirect("/login");}

export async function addProgram(data:FormData) {
 const staff=await requireRole("admin","approver");
 const parsed=z.object({code:z.string().min(2).max(24).regex(/^[A-Z0-9_-]+$/),
  title:z.string().min(4).max(160),description:z.string().max(1000),
  months:z.union([z.literal(""),z.coerce.number().int().min(1).max(240)])})
  .parse({code:field(data,"code").toUpperCase(),title:field(data,"title"),description:field(data,"description"),months:field(data,"months")});
 const rows=await query<{id:string}>("INSERT INTO programs(code,title,description,validity_months) VALUES($1,$2,$3,$4) RETURNING id",
 [parsed.code,parsed.title,parsed.description,parsed.months===""?null:parsed.months]);
 await audit(staff.id,"program.create","program",rows[0].id);
 notice("Training program created.");
}
async function createCandidate(input:z.infer<typeof candidateSchema>, staffId:string) {
 return transaction(async client=>{
  const candidate=(await client.query<{id:string}>(
   "INSERT INTO candidates(legal_name,email,phone,created_by) VALUES($1,$2,$3,$4) RETURNING id",
   [input.legalName,input.email.toLowerCase(),input.phone||null,staffId])).rows[0];
  const enrollment=(await client.query<{id:string}>(
   "INSERT INTO enrollments(candidate_id,program_id,cohort,score,outcome,submitted_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
   [candidate.id,input.programId,input.cohort,input.score,input.outcome,staffId])).rows[0];
  await client.query("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES($1,'enrollment.submit','enrollment',$2)",[staffId,enrollment.id]);
  return enrollment.id;
 });
}
export async function addCandidate(data:FormData) {
 const staff=await requireRole("admin","data_entry","approver");
 const input=candidateSchema.parse({
   legalName:field(data,"legalName"),email:field(data,"email"),phone:field(data,"phone"),
   cohort:field(data,"cohort"),score:Number(field(data,"score")),outcome:field(data,"outcome"),programId:field(data,"programId")
 });
 await createCandidate(input,staff.id);
 notice("Candidate recorded for independent approval.");
}
export async function importCandidates(data:FormData) {
 const staff=await requireRole("admin","data_entry","approver");
 const programId=z.uuid().parse(field(data,"programId"));
 const file=data.get("csv");
 if(!(file instanceof File)) throw new Error("Choose a CSV file.");
 if(file.size>512_000) throw new Error("CSV file is too large.");
 const rows=parseCsv(await file.text(),{columns:true,skip_empty_lines:true,trim:true,bom:true}) as Record<string,string>[];
 if(rows.length<1||rows.length>250) throw new Error("Import between 1 and 250 candidates per batch.");
 const inputs=rows.map(r=>candidateSchema.parse({
  legalName:r.legalName,email:r.email,phone:r.phone||"",cohort:r.cohort,
  score:Number(r.score),outcome:r.outcome,programId
 }));
 await transaction(async client=>{
  for(const input of inputs) {
    const candidate=(await client.query<{id:string}>("INSERT INTO candidates(legal_name,email,phone,created_by) VALUES($1,$2,$3,$4) RETURNING id",
       [input.legalName,input.email.toLowerCase(),input.phone||null,staff.id])).rows[0];
    const enrollment=(await client.query<{id:string}>("INSERT INTO enrollments(candidate_id,program_id,cohort,score,outcome,submitted_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
       [candidate.id,input.programId,input.cohort,input.score,input.outcome,staff.id])).rows[0];
    await client.query("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES($1,'enrollment.import','enrollment',$2)",[staff.id,enrollment.id]);
  }
 });
 notice(inputs.length+" candidates imported for review.");
}
export async function decideEnrollment(data:FormData) {
 const staff=await requireRole("admin","approver");
 const id=z.uuid().parse(field(data,"enrollmentId")),decision=z.enum(["approve","reject"]).parse(field(data,"decision"));
 const reason=field(data,"reason");
 const certificateId=await transaction(async client=>{
  const result=await client.query<{id:string;state:string;outcome:string;submitted_by:string;validity_months:number|null;legal_name:string;title:string}>(`
    SELECT e.id,e.state,e.outcome,e.submitted_by,p.validity_months,c.legal_name,p.title
    FROM enrollments e JOIN programs p ON p.id=e.program_id JOIN candidates c ON c.id=e.candidate_id
    WHERE e.id=$1 FOR UPDATE OF e`,[id]);
  const row=result.rows[0];
  if(!row||row.state!=="submitted") throw new Error("Enrollment is not awaiting review.");
  if(row.submitted_by===staff.id) throw new Error("A different officer must approve the candidate.");
  if(decision==="approve"&&row.outcome!=="passed") throw new Error("Failed candidates cannot receive a certificate.");
  if(decision==="reject"&&reason.length<10) throw new Error("Please provide a meaningful rejection reason.");
  await client.query("UPDATE enrollments SET state=$2,decided_by=$3,decided_at=now(),decided_reason=$4 WHERE id=$1",
    [id,decision==="approve"?"approved":"rejected",staff.id,reason||null]);
  if(decision==="reject") {
    await client.query("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES($1,'enrollment.reject','enrollment',$2,$3)",
      [staff.id,id,JSON.stringify({reason})]);
    return null;
  }
  const issuer=(process.env.ISSUER_NAME||"Demonstration Training Organization").trim();
  const approved=process.env.ISSUER_APPROVED==="true";
  if(approved && (!process.env.ISSUER_NAME || /demo/i.test(issuer))) throw new Error("Configure an approved real issuer name first.");
  const publicId=newCertificateId();
  const created=(await client.query<{id:string}>(`INSERT INTO certificates(enrollment_id,public_id,holder_name,course_title,issuer_name,is_demo,expires_at,created_by)
    VALUES($1,$2,$3,$4,$5,$6,CASE WHEN $7::integer IS NULL THEN NULL ELSE (CURRENT_DATE+($7::integer||' months')::interval)::date END,$8) RETURNING id`,
    [id,publicId,row.legal_name,row.title,issuer,!approved,row.validity_months,staff.id])).rows[0];
  await client.query("INSERT INTO certificate_events(certificate_id,action,actor_id) VALUES($1,'issued',$2)",[created.id,staff.id]);
  await client.query("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES($1,'certificate.issue','certificate',$2,$3)",
    [staff.id,created.id,JSON.stringify({publicId,isDemo:!approved})]);
  return publicId;
 });
 notice(certificateId?"Certificate issued: "+certificateId:"Enrollment rejected.");
}
export async function changeCertificateStatus(data:FormData) {
 const staff=await requireRole("admin","approver");
 const id=z.uuid().parse(field(data,"certificateId")),state=z.enum(["active","suspended","revoked"]).parse(field(data,"state"));
 const reason=field(data,"reason");
 if(reason.length<10||reason.length>500) throw new Error("Enter a reason between 10 and 500 characters.");
 await transaction(async client=>{
  const found=(await client.query<{state:string}>(`SELECT state FROM certificates WHERE id=$1 FOR UPDATE`,[id])).rows[0];
  if(!found) throw new Error("Certificate does not exist.");
  if(found.state==="revoked") throw new Error("Revocation is final. Issue a replacement after a new independent review.");
  if(state==="active"&&found.state!=="suspended") throw new Error("Only suspended certificates may be reactivated.");
  if(state===found.state) throw new Error("Certificate is already in this state.");
  await client.query("UPDATE certificates SET state=$2,last_reason=$3,updated_at=now() WHERE id=$1",[id,state,reason]);
  await client.query("INSERT INTO certificate_events(certificate_id,action,reason,actor_id) VALUES($1,$2,$3,$4)",[id,state,reason,staff.id]);
  await client.query("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'certificate',$3,$4)",
    [staff.id,"certificate."+state,id,JSON.stringify({reason})]);
 });
 notice("Certificate status updated.");
}
export async function addStaff(data:FormData) {
 const actor=await requireRole("admin");
 const email=z.email().parse(field(data,"email").toLowerCase()),role=z.enum(["admin","data_entry","approver","auditor"]).parse(field(data,"role"));
 const password=field(data,"password");
 if(password.length<14||password.length>200) throw new Error("Temporary password must be 14–200 characters.");
 const hash=await bcrypt.hash(password,12);
 const created=await query<{id:string}>("INSERT INTO staff(email,password_hash,role) VALUES($1,$2,$3) RETURNING id",[email,hash,role]);
 await audit(actor.id,"staff.create","staff",created[0].id,{role});
 notice("Staff account created. Give their temporary password securely and ask them to change it.");
}
export async function disableStaff(data:FormData) {
 const actor=await requireRole("admin"),id=z.uuid().parse(field(data,"staffId"));
 if(actor.id===id) throw new Error("You cannot deactivate your own account.");
 await transaction(async client=>{
   await client.query("UPDATE staff SET enabled=false WHERE id=$1",[id]);
   await client.query("DELETE FROM sessions WHERE staff_id=$1",[id]);
 });
 await audit(actor.id,"staff.disable","staff",id);
 notice("Staff access disabled.");
}
export type ApiKeyState={error?:string;token?:string};
export async function createApiKey(_:ApiKeyState,data:FormData):Promise<ApiKeyState> {
 try {
  const staff=await requireRole("admin");
  const label=z.string().min(3).max(100).parse(field(data,"label"));
  const token=secureToken(process.env.ISSUER_APPROVED==="true"?"vfy_live_":"vfy_test_");
  const item=await query<{id:string}>("INSERT INTO api_clients(label,token_hash,created_by) VALUES($1,$2,$3) RETURNING id",[label,secretHash(token),staff.id]);
  await audit(staff.id,"api_client.create","api_client",item[0].id,{label});
  return {token};
 } catch(e) {return {error:e instanceof Error?e.message:"Could not create key"};}
}
export async function revokeApiKey(data:FormData) {
 const staff=await requireRole("admin"),id=z.uuid().parse(field(data,"clientId"));
 await query("UPDATE api_clients SET revoked_at=now() WHERE id=$1 AND revoked_at IS NULL",[id]);
 await audit(staff.id,"api_client.revoke","api_client",id);
 notice("API client revoked.");
}

export async function changeOwnPassword(data:FormData) {
 const staff=await requireStaff();
 const current=field(data,"currentPassword"),replacement=field(data,"newPassword");
 if(replacement.length<14||replacement.length>200||current===replacement)throw new Error("Use a new password of 14–200 characters.");
 if(!await checkPassword(staff.email,current))throw new Error("Current password does not match.");
 const hash=await bcrypt.hash(replacement,12);
 await transaction(async client=>{
  await client.query("UPDATE staff SET password_hash=$2 WHERE id=$1",[staff.id,hash]);
  await client.query("DELETE FROM sessions WHERE staff_id=$1",[staff.id]);
 });
 await audit(staff.id,"staff.password_changed","staff",staff.id);
 await endSession();
 redirect("/login");
}
