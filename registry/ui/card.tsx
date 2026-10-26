"use client";

import { useRender } from "@base-ui/react/use-render";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/registry/lib/cn";

/** A surface for one piece of the page: a summary, a settings group, an item in a grid. */
export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      data-slot="card"
      className={cn(
        // A card with a CardLink is one target: it lifts its border on hover and rings on focus.
        "relative flex flex-col overflow-hidden rounded-float border border-border bg-surface text-(length:--qui-text)",
        "motion-control has-[[data-slot=card-link]:hover]:border-border-strong",
        "has-[[data-slot=card-link]:focus-visible]:outline-2 has-[[data-slot=card-link]:focus-visible]:outline-offset-2 has-[[data-slot=card-link]:focus-visible]:outline-ring",
        className,
      )}
      {...props}
    />
  );
}

/** Title, description and an optional action on the right, like a button or a menu. */
export function CardHeader({
  className,
  children,
  action,
  ...props
}: ComponentProps<"div"> & {
  /** A button or menu on the right, lined up with the title. */
  action?: ReactNode;
}) {
  return (
    <div data-slot="card-header" className={cn("flex items-start gap-3 px-5 pt-4 pb-2", className)} {...props}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</div>
      {/* Above a CardLink, so the action keeps its own clicks. */}
      {action && <div className="relative z-[1] -my-1 flex shrink-0 items-center gap-1">{action}</div>}
    </div>
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return <h3 data-slot="card-title" className={cn("text-base leading-6 font-semibold", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="card-description" className={cn("text-fg-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("flex-1 px-5 py-3", className)} {...props} />;
}

/**
 * One part of a card with several, like groups in a settings card. Sections are split by a
 * hairline that stops short of the edges, like the table's dividers.
 */
export function CardSection({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-section"
      className={cn(
        "relative px-5 py-4 [&+&]:before:absolute [&+&]:before:inset-x-5 [&+&]:before:top-0 [&+&]:before:h-px [&+&]:before:bg-border",
        className,
      )}
      {...props}
    />
  );
}

/** Actions or a total, on a soft band in the same tint as a table footer. */
export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "relative z-[1] mt-auto flex items-center gap-2 border-t border-border bg-[color-mix(in_oklab,var(--qui-surface-hover)_55%,var(--qui-surface))] px-5 py-3",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Makes the whole card open one place. Put it on the title: it stays one real link for the
 * keyboard, middle-click and "open in new tab", while buttons in the card keep their own clicks.
 */
export function CardLink({ render, className, ...props }: useRender.ComponentProps<"a">) {
  return useRender({
    render,
    defaultTagName: "a",
    props: {
      "data-slot": "card-link",
      className: cn("outline-none after:absolute after:inset-0 after:content-['']", className),
      ...props,
    },
  });
}
