"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import { CircleNotchIcon } from "@phosphor-icons/react/ssr";
import { type ComponentProps, type ReactNode, type Ref, type RefObject, useEffect, useRef, useState } from "react";
import { cn } from "@/registry/lib/cn";
import { useAriaShortcut, useShortcut, useShortcutLabel } from "@/registry/lib/shortcut";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/ui/tooltip";

// Fast actions finish before this, so they never flash a spinner.
const SPINNER_DELAY = 150;
// How long a confirm step waits for the second click.
const CONFIRM_TIMEOUT = 3000;

const variants = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover",
  secondary:
    "border border-border-strong bg-surface text-fg hover:bg-surface-hover data-[pressed]:bg-surface-active",
  ghost: "text-fg hover:bg-surface-hover",
  danger: "bg-danger text-danger-fg hover:opacity-90",
} as const;

const sizes = {
  sm: "h-[calc(var(--qui-control-h)-0.25rem)] gap-1.5 px-2.5 text-[calc(var(--qui-text)-0.0625rem)]",
  md: "h-(--qui-control-h) gap-2 px-(--qui-control-px) text-(length:--qui-text)",
  lg: "h-[calc(var(--qui-control-h)+0.5rem)] gap-2 px-4 text-(length:--qui-text)",
  icon: "size-(--qui-control-h) text-(length:--qui-text)",
} as const;

export type ButtonProps = ComponentProps<typeof BaseButton> & {
  /** `primary` for the main action, `secondary` for the rest, `ghost` in toolbars, `danger` for destructive ones. Defaults to secondary. */
  variant?: keyof typeof variants;
  /** Follows the density tokens; `icon` is square, for a lone icon. Defaults to md. */
  size?: keyof typeof sizes;
  /** Keeps the button's width while busy. The spinner only appears if it takes longer than 150ms. */
  loading?: boolean;
  /** e.g. "mod+s". Shows the key hint and binds it; `mod` is Cmd on Apple devices, Ctrl elsewhere. */
  shortcut?: string;
  /** Shown on hover and focus. On icon buttons it also becomes the accessible label. */
  tooltip?: ReactNode;
  /** Ask before acting: the first click swaps to this label, the second runs onClick. Resets after 3s. */
  confirm?: ReactNode;
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  shortcut,
  tooltip,
  confirm,
  disabled,
  className,
  children,
  onClick,
  onBlur,
  onKeyDown,
  ref,
  ...props
}: ButtonProps) {
  const innerRef = useRef<HTMLElement>(null);
  const spinner = useDelayedFlag(loading, SPINNER_DELAY);
  const [armed, setArmed] = useState(false);
  const keys = useShortcutLabel(shortcut);
  const ariaKeys = useAriaShortcut(shortcut);
  const iconOnly = size === "icon";

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), CONFIRM_TIMEOUT);
    return () => clearTimeout(timer);
  }, [armed]);

  // Clicking through the element keeps one code path, including the confirm step.
  useShortcut(shortcut, () => innerRef.current?.click(), !disabled && !loading);

  const label = (
    <>
      {confirm ? (
        // Both labels share one grid cell, so the button keeps the wider one's width.
        <span className="inline-grid gap-[inherit]">
          <Swap out={armed}>{children}</Swap>
          <Swap out={!armed}>{confirm}</Swap>
        </span>
      ) : (
        children
      )}
      {keys && !iconOnly && (
        <kbd className="font-sans text-[0.85em] tracking-wide opacity-60">{keys}</kbd>
      )}
    </>
  );

  const button = (
    <BaseButton
      data-slot="button"
      data-armed={armed || undefined}
      ref={mergeRefs(innerRef, ref)}
      disabled={disabled || loading}
      // Stays in the tab order while loading so focus isn't lost mid-action.
      focusableWhenDisabled={loading}
      aria-busy={loading || undefined}
      aria-keyshortcuts={ariaKeys}
      aria-label={props["aria-label"] ?? (iconOnly && typeof tooltip === "string" ? tooltip : undefined)}
      onClick={(event) => {
        if (confirm && !armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        onClick?.(event);
      }}
      onBlur={(event) => {
        setArmed(false);
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && armed) setArmed(false);
        onKeyDown?.(event);
      }}
      className={cn(
        "motion-control focus-ring relative inline-flex shrink-0 cursor-default select-none items-center justify-center whitespace-nowrap rounded-control font-medium",
        "active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 aria-busy:opacity-100",
        "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {spinner ? (
        <>
          <span className="invisible contents">{label}</span>
          <CircleNotchIcon aria-hidden className="absolute animate-spin" />
        </>
      ) : (
        label
      )}
    </BaseButton>
  );

  if (!tooltip) return button;
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>
        {tooltip}
        {keys && iconOnly && <kbd className="ml-2 font-sans tracking-wide opacity-60">{keys}</kbd>}
      </TooltipContent>
    </Tooltip>
  );
}

function Swap({ out, children }: { out: boolean; children: ReactNode }) {
  return (
    <span
      data-swap={out ? "out" : undefined}
      aria-hidden={out || undefined}
      className="motion-swap col-start-1 row-start-1 inline-flex items-center justify-center gap-[inherit]"
    >
      {children}
    </span>
  );
}

/** Turns true only after `value` has stayed true for `delay` ms; turns false immediately. */
function useDelayedFlag(value: boolean, delay: number) {
  const [flag, setFlag] = useState(false);
  useEffect(() => {
    if (!value) {
      setFlag(false);
      return;
    }
    const timer = setTimeout(() => setFlag(true), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return flag;
}

function mergeRefs<T>(inner: RefObject<T | null>, outer?: Ref<T>) {
  return (node: T | null) => {
    inner.current = node;
    if (typeof outer === "function") return outer(node);
    if (outer) outer.current = node;
  };
}
