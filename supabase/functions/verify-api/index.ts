// Verified independent registry API for GitHub Pages + Supabase Free.
// This function intentionally uses custom session/API-key authentication.
// Supabase gateway JWT verification is disabled so public lookups work.
// Never put the DB connection or application signing secrets in browser code.
import postgres from "npm:postgres@3.4.7";
import bcrypt from "npm:bcryptjs@2.4.3";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import QRCode from "npm:qrcode@1.5.4";

const dbURL=Deno.env.get("SUPABASE_DB_URL");
if(!dbURL)throw new Error("Missing SUPABASE_DB_URL");
const db=postgres(dbURL,{prepare:false,max:1});
const ORIGIN="https://kinglove58.github.io";
const CORS={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization","Vary":"Origin"};
const headers={"Cache-Control":"no-store",...CORS};
function out(data:unknown,status=200){return Response.json(data,{status,headers});}
function failure(message:string,status=400){return out({error:message},status);}
function str(v:unknown,max=180){return typeof v==="string"?v.trim().slice(0,max):"";}
function safeId(s:string){return /^SMT-20\d{2}(?:-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}){4}$/.test(s);}
function masked(n:string){return n.trim().split(/\s+/).map(x=>x[0]?.toUpperCase()+"***").join(" ");}
function effective(state:string,expiry:string|null){return state!=="active"?state:expiry&&expiry.slice(0,10)<new Date().toISOString().slice(0,10)?"expired":"active";}
async function digest(v:string){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("");}
function token(prefix=""){const a=new Uint8Array(32);crypto.getRandomValues(a);return prefix+btoa(String.fromCharCode(...a)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");}
function newId(){const a="23456789ABCDEFGHJKLMNPQRSTUVWXYZ";const b=new Uint8Array(16);crypto.getRandomValues(b);return "SMT-"+new Date().getUTCFullYear()+"-"+[0,4,8,12].map(n=>Array.from(b.slice(n,n+4)).map(x=>a[x%a.length]).join("")).join("-");}
async function rate(scope:string,subject:string,max:number,mins:number){
  const bucket=Math.floor(Date.now()/(mins*60000));
  const fp=await digest(scope+":"+subject);
  const rows=await db.unsafe("INSERT INTO request_limits(scope,fingerprint,bucket,hits) VALUES($1,$2,$3,1) ON CONFLICT(scope,fingerprint,bucket) DO UPDATE SET hits=request_limits.hits+1 RETURNING hits",[scope,fp,bucket]);
  if(Number(rows[0].hits)>max)throw new HttpErr(429,"Too many requests");
}
class HttpErr extends Error{constructor(public status:number,message:string){super(message);}}
function must(condition:unknown,message:string,status=400){if(!condition)throw new HttpErr(status,message);}
async function body(req:Request){const b=await req.json().catch(()=>null);must(b&&typeof b==="object"&&!Array.isArray(b),"Invalid JSON body");return b as Record<string,unknown>;}
async function authorize(req:Request,roles?:string[]){
  const bearer=req.headers.get("authorization")||"";
  const v=bearer.startsWith("Bearer ")?bearer.slice(7):"";
  must(v.startsWith("vfy_session_"),"Staff sign-in required",401);
  const h=await digest(v);
  const rows=await db.unsafe("SELECT s.id,s.email,s.role FROM sessions t JOIN staff s ON s.id=t.staff_id WHERE t.token_hash=$1 AND t.expires_at>now() AND s.enabled=true",[h]);
  const user=rows[0];
  must(user,"Session expired or unauthorized",401);
  if(roles)must(roles.includes(user.role),"Insufficient permission",403);
  return user as {id:string;email:string;role:string};
}
async function authorizeClient(req:Request){
  const v=(req.headers.get("authorization")||"").replace(/^Bearer /,"");
  must(/^vfy_(test|live)_[A-Za-z0-9_-]{40,}$/.test(v),"Invalid integration credential",401);
  const rows=await db.unsafe("SELECT id,label FROM api_clients WHERE token_hash=$1 AND revoked_at IS NULL",[await digest(v)]);
  must(rows[0],"Integration unauthorized",401);
  await rate("client",rows[0].id,240,1);
  return rows[0];
}
async function certificate(publicId:string){
  if(!safeId(publicId))return null;
  const rows=await db.unsafe("SELECT c.id,c.public_id,c.holder_name,c.course_title,c.issuer_name,c.is_demo,c.state,c.issued_at,c.expires_at,ca.email FROM certificates c JOIN enrollments en ON en.id=c.enrollment_id JOIN candidates ca ON ca.id=en.candidate_id WHERE c.public_id=$1",[publicId]);
  return rows[0]||null;
}
function present(c:any){return {id:c.public_id,status:effective(c.state,c.expires_at),holder:masked(c.holder_name),course:c.course_title,issuer:c.issuer_name,isDemo:c.is_demo,issuedAt:String(c.issued_at).slice(0,10),expiresAt:c.expires_at?String(c.expires_at).slice(0,10):null,type:"training_completion"};}
function emailOkay(s:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&s.length<=254;}
const audit=async(actor:string|null,action:string,entity:string,id:string,meta:Record<string,unknown>={})=>{await db.unsafe("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5::jsonb)",[actor,action,entity,id,JSON.stringify(meta)])};
async function handle(req:Request):Promise<Response>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});
  const u=new URL(req.url);let path=u.pathname.replace(/^.*?\/functions\/v1\/verify-api/,"")||"/";
  if(path.length>200)return failure("Invalid path",400);
  if(req.method==="GET"&&path==="/health"){
    const x=await db.unsafe("SELECT count(*)::integer AS n FROM programs");
    return out({status:"ok",database:true,programs:x[0].n});
  }
  if(req.method==="GET"&&path.startsWith("/public/")){
    await rate("lookup",req.headers.get("x-forwarded-for")||"anon",60,1);
    const cert=await certificate(path.slice("/public/".length).toUpperCase());
    return cert?out(present(cert)):failure("Certificate not found",404);
  }
  if(req.method==="POST"&&path==="/login"){
    const b=await body(req),email=str(b.email).toLowerCase(),password=str(b.password,200);
    await rate("login",req.headers.get("x-forwarded-for")||"unknown",12,15);
    must(emailOkay(email)&&password,"Invalid credentials",401);
    const result=await db.unsafe("SELECT id,email,role,password_hash FROM staff WHERE email=$1 AND enabled=true",[email]);
    const user=result[0];
    const valid=await bcrypt.compare(password,user?.password_hash||"$2a$12$C6UzMDM.H6dfI/f/IKxGhuF9s9G2y7z/7Q87c3BaaLX0GA1Qfu/9a");
    must(valid&&user,"Invalid credentials",401);
    const value=token("vfy_session_");
    await db.unsafe("INSERT INTO sessions(staff_id,token_hash,expires_at) VALUES($1,$2,now()+interval '8 hours')",[user.id,await digest(value)]);
    await audit(user.id,"staff.login","staff",user.id);
    return out({token:value,user:{id:user.id,email:user.email,role:user.role},expiresInSeconds:28800});
  }
  if(req.method==="POST"&&path==="/logout"){
    const user=await authorize(req);
    const h=await digest((req.headers.get("authorization")||"").slice(7));
    await db.unsafe("DELETE FROM sessions WHERE token_hash=$1",[h]);
    return out({ok:true});
  }
  if(req.method==="POST"&&path==="/account/password"){
    const actor=await authorize(req),b=await body(req),old=str(b.currentPassword,200),replacement=str(b.newPassword,200);
    must(replacement.length>=14&&replacement.length<=200&&old!==replacement,"New password must be at least 14 characters and different");
    const row=await db.unsafe("SELECT password_hash FROM staff WHERE id=$1",[actor.id]);
    must(await bcrypt.compare(old,row[0].password_hash),"Current password incorrect",401);
    await db.begin(async tx=>{
      await tx.unsafe("UPDATE staff SET password_hash=$1 WHERE id=$2",[await bcrypt.hash(replacement,12),actor.id]);
      await tx.unsafe("DELETE FROM sessions WHERE staff_id=$1",[actor.id]);
    });
    await audit(actor.id,"staff.password_change","staff",actor.id);
    return out({ok:true,signInAgain:true});
  }
  if(req.method==="GET"&&path==="/admin/state"){
    const actor=await authorize(req);
    const [programs,pending,certs,team,clients,logs]=await Promise.all([
      db.unsafe("SELECT id,code,title,description,active,validity_months FROM programs ORDER BY created_at DESC"),
      db.unsafe("SELECT e.id,e.submitted_by,e.score,e.outcome,e.cohort,c.legal_name,c.email,p.title FROM enrollments e JOIN candidates c ON c.id=e.candidate_id JOIN programs p ON p.id=e.program_id WHERE e.state='submitted' ORDER BY e.created_at DESC LIMIT 150"),
      db.unsafe("SELECT id,public_id,holder_name,course_title,state,is_demo,issued_at,expires_at FROM certificates ORDER BY created_at DESC LIMIT 150"),
      db.unsafe("SELECT id,email,role,enabled FROM staff ORDER BY created_at"),
      db.unsafe("SELECT id,label,created_at,revoked_at FROM api_clients ORDER BY created_at DESC"),
      db.unsafe("SELECT action,entity_type,created_at FROM audit_events ORDER BY created_at DESC LIMIT 25")
    ]);
    return out({user:actor,programs,pending,certificates:certs.map((c:any)=>({...c,status:effective(c.state,c.expires_at)})),team:actor.role==="admin"?team:[],clients:actor.role==="admin"?clients:[],logs});
  }
  if(req.method==="POST"&&path==="/admin/programs"){
    const actor=await authorize(req,["admin","approver"]),b=await body(req);
    const code=str(b.code,24).toUpperCase(),title=str(b.title,160),desc=str(b.description,1000),months=b.validityMonths==null?null:Number(b.validityMonths);
    must(/^[A-Z0-9_-]{2,24}$/.test(code)&&title.length>=4,"Program code/title required");
    must(months===null||(Number.isInteger(months)&&months>=1&&months<=240),"Invalid validity");
    const row=await db.unsafe("INSERT INTO programs(code,title,description,validity_months) VALUES($1,$2,$3,$4) RETURNING id",[code,title,desc,months]);
    await audit(actor.id,"program.create","program",row[0].id);
    return out({ok:true},201);
  }
  if(req.method==="POST"&&path==="/admin/candidates"){
    const actor=await authorize(req,["admin","data_entry","approver"]),b=await body(req);
    const name=str(b.legalName,160),email=str(b.email).toLowerCase(),phone=str(b.phone,30),cohort=str(b.cohort,120),programId=str(b.programId,60),score=Number(b.score),outcome=str(b.outcome);
    must(name.length>=3&&emailOkay(email)&&cohort.length>=2,"Candidate name, email and cohort required");
    must(Number.isFinite(score)&&score>=0&&score<=100&&["passed","failed"].includes(outcome),"Invalid assessment");
    const record=await db.begin(async tx=>{
      const p=await tx.unsafe("SELECT id FROM programs WHERE id=$1 AND active=true",[programId]);
      must(p.length,"Invalid training program");
      const c=await tx.unsafe("INSERT INTO candidates(legal_name,email,phone,created_by) VALUES($1,$2,$3,$4) RETURNING id",[name,email,phone||null,actor.id]);
      const e=await tx.unsafe("INSERT INTO enrollments(candidate_id,program_id,cohort,score,outcome,submitted_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",[c[0].id,programId,cohort,score,outcome,actor.id]);
      return e[0].id;
    });
    await audit(actor.id,"enrollment.submit","enrollment",record);
    return out({ok:true,enrollmentId:record},201);
  }
  const decision=path.match(/^\/admin\/enrollments\/([0-9a-f-]{36})\/decision$/);
  if(req.method==="POST"&&decision){
    const actor=await authorize(req,["admin","approver"]),b=await body(req),vote=str(b.decision),reason=str(b.reason,500);
    must(["approve","reject"].includes(vote),"Invalid decision");
    if(vote==="reject")must(reason.length>=10,"Rejection reason must contain 10 characters");
    const result=await db.begin(async tx=>{
      const found=await tx.unsafe("SELECT e.id,e.state,e.submitted_by,e.outcome,p.title,p.validity_months,c.legal_name FROM enrollments e JOIN programs p ON p.id=e.program_id JOIN candidates c ON c.id=e.candidate_id WHERE e.id=$1 FOR UPDATE OF e",[decision[1]]);
      const e=found[0];
      must(e&&e.state==="submitted","Not awaiting review",409);
      must(e.submitted_by!==actor.id,"A different officer must approve this enrolment",403);
      if(vote==="approve")must(e.outcome==="passed","A failed candidate cannot be issued a certificate",409);
      await tx.unsafe("UPDATE enrollments SET state=$2,decided_by=$3,decided_at=now(),decided_reason=$4 WHERE id=$1",[e.id,vote==="approve"?"approved":"rejected",actor.id,reason||null]);
      if(vote==="reject")return {decision:"rejected"};
      const id=newId(),issuer="Demonstration Training Organization";
      const inserted=await tx.unsafe("INSERT INTO certificates(enrollment_id,public_id,holder_name,course_title,issuer_name,is_demo,expires_at,created_by) VALUES($1,$2,$3,$4,$5,true,CASE WHEN $6::integer IS NULL THEN NULL ELSE (CURRENT_DATE+($6::integer||' months')::interval)::date END,$7) RETURNING id",[e.id,id,e.legal_name,e.title,issuer,e.validity_months,actor.id]);
      await tx.unsafe("INSERT INTO certificate_events(certificate_id,action,actor_id) VALUES($1,'issued',$2)",[inserted[0].id,actor.id]);
      return {decision:"approved",certificateId:id};
    });
    await audit(actor.id,"enrollment."+result.decision,"enrollment",decision[1],result);
    return out(result);
  }
  const statusChange=path.match(/^\/admin\/certificates\/([0-9a-f-]{36})\/status$/);
  if(req.method==="POST"&&statusChange){
    const actor=await authorize(req,["admin","approver"]),b=await body(req),state=str(b.state),reason=str(b.reason,500);
    must(["active","suspended","revoked"].includes(state)&&reason.length>=10,"Valid state and reason required");
    await db.begin(async tx=>{
      const cert=await tx.unsafe("SELECT state FROM certificates WHERE id=$1 FOR UPDATE",[statusChange[1]]);
      must(cert.length,"Certificate not found",404);
      must(cert[0].state!=="revoked","Revocation is permanent",409);
      must(state!==cert[0].state,"Certificate already has this state",409);
      must(state!=="active"||cert[0].state==="suspended","Only suspended certificates may be reactivated",409);
      await tx.unsafe("UPDATE certificates SET state=$2,last_reason=$3,updated_at=now() WHERE id=$1",[statusChange[1],state,reason]);
      await tx.unsafe("INSERT INTO certificate_events(certificate_id,action,reason,actor_id) VALUES($1,$2,$3,$4)",[statusChange[1],state,reason,actor.id]);
    });
    await audit(actor.id,"certificate."+state,"certificate",statusChange[1],{reason});
    return out({ok:true});
  }
  if(req.method==="POST"&&path==="/admin/team"){
    const actor=await authorize(req,["admin"]),b=await body(req),email=str(b.email).toLowerCase(),password=str(b.password,200),role=str(b.role);
    must(emailOkay(email)&&password.length>=14&&["admin","data_entry","approver","auditor"].includes(role),"Invalid staff registration");
    const rows=await db.unsafe("INSERT INTO staff(email,password_hash,role) VALUES($1,$2,$3) RETURNING id",[email,await bcrypt.hash(password,12),role]);
    await audit(actor.id,"staff.create","staff",rows[0].id,{role});
    return out({ok:true},201);
  }
  if(req.method==="POST"&&path==="/admin/keys"){
    const actor=await authorize(req,["admin"]),b=await body(req),label=str(b.label,100);
    must(label.length>=3,"Integration name required");
    const value=token("vfy_test_"),item=await db.unsafe("INSERT INTO api_clients(label,token_hash,created_by) VALUES($1,$2,$3) RETURNING id",[label,await digest(value),actor.id]);
    await audit(actor.id,"api_client.create","api_client",item[0].id,{label});
    return out({token:value,label},201);
  }
  if(req.method==="POST"&&path==="/admin/keys/revoke"){
    const actor=await authorize(req,["admin"]),b=await body(req),id=str(b.id,70);
    await db.unsafe("UPDATE api_clients SET revoked_at=now() WHERE id=$1",[id]);
    await audit(actor.id,"api_client.revoke","api_client",id);
    return out({ok:true});
  }
  if(req.method==="POST"&&path==="/integrations/verify"){
    const client=await authorizeClient(req),b=await body(req),id=str(b.certificateId,60).toUpperCase();
    const cert=await certificate(id);
    must(cert,"Certificate not found",404);
    const c=present(cert);
    await audit(null,"integration.verify","certificate",cert.id,{clientId:client.id,status:c.status});
    return out({verified:c.status==="active",certificate:c,holderMatch:"ownership_challenge_required",eligibleForHire:false});
  }
  if(req.method==="POST"&&path==="/integrations/claims/start"){
    await authorizeClient(req);
    return failure("Email ownership challenge is not configured on the GitHub Pages/Supabase demo. Do not mark holder verified.",503);
  }
  const pdf=path.match(/^\/admin\/certificates\/(SMT-[A-Z0-9-]+)\/pdf$/);
  if(req.method==="GET"&&pdf){
    await authorize(req);
    const cert=await certificate(pdf[1]);
    must(cert,"Certificate not found",404);
    const document=await PDFDocument.create(),page=document.addPage([842,595]);
    const bold=await document.embedFont(StandardFonts.HelveticaBold),font=await document.embedFont(StandardFonts.Helvetica);
    page.drawRectangle({x:0,y:0,width:842,height:595,color:rgb(.97,.98,.99)});
    page.drawText("CERTIFICATE OF TRAINING COMPLETION",{x:65,y:484,size:25,font:bold,color:rgb(.06,.14,.24)});
    page.drawText(cert.holder_name.slice(0,55),{x:65,y:417,size:26,font:bold,color:rgb(.04,.35,.3)});
    page.drawText(cert.course_title.slice(0,66),{x:65,y:371,size:18,font:bold});
    page.drawText("Demonstration Training Organization",{x:65,y:324,size:14,font});
    page.drawText("Certificate: "+cert.public_id,{x:65,y:273,size:13,font:bold});
    page.drawText("Issued: "+String(cert.issued_at).slice(0,10),{x:65,y:242,size:12,font});
    page.drawText("Current status: "+effective(cert.state,cert.expires_at),{x:65,y:215,size:12,font});
    page.drawText("DEMO ONLY — NOT AN OFFICIAL LICENCE OR NEMSA CERTIFICATE",{x:65,y:107,size:13,font:bold,color:rgb(.72,.2,.13)});
    const link="https://kinglove58.github.io/verify/#verify/"+cert.public_id;
    const qr=await document.embedPng(await QRCode.toBuffer(link,{width:200}));
    page.drawImage(qr,{x:650,y:150,width:120,height:120});
    page.drawText("Verify current status via QR",{x:622,y:130,size:10,font});
    return new Response(await document.save(),{status:200,headers:{...headers,"Content-Type":"application/pdf","Content-Disposition":'attachment; filename="'+cert.public_id+'.pdf"'}});
  }
  return failure("Route not found",404);
}
Deno.serve(async req=>{
  try{return await handle(req);}
  catch(e){
    if(e instanceof HttpErr)return failure(e.message,e.status);
    // Avoid leaking database credentials or stack traces to clients.
    console.error("Verify function error",e instanceof Error?e.message:"Unknown");
    return failure("The registry is temporarily unavailable",503);
  }
});
