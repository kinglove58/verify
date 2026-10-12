import {test} from "node:test";
import assert from "node:assert/strict";
import {newCertificateId,normalizeCertificateId,effectiveStatus,maskEmail,maskName,otpHash,safeEquals} from "../lib/crypto";
test("IDs validate and are difficult to guess",()=>{
 const seen=new Set<string>();
 for(let i=0;i<2500;i++){const id=newCertificateId();assert.equal(normalizeCertificateId(id.toLowerCase()),id);seen.add(id);}
 assert.equal(seen.size,2500);
 assert.equal(normalizeCertificateId("SMT-2026-AAAA-AAAA-AAAA-0000"),null);
});
test("revocation and suspension always override expiry",()=>{
 const past="2022-01-01";
 assert.equal(effectiveStatus("revoked",past),"revoked");
 assert.equal(effectiveStatus("suspended",past),"suspended");
 assert.equal(effectiveStatus("active",past),"expired");
 assert.equal(effectiveStatus("active",null),"active");
});
test("claims use bound, constant time digest comparison",()=>{
 const a=otpHash("challenge-A","123456","pepper");
 assert.ok(safeEquals(a,a));
 assert.ok(!safeEquals(a,otpHash("challenge-B","123456","pepper")));
});
test("public fields mask identifying details",()=>{
 assert.equal(maskName("Ada Chinyere Okafor"),"A*** C*** O***");
 assert.equal(maskEmail("ada@example.com"),"ad***@example.com");
});
