"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Compass, Move3d } from "lucide-react";
import { demoViewpoints as viewpoints } from "@/lib/acre7/scene/viewpoints";
import { SiteFooter, SiteHeader } from "@/components/acre7/SiteChrome";

export default function ViewpointsPage() {
  const [selectedId, setSelectedId] = useState(viewpoints[0].id);
  const selected = viewpoints.find((viewpoint) => viewpoint.id === selectedId) ?? viewpoints[0];

  return <main className="site-page-shell">
    <SiteHeader />
    <main className="site-page viewpoints-page">
      <header className="page-intro viewpoints-intro"><div><p className="home-kicker"><span className="home-kicker-line" /> Viewpoints / room positions</p><h1>Choose where the conversation happens.</h1><p>Use the plan as the map. Place a handful of positions where the material decision, circulation, or room feeling needs a closer look.</p></div><Link className="site-button primary" href="/designer">Open the full designer <ArrowUpRight size={16} /></Link></header>

      <section className="viewpoints-workspace" aria-label="Cedar House viewpoints">
        <div className="viewpoints-map"><div className="viewpoints-map-grid" aria-hidden="true" /><div className="viewpoints-floorplan" role="img" aria-label="Cedar House furnished overhead plan" />{viewpoints.map((viewpoint) => <button type="button" key={viewpoint.id} className={viewpoint.id === selected.id ? "viewpoint-map-pin active" : "viewpoint-map-pin"} style={{ left: `${viewpoint.planPosition.x}%`, top: `${viewpoint.planPosition.y}%` }} onClick={() => setSelectedId(viewpoint.id)} aria-label={`Select ${viewpoint.name}`} aria-pressed={viewpoint.id === selected.id}><span>{viewpoint.index}</span></button>)}<div className="viewpoints-map-label"><Compass size={16} /><span>North-up plan</span></div></div>
        <aside className="viewpoints-detail"><div className="viewpoints-detail-top"><span className="stage-label">Cedar House / selected position</span><span className="viewpoints-progress">{selected.index} / {viewpoints.length}</span></div><div className="viewpoints-image" style={{ backgroundImage: `url(${selected.panoramaUrl})` }} role="img" aria-label={`${selected.name} panorama preview`}><span className="viewpoints-image-badge"><Move3d size={15} /> Spherical view</span></div><div className="viewpoints-detail-copy"><div><h2>{selected.name}</h2><p>{selected.roomLabel}</p></div><span className="viewpoints-ready"><Check size={14} /> Ready</span></div><div className="viewpoints-detail-meta"><span><small>Position</small>{selected.planPosition.x}% / {selected.planPosition.y}%</span><span><small>Elevation</small>{selected.elevation} m</span><span><small>Initial heading</small>{Math.round(selected.initialYaw)}°</span></div><Link className="site-button secondary viewpoints-open" href={`/designer?viewpoint=${selected.id}`}>Open this view <ArrowRight size={16} /></Link></aside>
      </section>

      <div className="viewpoints-list" role="list" aria-label="All viewpoints">{viewpoints.map((viewpoint) => <button type="button" key={viewpoint.id} className={viewpoint.id === selected.id ? "viewpoints-list-item active" : "viewpoints-list-item"} onClick={() => setSelectedId(viewpoint.id)} aria-pressed={viewpoint.id === selected.id}><span className="viewpoints-list-number">{String(viewpoint.index).padStart(2, "0")}</span><span><strong>{viewpoint.name}</strong><small>{viewpoint.roomLabel}</small></span><span className="viewpoints-list-arrow"><ArrowRight size={15} /></span></button>)}</div>
    </main>
    <SiteFooter />
  </main>;
}
