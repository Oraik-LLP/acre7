"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useSyncExternalStore, type MouseEvent } from "react";
import { flushSync } from "react-dom";

const subscribeToHydration = () => () => undefined;

export function ThemeToggle() {
  const { theme = "light", setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const isDark = mounted && theme === "dark";
  const switchingRef = useRef(false);

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark ? "#101512" : "#f6f5ef");
  }, [isDark]);

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    if (switchingRef.current) return;
    const next = isDark ? "light" : "dark";
    const root = document.documentElement;
    const change = () => {
      flushSync(() => setTheme(next));
      root.dataset.theme = next;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#101512" : "#f6f5ef");
    };
    if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { change(); return; }
    const icon = event.currentTarget.querySelector(".theme-icon");
    const rect = (icon ?? event.currentTarget).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const width = Math.max(window.innerWidth, root.clientWidth);
    // The transition snapshot uses viewport coordinates. A long document's
    // height makes the circle race past the visible screen almost immediately.
    const height = Math.max(window.innerHeight, root.clientHeight);
    root.style.setProperty("--theme-reveal-x", `${x}px`);
    root.style.setProperty("--theme-reveal-y", `${y}px`);
    root.style.setProperty("--theme-reveal-radius", `${Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + 48}px`);
    switchingRef.current = true;
    try {
      const transition = document.startViewTransition(change);
      void transition.finished.finally(() => { switchingRef.current = false; }).catch(() => undefined);
    } catch { switchingRef.current = false; change(); }
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-pressed={isDark}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      onClick={toggle}
    >
      <span className="theme-icon">{isDark ? <Sun size={17} strokeWidth={1.8} /> : <Moon size={17} strokeWidth={1.8} />}</span>
      <span className="sr-only">{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
