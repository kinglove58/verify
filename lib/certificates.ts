import "server-only";
import { query } from "@/lib/db";
import { effectiveStatus,maskName,normalizeCertificateId } from "@/lib/crypto";

export type CertificateRow = {
 id:string; public_id:string; holder_name:string; course_title:string;
 issuer_name:string; is_demo:boolean; issued_at:string; expires_at:string|null;
 state:string; last_reason:string|null; email:string; phone:string|null;
};
export async function findCertificate(value: string):Promise<CertificateRow|null> {
 const id=normalizeCertificateId(value);
 if(!id) return null;
 const rows=await query<CertificateRow>(`SELECT c.*,p.email,p.phone FROM certificates c
   JOIN enrollments e ON e.id=c.enrollment_id JOIN candidates p ON p.id=e.candidate_id
   WHERE c.public_id=$1`,[id]);
 return rows[0]||null;
}
export function publicCertificate(row:CertificateRow) {
 return {
   certificateId:row.public_id,
   status:effectiveStatus(row.state,row.expires_at),
   holder:maskName(row.holder_name),
   course:row.course_title,
   issuer:row.issuer_name,
   issueDate:row.issued_at,
   expiryDate:row.expires_at,
   isDemo:row.is_demo,
   credentialType:"training_completion"
 };
}
