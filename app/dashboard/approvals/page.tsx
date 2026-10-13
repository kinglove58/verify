import {query} from "@/lib/db";
import {requireStaff} from "@/lib/auth";
import {decideEnrollment} from "@/app/actions";
import {PageHead,BlankSlate} from "../WorkspaceUI";
export const dynamic="force-dynamic";
type Pending={id:string;legal_name:string;email:string;cohort:string;score:string;outcome:string;title:string;submitted_by:string};
export default async function ApprovalsPage(){
 const staff=await requireStaff(),canApprove=["admin","approver"].includes(staff.role);
 const pending=await query<Pending>(`SELECT e.id,c.legal_name,c.email,e.cohort,e.score,e.outcome,p.title,e.submitted_by
  FROM enrollments e JOIN candidates c ON c.id=e.candidate_id JOIN programs p ON p.id=e.program_id
  WHERE e.state='submitted' ORDER BY e.created_at DESC LIMIT 200`);
 return <div className="workspace-page">
 <PageHead eyebrow="WORKSPACE / REVIEW" title="Approvals" description="One authorized officer can approve a passed trainee and issue their certificate. Each decision is logged."/>
 <div className="workspace-note"><b>Simple approval:</b> the administrator or approver may now approve their own submitted record. Failed assessments still cannot receive certificates.</div>
 <section className="panel"><div className="sectiontitle"><div><h2>Awaiting decision</h2><p>Review the assessment information before issuing a certificate.</p></div><span className="smallpill">{pending.length} pending</span></div>
 {!pending.length?<BlankSlate title="No pending approvals" description="Submitted trainee records appear here for approval." href="/dashboard/candidates" label="Register trainee"/>:
 <div className="reviewgrid">{pending.map(p=><div className="reviewitem" key={p.id}><div><strong>{p.legal_name}</strong><small>{p.email} · {p.title} · {p.cohort}</small><span className="reviewmeta">Score: {p.score}% · {p.outcome.toUpperCase()} · Submitted by {p.submitted_by===staff.id?"you":"another officer"}</span></div>
 {canApprove?<div className="reviewforms">
  <form action={decideEnrollment}><input type="hidden" name="enrollmentId" value={p.id}/><input type="hidden" name="decision" value="approve"/><button className="minibutton primary" disabled={p.outcome!=="passed"}>Approve & issue</button></form>
  <form action={decideEnrollment}><input type="hidden" name="enrollmentId" value={p.id}/><input type="hidden" name="decision" value="reject"/><input name="reason" placeholder="Rejection reason (10+ chars)" minLength={10} required/><button className="minibutton ghost">Reject</button></form>
 </div>:<small className="muted">You have view-only access.</small>}
 </div>)}</div>}
 </section></div>;
}
