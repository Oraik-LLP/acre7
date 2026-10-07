import Link from "next/link";
import { ArrowRight, Building2, Eye, UsersRound } from "lucide-react";
import { BuildQueue } from "@/components/acre7/BuildQueue";
import { SiteFooter, SiteHeader } from "@/components/acre7/SiteChrome";

const principles = [
  { icon: Building2, title: "Start with the real plan", copy: "The source stays visible. Rooms, openings, and uncertainty are reviewed before a generated view is treated as a decision." },
  { icon: Eye, title: "Constrain the visual language", copy: "Wall, floor, style, and light choices keep every room part of the same house instead of a collection of disconnected images." },
  { icon: UsersRound, title: "Make the handoff easier", copy: "Architects, buyers, brokers, and agents can point to the same room, same finish, and same moment in the project." },
];

export default function AboutPage() {
  return <main id="main-content" className="site-page-shell">
    <SiteHeader />
    <div className="site-page about-page">
      <section className="about-hero"><div><p className="home-kicker"><span className="home-kicker-line" /> About Acre7</p><h1>A visual handoff between the plan and the place.</h1><p>Acre7 is a spatial design workspace for the part of a project where a drawing has to become understandable to someone who did not draw it.</p><div className="home-actions"><Link className="site-button primary" href="/designer">Try the designer <ArrowRight size={16} /></Link><Link className="site-text-link" href="/viewpoints">Explore the viewpoints <ArrowRight size={16} /></Link></div></div><div className="about-hero-note"><span>01</span><p>Read the drawing.<br />Name the decisions.<br />Enter the room.</p></div></section>
      <section className="about-principles" aria-labelledby="principles-title"><div className="about-section-heading"><p className="home-kicker"><span className="home-kicker-line" /> Product principles</p><h2 id="principles-title">The useful part is the connection.</h2></div><div className="about-principle-list">{principles.map((principle, index) => { const Icon = principle.icon; return <article className="about-principle" key={principle.title}><span className="about-principle-number">0{index + 1}</span><span className="about-principle-icon"><Icon size={19} /></span><div><h3>{principle.title}</h3><p>{principle.copy}</p></div></article>; })}</div></section>
      <BuildQueue />
      <section className="about-next"><div><p className="home-kicker"><span className="home-kicker-line" /> Next review</p><h2>Bring the floor plan. Leave with a place everyone can discuss.</h2></div><Link className="site-button secondary" href="/designer">Open Acre7 <ArrowRight size={16} /></Link></section>
    </div>
    <SiteFooter />
  </main>;
}
