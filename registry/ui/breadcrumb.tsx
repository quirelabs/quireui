"use client";

import { useRender } from "@base-ui/react/use-render";
import { CaretUpDownIcon, CheckIcon, DotsThreeIcon } from "@phosphor-icons/react/ssr";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/registry/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu";

/** Where you are, and the way back up. Separators come between items on their own. */
export function Breadcrumb({ className, children, ...props }: ComponentProps<"nav">) {
  return (
    <nav data-slot="breadcrumb" aria-label="Breadcrumb" className={cn("min-w-0", className)} {...props}>
      <ol className="flex min-w-0 items-center text-(length:--qui-text) text-fg-muted">{children}</ol>
    </nav>
  );
}

/** One level of the path. */
export function BreadcrumbItem({ className, ...props }: ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn(
        // The separator is drawn before every item but the first, with empty alt text so screen
        // readers skip it. The last item is allowed to shrink first, so long current pages truncate.
        "flex min-w-0 items-center before:mx-2 before:text-fg-subtle before:content-['/'_/_''] first:before:hidden",
        "shrink-0 last:shrink",
        className,
      )}
      {...props}
    />
  );
}

const crumb =
  "motion-control focus-ring block max-w-[16rem] truncate rounded-[calc(var(--radius-control)-0.125rem)] hover:text-fg";

/** A level you can go back to. Long names truncate and show in full on hover. */
export function BreadcrumbLink({ render, className, children, ...props }: useRender.ComponentProps<"a">) {
  return useRender({
    render,
    defaultTagName: "a",
    props: {
      "data-slot": "breadcrumb-link",
      className: cn(crumb, className),
      title: typeof children === "string" ? children : undefined,
      children,
      ...props,
    },
  });
}

/** The page you are on. It is not a link, and screen readers hear it as the current page. */
export function BreadcrumbPage({ className, children, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      aria-current="page"
      title={typeof children === "string" ? children : undefined}
      className={cn("block truncate font-medium text-fg", className)}
      {...props}
    >
      {children}
    </span>
  );
}

type Level = { label: ReactNode; href: string };

/**
 * The middle of a deep path, folded into "…". It opens a menu of the levels it hides, so a long
 * path stays on one line without losing the way back.
 */
export function BreadcrumbCollapsed({
  items,
  className,
}: {
  /** The levels it stands for, in order from the top. */
  items: Level[];
  className?: string;
}) {
  return (
    <BreadcrumbItem className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Show ${items.length} more ${items.length === 1 ? "level" : "levels"}`}
          className="motion-control focus-ring grid h-6 w-7 place-items-center rounded-[calc(var(--radius-control)-0.125rem)] hover:bg-surface-hover hover:text-fg data-[popup-open]:bg-surface-hover data-[popup-open]:text-fg [&_svg]:size-4"
        >
          <DotsThreeIcon weight="bold" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {items.map((level) => (
            <DropdownMenuItem key={level.href} render={<a href={level.href} />}>
              {level.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </BreadcrumbItem>
  );
}

/**
 * A level that is one of several, like a workspace or a project. It shows the current one and
 * opens a menu to jump to a sibling, so the breadcrumb is a way around as well as a way back.
 */
export function BreadcrumbSwitcher({
  label,
  icon,
  items,
  current,
  className,
}: {
  /** The current level's name. */
  label: ReactNode;
  /** Something before the name, like a logo or an avatar. */
  icon?: ReactNode;
  /** The levels you can switch to, this one included. */
  items: (Level & { value: string; icon?: ReactNode })[];
  /** The `value` of the current level, marked with a check in the menu. */
  current: string;
  className?: string;
}) {
  return (
    <BreadcrumbItem className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger className="motion-control focus-ring -mx-1.5 flex h-7 min-w-0 items-center gap-1.5 rounded-[calc(var(--radius-control)-0.125rem)] px-1.5 font-medium text-fg hover:bg-surface-hover data-[popup-open]:bg-surface-hover [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-fg-subtle">
          {icon}
          <span className="truncate">{label}</span>
          <CaretUpDownIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {items.map((level) => (
            <DropdownMenuItem key={level.value} render={<a href={level.href} />}>
              {level.icon}
              <span className="flex-1 truncate">{level.label}</span>
              {level.value === current && <CheckIcon className="text-fg!" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </BreadcrumbItem>
  );
}
