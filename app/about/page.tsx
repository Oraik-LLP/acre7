import Link from "next/link";
import { ArrowRight, Building2, Eye, UsersRound } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/acre7/SiteChrome";

function SpatialPreview() {
  return <div className="about-spatial-demo" aria-label="Acre7 turns a floor plan into a spatial room view">
    <div className="about-spatial-demo-header"><span><i /> Plan to place</span><span>Spatial preview</span></div>
    <svg className="about-spatial-illustration" viewBox="0 0 420 190" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="about-plan-grid" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M8 0H0V8" fill="none" stroke="currentColor" strokeOpacity=".16" strokeWidth=".6" /></pattern>
        <linearGradient id="about-room-floor" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e4ead8" /><stop offset="1" stopColor="#b9c8aa" /></linearGradient>
        <linearGradient id="about-room-wall-left" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f6f5ed" /><stop offset="1" stopColor="#d5dfce" /></linearGradient>
        <linearGradient id="about-room-wall-right" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e9eee3" /><stop offset="1" stopColor="#c6d2bd" /></linearGradient>
      </defs>
      <g transform="translate(16 27)">
        <rect className="about-mini-plan-surface" width="116" height="116" rx="9" />
        <rect className="about-mini-plan-grid" width="116" height="116" rx="9" fill="url(#about-plan-grid)" />
        <path className="about-mini-plan-outline" d="M17 15h81v35h-13v51H17zM17 63h68M58 15v86M85 50v17" />
        <path className="about-mini-plan-route" d="M28 84V75h20V40h21" />
        <circle className="about-mini-plan-pin" cx="69" cy="40" r="3.5" />
      </g>
      <path className="about-plan-to-room" d="M145 86c13-17 24-17 38-2" />
      <path className="about-plan-to-room-arrow" d="m177 78 7 6-9 1" />
      <g className="about-mini-room" transform="translate(205 7)">
        <g className="about-mini-room-build">
          <polygon className="about-mini-room-shadow" points="14,108 94,65 180,111 98,158" />
          <polygon className="about-mini-room-floor" points="14,99 94,56 180,102 98,149" />
          <polygon className="about-mini-room-wall-left" points="14,99 94,56 94,14 14,58" />
          <polygon className="about-mini-room-wall-right" points="94,56 180,102 180,60 94,14" />
          <polygon className="about-mini-room-window" points="111,34 160,60 160,82 111,56" />
          <polygon className="about-mini-room-rug" points="49,101 92,78 137,102 94,126" />
          <polygon className="about-mini-room-furniture" points="45,91 72,77 105,94 78,109" />
          <polygon className="about-mini-room-furniture-side" points="45,91 45,103 78,120 78,109" />
          <polygon className="about-mini-room-furniture-front" points="78,109 105,94 105,106 78,120" />
          <path className="about-mini-room-detail" d="M53 88v9m8-13v9m47-36 49 26m-49-4 49 26M14 99v-41m166 44V60" />
          <circle className="about-mini-room-marker" cx="135" cy="105" r="4" />
        </g>
      </g>
      <text className="about-mini-label" x="19" y="164">2D PLAN</text>
      <text className="about-mini-label" x="249" y="164">ROOM VIEW</text>
    </svg>
    <div className="about-spatial-demo-footer"><span>Read the plan</span><span className="about-spatial-demo-connector" /><span>Explore the room</span></div>
  </div>;
}

const principles = [
  { icon: Building2, title: "Start with the real plan", copy: "The source stays visible. Rooms, openings, and uncertainty are reviewed before a generated view is treated as a decision." },
  { icon: Eye, title: "Constrain the visual language", copy: "Wall, floor, style, and light choices keep every room part of the same house instead of a collection of disconnected images." },
  { icon: UsersRound, title: "Make the handoff easier", copy: "Architects, buyers, brokers, and agents can point to the same room, same finish, and same moment in the project." },
];

export default function AboutPage() {
  return <main id="main-content" className="site-page-shell">
    <SiteHeader />
    <div className="site-page about-page">
      <section className="about-hero"><div><p className="home-kicker"><span className="home-kicker-line" /> About Acre7</p><h1>A visual handoff between the plan and the place.</h1><p>Acre7 is a spatial design workspace for the part of a project where a drawing has to become understandable to someone who did not draw it.</p><div className="home-actions"><Link className="site-button primary" href="/designer">Try the designer <ArrowRight size={16} /></Link><Link className="site-text-link" href="/viewpoints">Explore the viewpoints <ArrowRight size={16} /></Link></div></div><div className="about-hero-aside"><SpatialPreview /><div className="about-hero-note"><span>01</span><p>Read the drawing.<br />Name the decisions.<br />Enter the room.</p></div></div></section>
      <section className="about-principles" aria-labelledby="principles-title"><div className="about-section-heading"><p className="home-kicker"><span className="home-kicker-line" /> Product principles</p><h2 id="principles-title">The useful part is the connection.</h2></div><div className="about-principle-list">{principles.map((principle, index) => { const Icon = principle.icon; return <article className="about-principle" key={principle.title}><span className="about-principle-number">0{index + 1}</span><span className="about-principle-icon"><Icon size={19} /></span><div><h3>{principle.title}</h3><p>{principle.copy}</p></div></article>; })}</div></section>
      <section className="about-next"><div><p className="home-kicker"><span className="home-kicker-line" /> Next review</p><h2>Bring the floor plan. Leave with a place everyone can discuss.</h2></div><Link className="site-button secondary" href="/designer">Open Acre7 <ArrowRight size={16} /></Link></section>
    </div>
    <SiteFooter />
  </main>;
}
