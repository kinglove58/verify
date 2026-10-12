import { findCertificate,publicCertificate } from "@/lib/certificates";
import { limitRequest } from "@/lib/auth";
import { jsonError } from "@/lib/api-auth";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
 try {
  const ip=request.headers.get("x-vercel-forwarded-for")||request.headers.get("x-real-ip")||"unknown";
  await limitRequest("public",ip,60,1);
  const row=await findCertificate((await params).id);
  if(!row)return jsonError("Certificate not found",404);
  return Response.json(publicCertificate(row),{headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
 } catch {return jsonError("Verification is temporarily unavailable",503);}
}
