import Link from "next/link";
import {requireStaff} from "@/lib/auth";
import {query} from "@/lib/db";
import {findCertificate} from "@/lib/certificates";
import {effectiveStatus} from "@/lib/crypto";
import {changeCertificateStatus} from "@/app/actions";
export const dynamic="force-dynamic";
export default async function CertificateAdmin({params}:{params:Promise<{id:string}>}){
 const user=await requireStaff();
 const row=await findCertificate((await params).id);
 if(!row)return <main className="narrow searchpage"><h1>Certificate not found</h1><Link href="/dashboard">← Dashboard</Link></main>;
 const events=await query<{id:string;action:string;reason:string|null;created_at:Date}>(`SELECT id,action,reason,created_at FROM certificate_events WHERE certificate_id=$1 ORDER BY created_at DESC`,[row.id]);
 const canApprove=["admin","approver"].includes(user.role),status=effectiveStatus(row.state,row.expires_at);
 return <main className="narrow detailsadmin">
  <Link href="/dashboard" className="backlink">← Return to dashboard</Link><span className="eyebrow">CREDENTIAL RECORD</span><h1>{row.holder_name}</h1><p className="mono">{row.public_id}</p>
  {row.is_demo&&<div className="demoalert block">Demonstration-only record</div>}
  <div className="panel"><h2>Certificate details</h2><dl className="resultdetails">
   <div><dt>Training</dt><dd>{row.course_title}</dd></div><div><dt>Issuer</dt><dd>{row.issuer_name}</dd></div>
   <div><dt>Status</dt><dd>{status}</dd></div><div><dt>Issued</dt><dd>{String(row.issued_at).slice(0,10)}</dd></div>
   <div><dt>Expires</dt><dd>{row.expires_at?String(row.expires_at).slice(0,10):"No expiry"}</dd></div>
   <div><dt>Owner email (private)</dt><dd>{row.email}</dd></div>
  </dl><div className="actionbar"><a className="primarylink" href={"/api/v1/admin/certificates/"+row.public_id+"/pdf"}>Download PDF ↙</a><Link href={"/verify/"+row.public_id} className="secondarybutton">Open public verification ↗</Link></div></div>
  {canApprove&&row.state!=="revoked"&&<div className="panel"><h2>Update credential status</h2><p>Suspension is reversible. Revocation is permanent. A reason is required and every change is audited.</p>
   <form action={changeCertificateStatus} className="stacked">
    <input type="hidden" name="certificateId" value={row.id}/>
    <label>Action<select name="state" defaultValue="">
     <option value="" disabled>Select an action</option>{row.state==="active"&&<><option value="suspended">Suspend certificate</option><option value="revoked">Revoke permanently</option></>}{row.state==="suspended"&&<><option value="active">Reactivate</option><option value="revoked">Revoke permanently</option></>}
    </select></label>
    <label>Mandatory reason<textarea name="reason" minLength={10} maxLength={500} rows={3} required/></label>
    <button className="secondarybutton">Record status decision</button>
   </form></div>}
  <div className="panel"><h2>Certificate history</h2><div className="auditlist">{events.map(e=><div key={e.id}><span className="dot"/><strong>{e.action}</strong><small>{new Date(e.created_at).toLocaleString("en-NG",{timeZone:"Africa/Lagos"})}{e.reason?" — "+e.reason:""}</small></div>)}</div></div>
 </main>;
}
