import {test} from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {newCertificateId} from "../lib/crypto";

test("PostgreSQL registry constraints and lifecycle",async()=>{
 if(!process.env.DATABASE_URL) throw new Error("DATABASE_URL required for integration tests");
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
 try{
  const staff1=(await pool.query<{id:string}>(`INSERT INTO staff(email,password_hash,role) VALUES($1,'test-hash','data_entry') RETURNING id`,["test-data-"+crypto.randomUUID()+"@example.invalid"])).rows[0].id;
  const staff2=(await pool.query<{id:string}>(`INSERT INTO staff(email,password_hash,role) VALUES($1,'test-hash','approver') RETURNING id`,["test-approver-"+crypto.randomUUID()+"@example.invalid"])).rows[0].id;
  assert.notEqual(staff1,staff2);
  const code="TEST-"+crypto.randomUUID().slice(0,8).toUpperCase();
  const program=(await pool.query<{id:string}>(`INSERT INTO programs(code,title,validity_months) VALUES($1,'Demo Installation',24) RETURNING id`,[code])).rows[0].id;
  const candidate=(await pool.query<{id:string}>(`INSERT INTO candidates(legal_name,email,created_by) VALUES('Example Holder','example.holder@example.invalid',$1) RETURNING id`,[staff1])).rows[0].id;
  const record=(await pool.query<{id:string}>(`INSERT INTO enrollments(candidate_id,program_id,cohort,score,outcome,submitted_by) VALUES($1,$2,'October 2026',91,'passed',$3) RETURNING id`,[candidate,program,staff1])).rows[0].id;
  await pool.query("UPDATE enrollments SET state='approved',decided_by=$2,decided_at=now() WHERE id=$1",[record,staff1]);
  assert.equal((await pool.query("SELECT submitted_by=decided_by AS same_officer FROM enrollments WHERE id=$1",[record])).rows[0].same_officer,true);
  const id=newCertificateId();
  const cert=(await pool.query<{id:string}>(`INSERT INTO certificates(enrollment_id,public_id,holder_name,course_title,issuer_name,created_by) VALUES($1,$2,'Example Holder','Demo Installation','Demo Issuer',$3) RETURNING id`,[record,id,staff2])).rows[0].id;
  const found=await pool.query(`SELECT c.public_id,p.email FROM certificates c JOIN enrollments e ON e.id=c.enrollment_id JOIN candidates p ON p.id=e.candidate_id WHERE c.public_id=$1`,[id]);
  assert.equal(found.rows[0].email,"example.holder@example.invalid");
  await assert.rejects(()=>pool.query(`INSERT INTO certificates(enrollment_id,public_id,holder_name,course_title,issuer_name,created_by) VALUES($1,$2,'Example Holder','Duplicate','Demo Issuer',$3)`,[record,id,staff2]),(e:unknown)=>Boolean(e&&typeof e==="object"&&"code" in e&&e.code==="23505"));
  await pool.query("UPDATE certificates SET state='suspended',last_reason='Training claim under independent review' WHERE id=$1",[cert]);
  assert.equal((await pool.query("SELECT state FROM certificates WHERE id=$1",[cert])).rows[0].state,"suspended");
  await pool.query("UPDATE certificates SET state='revoked',last_reason='Credential revoked after investigation' WHERE id=$1",[cert]);
  assert.equal((await pool.query("SELECT state FROM certificates WHERE id=$1",[cert])).rows[0].state,"revoked");
 }finally{await pool.end();}
});
