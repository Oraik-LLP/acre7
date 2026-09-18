"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, LoaderCircle, MapPin, Maximize2, Minimize2, Move } from "lucide-react";
import * as THREE from "three";
import { isValidPanorama, validatePanorama } from "@/lib/acre7/scene/panorama";
import { normalizeDegrees } from "@/lib/acre7/scene/coordinates";
import type { PanoramaMetadata, Viewpoint } from "@/lib/acre7/scene/types";

type ViewerStatus = "loading" | "ready" | "failed" | "webgl-unavailable";

type PanoramaViewerProps = {
  viewpoint: Viewpoint;
  viewpoints: Viewpoint[];
  onViewpointChange: (viewpointId: string) => void;
  onMetadata: (metadata: PanoramaMetadata | null) => void;
};

type Orientation = {
  yaw: number;
  pitch: number;
  fov: number;
  targetYaw: number;
  targetPitch: number;
  targetFov: number;
};

type DragStart = {
  pointerId: number;
  x: number;
  y: number;
  yaw: number;
  pitch: number;
};

type PinchStart = {
  distance: number;
  fov: number;
};

const minFov = 38;
const maxFov = 100;
const minPitch = -85;
const maxPitch = 85;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function pointerDistance(points: Map<number, { x: number; y: number }>) {
  const [first, second] = Array.from(points.values());
  if (!first || !second) return 0;
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function PanoramaViewer({ viewpoint, viewpoints, onViewpointChange, onMetadata }: PanoramaViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const textureCacheRef = useRef(new Map<string, Promise<THREE.Texture>>());
  const hotspotRefs = useRef(new Map<string, HTMLButtonElement>());
  const viewpointRef = useRef(viewpoint);
  const mountedRef = useRef(false);
  const headingRef = useRef<HTMLSpanElement>(null);
  const pointerPositionsRef = useRef(new Map<number, { x: number; y: number }>());
  const dragStartRef = useRef<DragStart | null>(null);
  const pinchStartRef = useRef<PinchStart | null>(null);
  const orientationRef = useRef<Orientation>({
    yaw: viewpoint.initialYaw,
    pitch: viewpoint.initialPitch,
    fov: viewpoint.initialFov,
    targetYaw: viewpoint.initialYaw,
    targetPitch: viewpoint.initialPitch,
    targetFov: viewpoint.initialFov,
  });
  const [status, setStatus] = useState<ViewerStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === viewportRef.current);
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    viewpointRef.current = viewpoint;
    const orientation = orientationRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    orientation.targetYaw = viewpoint.initialYaw;
    orientation.targetPitch = viewpoint.initialPitch;
    orientation.targetFov = viewpoint.initialFov;
    orientation.yaw = viewpoint.initialYaw;
    orientation.pitch = viewpoint.initialPitch;
    orientation.fov = reducedMotion ? viewpoint.initialFov : Math.min(maxFov, viewpoint.initialFov + 25);
  }, [viewpoint]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const textureCache = textureCacheRef.current;

    mountedRef.current = true;
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      queueMicrotask(() => {
        setStatus("webgl-unavailable");
        setErrorMessage("Interactive 360° viewing is unavailable on this device.");
      });
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090b0a);
    const camera = new THREE.PerspectiveCamera(viewpointRef.current.initialFov, 1, 0.1, 100);
    camera.position.set(0, 0, 0);
    camera.rotation.order = "YXZ";

    const geometry = new THREE.SphereGeometry(10, 64, 40);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.setAttribute("aria-hidden", "true");
    viewport.insertBefore(renderer.domElement, viewport.firstChild);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    materialRef.current = material;

    const resize = () => {
      const { width, height } = viewport.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewport);
    resize();

    const onContextLost = (event: Event) => {
      event.preventDefault();
      setStatus("webgl-unavailable");
      setErrorMessage("The 360° renderer stopped. The static panorama is shown instead.");
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("button")) return;
      event.preventDefault();
      viewport.focus({ preventScroll: true });
      viewport.setPointerCapture(event.pointerId);
      pointerPositionsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointerPositionsRef.current.size === 1) {
        const orientation = orientationRef.current;
        dragStartRef.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          yaw: orientation.targetYaw,
          pitch: orientation.targetPitch,
        };
      } else if (pointerPositionsRef.current.size === 2) {
        pinchStartRef.current = {
          distance: pointerDistance(pointerPositionsRef.current),
          fov: orientationRef.current.targetFov,
        };
        dragStartRef.current = null;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pointerPositionsRef.current.has(event.pointerId)) return;
      event.preventDefault();
      pointerPositionsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointerPositionsRef.current.size === 2 && pinchStartRef.current) {
        const distance = pointerDistance(pointerPositionsRef.current);
        if (distance > 0) {
          orientationRef.current.targetFov = clamp(
            pinchStartRef.current.fov * (pinchStartRef.current.distance / distance),
            minFov,
            maxFov,
          );
        }
        return;
      }

      const dragStart = dragStartRef.current;
      if (!dragStart || dragStart.pointerId !== event.pointerId) return;
      orientationRef.current.targetYaw = dragStart.yaw + (dragStart.x - event.clientX) * 0.14;
      orientationRef.current.targetPitch = clamp(
        dragStart.pitch + (dragStart.y - event.clientY) * 0.12,
        minPitch,
        maxPitch,
      );
    };

    const endPointer = (event: PointerEvent) => {
      pointerPositionsRef.current.delete(event.pointerId);
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      pinchStartRef.current = null;

      const remaining = Array.from(pointerPositionsRef.current.entries())[0];
      if (remaining) {
        const [pointerId, point] = remaining;
        const orientation = orientationRef.current;
        dragStartRef.current = {
          pointerId,
          x: point.x,
          y: point.y,
          yaw: orientation.targetYaw,
          pitch: orientation.targetPitch,
        };
      } else {
        dragStartRef.current = null;
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      orientationRef.current.targetFov = clamp(
        orientationRef.current.targetFov + event.deltaY * 0.035,
        minFov,
        maxFov,
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const orientation = orientationRef.current;
      if (event.key === "ArrowLeft") orientation.targetYaw -= 12;
      else if (event.key === "ArrowRight") orientation.targetYaw += 12;
      else if (event.key === "ArrowUp") orientation.targetPitch = clamp(orientation.targetPitch + 8, minPitch, maxPitch);
      else if (event.key === "ArrowDown") orientation.targetPitch = clamp(orientation.targetPitch - 8, minPitch, maxPitch);
      else if (event.key === "+" || event.key === "=") orientation.targetFov = clamp(orientation.targetFov - 6, minFov, maxFov);
      else if (event.key === "-") orientation.targetFov = clamp(orientation.targetFov + 6, minFov, maxFov);
      else return;
      event.preventDefault();
    };

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", endPointer);
    viewport.addEventListener("pointercancel", endPointer);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("keydown", onKeyDown);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);

    let animationFrame = 0;
    const render = () => {
      const orientation = orientationRef.current;
      orientation.yaw += (orientation.targetYaw - orientation.yaw) * 0.12;
      orientation.pitch += (orientation.targetPitch - orientation.pitch) * 0.12;
      orientation.fov += (orientation.targetFov - orientation.fov) * 0.12;

      camera.rotation.y = THREE.MathUtils.degToRad(-orientation.yaw);
      camera.rotation.x = THREE.MathUtils.degToRad(orientation.pitch);
      if (Math.abs(camera.fov - orientation.fov) > 0.01) {
        camera.fov = orientation.fov;
        camera.updateProjectionMatrix();
      }

      const normalizedYaw = normalizeDegrees(orientation.yaw);
      if (headingRef.current) headingRef.current.textContent = `${Math.round(normalizedYaw)}°`;

      viewpointRef.current.neighbours.forEach((neighbour) => {
        const element = hotspotRefs.current.get(neighbour.viewpointId);
        if (!element) return;
        const relativeBearing = normalizeDegrees(neighbour.bearing - normalizedYaw);
        const visible = Math.abs(relativeBearing) < orientation.fov * 0.62;
        const horizontal = 50 + (relativeBearing / orientation.fov) * 82;
        const vertical = clamp(67 + orientation.pitch * 0.35, 26, 82);
        element.style.left = `${horizontal}%`;
        element.style.top = `${vertical}%`;
        element.style.opacity = visible ? "1" : "0";
        element.style.pointerEvents = visible ? "auto" : "none";
      });

      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(render);
    };
    render();

    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", endPointer);
      viewport.removeEventListener("pointercancel", endPointer);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("keydown", onKeyDown);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      textureCache.forEach((texturePromise) => {
        void texturePromise.then((texture) => texture.dispose()).catch(() => undefined);
      });
      textureCache.clear();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      materialRef.current = null;
    };
  }, []);

  useEffect(() => {
    const material = materialRef.current;
    const renderer = rendererRef.current;
    if (!material || !renderer) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setStatus("loading");
        setErrorMessage("");
        onMetadata(null);
      }
    });

    const loadTexture = (url: string) => {
      const cached = textureCacheRef.current.get(url);
      if (cached) return cached;

      const promise = new Promise<THREE.Texture>((resolve, reject) => {
        new THREE.TextureLoader().load(url, resolve, undefined, reject);
      }).then((texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
        return texture;
      });

      textureCacheRef.current.set(url, promise);
      return promise;
    };

    void loadTexture(viewpoint.panoramaUrl).then((texture) => {
      if (cancelled || !mountedRef.current) return;
      const image = texture.image as { width?: number; height?: number };
      const width = Number(image.width ?? 0);
      const height = Number(image.height ?? 0);
      const metadata = validatePanorama(viewpoint.panoramaUrl, width, height);

      if (!isValidPanorama(metadata)) {
        setStatus("failed");
        setErrorMessage("This image is not a valid 2:1 equirectangular panorama.");
        onMetadata(metadata);
        return;
      }

      material.map = texture;
      material.needsUpdate = true;
      setStatus("ready");
      onMetadata(metadata);

      viewpoint.neighbours.forEach((neighbour) => {
        const neighbourViewpoint = viewpoints.find((candidate) => candidate.id === neighbour.viewpointId);
        if (neighbourViewpoint) void loadTexture(neighbourViewpoint.panoramaUrl).catch(() => undefined);
      });
    }).catch(() => {
      if (cancelled || !mountedRef.current) return;
      setStatus("failed");
      setErrorMessage("The panorama could not be loaded. The static image is shown instead.");
      onMetadata(null);
    });

    return () => { cancelled = true; };
  }, [onMetadata, viewpoint, viewpoints]);

  const changeYaw = (amount: number) => {
    orientationRef.current.targetYaw += amount;
    viewportRef.current?.focus({ preventScroll: true });
  };

  const toggleFullscreen = async () => {
    const viewport = viewportRef.current;
    if (!viewport || !document.fullscreenEnabled || typeof viewport.requestFullscreen !== "function") return;

    try {
      if (document.fullscreenElement === viewport) await document.exitFullscreen();
      else await viewport.requestFullscreen();
    } catch {
      setErrorMessage("Fullscreen mode could not be opened in this browser.");
    }
  };

  const neighbourViewpoints = viewpoint.neighbours.flatMap((neighbour) => {
    const target = viewpoints.find((candidate) => candidate.id === neighbour.viewpointId);
    return target ? [{ ...neighbour, target }] : [];
  });

  const showFallback = status === "failed" || status === "webgl-unavailable";

  return <div
    ref={viewportRef}
    className="panorama-viewport"
    tabIndex={0}
    role="application"
    aria-label={`360 degree panorama from ${viewpoint.name}. Drag to look around, use arrow keys to rotate, and use the mouse wheel to zoom.`}
  >
    {showFallback && <>
      {/* A raw image remains available when WebGL cannot initialize or load the texture. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="panorama-fallback" src={viewpoint.panoramaUrl} alt={`Static panorama of ${viewpoint.name}`} />
    </>}
    <div className="tour-vignette" aria-hidden="true" />
    <div className="tour-reticle" aria-hidden="true"><span /></div>

    {neighbourViewpoints.map(({ target }) => <button
      type="button"
      className="panorama-hotspot"
      key={target.id}
      ref={(element) => {
        if (element) hotspotRefs.current.set(target.id, element);
        else hotspotRefs.current.delete(target.id);
      }}
      onClick={() => onViewpointChange(target.id)}
      aria-label={`Move to ${target.name}`}
    >
      <span className="hotspot-arrow"><ChevronRight size={15} /></span>
      <span>{target.name}</span>
    </button>)}

    <div className="tour-controls">
      <button type="button" aria-label="Look left" onClick={() => changeYaw(-18)}><ChevronLeft /></button>
      <span><Move size={14} /> Drag to look · <span ref={headingRef}>0°</span></span>
      <button type="button" aria-label="Look right" onClick={() => changeYaw(18)}><ChevronRight /></button>
    </div>
    <div className="tour-location"><MapPin size={15} /><span>{viewpoint.name}</span></div>
    <div className="tour-progress" aria-label={`Viewpoint ${viewpoint.index} of ${viewpoints.length}`}>{viewpoints.map((candidate) => <span key={candidate.id} className={candidate.id === viewpoint.id ? "active" : ""} />)}</div>
    <button
      type="button"
      className="tour-fullscreen"
      aria-label={isFullscreen ? "Exit fullscreen panorama" : "View panorama fullscreen"}
      title={isFullscreen ? "Exit fullscreen" : "View fullscreen"}
      aria-pressed={isFullscreen}
      onClick={() => void toggleFullscreen()}
    >
      {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
    </button>

    {status === "loading" && <div className="panorama-state" role="status"><LoaderCircle className="spin" /><span>Preparing 360° view…</span></div>}
    {showFallback && <div className="panorama-state panorama-state-error" role="alert"><AlertTriangle /><span>{errorMessage}</span></div>}
  </div>;
}
