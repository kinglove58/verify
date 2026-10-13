import {query} from "@/lib/db";
import {requireRole} from "@/lib/auth";
import {addCandidate,importCandidates} from "@/app/actions";
import CohortField from "../CohortField";
import {PageHead,BlankSlate} from "../WorkspaceUI";
export const dynamic="force-dynamic";
type Program={id:string;code:string;title:string;active:boolean};
type Candidate={id:string;legal_name:string;email:string;created_at:string};
export default async function CandidatesPage(){
 await requireRole("admin","data_entry","approver");
 const [programs,recent]=await Promise.all([
  query<Program>("SELECT id,code,title,active FROM programs ORDER BY created_at DESC"),
  query<Candidate>("SELECT id,legal_name,email,created_at FROM candidates ORDER BY created_at DESC LIMIT 12")
 ]);
 const options=programs.filter(p=>p.active);
 return <div className="workspace-page"><PageHead eyebrow="WORKSPACE / REGISTRATION" title="Candidates" description="Register completed training and submit assessment results for certificate approval."/>
 <section className="panel"><div className="sectiontitle"><div><h2>Register a trainee</h2><p>Use genuine course and assessment information. Records remain DEMO while issuer approval is pending.</p></div></div>
 <form action={addCandidate} className="formgrid">
  <label>Full legal name<input name="legalName" required minLength={3} maxLength={160} placeholder="As recorded by the training organization"/></label>
  <label>Holder email (for future verification)<input type="email" name="email" required placeholder="candidate@example.com"/></label>
  <label>Phone number (optional)<input type="tel" name="phone" maxLength={30} placeholder="+234 ..."/></label>
  <label>Training program<select name="programId" required defaultValue=""><option value="" disabled>Select training program</option>{options.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
  <CohortField/>
  <label>Assessment score (%)<input type="number" name="score" min={0} max={100} step="0.01" required/></label>
  <label>Assessment outcome<select name="outcome" required><option value="passed">Passed</option><option value="failed">Failed</option></select></label>
  <div className="formfooter"><button className="primary" disabled={!options.length}>Submit candidate →</button></div>
 </form>
 {!options.length&&<p className="message danger">No training program is active. Add a program before registering candidates.</p>}
 </section>
 <section className="panel"><div className="sectiontitle"><div><h2>Bulk candidate import</h2><p>Up to 250 candidates per CSV file. Each record still requires a one-person approval decision.</p></div></div>
 <form action={importCandidates} className="formgrid">
  <label>Training program<select name="programId" defaultValue="" required><option disabled value="">Select program</option>{options.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
  <label>Upload CSV<input name="csv" type="file" accept=".csv,text/csv" required/></label>
  <div className="formfooter"><button className="secondarybutton" disabled={!options.length}>Import candidates</button></div>
 </form>
 <p className="micro">CSV columns: <code>legalName,email,phone,cohort,score,outcome</code>. Use <code>passed</code> or <code>failed</code>.</p>
 </section>
 <section className="panel"><div className="sectiontitle"><div><h2>Recently registered candidates</h2><p>The latest 12 submissions</p></div></div>
 {!recent.length?<BlankSlate title="No trainee records yet" description="Use the registration form to create your first candidate."/>:
 <div className="tablewrap"><table className="datatable"><thead><tr><th>Legal name</th><th>Contact email</th><th>Registered</th></tr></thead><tbody>{recent.map(c=><tr key={c.id}><td>{c.legal_name}</td><td>{c.email}</td><td>{String(c.created_at).slice(0,10)}</td></tr>)}</tbody></table></div>}
 </section>
 </div>;
}
