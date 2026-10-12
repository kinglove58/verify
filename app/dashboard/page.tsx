import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import {query} from "@/lib/db";
import {addProgram,addCandidate,importCandidates,decideEnrollment,addStaff,disableStaff,revokeApiKey,logout,changeOwnPassword} from "@/app/actions";
import ApiKeyCreate from "./ApiKeyCreate";
import type {Metadata} from "next";
import {effectiveStatus} from "@/lib/crypto";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Administration dashboard"};

type Program={id:string;code:string;title:string;active:boolean};
type Pending={id:string;legal_name:string;email:string;cohort:string;score:number;outcome:string;title:string;submitted_by:string;created_at:string};
type Cert={id:string;public_id:string;holder_name:string;course_title:string;state:string;is_demo:boolean;issued_at:string;expires_at:string|null};
type Team={id:string;email:string;role:string;enabled:boolean};
type Client={id:string;label:string;created_at:string;revoked_at:string|null};
type Audit={id:string;action:string;entity_type:string;created_at:string};
export default async function Dashboard({searchParams}:{searchParams:Promise<{notice?:string}>}){
 const staff=await requireStaff(); const params=await searchParams;
 const [programs,pending,certs,team,clients,logs,stats]=await Promise.all([
  query<Program>("SELECT id,code,title,active FROM programs ORDER BY created_at DESC"),
  query<Pending>(`SELECT e.id,c.legal_name,c.email,e.cohort,e.score,e.outcome,p.title,e.submitted_by,e.created_at FROM enrollments e
     JOIN candidates c ON c.id=e.candidate_id JOIN programs p ON p.id=e.program_id WHERE e.state='submitted' ORDER BY e.created_at DESC LIMIT 100`),
  query<Cert>("SELECT id,public_id,holder_name,course_title,state,is_demo,issued_at,expires_at FROM certificates ORDER BY created_at DESC LIMIT 75"),
  query<Team>("SELECT id,email,role,enabled FROM staff ORDER BY created_at"),
  query<Client>("SELECT id,label,created_at,revoked_at FROM api_clients ORDER BY created_at DESC LIMIT 50"),
  query<Audit>("SELECT id,action,entity_type,created_at FROM audit_events ORDER BY created_at DESC LIMIT 20"),
  query<{candidates:string;certificates:string;pending:string;revoked:string}>(`SELECT
     (SELECT count(*)::text FROM candidates) AS candidates,
     (SELECT count(*)::text FROM certificates) AS certificates,
     (SELECT count(*)::text FROM enrollments WHERE state='submitted') AS pending,
     (SELECT count(*)::text FROM certificates WHERE state='revoked') AS revoked`)
 ]);
 const canEnter=["admin","data_entry","approver"].includes(staff.role),canApprove=["admin","approver"].includes(staff.role),admin=staff.role==="admin";
 return <main className="shell dashboard">
   <div className="dashhead"><div><span className="eyebrow">WORKFORCE CREDENTIAL ADMINISTRATION</span><h1>Registry overview</h1><p>Manage the complete lifecycle of technician training credentials.</p></div>
   <div className="account"><div><b>{staff.email}</b><span>{staff.role.replace("_"," ")}</span></div><form action={logout}><button className="ghost" type="submit">Sign out</button></form></div></div>
   {params.notice&&<div className="message success" role="status">{params.notice}</div>}
   {process.env.ISSUER_APPROVED!=="true"&&<div className="demoalert block">Demo issuance mode is ON. Certificates remain permanently labelled as demonstration records until the issuer is officially approved.</div>}
   <section className="metrics">
    {[["Candidate records",stats[0]?.candidates||"0","People registered"],["Certificates issued",stats[0]?.certificates||"0","Training credentials"],["Awaiting review",stats[0]?.pending||"0","Two-person approval"],["Revoked",stats[0]?.revoked||"0","Not valid"]].map(([name,value,sub])=><div className="metric" key={name}><span>{name}</span><strong>{value}</strong><small>{sub}</small></div>)}
   </section>
   <nav className="dashnav" aria-label="Dashboard sections"><a href="#certificates">Certificates</a><a href="#reviews">Approvals</a><a href="#candidates">Candidates</a><a href="#programs">Programs</a>{admin&&<a href="#integrations">API access</a>}{admin&&<a href="#team">Team</a>}<a href="#audit">Audit</a></nav>
   <section id="certificates" className="panel"><div className="sectiontitle"><div><h2>Issued certificates</h2><p>Live certificate statuses and download-ready PDF records.</p></div><span className="smallpill">{certs.length} recent</span></div>
    <div className="tablewrap"><table className="datatable"><thead><tr><th>Certificate</th><th>Holder</th><th>Training</th><th>Status</th><th>Details</th></tr></thead><tbody>
     {certs.map(c=><tr key={c.id}><td className="mono">{c.public_id}{c.is_demo&&<small className="subline">DEMO</small>}</td><td>{c.holder_name}</td><td>{c.course_title}</td><td><span className={"status-pill "+(effectiveStatus(c.state,c.expires_at)==="active"?"green":"red")}>{effectiveStatus(c.state,c.expires_at)}</span></td><td><Link href={"/dashboard/certificates/"+c.public_id}>Manage ↗</Link></td></tr>)}
     {!certs.length&&<tr><td colSpan={5} className="empty">No certificates yet. Submit a successful candidate and have a different officer approve it.</td></tr>}
    </tbody></table></div>
   </section>
   <section id="reviews" className="panel"><div className="sectiontitle"><div><h2>Approval queue</h2><p>Only a different authorized officer can approve a submitted record. Failed candidates cannot be issued certificates.</p></div><span className="smallpill">{pending.length} pending</span></div>
    {pending.length===0&&<p className="empty">There are no pending records.</p>}
    <div className="reviewgrid">{pending.map(p=><div className="reviewitem" key={p.id}><div><strong>{p.legal_name}</strong><small>{p.email} · {p.title} · {p.cohort}</small><span className="reviewmeta">Score: {p.score}% · {p.outcome.toUpperCase()}</span></div>
     {canApprove&&p.submitted_by!==staff.id?<div className="reviewforms"><form action={decideEnrollment}><input type="hidden" name="enrollmentId" value={p.id}/><input type="hidden" name="decision" value="approve"/><button className="minibutton primary" disabled={p.outcome!=="passed"}>Approve & issue</button></form><form action={decideEnrollment}><input type="hidden" name="enrollmentId" value={p.id}/><input type="hidden" name="decision" value="reject"/><input name="reason" placeholder="Rejection reason (10+ chars)" minLength={10} required/><button className="minibutton ghost">Reject</button></form></div>:<small className="muted">{p.submitted_by===staff.id?"Another officer must approve this.":"Review-only access"}</small>}
    </div>)}</div>
   </section>
   {canEnter&&<section id="candidates" className="panel"><div className="sectiontitle"><div><h2>New candidate</h2><p>Register a trainee's assessment outcome. Approved records become verifiable certificates.</p></div></div>
    <form action={addCandidate} className="formgrid">
     <label>Full legal name<input name="legalName" required minLength={3} maxLength={160} placeholder="As recorded by the training organization"/></label>
     <label>Verified email for holder confirmation<input type="email" name="email" required placeholder="candidate@example.com"/></label>
     <label>Phone number (optional)<input type="tel" name="phone" maxLength={30} placeholder="+234 ..."/></label>
     <label>Program<select name="programId" required defaultValue=""><option value="" disabled>Select training program</option>{programs.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
     <label>Training cohort<input name="cohort" required placeholder="Lagos · Cohort 01 / 2026"/></label>
     <label>Assessment score (%)<input type="number" name="score" min={0} max={100} step="0.01" required/></label>
     <label>Result<select name="outcome" required><option value="passed">Passed</option><option value="failed">Failed</option></select></label>
     <div className="formfooter"><button className="primary" disabled={!programs.length}>Submit for independent review →</button></div>
    </form>
    <div className="separator"/>
    <h3>Bulk import (CSV)</h3><p>Import up to 250 candidates at a time. All imported records require approval.</p>
    <form action={importCandidates} className="formgrid">
     <label>Training program<select name="programId" defaultValue="" required><option disabled value="">Select program</option>{programs.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
     <label>Upload CSV<input name="csv" type="file" accept=".csv,text/csv" required/></label>
     <div className="formfooter"><button className="secondarybutton" disabled={!programs.length}>Import candidate records</button></div>
    </form>
    <p className="micro">CSV columns: <code>legalName,email,phone,cohort,score,outcome</code>. Use <code>passed</code> or <code>failed</code> for the outcome.</p>
   </section>}
   {canApprove&&<section id="programs" className="panel"><div className="sectiontitle"><div><h2>Training programs</h2><p>Define exactly what the training organization certifies.</p></div></div>
    <div className="programtags">{programs.map(p=><span key={p.id} className="smallpill">{p.code} · {p.title}</span>)}{!programs.length&&<p>No programs registered yet.</p>}</div>
    <form action={addProgram} className="formgrid">
     <label>Code<input name="code" maxLength={24} required placeholder="SMT-INSTALL"/></label>
     <label>Program name<input name="title" required placeholder="Smart Meter Installation and Testing"/></label>
     <label className="full">Description<input name="description" maxLength={1000} placeholder="Training scope and competencies assessed"/></label>
     <label>Valid for (months; blank if none)<input type="number" name="months" min={1} max={240} placeholder="Optional"/></label>
     <div className="formfooter"><button className="secondarybutton">Add training program</button></div>
    </form>
   </section>}
   {admin&&<section id="integrations" className="panel"><div className="sectiontitle"><div><h2>API clients</h2><p>Create scoped server credentials for EDN Light or other approved partners. Never embed a key in client-side code.</p></div></div>
    <div className="twoCol"><div><h3>Create new credential</h3><ApiKeyCreate/></div><div><h3>Existing integrations</h3>{clients.map(c=><div className="listrow" key={c.id}><span><b>{c.label}</b><small>{c.revoked_at?"Revoked":"Active"} · {String(c.created_at).slice(0,10)}</small></span>{!c.revoked_at&&<form action={revokeApiKey}><input type="hidden" name="clientId" value={c.id}/><button className="ghost mini">Revoke</button></form>}</div>)}{!clients.length&&<p className="muted">No integration credentials created.</p>}</div></div>
   </section>}
   {admin&&<section id="team" className="panel"><div className="sectiontitle"><div><h2>Administrator access</h2><p>Use separate accounts to enforce maker-checker certificate approval.</p></div></div>
    <div className="twoCol"><div><h3>Create staff account</h3><form action={addStaff} className="stacked">
     <label>Email<input name="email" type="email" required/></label>
     <label>Role<select name="role"><option value="data_entry">Data-entry officer</option><option value="approver">Certificate approver</option><option value="auditor">Auditor</option><option value="admin">Administrator</option></select></label>
     <label>Temporary password (14+ characters)<input name="password" type="password" minLength={14} required/></label>
     <button className="secondarybutton">Create staff account</button></form></div>
     <div><h3>Current team</h3>{team.map(m=><div className="listrow" key={m.id}><span><b>{m.email}</b><small>{m.role} · {m.enabled?"Active":"Disabled"}</small></span>{m.enabled&&m.id!==staff.id&&<form action={disableStaff}><input name="staffId" type="hidden" value={m.id}/><button className="ghost mini">Disable</button></form>}</div>)}</div></div>
   </section>}
   <section id="security" className="panel"><div className="sectiontitle"><div><h2>Your account security</h2><p>Change your password and sign in again to continue.</p></div></div><form action={changeOwnPassword} className="formgrid"><label>Current password<input name="currentPassword" type="password" required/></label><label>New password (14+ characters)<input name="newPassword" type="password" minLength={14} required/></label><div className="formfooter"><button className="secondarybutton">Change password and sign out</button></div></form></section>
   <section id="audit" className="panel"><div className="sectiontitle"><div><h2>Audit trail</h2><p>Recent registry activity. Certificate-specific history is available from each certificate's details.</p></div></div>
    <div className="auditlist">{logs.map(l=><div key={l.id}><span className="dot"/><strong>{l.action.replaceAll("."," · ")}</strong><small>{l.entity_type} · {new Date(l.created_at).toLocaleString("en-NG",{timeZone:"Africa/Lagos"})}</small></div>)}{!logs.length&&<p>No activity recorded.</p>}</div>
   </section>
 </main>;
}
