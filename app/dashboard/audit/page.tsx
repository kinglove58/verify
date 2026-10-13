import {query} from "@/lib/db";
import {PageHead,BlankSlate} from "../WorkspaceUI";
export const dynamic="force-dynamic";
type Log={id:string;action:string;entity_type:string;created_at:string;actor_email:string|null};
export default async function AuditPage(){
 const logs=await query<Log>(`SELECT a.id,a.action,a.entity_type,a.created_at,s.email as actor_email FROM audit_events a LEFT JOIN staff s ON s.id=a.actor_id ORDER BY a.created_at DESC LIMIT 150`);
 return <div className="workspace-page"><PageHead eyebrow="MANAGEMENT / HISTORY" title="Audit activity" description="A traceable history of staff actions, approvals, credentials, and integration checks."/>
 <section className="panel"><div className="sectiontitle"><div><h2>Recent events</h2><p>Showing up to 150 newest activities</p></div><span className="smallpill">{logs.length} events</span></div>
 {!logs.length?<BlankSlate title="No events recorded" description="Actions appear here automatically."/>:
 <div className="tablewrap"><table className="datatable"><thead><tr><th>Action</th><th>Record type</th><th>Performed by</th><th>Date / time</th></tr></thead><tbody>{logs.map(l=><tr key={l.id}><td><b>{l.action.replaceAll("."," · ")}</b></td><td>{l.entity_type}</td><td>{l.actor_email||"System / API"}</td><td>{new Date(l.created_at).toLocaleString("en-NG",{timeZone:"Africa/Lagos"})}</td></tr>)}</tbody></table></div>}
 </section></div>;
}
