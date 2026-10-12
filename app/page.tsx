import Link from "next/link";
export default function Home(){
 return <main>
  <section className="hero shell">
   <div className="heromain">
    <span className="eyebrow"><span className="pulse"/> INDEPENDENT CERTIFICATE VERIFICATION</span>
    <h1>Every credential.<br/><em>Accounted for.</em></h1>
    <p className="lead">A secure digital registry for training organizations to record achievements, issue traceable certificates, and let partners verify credentials instantly.</p>
    <form action="/verify" method="GET" className="lookup">
      <label htmlFor="certificate">Verify a certificate</label>
      <div className="lookupinput"><input id="certificate" name="id" autoComplete="off" placeholder="Enter certificate ID e.g. SMT-2026-XXXX-..." required/><button type="submit">Verify now <span aria-hidden>→</span></button></div>
      <small>Verification checks the current registry status, including suspension and revocation.</small>
    </form>
   </div>
   <div className="heroart" aria-hidden="true">
    <div className="orbit orbit1"/><div className="orbit orbit2"/>
    <div className="certificate-art"><div className="seal">✓</div><div className="cert-upper">VERIFIED TRAINING RECORD</div><div className="fake-line large"/><div className="fake-line medium"/><div className="fake-line"/><div className="fake-line short"/><div className="cert-bottom"><span>REGISTRY VERIFIED</span><span>↗</span></div></div>
    <div className="float-proof"><span>✓</span><div><b>Authenticity verified</b><small>Checked against live records</small></div></div>
   </div>
  </section>
  <section className="under-hero"><div className="shell featuregrid">
    <div><span className="featureicon">01</span><h3>Issued with control</h3><p>Authorized staff record training achievements, independent approvers review them, and every decision is logged.</p></div>
    <div><span className="featureicon">02</span><h3>Verified in real time</h3><p>Unique, unguessable certificate IDs let anyone check the present status of a credential.</p></div>
    <div><span className="featureicon">03</span><h3>Connected via API</h3><p>Approved partners can verify certificates and confirm holder ownership before onboarding professionals.</p></div>
  </div></section>
  <section className="shell bottomcta"><div><span className="eyebrow">FOR TRAINING ORGANIZATIONS</span><h2>Build confidence in every professional you certify.</h2></div><Link href="/login" className="primarylink">Access registry dashboard →</Link></section>
 </main>;
}
