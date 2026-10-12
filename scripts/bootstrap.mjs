import pg from "pg";
import bcrypt from "bcryptjs";
const email=(process.env.BOOTSTRAP_EMAIL||"").trim().toLowerCase(),password=process.env.BOOTSTRAP_PASSWORD||"";
if(!process.env.DATABASE_URL||!email||password.length<14||!email.includes("@")) throw new Error("Export DATABASE_URL, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD (14+ characters).");
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try {
 const existing=await pool.query("SELECT count(*)::int AS n FROM staff");
 if(existing.rows[0].n!==0) throw new Error("Bootstrap allowed only when there are no staff accounts.");
 const hash=await bcrypt.hash(password,12);
 await pool.query("INSERT INTO staff(email,password_hash,role) VALUES($1,$2,'admin')",[email,hash]);
 console.log("First administrator created. Clear the bootstrap password from your environment.");
} finally {await pool.end();}
