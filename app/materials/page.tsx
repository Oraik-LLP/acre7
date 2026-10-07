"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Droplets, LampCeiling, Palette, SunMedium } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/acre7/SiteChrome";

type MaterialGroup = "walls" | "flooring" | "style" | "lighting";

const materialGroups: { key: MaterialGroup; label: string; icon: typeof Palette; options: { label: string; detail: string; swatch: string }[] }[] = [
  {
    key: "walls",
    label: "Wall color",
    icon: Palette,
    options: [
      { label: "Warm white", detail: "Soft mineral white", swatch: "#e6e3d9" },
      { label: "Soft beige", detail: "Quiet sand tone", swatch: "#c9bba6" },
      { label: "Sage green", detail: "Muted garden green", swatch: "#83917f" },
      { label: "Light grey", detail: "Cool architectural grey", swatch: "#a8afb0" },
    ],
  },
  {
    key: "flooring",
    label: "Flooring",
    icon: Droplets,
    options: [
      { label: "Oak wood", detail: "Natural plank direction", swatch: "linear-gradient(120deg,#6f4a35,#b98555,#5d3c2d)" },
      { label: "Stone tile", detail: "Quiet honed surface", swatch: "linear-gradient(135deg,#aaa99f,#dad6cb,#85877e)" },
      { label: "White marble", detail: "Light veined finish", swatch: "linear-gradient(135deg,#f4f1e9,#aeb5b4,#fff)" },
      { label: "Polished concrete", detail: "Soft industrial base", swatch: "linear-gradient(135deg,#717876,#b6bbb5,#777d7a)" },
    ],
  },
  {
    key: "style",
    label: "Interior style",
    icon: LampCeiling,
    options: [
      { label: "Warm natural", detail: "Wood, linen, daylight", swatch: "linear-gradient(120deg,#554035,#bd956f,#53644e)" },
      { label: "Modern minimal", detail: "Clean planes, low contrast", swatch: "linear-gradient(120deg,#202624,#e4e4dc,#9da39d)" },
      { label: "Earthy classic", detail: "Layered textures, calm weight", swatch: "linear-gradient(120deg,#633c31,#b98d6d,#626b55)" },
      { label: "Urban contrast", detail: "Dark trim, graphic light", swatch: "linear-gradient(120deg,#151a1b,#6c7374,#c2b3a1)" },
    ],
  },
  {
    key: "lighting",
    label: "Lighting",
    icon: SunMedium,
    options: [
      { label: "Natural daylight", detail: "Clear morning balance", swatch: "linear-gradient(120deg,#9ac8de,#fff2d4)" },
      { label: "Warm evening", detail: "Low sun, warmer shadows", swatch: "linear-gradient(120deg,#7f5142,#e6b16b)" },
      { label: "Soft ambient", detail: "Diffuse and quiet", swatch: "linear-gradient(120deg,#68627c,#d1bfaf)" },
      { label: "Bright neutral", detail: "Even review light", swatch: "linear-gradient(120deg,#c4d1d5,#f5f4ef)" },
    ],
  },
];

export default function MaterialsPage() {
  const [activeGroup, setActiveGroup] = useState<MaterialGroup>("walls");
  const [selections, setSelections] = useState<Record<MaterialGroup, string>>({
    walls: "Warm white", flooring: "Oak wood", style: "Warm natural", lighting: "Natural daylight",
  });
  const group = materialGroups.find((item) => item.key === activeGroup) ?? materialGroups[0];
  const activeOption = group.options.find((option) => option.label === selections[activeGroup]) ?? group.options[0];

  return <main id="main-content" className="site-page-shell">
    <SiteHeader />
    <div className="site-page materials-page">
      <header className="page-intro materials-intro"><div><p className="home-kicker"><span className="home-kicker-line" /> Materials / controlled choices</p><h1>Set the atmosphere before the first render.</h1><p>Keep the palette deliberate. Acre7 carries these choices through the overhead view and every room-level panorama.</p></div><Link className="site-button primary" href="/designer">Use in designer <ArrowRight size={16} /></Link></header>

      <section className="materials-workspace" aria-label="Material selector">
        <aside className="materials-rail"><div className="materials-rail-heading"><span>Design direction</span><small>4 decisions</small></div>{materialGroups.map((item) => { const Icon = item.icon; const active = item.key === activeGroup; return <button type="button" className={active ? "materials-tab active" : "materials-tab"} key={item.key} onClick={() => setActiveGroup(item.key)} aria-pressed={active}><span className="materials-tab-icon"><Icon size={17} /></span><span><strong>{item.label}</strong><small>{selections[item.key]}</small></span><ChevronDown size={15} /></button>; })}<div className="materials-rail-note"><span className="status-pip" /><div><strong>Consistent by design</strong><p>Selections stay attached to this project as you move between plan and viewpoints.</p></div></div></aside>

        <div className="materials-stage">
          <div className="materials-stage-top"><div><span className="stage-label">Cedar House / {group.label}</span><h2>{activeOption.label}</h2><p>{activeOption.detail}</p></div><span className="materials-count">{materialGroups.findIndex((item) => item.key === activeGroup) + 1} / 4</span></div>
          <div className="materials-scene" style={{ ["--material-swatch" as string]: activeOption.swatch }}>
            <div className="materials-scene-image" role="img" aria-label="Cedar House interior preview" />
            <div className="materials-scene-wash" />
            <div className="materials-scene-chip"><span className="materials-swatch" style={{ background: activeOption.swatch }} /><span>{activeOption.label}</span><Check size={14} /></div>
            <span className="materials-scene-caption">The same decision travels through all five viewpoints.</span>
          </div>
          <div className="materials-options" role="listbox" aria-label={group.label}>{group.options.map((option) => { const active = option.label === selections[activeGroup]; return <button type="button" role="option" aria-selected={active} className={active ? "materials-option active" : "materials-option"} key={option.label} onClick={() => setSelections((current) => ({ ...current, [activeGroup]: option.label }))}><span className="materials-option-swatch" style={{ background: option.swatch }} /><span><strong>{option.label}</strong><small>{option.detail}</small></span>{active && <Check size={16} />}</button>; })}</div>
        </div>
      </section>
    </div>
    <SiteFooter />
  </main>;
}
