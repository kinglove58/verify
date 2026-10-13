import {query} from "@/lib/db";
import {requireRole} from "@/lib/auth";
import {revokeApiKey} from "@/app/actions";
import ApiKeyCreate from "../ApiKeyCreate";
import {PageHead,BlankSlate} from "../WorkspaceUI";
export const dynamic="force-dynamic";
type Client={id:string;label:string;created_at:string;revoked_at:string|null};
export default async function IntegrationsPage(){
 await requireRole("admin");
 const clients=await query<Client>("SELECT id,label,created_at,revoked_at FROM api_clients ORDER BY created_at DESC LIMIT 100");
 return <div className="workspace-page"><PageHead eyebrow="MANAGEMENT / API" title="API integrations" description="Manage private server-to-server credentials for EDN Light and authorized clients."/>
 <div className="workspace-note"><b>Security:</b> integration tokens are shown only once. Never place them in the browser, mobile app, or GitHub.</div>
 <div className="workspace-quickgrid"><section className="panel"><div className="sectiontitle"><div><h2>Create a credential</h2><p>Give each partner a clearly named key.</p></div></div><ApiKeyCreate/></section>
 <section className="panel"><div className="sectiontitle"><div><h2>Existing clients</h2><p>Revoke compromised or unused credentials.</p></div></div>
 {!clients.length?<BlankSlate title="No integrations" description="Create an API credential to register a partner."/>:
 clients.map(c=><div className="listrow" key={c.id}><span><b>{c.label}</b><small>{c.revoked_at?"Revoked":"Active"} · {String(c.created_at).slice(0,10)}</small></span>{!c.revoked_at&&<form action={revokeApiKey}><input type="hidden" name="clientId" value={c.id}/><button className="ghost mini">Revoke</button></form>}</div>)}
 </section></div></div>;
}
