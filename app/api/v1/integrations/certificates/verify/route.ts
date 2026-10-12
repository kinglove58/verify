import { z } from "zod";
import { apiClient,jsonError } from "@/lib/api-auth";
import { findCertificate } from "@/lib/certificates";
import { effectiveStatus,maskEmail,maskName } from "@/lib/crypto";
import { audit } from "@/lib/db";
export const runtime="nodejs";
export async function POST(request:Request) {
 try {
  const client=await apiClient(request);
  if(!client)return jsonError("Unauthorized",401);
  const body=z.object({certificateId:z.string().min(8).max(50)}).strict().parse(await request.json());
  const certificate=await findCertificate(body.certificateId);
  if(!certificate)return jsonError("Certificate not found",404);
  const status=effectiveStatus(certificate.state,certificate.expires_at);
  await audit(null,"integration.verify","certificate",certificate.id,{clientId:client.id,status});
  return Response.json({
   verified:status==="active",
   certificate:{
     id:certificate.public_id,
     status,
     type:"training_completion",
     course:certificate.course_title,
     issuedAt:certificate.issued_at,
     expiresAt:certificate.expires_at,
     issuer:certificate.issuer_name,
     isDemo:certificate.is_demo
   },
   holder:{displayNameMasked:maskName(certificate.holder_name),contactHint:maskEmail(certificate.email)},
   holderMatch:"ownership_challenge_required",
   eligibleForHire:false
  },{headers:{"Cache-Control":"no-store"}});
 } catch(e) {
  if(e instanceof z.ZodError)return jsonError("Invalid request",400);
  return jsonError("Verification unavailable",503);
 }
}
