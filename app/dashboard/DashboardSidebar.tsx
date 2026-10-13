"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useState} from "react";
import {logout} from "@/app/actions";
type Role = "admin"|"data_entry"|"approver"|"auditor";
type NavItem = {href:string;label:string;icon:string;roles?:Role[]};
const primary:NavItem[]=[
 {href:"/dashboard",label:"Overview",icon:"▦"},
 {href:"/dashboard/certificates",label:"Certificates",icon:"▣"},
 {href:"/dashboard/approvals",label:"Approvals",icon:"✓"},
 {href:"/dashboard/candidates",label:"Candidates",icon:"♙",roles:["admin","data_entry","approver"]},
 {href:"/dashboard/programs",label:"Training programs",icon:"⌑",roles:["admin","approver"]}
];
const management:NavItem[]=[
 {href:"/dashboard/integrations",label:"API integrations",icon:"⇄",roles:["admin"]},
 {href:"/dashboard/team",label:"Staff & roles",icon:"♧",roles:["admin"]},
 {href:"/dashboard/audit",label:"Audit activity",icon:"◷"},
 {href:"/dashboard/settings",label:"Account settings",icon:"⚙"}
];
export default function DashboardSidebar({email,role}:{email:string;role:Role}) {
 const path=usePathname(),[open,setOpen]=useState(false);
 const menu=(items:NavItem[])=>items.filter(item=>!item.roles||item.roles.includes(role)).map(item=>{
  const active=item.href==="/dashboard"?path==="/dashboard":path===item.href||path.startsWith(item.href+"/");
  return <Link href={item.href} key={item.href} onClick={()=>setOpen(false)} aria-current={active?"page":undefined} className={"workspace-navlink"+(active?" active":"")}>
   <span className="workspace-navicon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>{active&&<span className="workspace-current" aria-hidden="true"/>}
  </Link>;
 });
 return <>
 <div className="workspace-mobilebar"><span><b>VERIFY</b> / Workspace</span><button type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-controls="workspace-menu">{open?"Close ✕":"Menu ☰"}</button></div>
 {open&&<button className="workspace-scrim" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
 <aside className={"workspace-sidebar"+(open?" open":"")} id="workspace-menu">
  <div className="workspace-heading"><span className="workspace-brandmark">✓</span><div><strong>Verify workspace</strong><small>Certificate management</small></div></div>
  <div className="workspace-sidegroup"><span className="workspace-groupname">WORKSPACE</span>{menu(primary)}</div>
  <div className="workspace-sidegroup"><span className="workspace-groupname">MANAGEMENT</span>{menu(management)}</div>
  <div className="workspace-sidebar-bottom">
   <div className="workspace-demotag">● DEMO ENVIRONMENT</div>
   <div className="workspace-profile"><span className="workspace-avatar">{email.slice(0,1).toUpperCase()}</span><div><strong title={email}>{email}</strong><small>{role.replace("_"," ")}</small></div></div>
   <form action={logout}><button className="workspace-signout" type="submit">↩ Sign out</button></form>
  </div>
 </aside>
 </>;
}
