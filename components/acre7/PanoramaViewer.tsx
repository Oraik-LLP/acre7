"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, LoaderCircle, MapPin, Maximize2, Minimize2, Move, Sparkles, X, RotateCcw, ImagePlus, WandSparkles, Smartphone, Compass, Grid2X2, ArrowLeft } from "lucide-react";
import * as THREE from "three";
import Image from "next/image";
import { isValidPanorama, validatePanorama } from "@/lib/acre7/scene/panorama";
import { normalizeDegrees } from "@/lib/acre7/scene/coordinates";
import type { PanoramaMetadata, Viewpoint } from "@/lib/acre7/scene/types";
import { editableFurniture, selectedFurnitureChoice, type EditableFurniture } from "@/lib/acre7/furniture-demo";
import { adjacentViewpointIndex, frameSmoothing } from "@/lib/acre7/scene/motion";
import { usePanoramaMotion } from "@/hooks/use-panorama-motion";

type ViewerStatus = "loading" | "ready" | "failed" | "webgl-unavailable";

type PanoramaViewerProps = {
  viewpoint: Viewpoint;
  viewpoints: Viewpoint[];
  onViewpointChange: (viewpointId: string) => void;
  onMetadata: (metadata: PanoramaMetadata | null) => void;
  panoramaUrl: string;
  choice: string;
  onChoiceChange: (choice: string, itemId?: string) => void;
  onOverview: () => void;
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

export function PanoramaViewer({ viewpoint, viewpoints, panoramaUrl, choice, onChoiceChange, onViewpointChange, onMetadata, onOverview }: PanoramaViewerProps) {
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
  const velocityRef = useRef({ yaw: 0, pitch: 0, time: 0, x: 0, y: 0 });
  const reducedMotionRef = useRef(false);
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [roomMenuOpen, setRoomMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeItem, setActiveItem] = useState<EditableFurniture | null>(null);
  const [editTab, setEditTab] = useState<"suggest" | "inventory" | "reference" | "describe">("suggest");
  const [description, setDescription] = useState("");
  const [referenceName, setReferenceName] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [sticker, setSticker] = useState<{ image: string; points: string; width: number; height: number } | null>(null);
  const items = editableFurniture[viewpoint.id] ?? [];
  const isEmpty = choice === "empty";
  const motion = usePanoramaMotion(orientationRef);
  const motionRecenter = motion.recenter;
  const currentIndex = viewpoints.findIndex((candidate) => candidate.id === viewpoint.id);
  const previousIndex = adjacentViewpointIndex(currentIndex, -1, viewpoints.length);
  const nextIndex = adjacentViewpointIndex(currentIndex, 1, viewpoints.length);

  useEffect(() => {
    if (!isExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isExpanded]);

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
    queueMicrotask(() => { setActiveItem(null); setEditing(false); setEditMessage(""); setRoomMenuOpen(false); });
    pointerPositionsRef.current.clear();
    dragStartRef.current = null;
    pinchStartRef.current = null;
    velocityRef.current.yaw = 0;
    velocityRef.current.pitch = 0;
    const orientation = orientationRef.current;
    orientation.targetYaw = viewpoint.initialYaw;
    orientation.targetPitch = viewpoint.initialPitch;
    orientation.targetFov = viewpoint.initialFov;
    orientation.yaw = viewpoint.initialYaw;
    orientation.pitch = viewpoint.initialPitch;
    orientation.fov = viewpoint.initialFov;
  }, [viewpoint]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const textureCache = textureCacheRef.current;

    mountedRef.current = true;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => { reducedMotionRef.current = motionPreference.matches; };
    syncMotionPreference();
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
    motionPreference.addEventListener("change", syncMotionPreference);

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
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      viewport.focus({ preventScroll: true });
      viewport.setPointerCapture(event.pointerId);
      pointerPositionsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      velocityRef.current = { yaw: 0, pitch: 0, time: performance.now(), x: event.clientX, y: event.clientY };

      if (pointerPositionsRef.current.size === 1) {
        const orientation = orientationRef.current;
        dragStartRef.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          yaw: orientation.yaw,
          pitch: orientation.pitch,
        };
        orientation.targetYaw = orientation.yaw;
        orientation.targetPitch = orientation.pitch;
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
      const rect = viewport.getBoundingClientRect();
      const verticalFov = orientationRef.current.fov;
      const horizontalFov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(verticalFov) / 2) * camera.aspect));
      const yawScale = horizontalFov / Math.max(rect.width, 1);
      const pitchScale = verticalFov / Math.max(rect.height, 1);
      orientationRef.current.targetYaw = dragStart.yaw + (dragStart.x - event.clientX) * yawScale;
      orientationRef.current.targetPitch = clamp(
        dragStart.pitch + (event.clientY - dragStart.y) * pitchScale,
        minPitch,
        maxPitch,
      );
      const velocity = velocityRef.current;
      const now = performance.now();
      const elapsed = Math.max((now - velocity.time) / 1000, 0.008);
      velocity.yaw = clamp((velocity.x - event.clientX) * yawScale / elapsed, -160, 160);
      velocity.pitch = clamp((event.clientY - velocity.y) * pitchScale / elapsed, -100, 100);
      velocity.time = now;
      velocity.x = event.clientX;
      velocity.y = event.clientY;
    };

    const endPointer = (event: PointerEvent) => {
      if (!pointerPositionsRef.current.has(event.pointerId)) return;
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
        if (event.type !== "pointerup" || performance.now() - velocityRef.current.time > 80 || reducedMotionRef.current) {
          velocityRef.current.yaw = 0;
          velocityRef.current.pitch = 0;
        }
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
      if (event.key === "Escape") { setEditing(false); setIsExpanded(false); setRoomMenuOpen(false); return; }
      if ((event.target as HTMLElement).closest("input, textarea")) return;
      const orientation = orientationRef.current;
      velocityRef.current.yaw = 0;
      velocityRef.current.pitch = 0;
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
    viewport.addEventListener("lostpointercapture", endPointer);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("keydown", onKeyDown);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);

    let animationFrame = 0;
    let lastFrame = performance.now();
    const worldPoint = new THREE.Vector3();
    const projectedPoint = new THREE.Vector3();
    const cameraForward = new THREE.Vector3();
    const render = (now = performance.now()) => {
      const delta = Math.min(Math.max((now - lastFrame) / 1000, 0), 0.05);
      lastFrame = now;
      const orientation = orientationRef.current;
      const velocity = velocityRef.current;
      if (!pointerPositionsRef.current.size && !reducedMotionRef.current) {
        orientation.targetYaw += velocity.yaw * delta;
        orientation.targetPitch = clamp(orientation.targetPitch + velocity.pitch * delta, minPitch, maxPitch);
        const decay = Math.exp(-7 * delta);
        velocity.yaw *= decay;
        velocity.pitch *= decay;
        if (Math.abs(velocity.yaw) < 0.1) velocity.yaw = 0;
        if (Math.abs(velocity.pitch) < 0.1) velocity.pitch = 0;
      }
      const smoothing = frameSmoothing(delta, pointerPositionsRef.current.size ? 28 : 14);
      orientation.yaw += (orientation.targetYaw - orientation.yaw) * smoothing;
      orientation.pitch += (orientation.targetPitch - orientation.pitch) * smoothing;
      orientation.fov += (orientation.targetFov - orientation.fov) * smoothing;

      camera.rotation.y = THREE.MathUtils.degToRad(-orientation.yaw);
      camera.rotation.x = THREE.MathUtils.degToRad(orientation.pitch);
      camera.updateMatrixWorld();
      camera.getWorldDirection(cameraForward);
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

      const projectPoint = (bearing: number, pitch: number) => {
        const longitude = THREE.MathUtils.degToRad(bearing);
        const latitude = THREE.MathUtils.degToRad(pitch);
        worldPoint.set(Math.sin(longitude) * Math.cos(latitude), Math.sin(latitude), -Math.cos(longitude) * Math.cos(latitude)).multiplyScalar(10);
        const inFront = worldPoint.dot(cameraForward) > 0;
        const point = projectedPoint.copy(worldPoint).project(camera);
        return { x: (point.x + 1) * viewport.clientWidth / 2, y: (1 - point.y) * viewport.clientHeight / 2, visible: inFront && Math.abs(point.x) < 0.88 && Math.abs(point.y) < 0.78 };
      };
      viewpointRef.current.neighbours.forEach((neighbour) => {
        const element = hotspotRefs.current.get(neighbour.viewpointId);
        if (!element) return;
        const point = projectPoint(neighbour.bearing, -18);
        element.style.left = `${point.x}px`;
        element.style.top = `${point.y}px`;
        element.style.opacity = point.visible ? "1" : "0";
        element.style.pointerEvents = point.visible ? "auto" : "none";
        element.style.visibility = point.visible ? "visible" : "hidden";
      });
      (editableFurniture[viewpointRef.current.id] ?? []).forEach((item) => {
        const element = furnitureRefs.current.get(item.id);
        const shape = shapeRefs.current.get(item.id);
        if (!element && !shape) return;
        const center = projectPoint(item.bearing, item.pitch);
        const visible = center.visible;
        if (element) {
          element.style.left = `${center.x}px`;
          element.style.top = `${center.y}px`;
          element.style.opacity = visible ? "1" : "0";
          element.style.pointerEvents = visible ? "auto" : "none";
          element.style.visibility = visible ? "visible" : "hidden";
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
      viewport.removeEventListener("lostpointercapture", endPointer);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("keydown", onKeyDown);
      motionPreference.removeEventListener("change", syncMotionPreference);
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
      }).catch((error) => { textureCacheRef.current.delete(url); throw error; });

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
        transitionRef.current = null;
        if (overlayMesh) overlayMesh.visible = false;
        if (overlayMaterial) { overlayMaterial.map = null; overlayMaterial.opacity = 0; }
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
    if (next && focus) orientationRef.current.targetYaw = orientationRef.current.yaw + normalizeDegrees(next.bearing - orientationRef.current.yaw);
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

  const recenter = () => {
    velocityRef.current.yaw = 0;
    velocityRef.current.pitch = 0;
    orientationRef.current.targetYaw = orientationRef.current.yaw + normalizeDegrees(viewpoint.initialYaw - orientationRef.current.yaw);
    orientationRef.current.targetPitch = viewpoint.initialPitch;
    orientationRef.current.targetFov = viewpoint.initialFov;
    motionRecenter();
  };

  const toggleFullscreen = async () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (isExpanded) { setIsExpanded(false); return; }
    if (document.fullscreenElement === viewport) { await document.exitFullscreen(); return; }
    if (!document.fullscreenEnabled || typeof viewport.requestFullscreen !== "function") { setIsExpanded(true); return; }

    try {
      await viewport.requestFullscreen();
    } catch {
      setIsExpanded(true);
    }
  };

  const neighbourViewpoints = viewpoint.neighbours.flatMap((neighbour) => {
    const target = viewpoints.find((candidate) => candidate.id === neighbour.viewpointId);
    return target ? [{ ...neighbour, target }] : [];
  });

  const showFallback = status === "failed" || status === "webgl-unavailable";

  return <div
    ref={viewportRef}
    className={`panorama-viewport${isExpanded ? " is-expanded" : ""}${editing ? " is-editing" : ""}`}
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

    <div className="tour-topline">
      <button type="button" className="tour-overview" onClick={onOverview} aria-label="Back to house overview"><ArrowLeft size={18} /></button>
      <button type="button" className="tour-room-selector" aria-expanded={roomMenuOpen} aria-controls="tour-room-menu" onClick={() => setRoomMenuOpen((open) => !open)}><MapPin size={15} /><span>{viewpoint.name}<small>Cedar House · {currentIndex + 1} / {viewpoints.length}</small></span><Grid2X2 size={16} /></button>
    </div>
    {roomMenuOpen && <nav className="tour-room-menu" id="tour-room-menu" aria-label="Choose a room">{viewpoints.map((candidate) => <button key={candidate.id} type="button" aria-current={candidate.id === viewpoint.id ? "step" : undefined} onClick={() => { setRoomMenuOpen(false); onViewpointChange(candidate.id); }}><Image src={candidate.panoramaUrl} width={64} height={40} alt="" unoptimized /><span>{candidate.name}</span><small>{candidate.index}</small></button>)}</nav>}
    <div className="tour-tools">
      {motion.available && <button type="button" className={motion.status !== "off" ? "tour-motion active" : "tour-motion"} aria-pressed={motion.status !== "off"} onClick={() => { velocityRef.current.yaw = 0; velocityRef.current.pitch = 0; void motion.toggle(); }} title="Look around by moving your phone"><Smartphone size={18} /><span>{motion.status === "starting" ? "Connecting…" : motion.status === "on" ? "Motion on" : "Use motion"}</span></button>}
      <button type="button" aria-label="Recenter view" title="Recenter view" onClick={recenter}><Compass size={18} /></button>
    <button
      type="button"
      aria-label={isFullscreen || isExpanded ? "Exit fullscreen panorama" : "View panorama fullscreen"}
      title={isFullscreen || isExpanded ? "Exit fullscreen" : "View fullscreen"}
      aria-pressed={isFullscreen || isExpanded}
      onClick={() => void toggleFullscreen()}
    >
      {isFullscreen || isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
    </button>
    </div>
    <div className="tour-navigation">
      <p className="tour-gesture-hint"><Move size={14} /><span>{motion.status === "on" ? "Move your phone to look around" : "Drag to look · Pinch or scroll to zoom"}</span><span ref={headingRef} className="tour-heading">0°</span></p>
      <nav className="tour-room-nav" aria-label="Room navigation">
        <button type="button" aria-label="Previous room" disabled={previousIndex === null} onClick={() => { if (previousIndex !== null) onViewpointChange(viewpoints[previousIndex].id); }}><ChevronLeft size={20} /><span>Previous</span></button>
        <span className="tour-room-count" aria-live="polite">{currentIndex + 1}<span> / {viewpoints.length}</span></span>
        <button type="button" aria-label="Next room" disabled={nextIndex === null} onClick={() => { if (nextIndex !== null) onViewpointChange(viewpoints[nextIndex].id); }}><span>Next</span><ChevronRight size={20} /></button>
      </nav>
    </div>
    {motion.message && <div className="tour-message" role="status"><span>{motion.message}</span><button type="button" aria-label="Dismiss viewer message" onClick={motion.clearMessage}><X size={16} /></button></div>}

    {status === "loading" && <div className="panorama-state" role="status"><LoaderCircle className="spin" /><span>Preparing 360° view…</span></div>}
    {showFallback && <div className="panorama-state panorama-state-error" role="alert"><AlertTriangle /><span>{errorMessage}</span></div>}
  </div>;
}
