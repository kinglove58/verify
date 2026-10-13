import {query} from "@/lib/db";
import {requireRole} from "@/lib/auth";
import {addProgram} from "@/app/actions";
import {PageHead,BlankSlate} from "../WorkspaceUI";
export const dynamic="force-dynamic";
type Program={id:string;code:string;title:string;description:string;validity_months:number|null;active:boolean};
export default async function ProgramsPage(){
 await requireRole("admin","approver");
 const programs=await query<Program>("SELECT id,code,title,description,validity_months,active FROM programs ORDER BY created_at DESC");
 return <div className="workspace-page"><PageHead eyebrow="WORKSPACE / LEARNING" title="Training programs" description="Define the training programs and competencies your organization records."/>
 <section className="panel"><div className="sectiontitle"><div><h2>Available programs</h2><p>{programs.length} programs configured</p></div></div>
 {!programs.length?<BlankSlate title="No training programs" description="Create a training program before adding candidates."/>:
 <div className="workspace-program-grid">{programs.map(p=><div className="workspace-programcard" key={p.id}><div><span className="smallpill">{p.code}</span><span className={"status-pill "+(p.active?"green":"red")}>{p.active?"Active":"Inactive"}</span></div><h3>{p.title}</h3><p>{p.description||"No description provided"}</p><small>Validity: {p.validity_months?p.validity_months+" months":"No expiry set"}</small></div>)}</div>}
 </section>
 <section className="panel"><div className="sectiontitle"><div><h2>Add a new program</h2><p>Only list qualifications that the training organization actually provides.</p></div></div>
 <form action={addProgram} className="formgrid">
  <label>Program code<input name="code" maxLength={24} required placeholder="SMT-INSTALL"/></label>
  <label>Program name<input name="title" required minLength={4} maxLength={160} placeholder="Smart Meter Installation and Testing"/></label>
  <label className="full">Description<input name="description" maxLength={1000} placeholder="Training scope and competencies assessed"/></label>
  <label>Valid for (months; optional)<input type="number" name="months" min={1} max={240} placeholder="No expiry"/></label>
  <div className="formfooter"><button className="secondarybutton">Add program</button></div>
 </form>
 </section></div>;
}
