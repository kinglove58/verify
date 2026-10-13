import Link from "next/link";
import {query} from "@/lib/db";
import {requireStaff} from "@/lib/auth";
import {effectiveStatus} from "@/lib/crypto";
import {PageHead,DemoAlert,BlankSlate} from "./WorkspaceUI";
export const dynamic="force-dynamic";
type Count={candidates:string;certificates:string;pending:string;revoked:string};
type Cert={public_id:string;holder_name:string;course_title:string;state:string;expires_at:string|null;is_demo:boolean};
type Activity={id:string;action:string;created_at:string};
export default async function Overview(){
 const staff=await requireStaff();
 const [counts,recent,events]=await Promise.all([
  query<Count>(`SELECT (SELECT count(*)::text FROM candidates) AS candidates,
   (SELECT count(*)::text FROM certificates) AS certificates,
   (SELECT count(*)::text FROM enrollments WHERE state='submitted') AS pending,
   (SELECT count(*)::text FROM certificates WHERE state='revoked') AS revoked`),
  query<Cert>("SELECT public_id,holder_name,course_title,state,expires_at,is_demo FROM certificates ORDER BY created_at DESC LIMIT 5"),
  query<Activity>("SELECT id,action,created_at FROM audit_events ORDER BY created_at DESC LIMIT 5")
 ]);
 const summary=counts[0];
 const metrics=[
  ["Candidate records",summary?.candidates||"0","Registered trainees","/dashboard/candidates"],
  ["Certificates issued",summary?.certificates||"0","Credentials on record","/dashboard/certificates"],
  ["Awaiting approval",summary?.pending||"0","One authorized sign-off","/dashboard/approvals"],
  ["Revoked certificates",summary?.revoked||"0","No longer valid","/dashboard/certificates"]
 ];
 return <div className="workspace-page">
  <PageHead eyebrow="WORKSPACE / OVERVIEW" title="Registry overview" description={"Welcome back, "+staff.email+". Manage training credentials from one place."} action={["admin","data_entry","approver"].includes(staff.role)?{href:"/dashboard/candidates",label:"Register candidate"}:undefined}/>
  <DemoAlert/>
  <section className="metrics">{metrics.map(([label,value,description,href])=><Link href={href} className="metric workspace-metric" key={label}><span>{label}</span><strong>{value}</strong><small>{description} ↗</small></Link>)}</section>
  <section className="workspace-quickgrid">
   <div className="panel"><div className="sectiontitle"><div><h2>Recent certificates</h2><p>Live records and status changes</p></div><Link href="/dashboard/certificates">View all →</Link></div>
   {!recent.length?<BlankSlate title="No certificates yet" description="Register a trainee and approve their passed assessment to issue a demo certificate." href="/dashboard/candidates" label="Register candidate"/>:
   <div className="workspace-activityrows">{recent.map(c=><Link href={"/dashboard/certificates/"+c.public_id} key={c.public_id} className="workspace-activityrow"><span><b>{c.holder_name}</b><small>{c.course_title}{c.is_demo?" · DEMO":""}</small></span><span className={"status-pill "+(effectiveStatus(c.state,c.expires_at)==="active"?"green":"red")}>{effectiveStatus(c.state,c.expires_at)}</span></Link>)}</div>}</div>
   <div className="panel"><div className="sectiontitle"><div><h2>Latest activity</h2><p>Audited registry operations</p></div><Link href="/dashboard/audit">View all →</Link></div>
   {!events.length?<BlankSlate title="No activity yet" description="Staff activity and certificate changes will appear here."/>:
   <div className="workspace-activityrows">{events.map(event=><div key={event.id} className="workspace-activityrow"><span><b>{event.action.replaceAll("."," · ")}</b><small>{new Date(event.created_at).toLocaleString("en-NG",{timeZone:"Africa/Lagos"})}</small></span><span className="workspace-live-dot"/></div>)}</div>}</div>
  </section>
  <section className="panel workspace-next"><h2>Fast actions</h2><div className="workspace-shortcuts">
   <Link href="/dashboard/approvals"><b>✓</b><span>Review and issue<small>Approve passed trainees</small></span>→</Link>
   <Link href="/dashboard/programs"><b>⌑</b><span>Training programs<small>Manage certified courses</small></span>→</Link>
   <Link href="/dashboard/settings"><b>⚙</b><span>Account security<small>Change your staff password</small></span>→</Link>
  </div></section>
 </div>;
}
