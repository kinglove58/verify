import "server-only";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { secretHash,secureToken } from "@/lib/crypto";

export type Staff = { id:string; email:string; role:"admin"|"data_entry"|"approver"|"auditor" };
const cookieName = process.env.NODE_ENV === "production" ? "__Host-verify_session" : "verify_session";
export async function currentStaff(): Promise<Staff|null> {
  const token=(await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const items=await query<Staff>(`SELECT s.id,s.email,s.role FROM sessions x JOIN staff s ON s.id=x.staff_id
    WHERE x.token_hash=$1 AND x.expires_at>now() AND s.enabled=true`,[secretHash(token)]);
  return items[0]||null;
}
export async function requireStaff(): Promise<Staff> {
  const staff=await currentStaff();
  if (!staff) redirect("/login");
  return staff;
}
export async function requireRole(...roles:Staff["role"][]): Promise<Staff> {
  const staff=await requireStaff();
  if (!roles.includes(staff.role)) throw new Error("You do not have permission to perform this action.");
  return staff;
}
export async function checkPassword(email:string,password:string) {
  const users=await query<Staff&{password_hash:string}>(`SELECT id,email,role,password_hash FROM staff WHERE email=$1 AND enabled=true`,[email.toLowerCase()]);
  const user=users[0];
  const dummy="$2a$12$C6UzMDM.H6dfI/f/IKxGhuF9s9G2y7z/7Q87c3BaaLX0GA1Qfu/9a";
  const valid=await bcrypt.compare(password,user?.password_hash||dummy);
  return valid&&user?user:null;
}
export async function startSession(staffId:string) {
  const token=secureToken("");
  await query("INSERT INTO sessions(staff_id,token_hash,expires_at) VALUES($1,$2,now()+interval '8 hours')",[staffId,secretHash(token)]);
  (await cookies()).set(cookieName,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:8*3600});
}
export async function endSession() {
  const jar=await cookies(),token=jar.get(cookieName)?.value;
  if(token) await query("DELETE FROM sessions WHERE token_hash=$1",[secretHash(token)]);
  jar.delete(cookieName);
}
export async function limitRequest(scope:string,identity:string,max:number,minutes:number) {
  const pepper=process.env.SECURITY_PEPPER;
  if(!pepper||pepper.length<32) throw new Error("SECURITY_PEPPER must contain at least 32 characters.");
  const id=secretHash(pepper+identity);
  const window=Math.floor(Date.now()/(minutes*60_000));
  const result=await query<{hits:number}>(`INSERT INTO request_limits(scope,fingerprint,bucket,hits) VALUES($1,$2,$3,1)
    ON CONFLICT(scope,fingerprint,bucket) DO UPDATE SET hits=request_limits.hits+1 RETURNING hits`,[scope,id,window]);
  if(result[0].hits>max) throw new Error("Too many requests. Please try again later.");
}
export async function requestFingerprint():Promise<string> {
  const h=await headers();
  return h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
