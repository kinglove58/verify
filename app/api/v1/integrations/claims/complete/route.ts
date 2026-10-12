import { z } from "zod";
import { apiClient,jsonError } from "@/lib/api-auth";
import { transaction,audit } from "@/lib/db";
import { effectiveStatus,otpHash,safeEquals } from "@/lib/crypto";
export const runtime="nodejs";
export async function POST(request:Request) {
 try {
  const client=await apiClient(request);
  if(!client)return jsonError("Unauthorized",401);
  const input=z.object({challengeId:z.uuid(),subjectRef:z.string().min(4).max(120),code:z.string().regex(/^\d{6}$/)}).strict().parse(await request.json());
  const pepper=process.env.SECURITY_PEPPER;
  if(!pepper||pepper.length<32)throw new Error("Missing server secret");
  const verified=await transaction(async db=>{
   const rows=await db.query<{id:string;code_hash:string;attempts:number;expires_at:Date;consumed_at:Date|null;subject_ref:string;certificate_id:string;public_id:string;holder_name:string;course_title:string;issuer_name:string;is_demo:boolean;state:string;expires_cert:Date|null}>(`
    SELECT ch.*,c.public_id,c.holder_name,c.course_title,c.issuer_name,c.is_demo,c.state,c.expires_at AS expires_cert
    FROM claim_challenges ch JOIN certificates c ON c.id=ch.certificate_id
    WHERE ch.id=$1 AND ch.client_id=$2 FOR UPDATE OF ch`,[input.challengeId,client.id]);
   const row=rows.rows[0];
   if(!row||row.consumed_at||row.attempts>=5||row.expires_at.getTime()<=Date.now()||row.subject_ref!==input.subjectRef)return null;
   if(effectiveStatus(row.state,row.expires_cert)!=="active")return null;
   await db.query("UPDATE claim_challenges SET attempts=attempts+1 WHERE id=$1",[input.challengeId]);
   if(!safeEquals(row.code_hash,otpHash(input.challengeId,input.code,pepper)))return null;
   const claimed=await db.query<{subject_ref:string}>(`SELECT subject_ref FROM certificate_claims
       WHERE certificate_id=$1 AND client_id=$2 FOR UPDATE`,[row.certificate_id,client.id]);
   if(claimed.rows.length&&claimed.rows[0].subject_ref!==input.subjectRef)return null;
   await db.query("INSERT INTO certificate_claims(certificate_id,client_id,subject_ref) VALUES($1,$2,$3) ON CONFLICT(certificate_id,client_id) DO NOTHING",
     [row.certificate_id,client.id,input.subjectRef]);
   await db.query("UPDATE claim_challenges SET consumed_at=now() WHERE id=$1",[input.challengeId]);
   return {certificateId:row.public_id,holder:{fullName:row.holder_name},credential:{
      course:row.course_title,issuer:row.issuer_name,isDemo:row.is_demo,status:"active"
   },subjectRef:input.subjectRef,holderMatch:"confirmed"};
  });
  if(!verified)return jsonError("Challenge invalid, expired, or already claimed",409);
  await audit(null,"integration.claim.complete","certificate",verified.certificateId,{clientId:client.id,subjectRef:input.subjectRef});
  return Response.json(verified,{headers:{"Cache-Control":"no-store"}});
 } catch(e) {
  if(e instanceof z.ZodError)return jsonError("Invalid request",400);
  return jsonError("Unable to confirm ownership",503);
 }
}
