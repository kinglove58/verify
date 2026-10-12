import "server-only";
import { query } from "@/lib/db";
import { secretHash } from "@/lib/crypto";
import { limitRequest } from "@/lib/auth";

export type ApiClient = {id:string;label:string};
export async function apiClient(request:Request):Promise<ApiClient|null> {
  const value=request.headers.get("authorization")||"";
  if(!/^Bearer vfy_(?:test|live)_[A-Za-z0-9_-]{40,}$/.test(value)) return null;
  const rows=await query<ApiClient>("SELECT id,label FROM api_clients WHERE token_hash=$1 AND revoked_at IS NULL",[secretHash(value.slice(7))]);
  if(!rows[0]) return null;
  await limitRequest("api:"+rows[0].id, rows[0].id, 240, 1);
  return rows[0];
}
export function jsonError(message:string,status:number) {return Response.json({error:message},{status,headers:{"Cache-Control":"no-store"}});}
