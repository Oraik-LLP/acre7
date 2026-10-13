"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, MapPin } from "lucide-react";
import { demoViewpoints as viewpoints } from "@/lib/acre7/scene/viewpoints";
import type { MaterialSelections } from "@/lib/acre7/types";

export const demoStepLabels = ["Plan", "Materials", "Viewpoints", "Generate", "Tour"];
type MaterialKey = keyof MaterialSelections;
const materialLabels: Record<MaterialKey, string> = { walls: "Wall color", flooring: "Flooring", style: "Interior style", lighting: "Lighting" };

export function DemoStepNavigation({ step, onStep }: { step: number; onStep: (index: number) => void }) {
  return <nav className="demo-flow-nav" aria-label="Demo step navigation">
    <button type="button" aria-label="Previous demo step" disabled={step === 0} onClick={() => onStep(step - 1)}><ArrowLeft size={18} /><span>Previous</span></button>
    <span aria-live="polite"><strong>{demoStepLabels[step]}</strong><small>Step {step + 1} of {demoStepLabels.length}</small></span>
    <button type="button" aria-label="Next demo step" disabled={step === demoStepLabels.length - 1} onClick={() => onStep(step + 1)}><span>Next</span><ArrowRight size={18} /></button>
  </nav>;
}

export function DemoWorkflow({ step, parameters, options, onParameter, selectedId, onSelect, startEmpty, onStartEmpty, onStep, onExit }: {
  step: number;
  parameters: MaterialSelections;
  options: Record<MaterialKey, { label: string; swatch: string }[]>;
  onParameter: (key: MaterialKey, value: string) => void;
  selectedId: string;
  onSelect: (id: string) => void;
  startEmpty: boolean;
  onStartEmpty: (empty: boolean) => void;
  onStep: (index: number) => void;
  onExit: () => void;
}) {
  const [activeMaterial, setActiveMaterial] = useState<MaterialKey>("walls");
  const selected = viewpoints.find((point) => point.id === selectedId) ?? viewpoints[0];
  const title = step === 0 ? "Start with the floor plan." : step === 1 ? "Choose the room’s atmosphere." : "Decide where to look around.";
  const description = step === 0 ? "Explore Cedar House from the first drawing to the finished 360° tour. Everything you need for this walkthrough is already prepared." : step === 1 ? "Try the material controls and carry your choices through the demo. The prepared images use the original warm natural palette." : "Choose the room where your tour begins. These five prepared positions connect the plan to the panoramic views.";

  return <>
    <section className="workspace demo-workspace">
      <aside className="control-panel demo-panel">
        <button type="button" className="demo-exit" onClick={onExit}><ArrowLeft size={15} /> Back to designer</button>
        <h1>{title}</h1><p className="intro">{description}</p>
        {step === 0 && <>
          <div className="demo-plan-summary"><strong>Cedar House</strong><span>2 bedrooms · living · dining · kitchen</span><p>A sample plan accompanies this prepared tour. Follow the steps above or use Next below.</p></div>
          <label className="empty-room-choice"><input type="checkbox" checked={startEmpty} onChange={(event) => onStartEmpty(event.target.checked)} /><span><strong>Start with empty rooms</strong><small>Explore the empty-room versions, then add furniture inside the tour.</small></span></label>
        </>}
        {step === 1 && <>
          <div className="demo-material-tabs" aria-label="Material groups">{(Object.keys(materialLabels) as MaterialKey[]).map((key) => <button type="button" key={key} aria-pressed={key === activeMaterial} className={key === activeMaterial ? "selected" : ""} onClick={() => setActiveMaterial(key)}><strong>{materialLabels[key]}</strong><small>{parameters[key]}</small></button>)}</div>
          <p className="demo-sample-note">Demo selections are saved as you explore. This walkthrough displays prepared images without generating new ones.</p>
        </>}
        {step === 2 && <>
          <div className="viewpoint-heading"><span>Tour starts in</span><small>{selected.index} / {viewpoints.length}</small></div>
          <div className="viewpoint-list">{viewpoints.map((point) => <button type="button" key={point.id} className={point.id === selectedId ? "viewpoint-item selected" : "viewpoint-item"} aria-pressed={point.id === selectedId} onClick={() => onSelect(point.id)}><span className="viewpoint-thumb" style={{ backgroundImage: `url(${point.panoramaUrl})` }}><small>{point.index}</small></span><span><strong>{point.name}</strong><small>{point.roomLabel}</small></span>{point.id === selectedId ? <Check size={16} /> : <ArrowRight size={16} />}</button>)}</div>
        </>}
      </aside>
      <section className="canvas-panel demo-stage" aria-label={`${demoStepLabels[step]} demo preview`}>
        <div className="canvas-toolbar"><div><span className="canvas-title">{step === 0 ? "Cedar House · sample plan" : step === 1 ? materialLabels[activeMaterial] : "Choose a starting viewpoint"}</span><span className="canvas-status">{step === 0 ? "Prepared example · no upload needed" : step === 1 ? "Original sample: warm white · oak · daylight" : `${selected.name} · ${viewpoints.length} room positions`}</span></div><span className="resolution-pill">Step {step + 1} / 5</span></div>
        {step === 0 ? <div className="demo-plan-drawing">
          <svg viewBox="0 0 1200 760" role="img" aria-label="Illustrative Cedar House floor plan with two bedrooms, living room, dining area and kitchen">
            <path className="demo-plan-wall" d="M94 80H1104V672H94ZM94 365H510V80M510 80V348H694V80M694 80V365H1104M94 365V620H510V365M510 365V672M694 365V585H1104M694 585H510M864 365V585M510 250H694M360 365V672" />
            <path className="demo-plan-door" d="M442 365a69 69 0 0 1 69-69M694 282a63 63 0 0 1 63 63M510 470a57 57 0 0 0 57 57M806 585a65 65 0 0 1 65 65M975 365a62 62 0 0 0 62 62" />
            <text x="290" y="215">Primary bedroom</text><text x="885" y="205">Living room</text><text x="250" y="500">Guest bedroom</text><text x="780" y="475">Dining</text><text x="980" y="475">Kitchen</text><text className="demo-plan-entry" x="610" y="635">Entry</text>
          </svg><span className="demo-drawing-note">Illustrative source plan for the prepared demo</span>
        </div> : step === 1 ? <div className="demo-material-stage">
          <div className="demo-material-image"><Image src="/demo/apartment-overhead.png" alt="Cedar House prepared interior with the original warm natural palette" width={1672} height={1000} unoptimized /></div>
          <div className="demo-material-options" aria-label={materialLabels[activeMaterial]}>{options[activeMaterial].map((option) => <button type="button" key={option.label} className={parameters[activeMaterial] === option.label ? "selected" : ""} aria-pressed={parameters[activeMaterial] === option.label} onClick={() => onParameter(activeMaterial, option.label)}><span className="demo-material-swatch" style={{ background: option.swatch }} /><strong>{option.label}</strong>{parameters[activeMaterial] === option.label && <Check size={16} />}</button>)}</div>
        </div> : <div className="overview-canvas demo-viewpoint-map">
          <Image className="overhead-image" src={startEmpty ? "/demo/furniture/apartment-overhead-empty.webp" : "/demo/apartment-overhead.png"} alt="Cedar House overview with five prepared viewpoints" width={1672} height={1000} unoptimized />
          {viewpoints.map((point) => <button type="button" key={point.id} className={point.id === selectedId ? "map-point active" : "map-point"} aria-label={`Select starting viewpoint: ${point.name}`} aria-pressed={point.id === selectedId} style={{ left: `${point.planPosition.x}%`, top: `${point.planPosition.y}%` }} onClick={() => onSelect(point.id)}>{point.index}</button>)}
          <div className="demo-selected-view"><MapPin size={16} /> Start in {selected.name}</div>
        </div>}
      </section>
    </section>
    <DemoStepNavigation step={step} onStep={onStep} />
  </>;
}
