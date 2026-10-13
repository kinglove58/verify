"use client";
import {useSearchParams} from "next/navigation";
export default function DashboardNotice() {
 const notice=useSearchParams().get("notice");
 return notice?<div className="message success workspace-notice" role="status">{notice.slice(0,350)}</div>:null;
}
