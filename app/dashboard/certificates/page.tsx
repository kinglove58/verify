import Link from "next/link";
import {query} from "@/lib/db";
import {effectiveStatus} from "@/lib/crypto";
import {PageHead,BlankSlate} from "../WorkspaceUI";
export const dynamic="force-dynamic";
type Cert={id:string;public_id:string;holder_name:string;course_title:string;state:string;is_demo:boolean;issued_at:string;expires_at:string|null};
export default async function CertificatesPage(){
 const certs=await query<Cert>("SELECT id,public_id,holder_name,course_title,state,is_demo,issued_at,expires_at FROM certificates ORDER BY created_at DESC LIMIT 200");
 return <div className="workspace-page"><PageHead eyebrow="WORKSPACE / CREDENTIALS" title="Certificates" description="Inspect issued credentials, open their QR/PDF record, and manage status changes." action={{href:"/dashboard/candidates",label:"New candidate"}}/>
 <section className="panel"><div className="sectiontitle"><div><h2>Issued certificates</h2><p>Showing the {certs.length} most recent records</p></div><span className="smallpill">{certs.length} records</span></div>
 {!certs.length?<BlankSlate title="No certificates issued" description="Start with a training program and a passed assessment." href="/dashboard/candidates" label="Register candidate"/>:
 <div className="tablewrap"><table className="datatable"><thead><tr><th>Certificate ID</th><th>Holder</th><th>Training program</th><th>Issued</th><th>Status</th><th></th></tr></thead><tbody>{certs.map(c=><tr key={c.id}>
  <td className="mono">{c.public_id}{c.is_demo&&<small className="subline">DEMO</small>}</td><td>{c.holder_name}</td><td>{c.course_title}</td><td>{String(c.issued_at).slice(0,10)}</td>
  <td><span className={"status-pill "+(effectiveStatus(c.state,c.expires_at)==="active"?"green":"red")}>{effectiveStatus(c.state,c.expires_at)}</span></td><td><Link href={"/dashboard/certificates/"+c.public_id}>Manage ↗</Link></td>
 </tr>)}</tbody></table></div>}
 </section></div>;
}
