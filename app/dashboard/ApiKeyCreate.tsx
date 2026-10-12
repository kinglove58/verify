"use client";
import { useActionState } from "react";
import { createApiKey, type ApiKeyState } from "@/app/actions";
export default function ApiKeyCreate(){
 const [state,action,pending]=useActionState<ApiKeyState,FormData>(createApiKey,{});
 return <form action={action} className="stacked">
  <label>Integration name<input name="label" placeholder="EDN Light staging" minLength={3} required/></label>
  <button type="submit" className="primary" disabled={pending}>{pending?"Generating…":"Create API credential"}</button>
  {state.error&&<div className="message danger" role="alert">{state.error}</div>}
  {state.token&&<div className="keybox" role="status"><b>Copy now — this secret cannot be retrieved again.</b><textarea readOnly rows={3} value={state.token} onFocus={e=>e.currentTarget.select()}/><small>Use only in EDN Light's server-side environment, never in a mobile app.</small></div>}
 </form>;
}
