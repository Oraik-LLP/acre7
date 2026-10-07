"use client";

import Image from "next/image";
import { ArrowDown, Move3d } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const stages = [
  {
    index: "01",
    label: "Reading the plan",
    title: "Start with the lines.",
    description: "Room edges and openings give the design its structure. The source plan stays at the center of every decision.",
  },
  {
    index: "02",
    label: "Building the space",
    title: "See the rooms take shape.",
    description: "Move from a flat drawing into a furnished overhead view, with materials and light carried through the whole home.",
  },
  {
    index: "03",
    label: "Entering a room",
    title: "Then step inside.",
    description: "Choose a viewpoint and open a room-level panorama to look around before a single wall is finished.",
  },
];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function ramp(value: number, start: number, end: number) {
  return clamp((value - start) / (end - start));
}

export function ScrollSpatialStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const update = () => {
      frame = 0;
      if (motionPreference.matches) return;

      const travel = Math.max(section.offsetHeight - window.innerHeight, 1);
      const progress = clamp(-section.getBoundingClientRect().top / travel);
      const planOpacity = 1 - ramp(progress, 0.06, 0.38);
      const overheadOpacity = ramp(progress, 0.2, 0.43) * (1 - ramp(progress, 0.63, 0.81));
      const panoramaOpacity = ramp(progress, 0.59, 0.82);
      const roomFocus = ramp(progress, 0.38, 0.72);
      const overheadScale = 1 + roomFocus * 1.02;
      const overheadLift = roomFocus * -11;
      const panoramaScale = 1.11 - panoramaOpacity * 0.11;
      const panoramaOffset = (progress - 0.5) * -7;

      section.style.setProperty("--story-progress", progress.toFixed(3));
      section.style.setProperty("--story-plan-opacity", planOpacity.toFixed(3));
      section.style.setProperty("--story-overhead-opacity", overheadOpacity.toFixed(3));
      section.style.setProperty("--story-panorama-opacity", panoramaOpacity.toFixed(3));
      section.style.setProperty("--story-overhead-scale", overheadScale.toFixed(3));
      section.style.setProperty("--story-overhead-lift", `${overheadLift.toFixed(2)}%`);
      section.style.setProperty("--story-panorama-scale", panoramaScale.toFixed(3));
      section.style.setProperty("--story-panorama-offset", `${panoramaOffset.toFixed(2)}%`);
      section.style.setProperty("--story-panorama-inset", `${(24 * (1 - panoramaOpacity)).toFixed(2)}%`);
      section.style.setProperty("--story-panorama-radius", `${Math.round(28 * (1 - panoramaOpacity))}px`);

      const nextStage = progress < 0.31 ? 0 : progress < 0.66 ? 1 : 2;
      if (nextStage !== stageIndex) setStageIndex(nextStage);
    };

    const scheduleUpdate = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };

    if (!motionPreference.matches) {
      scheduleUpdate();
      window.addEventListener("scroll", scheduleUpdate, { passive: true });
      window.addEventListener("resize", scheduleUpdate, { passive: true });
    }

    const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        window.removeEventListener("scroll", scheduleUpdate);
        window.removeEventListener("resize", scheduleUpdate);
        section.style.setProperty("--story-plan-opacity", "0");
        section.style.setProperty("--story-overhead-opacity", "1");
        section.style.setProperty("--story-panorama-opacity", "0");
        setStageIndex(1);
      } else {
        scheduleUpdate();
        window.addEventListener("scroll", scheduleUpdate, { passive: true });
        window.addEventListener("resize", scheduleUpdate, { passive: true });
      }
    };

    motionPreference.addEventListener("change", onMotionPreferenceChange);
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      motionPreference.removeEventListener("change", onMotionPreferenceChange);
    };
  }, [stageIndex]);

  const activeStage = stages[stageIndex];

  return (
    <section
      ref={sectionRef}
      className="home-scroll-story"
      data-story-stage={stageIndex}
      aria-labelledby="story-title"
    >
      <div className="story-sticky">
        <div className="story-copy" aria-live="polite" aria-atomic="true">
          <p className="story-kicker"><span /> A plan becomes a place</p>
          <div className="story-step-count"><span>{activeStage.index}</span> / SPATIAL SEQUENCE</div>
          <h2 id="story-title">{activeStage.title}</h2>
          <p className="story-description">{activeStage.description}</p>
          <div className="story-step-label" aria-hidden="true">
            {stages.map((stage, index) => (
              <span key={stage.index} className={index === stageIndex ? "active" : ""}>
                {stage.index} <span>{stage.label}</span>
              </span>
            ))}
          </div>
          <div className="story-scroll-hint"><ArrowDown size={14} /> Scroll to move through the space</div>
        </div>

        <div className="story-visual" role="img" aria-label={`Cedar House spatial sequence: ${activeStage.label}`}>
          <div className="story-visual-grid" aria-hidden="true" />
          <div className="story-plan-layer" aria-hidden="true">
            <div className="story-plan-lines">
              <svg viewBox="0 0 1200 760" role="presentation">
                <path className="plan-outline" d="M94 80H1104V672H94Z" />
                <path d="M94 365H510V80M510 80V348H694V80M694 80V365H1104M94 365V620H510V365M510 365V672M694 365V585H1104M694 585H510M864 365V585M510 250H694M360 365V672" />
                <path className="plan-opening" d="M442 365a69 69 0 0 1 69-69M694 282a63 63 0 0 1 63 63M510 470a57 57 0 0 0 57 57M806 585a65 65 0 0 1 65 65M975 365a62 62 0 0 0 62 62" />
                <path className="plan-route" d="M566 640C570 550 624 532 650 460S663 326 760 322 920 290 975 195" />
                <circle className="plan-node" cx="566" cy="640" r="8" />
                <circle className="plan-node" cx="975" cy="195" r="11" />
              </svg>
            </div>
            <div className="plan-caption plan-caption-one">Source drawing</div>
            <div className="plan-caption plan-caption-two">Living room · 01</div>
          </div>

          <div className="story-overhead-layer" aria-hidden="true">
            <Image
              className="story-overhead-image"
              src="/demo/apartment-overhead.png"
              alt=""
              width={1672}
              height={1000}
              sizes="(max-width: 760px) 100vw, 62vw"
              unoptimized
              priority={false}
            />
            <div className="story-room-pin"><span>01</span><strong>Living room</strong></div>
            <div className="story-material-tag"><span /> Oak wood · daylight</div>
          </div>

          <div className="story-panorama-layer" aria-hidden="true">
            <Image
              className="story-panorama-image"
              src="/demo/living-panorama.png"
              alt=""
              width={2048}
              height={1024}
              sizes="(max-width: 760px) 100vw, 62vw"
              unoptimized
              priority={false}
            />
            <div className="story-panorama-shade" />
            <div className="story-panorama-caption"><Move3d size={16} /><span>Living room</span><small>360° VIEW</small></div>
            <span className="story-panorama-reticle" />
          </div>

          <div className="story-visual-meta"><span>CEDAR HOUSE / SPATIAL STUDY</span><span className="story-live-dot" /> <span>{activeStage.label}</span></div>
          <div className="story-visual-progress"><span /></div>
          <div className="story-visual-footer"><span>01 — 05 viewpoints</span><span>Plan → overhead → room</span></div>
        </div>

        <div className="story-reduced-gallery" aria-label="Spatial sequence">
          <article><span>01 / PLAN</span><div className="reduced-plan-mini" aria-hidden="true" /><h3>Read the drawing</h3><p>Room edges and openings set the structure.</p></article>
          <article><span>02 / OVERHEAD</span><Image src="/demo/apartment-overhead.png" alt="Furnished overhead view of the Cedar House layout" width={1672} height={1000} sizes="(max-width: 700px) 100vw, 33vw" unoptimized /><h3>See the rooms take shape</h3><p>One material palette carries across the home.</p></article>
          <article><span>03 / ROOM VIEW</span><Image src="/demo/living-panorama.png" alt="Panoramic living room view" width={2048} height={1024} sizes="(max-width: 700px) 100vw, 33vw" unoptimized /><h3>Enter a room</h3><p>Room-level panoramas bring each viewpoint into focus.</p></article>
        </div>
      </div>
    </section>
  );
}
