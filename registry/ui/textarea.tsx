"use client";

import { Input as BaseInput } from "@base-ui/react/input";
import { type CSSProperties, type ComponentProps, useLayoutEffect, useRef } from "react";
import { cn } from "@/registry/lib/cn";

export type TextareaProps = Omit<ComponentProps<"textarea">, "rows"> & {
  /** Starting height in rows. */
  minRows?: number;
  /** Stops growing here and scrolls instead. */
  maxRows?: number;
};

const supportsFieldSizing = () => typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");

/**
 * Grows with its content. Uses CSS field-sizing where supported and measures
 * scrollHeight elsewhere. Works inside Field like Input does.
 */
export function Textarea({ className, minRows = 3, maxRows = 12, style, onInput, ...props }: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const fit = () => {
    const el = ref.current;
    if (!el || supportsFieldSizing()) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  };

  // Controlled values can change without an input event.
  useLayoutEffect(fit);

  return (
    <BaseInput
      render={<textarea ref={ref} rows={minRows} />}
      data-slot="textarea"
      onInput={(e) => {
        fit();
        // Base UI types the event for <input>; the element here is the textarea.
        onInput?.(e as never);
      }}
      style={
        {
          minHeight: `calc(${minRows}lh + 2 * var(--qui-textarea-py) + 2px)`,
          maxHeight: `calc(${maxRows}lh + 2 * var(--qui-textarea-py) + 2px)`,
          ...style,
        } as CSSProperties
      }
      className={cn(
        "motion-control w-full min-w-0 resize-none rounded-control border border-border-strong bg-surface px-(--qui-control-px) py-(--qui-textarea-py) text-(length:--qui-text) leading-normal text-fg [--qui-textarea-py:0.375rem] [field-sizing:content]",
        "placeholder:text-fg-subtle hover:border-fg-subtle",
        "outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-danger data-[invalid]:border-danger",
        "aria-invalid:focus-visible:border-danger aria-invalid:focus-visible:ring-danger data-[invalid]:focus-visible:border-danger data-[invalid]:focus-visible:ring-danger",
        "pointer-coarse:text-base",
        className,
      )}
      {...(props as ComponentProps<typeof BaseInput>)}
    />
  );
}
