import {redirect} from "next/navigation";
import {normalizeCertificateId} from "@/lib/crypto";
import type {Metadata} from "next";
export const metadata:Metadata={title:"Verify a certificate"};
export default async function VerifySearch({searchParams}:{searchParams:Promise<{id?:string}>}){
 const p=await searchParams;
 if(p.id){const normalized=normalizeCertificateId(p.id);if(normalized)redirect("/verify/"+normalized);}
 return <main className="narrow searchpage"><div className="tinylabel">CERTIFICATE LOOKUP</div><h1>Check a training certificate</h1><p>Enter the unique ID printed on the certificate or scan its QR code.</p>
   {p.id&&<div className="message danger">That certificate ID has an invalid format.</div>}
   <form className="stacked formpanel" action="/verify" method="GET">
     <label>Certificate ID<input type="text" name="id" required autoComplete="off" placeholder="SMT-2026-XXXX-XXXX-XXXX-XXXX"/></label>
     <button type="submit" className="primary">Check registry →</button>
   </form><p className="micro">A valid training certificate does not necessarily authorize regulated electrical work.</p></main>;
}
