"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { deviceLookAngles } from "@/lib/acre7/scene/motion";
import { normalizeDegrees } from "@/lib/acre7/scene/coordinates";

type MotionOrientation = { targetYaw: number; targetPitch: number };
type PermissionEvent = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

export function usePanoramaMotion(orientation: MutableRefObject<MotionOrientation>) {
  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState<"off" | "starting" | "on">("off");
  const [message, setMessage] = useState("");
  const cleanupRef = useRef<(() => void) | null>(null);
  const previousRef = useRef<{ yaw: number; pitch: number } | null>(null);
  const requestingRef = useRef(false);
  const aliveRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    const supported = window.isSecureContext && "DeviceOrientationEvent" in window && window.matchMedia("(any-pointer: coarse)").matches;
    queueMicrotask(() => { if (aliveRef.current) setAvailable(supported); });
    return () => { aliveRef.current = false; cleanupRef.current?.(); };
  }, []);

  function stop() {
    cleanupRef.current?.();
    cleanupRef.current = null;
    previousRef.current = null;
    setStatus("off");
  }

  async function toggle() {
    if (status !== "off") { stop(); setMessage(""); return; }
    if (requestingRef.current) return;
    requestingRef.current = true;
    setMessage("");
    try {
      const sensor = window.DeviceOrientationEvent as PermissionEvent;
      // iOS requires this request directly inside the user's button gesture.
      if (sensor.requestPermission && await sensor.requestPermission() !== "granted") {
        setMessage("Motion access was declined. You can still swipe to look around.");
        return;
      }
      if (!aliveRef.current) return;
      setStatus("starting");
      previousRef.current = null;
      let received = false;
      const reset = () => { previousRef.current = null; };
      const onOrientation = (event: DeviceOrientationEvent) => {
        if (document.hidden || event.alpha === null || event.beta === null || event.gamma === null) return;
        if (![event.alpha, event.beta, event.gamma].every(Number.isFinite)) return;
        if (!received) { received = true; clearTimeout(timeout); setStatus("on"); }
        const screenAngle = window.screen.orientation?.angle ?? (window as Window & { orientation?: number }).orientation ?? 0;
        const next = deviceLookAngles(event.alpha, event.beta, event.gamma, screenAngle);
        const previous = previousRef.current;
        if (previous) {
          // Apply relative changes so enabling motion, changing rooms and touch
          // gestures retain the current view instead of snapping to north.
          orientation.current.targetYaw += normalizeDegrees(next.yaw - previous.yaw);
          orientation.current.targetPitch = Math.max(-85, Math.min(85, orientation.current.targetPitch + next.pitch - previous.pitch));
        }
        previousRef.current = next;
      };
      const timeout = setTimeout(() => {
        stop();
        setMessage("No motion sensor data received. Check browser motion permissions, or swipe to explore.");
      }, 5000);
      window.addEventListener("deviceorientation", onOrientation);
      window.addEventListener("orientationchange", reset);
      window.screen.orientation?.addEventListener("change", reset);
      document.addEventListener("visibilitychange", reset);
      cleanupRef.current = () => {
        clearTimeout(timeout);
        window.removeEventListener("deviceorientation", onOrientation);
        window.removeEventListener("orientationchange", reset);
        window.screen.orientation?.removeEventListener("change", reset);
        document.removeEventListener("visibilitychange", reset);
      };
    } catch {
      if (aliveRef.current) { stop(); setMessage("Motion controls could not start. Use touch controls or check browser permissions."); }
    } finally { requestingRef.current = false; }
  }

  return { available, status, message, toggle, clearMessage: () => setMessage(""), recenter: () => { previousRef.current = null; } };
}
