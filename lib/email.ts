import "server-only";
import nodemailer from "nodemailer";
export async function sendHolderCode(to:string,code:string,certificate:string) {
 const {SMTP_HOST,SMTP_USER,SMTP_PASSWORD,SMTP_FROM,SMTP_PORT}=process.env;
 if(!SMTP_HOST||!SMTP_USER||!SMTP_PASSWORD||!SMTP_FROM) throw new Error("Email verification is not configured");
 const transport=nodemailer.createTransport({host:SMTP_HOST,port:Number(SMTP_PORT||587),secure:Number(SMTP_PORT||587)===465,auth:{user:SMTP_USER,pass:SMTP_PASSWORD}});
 await transport.sendMail({
   from:SMTP_FROM,to,subject:"Certificate ownership verification code",
   text:`A request was made to link your certificate ${certificate} to a professional account. Your code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email. Never share the code.`
 });
}
