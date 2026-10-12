import fs from "node:fs/promises";
import pg from "pg";
if(!process.env.DATABASE_URL) throw new Error("Export DATABASE_URL before migrating.");
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try {
 const sql=await fs.readFile(new URL("../db/schema.sql",import.meta.url),"utf8");
 await pool.query(sql);
 console.log("Schema successfully applied.");
} finally {await pool.end();}
