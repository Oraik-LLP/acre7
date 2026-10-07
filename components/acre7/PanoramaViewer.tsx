"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, LoaderCircle, MapPin, Maximize2, Minimize2, Move, Sparkles, X, RotateCcw, ImagePlus, WandSparkles } from "lucide-react";
import * as THREE from "three";
import Image from "next/image";
import { isValidPanorama, validatePanorama } from "@/lib/acre7/scene/panorama";
import { normalizeDegrees } from "@/lib/acre7/scene/coordinates";
import type { PanoramaMetadata, Viewpoint } from "@/lib/acre7/scene/types";
import { editableFurniture, selectedFurnitureChoice, type EditableFurniture } from "@/lib/acre7/furniture-demo";

type ViewerStatus = "loading" | "ready" | "failed" | "webgl-unavailable";

type PanoramaViewerProps = {
  viewpoint: Viewpoint;
  viewpoints: Viewpoint[];
  onViewpointChange: (viewpointId: string) => void;
  onMetadata: (metadata: PanoramaMetadata | null) => void;
  panoramaUrl: string;
  choice: string;
  onChoiceChange: (choice: string, itemId?: string) => void;
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

export function PanoramaViewer({ viewpoint, viewpoints, panoramaUrl, choice, onChoiceChange, onViewpointChange, onMetadata }: PanoramaViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const overlayMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const overlayMeshRef = useRef<THREE.Mesh | null>(null);
  const transitionRef = useRef<{ texture: THREE.Texture; started: number } | null>(null);
  const textureCacheRef = useRef(new Map<string, Promise<THREE.Texture>>());
  const hotspotRefs = useRef(new Map<string, HTMLButtonElement>());
  const furnitureRefs = useRef(new Map<string, HTMLButtonElement>());
  const shapeRefs = useRef(new Map<string, SVGPolygonElement>());
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const pressedItemRef = useRef<string | null>(null);
  const editorRef = useRef<HTMLElement>(null);
  const stickerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [editing, setEditing] = useState(false);
  const [activeItem, setActiveItem] = useState<EditableFurniture | null>(null);
  const [editTab, setEditTab] = useState<"suggest" | "inventory" | "reference" | "describe">("suggest");
  const [description, setDescription] = useState("");
  const [referenceName, setReferenceName] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [sticker, setSticker] = useState<{ image: string; points: string; width: number; height: number } | null>(null);
  const items = editableFurniture[viewpoint.id] ?? [];
  const isEmpty = choice === "empty";

  useEffect(() => {
    if (editing) editorRef.current?.focus({ preventScroll: true });
  }, [editing]);

  useEffect(() => () => { if (stickerTimerRef.current) clearTimeout(stickerTimerRef.current); }, []);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === viewportRef.current);
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    viewpointRef.current = viewpoint;
    queueMicrotask(() => { setActiveItem(null); setEditing(false); setEditMessage(""); });
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
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
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
    const overlayGeometry = geometry.clone();
    overlayGeometry.scale(0.995, 0.995, 0.995);
    const overlayMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
    const overlaySphere = new THREE.Mesh(overlayGeometry, overlayMaterial);
    overlaySphere.renderOrder = 1;
    overlaySphere.visible = false;
    scene.add(overlaySphere);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.setAttribute("aria-hidden", "true");
    viewport.insertBefore(renderer.domElement, viewport.firstChild);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    materialRef.current = material;
    overlayMaterialRef.current = overlayMaterial;
    overlayMeshRef.current = overlaySphere;

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
      if (target.closest("button, input, textarea, .furniture-editor")) return;
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
      if ((event.target as HTMLElement).closest(".furniture-editor")) return;
      event.preventDefault();
      orientationRef.current.targetFov = clamp(
        orientationRef.current.targetFov + event.deltaY * 0.035,
        minFov,
        maxFov,
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setEditing(false); return; }
      if ((event.target as HTMLElement).closest("input, textarea")) return;
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
      const transition = transitionRef.current;
      if (transition) {
        const progress = clamp((performance.now() - transition.started) / 420, 0, 1);
        overlayMaterial.opacity = 1 - Math.pow(1 - progress, 3);
        if (progress >= 1) {
          material.map = transition.texture;
          material.needsUpdate = true;
          overlayMaterial.map = null;
          overlaySphere.visible = false;
          transitionRef.current = null;
        }
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

      const projectPoint = (bearing: number, pitch: number) => {
        const longitude = THREE.MathUtils.degToRad(bearing);
        const latitude = THREE.MathUtils.degToRad(pitch);
        const point = new THREE.Vector3(Math.sin(longitude) * Math.cos(latitude), Math.sin(latitude), -Math.cos(longitude) * Math.cos(latitude)).multiplyScalar(10).project(camera);
        return { x: (point.x + 1) * renderer.domElement.clientWidth / 2, y: (1 - point.y) * renderer.domElement.clientHeight / 2 };
      };
      const horizontalFov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(orientation.fov) / 2) * camera.aspect));
      (editableFurniture[viewpointRef.current.id] ?? []).forEach((item) => {
        const element = furnitureRefs.current.get(item.id);
        const shape = shapeRefs.current.get(item.id);
        if (!element && !shape) return;
        const relativeBearing = normalizeDegrees(item.bearing - normalizedYaw);
        const visible = Math.abs(relativeBearing) < horizontalFov * 0.55;
        if (element) {
          const center = projectPoint(item.bearing, item.pitch);
          element.style.left = `${center.x}px`;
          element.style.top = `${center.y}px`;
          element.style.opacity = visible ? "1" : "0";
          element.style.pointerEvents = visible ? "auto" : "none";
        }
        if (shape) {
          shape.style.opacity = visible ? "1" : "0";
          shape.style.pointerEvents = visible ? "visiblePainted" : "none";
          if (visible) shape.setAttribute("points", item.outline.map(([x, y]) => {
            const p = projectPoint((x / 1774) * 360 - 270, (0.5 - y / 887) * 180);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          }).join(" "));
        }
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
      overlayGeometry.dispose();
      material.dispose();
      overlayMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      materialRef.current = null;
      overlayMaterialRef.current = null;
      overlayMeshRef.current = null;
      transitionRef.current = null;
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

    void loadTexture(panoramaUrl).then((texture) => {
      if (cancelled || !mountedRef.current) return;
      const image = texture.image as { width?: number; height?: number };
      const width = Number(image.width ?? 0);
      const height = Number(image.height ?? 0);
      const metadata = validatePanorama(panoramaUrl, width, height);

      if (!isValidPanorama(metadata)) {
        setStatus("failed");
        setErrorMessage("This image is not a valid 2:1 equirectangular panorama.");
        onMetadata(metadata);
        return;
      }

      const overlayMaterial = overlayMaterialRef.current;
      const overlayMesh = overlayMeshRef.current;
      if (material.map && overlayMaterial && overlayMesh && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        overlayMaterial.map = texture;
        overlayMaterial.opacity = 0;
        overlayMaterial.needsUpdate = true;
        overlayMesh.visible = true;
        transitionRef.current = { texture, started: performance.now() };
      } else {
        material.map = texture;
        material.needsUpdate = true;
      }
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
  }, [onMetadata, panoramaUrl, viewpoint, viewpoints]);

  const openFurniture = (item?: EditableFurniture, screenX?: number, focus = true) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const bearing = screenX !== undefined && rect ? orientationRef.current.yaw + ((((screenX - rect.left) / rect.width) * 100 - 50) / 82) * orientationRef.current.fov : orientationRef.current.yaw;
    const next = item ?? (isEmpty ? items[0] : items.reduce<EditableFurniture | null>((nearest, candidate) => !nearest || Math.abs(normalizeDegrees(candidate.bearing - bearing)) < Math.abs(normalizeDegrees(nearest.bearing - bearing)) ? candidate : nearest, null));
    setActiveItem(next);
    setEditTab("suggest");
    setEditMessage("");
    setEditing(true);
    if (next && !focus && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const shape = shapeRefs.current.get(next.id);
      const canvas = rendererRef.current?.domElement;
      const viewport = viewportRef.current;
      const points = shape?.getAttribute("points");
      if (canvas && viewport && points) {
        try {
          setSticker({ image: canvas.toDataURL("image/jpeg", 0.84), points, width: viewport.clientWidth, height: viewport.clientHeight });
          if (stickerTimerRef.current) clearTimeout(stickerTimerRef.current);
          stickerTimerRef.current = setTimeout(() => setSticker(null), 680);
        } catch { setSticker(null); }
      }
    }
    if (next && focus) orientationRef.current.targetYaw = next.bearing;
  };

  const suggest = () => {
    const text = description.toLowerCase();
    const options = activeItem?.choices ?? [];
    const match = options.find((option) => option.id !== "original" && option.id !== "removed" && option.id !== "bed-removed" && option.id !== "bedside-removed" && text.includes(option.label.toLowerCase().split(" ")[0]));
    if (text.trim() && !match) { setEditMessage("This preview has a small prepared catalog. Try armchair, beanbag, bunk bed, or writing desk."); return; }
    const suggestion = match ?? options.find((option) => !["original", "removed", "bed-removed", "bedside-removed"].includes(option.id));
    onChoiceChange(suggestion?.id ?? "original", activeItem?.id);
    setEditMessage(suggestion ? `${suggestion.label} preview applied.` : "The furnished room is ready.");
  };

  const clearPress = () => { if (pressTimerRef.current) clearTimeout(pressTimerRef.current); pressTimerRef.current = null; pressOriginRef.current = null; pressedItemRef.current = null; };

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
    onContextMenu={(event) => { const id = (event.target as Element).closest("[data-furniture-id]")?.getAttribute("data-furniture-id"); if (!id) return; event.preventDefault(); openFurniture(items.find((item) => item.id === id), undefined, false); }}
    onPointerDownCapture={(event) => { if ((event.target as HTMLElement).closest("button, input, textarea, .furniture-editor") || (event.pointerType === "mouse" && event.button !== 0)) return; const id = (event.target as Element).closest("[data-furniture-id]")?.getAttribute("data-furniture-id"); if (!id) return; pressedItemRef.current = id; pressOriginRef.current = { x: event.clientX, y: event.clientY }; if (event.pointerType === "touch") pressTimerRef.current = setTimeout(() => { openFurniture(items.find((item) => item.id === id), undefined, false); pressedItemRef.current = null; pressTimerRef.current = null; }, 520); }}
    onPointerMoveCapture={(event) => { if (pressOriginRef.current && Math.hypot(event.clientX - pressOriginRef.current.x, event.clientY - pressOriginRef.current.y) > 12) clearPress(); }}
    onPointerUpCapture={(event) => { const id = pressedItemRef.current; const start = pressOriginRef.current; if (id && start && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 12) openFurniture(items.find((item) => item.id === id), undefined, false); clearPress(); }}
    onPointerCancelCapture={clearPress}
  >
    {showFallback && <>
      {/* A raw image remains available when WebGL cannot initialize or load the texture. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="panorama-fallback" src={panoramaUrl} alt={`Static panorama of ${viewpoint.name}`} />
    </>}
    <div className="tour-vignette" aria-hidden="true" />
    <div className="tour-reticle" aria-hidden="true"><span /></div>

    {!isEmpty && <svg className="furniture-selection-layer" aria-hidden="true">{sticker && <><defs><clipPath id="furniture-sticker-clip"><polygon points={sticker.points} /></clipPath></defs><g className="furniture-sticker" clipPath="url(#furniture-sticker-clip)"><image href={sticker.image} width={sticker.width} height={sticker.height} /></g></>}{items.map((item) => <polygon key={item.id} data-furniture-id={item.id} ref={(element) => { if (element) shapeRefs.current.set(item.id, element); else shapeRefs.current.delete(item.id); }} className={editing && activeItem?.id === item.id ? "furniture-shape selected" : "furniture-shape"} />)}</svg>}

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

    {!isEmpty && items.map((item) => <button type="button" key={item.id} data-furniture-id={item.id} className={editing && activeItem?.id === item.id ? "furniture-hotspot selected" : "furniture-hotspot"} ref={(element) => { if (element) furnitureRefs.current.set(item.id, element); else furnitureRefs.current.delete(item.id); }} onClick={() => openFurniture(item)} aria-label={`Edit ${item.name}`}><Sparkles size={15} /><span>{item.name}</span></button>)}

    <button type="button" className="furniture-trigger" onClick={() => openFurniture()}><Sparkles size={17} /> {isEmpty ? "Suggest furniture" : "Edit furniture"}</button>

    {editing && <section ref={editorRef} tabIndex={-1} role="dialog" className="furniture-editor" aria-label="Furniture editing controls" onPointerDown={(event) => event.stopPropagation()}>
      <div className="furniture-editor-head"><div><small>{isEmpty ? "EMPTY ROOM" : "SELECTED OBJECT"}</small><strong>{isEmpty ? viewpoint.name : activeItem?.name ?? "Choose a piece"}</strong></div><button type="button" aria-label="Close furniture editor" onClick={() => setEditing(false)}><X size={18} /></button></div>
      {!isEmpty && items.length > 1 && <div className="furniture-object-list">{items.map((item) => <button type="button" key={item.id} className={activeItem?.id === item.id ? "selected" : ""} onClick={() => { setActiveItem(item); orientationRef.current.targetYaw = item.bearing; }}>{item.name}</button>)}</div>}
      <div className="furniture-tabs" role="tablist" aria-label="Furniture input">{([ ["suggest","✨ Suggest"], ["inventory","Inventory"], ["reference","Image"], ["describe","Text"] ] as const).map(([id,label]) => <button type="button" key={id} role="tab" aria-selected={editTab === id} className={editTab === id ? "selected" : ""} onClick={() => setEditTab(id)}>{label}</button>)}</div>
      {editTab === "inventory" && !isEmpty && activeItem ? <div className="furniture-options">{activeItem.choices.map((option) => <button type="button" key={option.id} className={selectedFurnitureChoice(viewpoint.id, choice, activeItem.id) === option.id ? "selected" : ""} onClick={() => { onChoiceChange(option.id, activeItem.id); setEditMessage(`${option.label} preview applied.`); }}><Image src={option.image} alt="" width={140} height={96} unoptimized /><span><strong>{option.label}</strong><small>{option.hint}</small></span></button>)}</div> : null}
      {editTab === "reference" && <label className="furniture-reference"><ImagePlus size={19} /><span>{referenceName || "Choose a furniture reference image"}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { setReferenceName(event.target.files?.[0]?.name ?? ""); setEditMessage("Reference selected. Open Inventory to choose the closest prepared option."); }} /></label>}
      {editTab === "describe" && <label className="furniture-description">Describe the change<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Try armchair, beanbag, bunk bed, or writing desk" maxLength={180} /></label>}
      {(editTab !== "inventory" || isEmpty) && <button type="button" className="furniture-suggest-action" onClick={suggest}><WandSparkles size={16} /> {isEmpty ? "Furnish this room" : "Show suggestion"}</button>}
      {isEmpty && items.length > 0 && <div className="furniture-options compact">{items.flatMap((item) => item.choices.filter((option) => option.id !== "original" && !option.id.includes("removed")).map((option) => ({ item, option }))).map(({ item, option }) => <button type="button" key={option.id} onClick={() => { onChoiceChange(option.id, item.id); setEditMessage(`${option.label} preview applied.`); }}><Image src={option.image} alt="" width={140} height={96} unoptimized /><strong>{option.label}</strong></button>)}</div>}
      {editMessage && <p className="furniture-message" role="status">{editMessage}</p>}
      <button type="button" className="furniture-reset" onClick={() => { onChoiceChange("original"); setEditMessage("Original room restored."); }}><RotateCcw size={14} /> Restore original room</button>
      <p className="furniture-help"><span className="furniture-help-desktop">Click or right-click a highlighted item to edit it.</span><span className="furniture-help-touch">Tap or press a highlighted item to edit it.</span></p>
    </section>}

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
