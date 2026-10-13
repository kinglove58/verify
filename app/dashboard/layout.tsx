import {Suspense} from "react";
import type {ReactNode} from "react";
import {requireStaff} from "@/lib/auth";
import DashboardSidebar from "./DashboardSidebar";
import DashboardNotice from "./DashboardNotice";
export const dynamic="force-dynamic";
export default async function DashboardLayout({children}:{children:ReactNode}) {
 const staff=await requireStaff();
 return <div className="workspace-layout">
  <DashboardSidebar email={staff.email} role={staff.role as "admin"|"approver"|"data_entry"|"auditor"}/>
  <main className="workspace-main" id="workspace-content"><Suspense fallback={null}><DashboardNotice/></Suspense>{children}</main>
 </div>;
}
