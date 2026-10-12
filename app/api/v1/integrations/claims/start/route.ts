import { z } from "zod";
import { apiClient,jsonError } from "@/lib/api-auth";
import { query,audit } from "@/lib/db";
import { findCertificate } from "@/lib/certificates";
import { effectiveStatus,oneTimeCode,otpHash,maskEmail } from "@/lib/crypto";
import { sendHolderCode } from "@/lib/email";
export const runtime="nodejs";
export async function POST(request:Request) {
 try {
  const client=await apiClient(request);
  if(!client)return jsonError("Unauthorized",401);
  const input=z.object({certificateId:z.string().min(8).max(50),subjectRef:z.string().min(4).max(120)}).strict().parse(await request.json());
  const row=await findCertificate(input.certificateId);
  if(!row)return jsonError("Certificate not found",404);
  if(effectiveStatus(row.state,row.expires_at)!=="active")return jsonError("Certificate is not active",409);
  if(!process.env.SMTP_HOST||!process.env.SMTP_FROM||!process.env.SMTP_USER||!process.env.SMTP_PASSWORD)return jsonError("Holder confirmation is not configured",503);
  const prior=await query<{subject_ref:string}>("SELECT subject_ref FROM certificate_claims WHERE certificate_id=$1 AND client_id=$2",[row.id,client.id]);
  if(prior[0]&&prior[0].subject_ref!==input.subjectRef)return jsonError("Certificate is already linked to another account",409);
  await query("UPDATE claim_challenges SET consumed_at=now() WHERE certificate_id=$1 AND client_id=$2 AND consumed_at IS NULL",[row.id,client.id]);
  const id=crypto.randomUUID(),code=oneTimeCode();
  const pepper=process.env.SECURITY_PEPPER;
  if(!pepper||pepper.length<32)throw new Error("Missing server secret");
  await query(`INSERT INTO claim_challenges(id,certificate_id,client_id,subject_ref,code_hash,expires_at)
   VALUES($1,$2,$3,$4,$5,now()+interval '10 minutes')`,[id,row.id,client.id,input.subjectRef,otpHash(id,code,pepper)]);
  try {await sendHolderCode(row.email,code,row.public_id);}
  catch(e) {await query("UPDATE claim_challenges SET consumed_at=now() WHERE id=$1",[id]);throw e;}
  await audit(null,"integration.claim.start","certificate",row.id,{clientId:client.id});
  return Response.json({challengeId:id,deliveredTo:maskEmail(row.email),expiresInSeconds:600},{status:202,headers:{"Cache-Control":"no-store"}});
 } catch(e) {
  if(e instanceof z.ZodError)return jsonError("Invalid request",400);
  return jsonError("Could not start ownership verification",503);
 }
}
