import {PDFDocument,StandardFonts,rgb} from "pdf-lib";
import QRCode from "qrcode";
import { currentStaff } from "@/lib/auth";
import { findCertificate } from "@/lib/certificates";
import { effectiveStatus } from "@/lib/crypto";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
 const actor=await currentStaff();
 if(!actor)return new Response("Unauthorized",{status:401});
 const row=await findCertificate((await params).id);
 if(!row)return new Response("Not found",{status:404});
 const document=await PDFDocument.create();
 const page=document.addPage([842,595]);
 const font=await document.embedFont(StandardFonts.Helvetica);
 const bold=await document.embedFont(StandardFonts.HelveticaBold);
 const white=rgb(1,1,1),navy=rgb(.035,.095,.17),gold=rgb(.78,.56,.22);
 page.drawRectangle({x:0,y:0,width:842,height:595,color:rgb(.97,.98,.99)});
 page.drawRectangle({x:0,y:565,width:842,height:30,color:navy});
 page.drawRectangle({x:28,y:28,width:786,height:525,borderColor:gold,borderWidth:2});
 page.drawText("CERTIFICATE OF TRAINING COMPLETION",{x:76,y:473,font:bold,size:24,color:navy});
 page.drawText("THIS CERTIFIES THAT",{x:76,y:423,font,size:13,color:rgb(.38,.44,.52)});
 page.drawText(row.holder_name.slice(0,60),{x:76,y:380,font:bold,size:28,color:navy});
 page.drawText("successfully completed",{x:76,y:342,font,size:14,color:navy});
 page.drawText(row.course_title.slice(0,70),{x:76,y:310,font:bold,size:19,color:navy});
 page.drawText("Issuer: "+row.issuer_name.slice(0,78),{x:76,y:258,font,size:12,color:navy});
 page.drawText("Certificate ID: "+row.public_id,{x:76,y:225,font:bold,size:12,color:navy});
 page.drawText("Issued: "+new Date(row.issued_at).toISOString().slice(0,10),{x:76,y:198,font,size:12,color:navy});
 page.drawText("Status: "+effectiveStatus(row.state,row.expires_at).toUpperCase(),{x:76,y:171,font,size:12,color:navy});
 const origin=process.env.NEXT_PUBLIC_BASE_URL||new URL(request.url).origin;
 const qr=await document.embedPng(await QRCode.toBuffer(origin+"/verify/"+row.public_id,{width:220,margin:2}));
 page.drawImage(qr,{x:640,y:94,width:130,height:130});
 page.drawText("Scan to verify current status",{x:618,y:78,font,size:10,color:navy});
 if(row.is_demo){
  page.drawRectangle({x:80,y:83,width:460,height:50,color:rgb(1,.92,.87)});
  page.drawText("DEMONSTRATION ONLY - NOT AN OFFICIAL CREDENTIAL",{x:94,y:106,font:bold,size:12,color:rgb(.62,.19,.1)});
  page.drawText("Not proof of any regulatory licence or authorization.",{x:94,y:90,font,size:10,color:rgb(.62,.19,.1)});
 }
 page.drawText("Check live registry status; printed certificates may have been suspended or revoked.",{x:75,y:49,font,size:10,color:navy});
 const bytes=await document.save();
 return new Response(Buffer.from(bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":'attachment; filename="certificate-'+row.public_id+'.pdf"',"Cache-Control":"no-store"}});
}
