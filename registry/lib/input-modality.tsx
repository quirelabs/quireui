"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Marks <html data-input="keyboard|pointer"> so the motion utilities can skip
 * animation for keyboard-driven interaction. Someone pressing Cmd+K 200 times a
 * day should never wait for a transition.
 */
export function useInputModality() {
  useEffect(() => {
    const root = document.documentElement;
    const set = (mode: "keyboard" | "pointer") => {
      if (root.dataset.input !== mode) root.dataset.input = mode;
    };
    const onKey = (e: KeyboardEvent) => {
      // Modifier-only presses also happen mid-mouse-use (shift-click etc).
      if (e.key === "Shift" || e.key === "Meta" || e.key === "Control" || e.key === "Alt") return;
      set("keyboard");
    };
    const onPointer = () => set("pointer");
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, []);
}

/** Render once in the root layout. */
export function InputModality() {
  useInputModality();
  return null;
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-input", "data-motion"] });
  return () => observer.disconnect();
}

function snapshot() {
  const { input, motion } = document.documentElement.dataset;
  return input === "keyboard" || motion === "reduced";
}

/**
 * True when JS-driven motion should be instant: keyboard use or an app-level
 * data-motion="reduced". The same rule the CSS motion utilities follow.
 * (prefers-reduced-motion is left to each animation, which already checks it.)
 */
export function useInstantMotion() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
