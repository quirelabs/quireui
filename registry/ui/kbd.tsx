"use client";

import { type ComponentProps, Fragment, type ReactNode, useEffect, useState } from "react";
import { cn } from "@/registry/lib/cn";
import { matchesShortcut, useShortcutKeys } from "@/registry/lib/shortcut";

// Sized in em, so a key fits wherever it sits: a sentence, a menu, a tooltip, a button. The small
// top padding centres letters optically; the font's tall ascender would otherwise lift them.
const cap =
  "inline-flex h-[1.75em] min-w-[1.75em] items-center justify-center rounded-[0.4em] border border-border bg-surface px-[0.45em] pt-[0.1em] font-sans leading-none font-medium text-fg-muted shadow-[0_1px_0_var(--qui-border)]";
// Pressed keys sink into the surface. Instantly: keyboard input is never animated.
const pressed = "translate-y-px border-border-strong bg-surface-hover text-fg shadow-none";

export type KbdProps = Omit<ComponentProps<"kbd">, "children"> & {
  /** A shortcut in the library's format: "mod+k", "shift+/", or a sequence like "g i". */
  shortcut?: string;
  /** Lights the keys while they are pressed (and steps through sequences), for teaching a shortcut. */
  live?: boolean;
  /** A single key or label instead of a shortcut, e.g. "Esc". */
  children?: ReactNode;
};

/**
 * Keyboard keys. Shortcuts are drawn for the platform: "mod+k" is ⌘ K on a Mac and Ctrl K
 * elsewhere. Sequences read "G then I".
 */
export function Kbd({ shortcut, live = false, className, children, ...props }: KbdProps) {
  const steps = shortcut ? shortcut.trim().split(/\s+/) : [];
  const lit = useLiveKeys(live ? steps : []);

  if (!shortcut) {
    return (
      <kbd data-slot="kbd" className={cn(cap, "text-[0.75em]", className)} {...props}>
        {children}
      </kbd>
    );
  }
  return (
    // Nested kbd elements are how HTML marks up a key combination.
    <kbd data-slot="kbd" className={cn("inline-flex items-center gap-[0.25em] align-middle font-sans text-[0.75em]", className)} {...props}>
      {steps.map((step, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: steps never reorder
        <Fragment key={i}>
          {i > 0 && <span className="px-[0.15em] text-fg-subtle">then</span>}
          <Step shortcut={step} lit={lit[i]} />
        </Fragment>
      ))}
    </kbd>
  );
}

function Step({ shortcut, lit }: { shortcut: string; lit?: boolean[] }) {
  const keys = useShortcutKeys(shortcut);
  return keys.map((key, i) => (
    <kbd key={key} className={cn(cap, lit?.[i] && pressed)}>
      {key}
    </kbd>
  ));
}

const modifierOf = {
  mod: (e: KeyboardEvent) => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? e.metaKey : e.ctrlKey),
  alt: (e: KeyboardEvent) => e.altKey,
  shift: (e: KeyboardEvent) => e.shiftKey,
};

/**
 * Which caps are lit, per step and per key. In a combination each key lights while it is held;
 * in a sequence, finished steps stay lit until the sequence completes or stalls for a second.
 */
function useLiveKeys(steps: string[]) {
  const [lit, setLit] = useState<boolean[][]>([]);
  const signature = steps.join(" ");

  useEffect(() => {
    if (!signature) return;
    const parsed = signature.split(" ").map((step) => {
      const parts = step.toLowerCase().split("+");
      return { step, key: parts.pop() ?? "", mods: parts as (keyof typeof modifierOf)[] };
    });
    let done = 0;
    let reset: ReturnType<typeof setTimeout> | undefined;

    // Keys of the current step that are held right now, in the order the caps are drawn.
    const held = (e: KeyboardEvent, down: boolean) => {
      const current = parsed[Math.min(done, parsed.length - 1)];
      const order = ["mod", "alt", "shift"].filter((m) => current.mods.includes(m as keyof typeof modifierOf));
      const keyDown = down && e.key.toLowerCase() === (current.key === "space" ? " " : current.key);
      return [...order.map((m) => modifierOf[m as keyof typeof modifierOf](e)), keyDown];
    };
    const render = (current: boolean[]) =>
      setLit(parsed.map((_, i) => (i < done ? current.map(() => true) : i === done ? current : [])));

    const onDown = (e: KeyboardEvent) => {
      const step = parsed[done];
      if (!step) return;
      if (matchesShortcut(e, step.step)) {
        done += 1;
        clearTimeout(reset);
        if (done === parsed.length) {
          setLit(parsed.map((p) => Array(p.mods.length + 1).fill(true)));
          reset = setTimeout(() => {
            done = 0;
            setLit([]);
          }, 600);
          return;
        }
        // Waits a second for the next step, then starts over.
        reset = setTimeout(() => {
          done = 0;
          setLit([]);
        }, 1000);
        render([]);
        return;
      }
      render(held(e, true));
    };
    const onUp = (e: KeyboardEvent) => {
      if (done === parsed.length) return;
      render(held(e, false));
    };
    const clear = () => {
      done = 0;
      setLit([]);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    return () => {
      clearTimeout(reset);
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
    };
  }, [signature]);

  return lit;
}
