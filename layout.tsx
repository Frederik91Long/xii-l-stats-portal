import type {Metadata} from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata:Metadata={title:'XII-L | Official Stats Portal',description:'The Road to the Crown. XII-L fantasy football standings, matchups and franchises.'};
const nav=[['/','Overview'],['/standings','Standings'],['/matchups','Matchups'],['/franchises','Franchises']];
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="nl"><body><header className="top"><div className="wrap head"><Link href="/" className="logo"><span className="logoMark">XII</span><span><strong>XII-L</strong><small>OFFICIAL STATS PORTAL</small></span></Link><nav className="nav">{nav.map(([href,label])=><Link key={href} href={href}>{label}</Link>)}</nav><span className="seasonPill">2026 SEASON</span></div></header>{children}<footer className="footer">XII-L • The Road to the Crown · Independent fantasy league portal · Powered by Sleeper public data</footer></body></html>}
