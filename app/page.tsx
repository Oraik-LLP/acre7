"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown,
  ChevronRight, CircleDot, FileImage, House, Layers3, LoaderCircle, MapPin,
  Ruler, ScanLine, Sparkles, Upload, Waypoints,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanoramaViewer } from "@/components/acre7/PanoramaViewer";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { demoViewpoints as viewpoints } from "@/lib/acre7/scene/viewpoints";
import type { PanoramaMetadata, Viewpoint } from "@/lib/acre7/scene/types";
import type { FloorPlanAnalysis, ProviderStatus } from "@/lib/acre7/types";
import { SiteFooter, SiteHeader } from "@/components/acre7/SiteChrome";

type ParameterKey = "walls" | "flooring" | "style" | "lighting";
type Screen = "source" | "overview" | "tour";

const options: Record<ParameterKey, { label: string; swatch: string }[]> = {
  walls: [
    { label: "Warm white", swatch: "#e8e2d7" }, { label: "Soft beige", swatch: "#cbbba4" },
    { label: "Sage green", swatch: "#81917b" }, { label: "Light grey", swatch: "#a9adb0" },
  ],
  flooring: [
    { label: "Oak wood", swatch: "linear-gradient(120deg,#77513a,#bc8c5c,#694732)" },
    { label: "Stone tile", swatch: "linear-gradient(135deg,#b8b2a6,#d9d5cc)" },
    { label: "White marble", swatch: "linear-gradient(135deg,#f3f1ed,#a9aeb1,#fff)" },
    { label: "Polished concrete", swatch: "linear-gradient(135deg,#86898b,#bbbdbd)" },
  ],
  style: [
    { label: "Warm natural", swatch: "linear-gradient(120deg,#614536,#c19568,#4f5b45)" },
    { label: "Modern minimal", swatch: "linear-gradient(120deg,#222726,#e9e5dd,#9b9d98)" },
    { label: "Earthy classic", swatch: "linear-gradient(120deg,#6a3f2f,#b88d69,#59604a)" },
    { label: "Urban contrast", swatch: "linear-gradient(120deg,#161b1d,#6d7374,#c8b8a4)" },
  ],
  lighting: [
    { label: "Natural daylight", swatch: "linear-gradient(120deg,#92bdda,#fff3d5)" },
    { label: "Warm evening", swatch: "linear-gradient(120deg,#8e5540,#e7b36c)" },
    { label: "Soft ambient", swatch: "linear-gradient(120deg,#6e6684,#d2bdac)" },
    { label: "Bright neutral", swatch: "linear-gradient(120deg,#c8d2d6,#f5f4ef)" },
  ],
};
const titles: Record<ParameterKey, string> = { walls: "Wall color", flooring: "Flooring", style: "Interior style", lighting: "Lighting" };
function preloadImage(url: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Unable to preload ${url}`));
    image.src = url;
  });
}

export function DesignerApp() {
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [picker, setPicker] = useState<ParameterKey | null>(null);
  const [instructions, setInstructions] = useState("");
  const [providers, setProviders] = useState<ProviderStatus | null>(null);
  const [analysis, setAnalysis] = useState<FloorPlanAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [screen, setScreen] = useState<Screen>("source");
  const [selectedViewpoint, setSelectedViewpoint] = useState("view_living");
  const [panoramaMetadata, setPanoramaMetadata] = useState<PanoramaMetadata | null>(null);
  const [isEnteringTour, setIsEnteringTour] = useState(false);
  const [isPreparingTour, setIsPreparingTour] = useState(false);
  const [parameters, setParameters] = useState<Record<ParameterKey, string>>({
    walls: "Warm white", flooring: "Oak wood", style: "Warm natural", lighting: "Natural daylight",
  });

  useEffect(() => {
    fetch("/api/provider-status")
      .then((response) => response.json() as Promise<ProviderStatus>)
      .then(setProviders)
      .catch(() => setProviders(null));
    viewpoints.forEach((viewpoint) => { const image = new Image(); image.src = viewpoint.panoramaUrl; });
    return () => { if (transitionTimer.current) clearTimeout(transitionTimer.current); };
  }, []);

  async function enterTour() {
    if (isEnteringTour || isPreparingTour) return;
    setIsPreparingTour(true);
    try {
      await preloadImage(selected.panoramaUrl);
    } catch {
      // The WebGL viewer owns the visible load/error state and fallback.
    }
    setIsPreparingTour(false);
    setIsEnteringTour(true);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    transitionTimer.current = setTimeout(() => {
      setScreen("tour"); setIsEnteringTour(false);
    }, reducedMotion ? 100 : 1450);
  }

  function acceptFile(nextFile?: File) {
    if (!nextFile || !nextFile.type.match(/^(image\/(png|jpeg)|application\/pdf)$/)) {
      setAnalysisError("Use a PNG, JPG, or PDF floor plan."); return;
    }
    if (nextFile.size > 20 * 1024 * 1024) {
      setAnalysisError("The floor plan must be 20 MB or smaller."); return;
    }
    setAnalysisError(""); setAnalysis(null); setFile(nextFile);
    if (nextFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(String(reader.result));
      reader.readAsDataURL(nextFile);
    } else setPreview(null);
  }

  async function analyze() {
    if (!file || isAnalyzing) return;
    setIsAnalyzing(true); setAnalysisError("");
    const form = new FormData();
    form.set("floorPlan", file); form.set("instructions", instructions); form.set("materials", JSON.stringify(parameters));
    try {
      const response = await fetch("/api/analyze", { method: "POST", body: form });
      const payload = await response.json() as { analysis?: FloorPlanAnalysis; error?: string };
      if (!response.ok || !payload.analysis) throw new Error(payload.error || "Floor-plan analysis failed.");
      setAnalysis(payload.analysis);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Floor-plan analysis failed.");
    } finally { setIsAnalyzing(false); }
  }

  const activeStep = screen === "source" ? 0 : screen === "overview" ? 3 : 4;
  const selected = viewpoints.find((viewpoint) => viewpoint.id === selectedViewpoint) ?? viewpoints[0];

  return (
    <main id="main-content" className={`app-shell screen-${screen}`}>
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setScreen("source")} aria-label="Acre7 home"><span className="brand-mark"><House size={17} strokeWidth={2.2} /></span><span>acre<span className="brand-seven">7</span></span></button>
        <div className="project-title"><span className="project-kicker">{screen === "source" ? "New project" : "Cedar House"}</span><span className="autosave"><span /> {screen === "source" ? "Plan review" : "Prepared demo"}</span></div>
        <div className={screen === "source" ? "provider-state" : "provider-state project-ready"}>
          <span className={screen !== "source" || providers?.analysisEnabled ? "provider-dot ready" : "provider-dot"} />
          <span>{screen !== "source" ? "Demo ready" : providers?.analysisEnabled ? "Plan reader ready" : "Demo mode"}</span>
        </div>
      </header>

      <nav className="steps" aria-label="Project progress">
        {["Plan", "Materials", "Viewpoints", "Generate", "Tour"].map((step, index) => (
          <div className={index === activeStep ? "step active" : index < activeStep ? "step complete" : "step"} key={step}>
            <span className="step-number">{index < activeStep ? <Check size={13} /> : index + 1}</span><span>{step}</span>
          </div>
        ))}
      </nav>

      {screen === "source" ? (
        <SourceWorkspace
          file={file} preview={preview} analysis={analysis} analysisError={analysisError} isAnalyzing={isAnalyzing} analysisEnabled={providers?.analysisEnabled ?? false}
          parameters={parameters} instructions={instructions}
          onFile={acceptFile} onInstructions={setInstructions} onPicker={setPicker} onAnalyze={analyze}
          onOpenReady={() => { setScreen("overview"); setAnalysisError(""); }}
        />
      ) : (
        <ReadyProject
          screen={screen} selected={selected} selectedViewpoint={selectedViewpoint}
          isEntering={isEnteringTour} isPreparing={isPreparingTour} panoramaMetadata={panoramaMetadata}
          onSelect={(id) => { setSelectedViewpoint(id); setPanoramaMetadata(null); }}
          onTour={() => { void enterTour(); }} onOverview={() => { setScreen("overview"); setPanoramaMetadata(null); }}
          onMetadata={setPanoramaMetadata}
        />
      )}

      <Dialog open={picker !== null} onOpenChange={(open) => !open && setPicker(null)}>
        <DialogContent className="picker-dialog">
          <DialogHeader><DialogTitle>{picker ? titles[picker] : "Choose an option"}</DialogTitle><DialogDescription>Choose one controlled value to keep every generated view consistent.</DialogDescription></DialogHeader>
          <div className="option-grid">
            {picker && options[picker].map((option) => {
              const isSelected = parameters[picker] === option.label;
              return <button type="button" key={option.label} className={isSelected ? "option-card selected" : "option-card"} onClick={() => { setParameters((current) => ({ ...current, [picker]: option.label })); setPicker(null); }}><span className="option-swatch" style={{ background: option.swatch }} /><span>{option.label}</span>{isSelected && <span className="selected-check"><Check size={14} /></span>}</button>;
            })}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

type SourceProps = {
  file: File | null; preview: string | null; analysis: FloorPlanAnalysis | null; analysisError: string; isAnalyzing: boolean; analysisEnabled: boolean;
  parameters: Record<ParameterKey, string>; instructions: string;
  onFile: (file?: File) => void; onInstructions: (value: string) => void; onPicker: (key: ParameterKey) => void;
  onAnalyze: () => void; onOpenReady: () => void;
};

function SourceWorkspace(props: SourceProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return <section className="workspace">
    <aside className="control-panel">
      <div className="eyebrow"><Layers3 size={15} /> Source</div>
      <h1>Turn a floor plan into a place you can enter.</h1>
      <p className="intro">Upload one floor plan. You’ll review the rooms and openings before any image is generated.</p>
      <input ref={inputRef} className="sr-only" type="file" accept="image/png,image/jpeg,application/pdf" onChange={(event) => props.onFile(event.target.files?.[0])} />
      <button type="button" className={props.file ? "upload-card has-file" : "upload-card"} onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); props.onFile(event.dataTransfer.files[0]); }}>
        <span className="upload-icon">{props.file ? <FileImage /> : <Upload />}</span>
        <span className="upload-copy"><strong>{props.file ? props.file.name : "Drop your floor plan here"}</strong><small>{props.file ? "Click to replace" : "PNG, JPG or PDF · up to 20 MB"}</small></span>
        {props.file && <span className="file-check"><Check size={15} /></span>}
      </button>
      <button type="button" className="ready-project-link" onClick={props.onOpenReady}><span><Sparkles size={16} /> Preview generated Cedar House</span><ArrowRight size={16} /></button>

      <div className="prompt-block"><div className="field-label">Design direction</div><div className="prompt-sentence">
        I want to generate this house with <Chip label={props.parameters.walls} onClick={() => props.onPicker("walls")} /> walls, <Chip label={props.parameters.flooring} onClick={() => props.onPicker("flooring")} /> flooring, a <Chip label={props.parameters.style} onClick={() => props.onPicker("style")} /> interior, and <Chip label={props.parameters.lighting} onClick={() => props.onPicker("lighting")} />.
      </div><textarea value={props.instructions} onChange={(event) => props.onInstructions(event.target.value)} maxLength={4000} aria-label="Additional instructions" placeholder="Add project details, room priorities, or finishes…" /></div>
      {props.analysisError && <div className="inline-alert" role="alert"><AlertTriangle size={17} /><span>{props.analysisError}</span></div>}
      <Button className="primary-action" size="lg" disabled={!props.file || props.isAnalyzing || !props.analysisEnabled} onClick={props.onAnalyze}>{props.isAnalyzing ? <><LoaderCircle className="spin" /> Reading plan…</> : <>Read floor plan <ArrowRight /></>}</Button>
      {!props.analysisEnabled ? <p className="action-note">Live plan reading is not enabled here. Explore the prepared Cedar House tour above.</p> : !props.file && <p className="action-note">Upload a plan to start a new project</p>}
    </aside>

    <section className="canvas-panel" aria-label="Floor plan preview">
      <div className="canvas-toolbar"><div><span className="canvas-title">{props.analysis ? "Layout review" : "Floor plan"}</span><span className="canvas-status">{props.analysis ? `${props.analysis.rooms.length} rooms · ${props.analysis.openings.length} openings detected` : props.file ? "Ready to analyze" : "Waiting for upload"}</span></div><span className="resolution-pill">{props.analysis ? "Needs confirmation" : "Input source"}</span></div>
      <div className={props.preview ? "plan-canvas with-preview" : "plan-canvas"}>
        {props.preview ? <img src={props.preview} alt="Uploaded floor plan preview" /> : props.file ? <div className="pdf-preview"><FileImage size={34} /><strong>{props.file.name}</strong><span>PDF ready for page selection</span></div> : <EmptyPlan />}
        {props.analysis && <div className="analysis-drawer"><div className="analysis-heading"><div><small>Floor plan extraction</small><strong>{props.analysis.projectSummary}</strong></div><span>{Math.round((props.analysis.rooms.reduce((sum, room) => sum + room.confidence, 0) / Math.max(props.analysis.rooms.length, 1)) * 100)}% avg. confidence</span></div><div className="room-list">{props.analysis.rooms.map((room) => <div className="room-result" key={room.id}><span>{room.label}</span><small>{Math.round(room.confidence * 100)}%</small></div>)}</div>{props.analysis.uncertainties.length > 0 && <div className="uncertainty"><AlertTriangle size={15} /><span>{props.analysis.uncertainties[0]}</span></div>}<p className="analysis-next-note">This is the current live step. The Cedar House tour above is a prepared example.</p></div>}
      </div>
      <div className="canvas-footer"><span>Review the extracted rooms and uncertainties before planning a visualization.</span><span className="provider-note">Gemini plan analysis · prepared panorama demo</span></div>
    </section>
  </section>;
}

function ReadyProject({ screen, selected, selectedViewpoint, isEntering, isPreparing, panoramaMetadata, onSelect, onTour, onOverview, onMetadata }: {
  screen: Screen; selected: Viewpoint; selectedViewpoint: string; isEntering: boolean; isPreparing: boolean;
  panoramaMetadata: PanoramaMetadata | null;
  onSelect: (id: string) => void; onTour: () => void; onOverview: () => void;
  onMetadata: (metadata: PanoramaMetadata | null) => void;
}) {
  return <section className="workspace ready-workspace">
    <aside className="control-panel project-panel">
      <div className="eyebrow"><Sparkles size={15} /> Cedar House</div>
      <h1>{screen === "tour" ? selected.name : "Your home, from every angle."}</h1>
      <p className="intro">{screen === "tour" ? `${selected.roomLabel} · Viewpoint ${selected.index} of 5` : "Five positions connect the furnished overview to an immersive room-by-room tour."}</p>
      <div className="project-spec"><span><small>Walls</small>Warm white</span><span><small>Floor</small>Oak wood</span><span><small>Style</small>Warm natural</span><span><small>Light</small>Daylight</span></div>
      <div className="viewpoint-heading"><span>Viewpoints</span><small>5 / 5</small></div>
      <div className="viewpoint-list">{viewpoints.map((viewpoint) => <button type="button" key={viewpoint.id} aria-pressed={selectedViewpoint === viewpoint.id} className={selectedViewpoint === viewpoint.id ? "viewpoint-item selected" : "viewpoint-item"} onClick={() => onSelect(viewpoint.id)}><span className="viewpoint-thumb" style={{ backgroundImage: `url(${viewpoint.panoramaUrl})` }}><small>{viewpoint.index}</small></span><span><strong>{viewpoint.name}</strong><small>{viewpoint.roomLabel}</small></span><ChevronRight size={16} /></button>)}</div>
      {screen === "tour" ? <Button variant="outline" className="primary-action tour-back" onClick={onOverview}><ArrowLeft /> Back to overview</Button> : <Button className="primary-action" size="lg" onClick={onTour} disabled={isEntering || isPreparing}>{isPreparing ? "Preparing panorama…" : isEntering ? "Entering…" : "Enter panoramic tour"} <ArrowRight /></Button>}
    </aside>

    <section className="canvas-panel project-canvas">
      <div className="canvas-toolbar"><div><span className="canvas-title">{screen === "tour" ? selected.name : "Furnished overview"}</span><span className="canvas-status">{screen === "tour" ? "360° panorama · drag, look up or down, and zoom" : "Choose a point to preview its room"}</span></div><span className="resolution-pill">{screen === "tour" ? panoramaMetadata ? `${panoramaMetadata.width} × ${panoramaMetadata.height}` : "Loading texture" : "5 viewpoints"}</span></div>
      {screen === "tour" ? <PanoramaViewer viewpoint={selected} viewpoints={viewpoints} onViewpointChange={onSelect} onMetadata={onMetadata} /> : <div className={isEntering ? "overview-canvas entering-tour" : "overview-canvas"} style={{ "--focus-x": `${selected.planPosition.x}%`, "--focus-y": `${selected.planPosition.y}%` } as CSSProperties}>
        <img className="overhead-image" src="/demo/apartment-overhead.png" alt="Furnished overhead view of Cedar House" />
        <div className="transition-panorama" style={{ backgroundImage: `url(${selected.panoramaUrl})` }} />
        <div className="transition-label"><MapPin size={16} /><span>Entering {selected.name}</span></div>
        {viewpoints.map((viewpoint) => <button type="button" aria-label={`Open ${viewpoint.name}`} title={viewpoint.name} key={viewpoint.id} className={selectedViewpoint === viewpoint.id ? "map-point active" : "map-point"} style={{ left: `${viewpoint.planPosition.x}%`, top: `${viewpoint.planPosition.y}%` }} onClick={() => onSelect(viewpoint.id)} disabled={isEntering || isPreparing}><span>{viewpoint.index}</span></button>)}
        <div className="overview-caption"><span className="viewpoint-index">{selected.index}</span><div><strong>{selected.name}</strong><small>{selected.roomLabel}</small></div><button type="button" onClick={onTour} disabled={isEntering || isPreparing}>{isPreparing ? "Preparing…" : isEntering ? "Entering…" : "Open view"} <ArrowRight size={14} /></button></div>
      </div>}
      <div className="canvas-footer"><span>{screen === "tour" ? "Use the viewpoint list to move between rooms." : "Select any numbered point to choose where the tour begins."}</span><span className="provider-note">Cedar House · Warm natural</span></div>
    </section>
  </section>;
}

function EmptyPlan() {
  return <div className="empty-plan"><div className="plan-ghost" aria-hidden="true"><div className="room room-a" /><div className="room room-b" /><div className="room room-c" /><div className="room room-d" /><span className="door d1" /><span className="door d2" /></div><div className="empty-copy"><span className="spark-icon"><Sparkles size={20} /></span><strong>Your plan will appear here</strong><p>We’ll identify rooms, walls, doors and windows for your review.</p></div></div>;
}

function Chip({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="parameter-chip" onClick={onClick}>{label}<ChevronDown size={14} /></button>;
}

export default function HomePage() {
  return <main id="main-content" className="marketing-site">
    <SiteHeader />

    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-hero-copy">
        <p className="home-kicker"><span className="home-kicker-line" /> Spatial design workspace</p>
        <h1 id="home-title">See the house before the walls are finished.</h1>
        <p className="home-lede">Acre7 turns a real floor plan into a shared visual place. Choose the materials, set the viewpoints, and walk through the result with the people making the decision.</p>
        <div className="home-actions">
          <Link className="site-button primary" href="/designer">Open the designer <ArrowUpRight size={16} /></Link>
          <Link className="site-text-link" href="/about">How Acre7 works <ArrowRight size={16} /></Link>
        </div>
        <div className="home-proof" aria-label="Acre7 workflow qualities">
          <span><CircleDot size={15} /> Real floor plans</span>
          <span><ScanLine size={15} /> Controlled finishes</span>
          <span><Waypoints size={15} /> Room-level views</span>
        </div>
      </div>

      <div className="home-hero-stage" aria-label="Acre7 spatial preview">
        <div className="stage-meta"><span>CEDAR HOUSE / LIVE PREVIEW</span><span><span className="status-pip" /> 5 viewpoints ready</span></div>
        <div className="stage-viewport">
          <div className="stage-grid" aria-hidden="true" />
          <div className="stage-plan" style={{ backgroundImage: "url('/demo/apartment-overhead.png')" }} role="img" aria-label="Furnished overhead view of Cedar House" />
          <div className="stage-panorama" style={{ backgroundImage: "url('/demo/living-panorama.png')" }} role="img" aria-label="Living room panorama preview" />
          <span className="stage-line stage-line-one" aria-hidden="true" />
          <span className="stage-line stage-line-two" aria-hidden="true" />
          <span className="stage-pin stage-pin-one"><span>01</span><small>Living room</small></span>
          <span className="stage-pin stage-pin-two"><span>04</span><small>Primary bedroom</small></span>
          <div className="stage-card"><span className="stage-card-icon"><Ruler size={16} /></span><div><strong>Warm natural</strong><small>Oak wood · daylight</small></div><span className="stage-card-state">Ready</span></div>
          <div className="stage-corner-label">A / 05 <span>panoramic positions</span></div>
        </div>
        <div className="stage-footer"><span>Floor plan → spatial preview</span><span>Drag inside the designer to look around</span></div>
      </div>
    </section>

    <section className="home-signal" aria-labelledby="signal-title">
      <div className="home-section-index">01 / THE SIGNAL</div>
      <div className="home-signal-copy"><h2 id="signal-title">A common language for the room between the drawing and the decision.</h2><p>Architects can show intent. Buyers can react to a room instead of a promise. Brokers can carry the same approved view from the first plan review to the final walkthrough.</p></div>
      <Link className="home-section-link" href="/about">Read the product story <ArrowUpRight size={16} /></Link>
    </section>

    <section className="home-process" aria-labelledby="process-title">
      <div className="home-process-heading"><p className="home-kicker"><span className="home-kicker-line" /> The working surface</p><h2 id="process-title">One project. Three decisions.</h2><p>Every view stays connected to the source plan, the finish palette, and the selected room positions.</p></div>
      <div className="home-process-rail">
        <article className="home-process-step"><span>01</span><div><h3>Plan</h3><p>Upload the real plan and review rooms, walls, openings, and uncertainty before anything is generated.</p><Link href="/designer">Start with a plan <ArrowRight size={15} /></Link></div></article>
        <article className="home-process-step"><span>02</span><div><h3>Materials</h3><p>Choose from a focused set of wall, floor, style, and light values so the house reads as one place.</p><Link href="/materials">Explore finishes <ArrowRight size={15} /></Link></div></article>
        <article className="home-process-step"><span>03</span><div><h3>Viewpoints</h3><p>Place up to five room positions, then move from the overhead plan into a spherical panorama.</p><Link href="/viewpoints">See the viewpoints <ArrowRight size={15} /></Link></div></article>
      </div>
    </section>

    <section className="home-callout" aria-labelledby="callout-title">
      <div><p className="home-kicker"><span className="home-kicker-line" /> Built for the handoff</p><h2 id="callout-title">The best review happens when everyone can point to the same place.</h2></div>
      <div className="home-callout-side"><p>Keep the architect’s drawing, the material decision, and the buyer’s reaction in one spatial thread.</p><Link className="site-button secondary" href="/designer">Enter Acre7 <ArrowUpRight size={16} /></Link></div>
    </section>

    <SiteFooter />
  </main>;
}
