import {login} from "@/app/actions";
import {currentStaff} from "@/lib/auth";
import {redirect} from "next/navigation";
import type {Metadata} from "next";
export const metadata:Metadata={title:"Staff sign in"};
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
 if(await currentStaff())redirect("/dashboard");
 const params=await searchParams;
 return <main className="authwrap"><section className="authcard">
  <span className="eyebrow">AUTHORIZED PERSONNEL</span><h1>Welcome back</h1><p>Sign in to securely manage training records and certificates.</p>
  {params.error&&<div className="message danger" role="alert">Invalid email or password. Try again.</div>}
  <form action={login} className="stacked">
   <label>Email address<input type="email" name="email" placeholder="name@organization.com" autoComplete="username" required maxLength={254}/></label>
   <label>Password<input type="password" name="password" autoComplete="current-password" required/></label>
   <button className="primary" type="submit">Sign in securely <span aria-hidden>→</span></button>
  </form>
  <p className="micro">Access restricted to approved administrators, data-entry officers, approvers and auditors.</p>
 </section></main>;
}
