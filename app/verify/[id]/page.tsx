import Link from "next/link";
import { findCertificate,publicCertificate } from "@/lib/certificates";
import { normalizeCertificateId } from "@/lib/crypto";
import type {Metadata} from "next";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Certificate status"};
export default async function CertificateVerification({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const match=normalizeCertificateId(id),row=match?await findCertificate(match):null;
 const cert=row?publicCertificate(row):null;
 return <main className="narrow verifyresult"><Link href="/verify" className="backlink">← Verify another certificate</Link>
  {!cert?<div className="resultcard"><div className="bigicon bad">!</div><span className="eyebrow">NO MATCH FOUND</span><h1>Certificate not found</h1><p>No record matches this identifier. Check the printed ID and try again. Contact the issuing organization if you believe this is an error.</p><Link className="primarylink" href="/verify">Try again →</Link></div>:
  <div className="resultcard">
   {cert.isDemo&&<div className="demoalert">DEMONSTRATION RECORD — NOT AN OFFICIAL CREDENTIAL</div>}
   <div className={"bigicon "+(cert.status==="active"?"good":"bad")}>{cert.status==="active"?"✓":"!"}</div>
   <span className="eyebrow">REGISTRY VERIFICATION RESULT</span>
   <h1>{cert.status==="active"?"Credential record confirmed":"Credential "+cert.status}</h1>
   <p>{cert.status==="active"?"This training completion certificate exists in the registry.":"This training completion credential is not currently active and must not be accepted as valid."}</p>
   <dl className="resultdetails">
    <div><dt>Certificate ID</dt><dd className="mono">{cert.certificateId}</dd></div>
    <div><dt>Status</dt><dd className={"status-pill "+(cert.status==="active"?"green":"red")}>{cert.status.toUpperCase()}</dd></div>
    <div><dt>Holder (masked)</dt><dd>{cert.holder}</dd></div>
    <div><dt>Training</dt><dd>{cert.course}</dd></div>
    <div><dt>Issuing organization</dt><dd>{cert.issuer}</dd></div>
    <div><dt>Issued</dt><dd>{String(cert.issueDate).slice(0,10)}</dd></div>
    <div><dt>Expires</dt><dd>{cert.expiryDate?String(cert.expiryDate).slice(0,10):"No expiry set"}</dd></div>
    <div><dt>Credential classification</dt><dd>Training completion</dd></div>
   </dl>
   <p className="micro">A registry match is not identity verification of the person presenting the credential. Independent holder confirmation is required for EDN Light onboarding. This is not a NEMSA licence.</p>
  </div>}
 </main>
}
