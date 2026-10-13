import {query} from "@/lib/db";
import {requireRole} from "@/lib/auth";
import {addStaff,disableStaff} from "@/app/actions";
import {PageHead} from "../WorkspaceUI";
export const dynamic="force-dynamic";
type Staff={id:string;email:string;role:string;enabled:boolean};
export default async function TeamPage(){
 const actor=await requireRole("admin");
 const team=await query<Staff>("SELECT id,email,role,enabled FROM staff ORDER BY created_at");
 return <div className="workspace-page"><PageHead eyebrow="MANAGEMENT / USERS" title="Staff & roles" description="Invite team members, grant the minimum required permissions, and manage access."/>
 <div className="workspace-note">One authorized administrator or approver can approve a passed trainee. Separate approval accounts are optional.</div>
 <div className="workspace-quickgrid"><section className="panel"><div className="sectiontitle"><div><h2>Add staff member</h2><p>Give each person their own login.</p></div></div>
 <form action={addStaff} className="stacked">
 <label>Staff email<input name="email" type="email" required/></label>
 <label>Role<select name="role"><option value="data_entry">Data-entry officer</option><option value="approver">Certificate approver</option><option value="auditor">Auditor</option><option value="admin">Administrator</option></select></label>
 <label>Temporary password (14+ characters)<input name="password" type="password" minLength={14} required/></label><button className="secondarybutton">Create staff account</button>
 </form></section>
 <section className="panel"><div className="sectiontitle"><div><h2>Current team</h2><p>{team.length} accounts</p></div></div>
 {team.map(m=><div className="listrow" key={m.id}><span><b>{m.email}</b><small>{m.role.replace("_"," ")} · {m.enabled?"Active":"Disabled"}</small></span>
 {m.enabled&&m.id!==actor.id&&<form action={disableStaff}><input name="staffId" type="hidden" value={m.id}/><button className="ghost mini">Disable</button></form>}</div>)}
 </section></div></div>;
}
