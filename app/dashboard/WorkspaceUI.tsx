import Link from "next/link";
export function PageHead({eyebrow,title,description,action}:{eyebrow?:string;title:string;description:string;action?:{href:string;label:string}}) {
 return <header className="workspace-pagehead"><div>{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>{action&&<Link className="primary" href={action.href}>{action.label} →</Link>}</header>;
}
export function BlankSlate({title,description,href,label}:{title:string;description:string;href?:string;label?:string}){
 return <div className="workspace-empty"><div className="workspace-empty-icon" aria-hidden="true">◎</div><h3>{title}</h3><p>{description}</p>{href&&label&&<Link className="secondarybutton" href={href}>{label}</Link>}</div>;
}
export function DemoAlert(){return process.env.ISSUER_APPROVED==="true"?null:<div className="demoalert block">Demonstration mode is enabled. Certificates created here remain marked DEMO until an authorized issuer formally approves them.</div>}
