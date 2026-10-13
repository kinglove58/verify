import {requireStaff} from "@/lib/auth";
import {changeOwnPassword} from "@/app/actions";
import {PageHead} from "../WorkspaceUI";
export const dynamic="force-dynamic";
export default async function SettingsPage(){
 const user=await requireStaff();
 return <div className="workspace-page"><PageHead eyebrow="YOUR ACCOUNT" title="Account settings" description="Manage your login security and staff profile."/>
 <div className="workspace-quickgrid">
 <section className="panel"><h2>Staff profile</h2><dl className="resultdetails"><div><dt>Email address</dt><dd>{user.email}</dd></div><div><dt>Permission role</dt><dd>{user.role.replace("_"," ")}</dd></div><div><dt>Session security</dt><dd>Server-side authenticated</dd></div></dl></section>
 <section className="panel"><h2>Change your password</h2><p className="muted">Use a unique password with at least 14 characters. All active sessions will be signed out.</p>
 <form action={changeOwnPassword} className="stacked">
 <label>Current password<input name="currentPassword" type="password" required autoComplete="current-password"/></label>
 <label>New password<input name="newPassword" type="password" minLength={14} maxLength={200} required autoComplete="new-password"/></label>
 <button className="secondarybutton">Change password and sign out</button>
 </form></section></div></div>;
}
