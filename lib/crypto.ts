import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export function newCertificateId(year = new Date().getUTCFullYear()): string {
  const chunks = Array.from({length:4}, () => Array.from({length:4}, () => alphabet[randomInt(alphabet.length)]).join(""));
  return ["SMT",String(year),...chunks].join("-");
}
export function normalizeCertificateId(value: string): string | null {
  const v = value.trim().toUpperCase();
  return /^SMT-20\d{2}(?:-[23456789A-HJ-NP-Z]{4}){4}$/.test(v) ? v : null;
}
export function secretHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
export function secureToken(prefix: string): string {
  return prefix + randomBytes(32).toString("base64url");
}
export function oneTimeCode(): string { return String(randomInt(0,1_000_000)).padStart(6,"0"); }
export function otpHash(challengeId: string, code: string, pepper: string): string {
  return createHmac("sha256",pepper).update(challengeId+":"+code).digest("hex");
}
export function safeEquals(a: string,b: string): boolean {
  const aa=Buffer.from(a,"hex"), bb=Buffer.from(b,"hex");
  return aa.length===bb.length && timingSafeEqual(aa,bb);
}
export function effectiveStatus(state: string, expiresAt: string | Date | null): string {
  if (state !== "active") return state;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return "expired";
  return "active";
}
export function maskName(name: string): string {
  return name.trim().split(/\s+/).map(p=>p[0]?.toUpperCase()+"***").join(" ");
}
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return (local?.slice(0,2)||"*") + "***@" + (domain||"hidden");
}
