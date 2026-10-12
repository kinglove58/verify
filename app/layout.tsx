import type {Metadata} from "next";
import Link from "next/link";
import "./globals.css";
export const metadata:Metadata={
 title:{default:"Verify | Technician Certificate Registry",template:"%s | Verify"},
 description:"Independent training certificate registry and secure verification API for skilled meter technicians.",
 robots:{index:false,follow:false}
};
export default function Layout({children}:{children:React.ReactNode}){
 return <html lang="en"><body>
  <header className="topbar">
   <div className="shell topinner">
    <Link href="/" className="brand"><span className="brandmark">✓</span><span>verify<span className="branddot">.</span></span><small>Credential registry</small></Link>
    <nav aria-label="Main navigation"><Link href="/verify">Verify certificate</Link><Link href="/dashboard">Dashboard</Link><Link href="/login" className="navbutton">Staff sign in <span aria-hidden>→</span></Link></nav>
   </div>
  </header>
  {children}
  <footer className="footer"><div className="shell footergrid"><span>© {new Date().getFullYear()} Verify Registry</span><span>Training completion is not a regulatory licence.</span><span>Built for trusted workforce verification.</span></div></footer>
 </body></html>
}
