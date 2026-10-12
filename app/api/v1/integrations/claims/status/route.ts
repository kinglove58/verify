import { z } from "zod";
import {apiClient,jsonError} from "@/lib/api-auth";
import {findCertificate} from "@/lib/certificates";
import {query} from "@/lib/db";
import {effectiveStatus} from "@/lib/crypto";
export const runtime="nodejs";
export async function POST(request:Request){
 try{
  const client=await apiClient(request);
  if(!client)return jsonError("Unauthorized",401);
  const input=z.object({certificateId:z.string().min(8).max(50),subjectRef:z.string().min(4).max(120)}).strict().parse(await request.json());
  const certificate=await findCertificate(input.certificateId);
  if(!certificate)return jsonError("Certificate not found",404);
  const links=await query<{id:string}>("SELECT id FROM certificate_claims WHERE client_id=$1 AND certificate_id=$2 AND subject_ref=$3",[client.id,certificate.id,input.subjectRef]);
  if(!links.length)return jsonError("Credential not linked to this user",404);
  return Response.json({certificateId:certificate.public_id,subjectRef:input.subjectRef,status:effectiveStatus(certificate.state,certificate.expires_at),
    holderMatch:"confirmed",isDemo:certificate.is_demo,credentialType:"training_completion",issuer:certificate.issuer_name},{headers:{"Cache-Control":"no-store"}});
 }catch(e){if(e instanceof z.ZodError)return jsonError("Invalid request",400);return jsonError("Unable to check claim",503);}
}
