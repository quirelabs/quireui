"use client";

import { useEffect, useEffectEvent, useSyncExternalStore } from "react";

/**
 * Shortcuts are written as "mod+s", "shift+k" or "/". `mod` is Cmd on Apple devices
 * and Ctrl everywhere else.
 */
type Parsed = { key: string; mod: boolean; shift: boolean; alt: boolean };

function parse(shortcut: string): Parsed {
  const parts = shortcut.toLowerCase().split("+");
  const key = parts.pop() ?? "";
  return { key, mod: parts.includes("mod"), shift: parts.includes("shift"), alt: parts.includes("alt") };
}

const isApple = () => /Mac|iPhone|iPad/.test(navigator.userAgent);
const noop = () => () => {};

/** Platform check that is safe during server rendering (assumes non-Apple there). */
export function useIsApple() {
  return useSyncExternalStore(noop, isApple, () => false);
}

const keyNames: Record<string, [apple: string, other: string]> = {
  enter: ["↵", "Enter"],
  escape: ["Esc", "Esc"],
  backspace: ["⌫", "Backspace"],
  delete: ["⌦", "Del"],
  arrowup: ["↑", "↑"],
  arrowdown: ["↓", "↓"],
};

const ariaKeyNames: Record<string, string> = {
  enter: "Enter",
  escape: "Escape",
  backspace: "Backspace",
  delete: "Delete",
  arrowup: "ArrowUp",
  arrowdown: "ArrowDown",
};

/** "mod+s" becomes "⌘S" on Apple devices and "Ctrl+S" elsewhere. */
export function useShortcutLabel(shortcut?: string) {
  const apple = useIsApple();
  if (!shortcut) return null;
  const { key, mod, shift, alt } = parse(shortcut);
  const name = keyNames[key]?.[apple ? 0 : 1] ?? key.toUpperCase();
  if (apple) return `${mod ? "⌘" : ""}${alt ? "⌥" : ""}${shift ? "⇧" : ""}${name}`;
  return [mod && "Ctrl", alt && "Alt", shift && "Shift", name].filter(Boolean).join("+");
}

/** Value for aria-keyshortcuts, e.g. "Meta+S" or "Control+S". */
export function useAriaShortcut(shortcut?: string) {
  const apple = useIsApple();
  if (!shortcut) return undefined;
  const { key, mod, shift, alt } = parse(shortcut);
  // aria-keyshortcuts uses KeyboardEvent.key names: "S", "Enter", "ArrowUp".
  const name = key.length === 1 ? key.toUpperCase() : (ariaKeyNames[key] ?? key);
  return [mod && (apple ? "Meta" : "Control"), alt && "Alt", shift && "Shift", name]
    .filter(Boolean)
    .join("+");
}

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** Binds a shortcut on window while `enabled`. Plain-key shortcuts never fire while typing. */
export function useShortcut(shortcut: string | undefined, handler: () => void, enabled = true) {
  const run = useEffectEvent(handler);
  useEffect(() => {
    if (!shortcut || !enabled) return;
    const s = parse(shortcut);
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = isApple() ? e.metaKey : e.ctrlKey;
      if (e.key.toLowerCase() !== s.key || mod !== s.mod || e.shiftKey !== s.shift || e.altKey !== s.alt) return;
      if (!s.mod && isTyping(e.target)) return;
      // A closer handler (e.g. a dialog submitting its form) already took this key.
      if (e.defaultPrevented) return;
      e.preventDefault();
      run();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut, enabled]);
}
