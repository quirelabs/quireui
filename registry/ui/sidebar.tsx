"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { useRender } from "@base-ui/react/use-render";
import { CaretRightIcon, SidebarSimpleIcon } from "@phosphor-icons/react/ssr";
import {
  type ComponentProps,
  type CSSProperties,
  createContext,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  use,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { flushSync } from "react-dom";
import { cn } from "@/registry/lib/cn";
import { matchesShortcut } from "@/registry/lib/shortcut";
import { Button } from "@/registry/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/registry/ui/sheet";
import { Skeleton, SkeletonText } from "@/registry/ui/skeleton";

const PEEK_DELAY = 200; // long enough that crossing the rail on the way to the page does not open it
const MIN_WIDTH = 192;
const MAX_WIDTH = 384;
const RESIZE_STEP = 16;
const PHONE = "(max-width: 47.9375rem)"; // below md, the same line the aside hides at

// The rail: collapsed, and not opened by a peek. Written out here, because Tailwind only sees whole class names.
const onRail = cn(
  "[&[data-collapsed]:not([data-peek])_[data-sidebar-label]]:opacity-0",
  "[&[data-collapsed]:not([data-peek])_[data-sidebar-hide]]:hidden",
  "[&[data-collapsed]:not([data-peek])_[data-sidebar-dot]]:block",
  "[&[data-collapsed]:not([data-peek])_[data-sidebar-row]]:w-(--qui-item-h)",
);

export type SidebarLabels = {
  /** The name of the button that opens and closes the sidebar. */
  toggle: string;
  /** The name of the edge that resizes it. */
  resize: string;
  /** The name of the panel on phones. */
  title: string;
};

const defaultLabels: SidebarLabels = { toggle: "Toggle sidebar", resize: "Resize sidebar", title: "Navigation" };

type CollapseMode = "icon" | "offcanvas" | "none";

type SidebarContextValue = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
  mobile: boolean;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  peek: boolean;
  setPeek: (peek: boolean) => void;
  collapsible: CollapseMode;
  resizable: boolean;
  width: number | undefined;
  setWidth: (width: number, save?: boolean) => void;
  labels: SidebarLabels;
  rootRef: RefObject<HTMLDivElement | null>;
  insetRef: RefObject<HTMLElement | null>;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

/** The sidebar's state, from anywhere inside `SidebarProvider`. */
export function useSidebar() {
  const context = use(SidebarContext);
  if (!context) throw new Error("useSidebar needs a SidebarProvider around it.");
  return context;
}

const subscribeNothing = () => () => {};
const subscribePhone = (change: () => void) => {
  const query = window.matchMedia(PHONE);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
};

const read = (key: string) => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}") as { collapsed?: boolean; width?: number };
  } catch {
    return {};
  }
};

// Runs while the page is parsed, so a reload paints the saved state rather than flashing the default.
const restore = (key: string) =>
  `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(key).replace(/</g, "\\u003c")})||"{}"),e=document.currentScript.parentElement;if(s.collapsed!==undefined){if(s.collapsed)e.setAttribute("data-collapsed","");else e.removeAttribute("data-collapsed")}if(s.width)e.style.setProperty("--qui-sidebar-width",s.width+"px")}catch(_){}})()`;

export type SidebarProviderProps = ComponentProps<"div"> & {
  /** Whether it is collapsed, when you control it. */
  collapsed?: boolean;
  /** Whether it starts collapsed. Defaults to false. */
  defaultCollapsed?: boolean;
  /** Called with the new state. */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Saves the collapsed state and width in this browser under this key, restored before the first paint. */
  storageKey?: string;
  /** Collapses to a rail of `icon`s, slides away with `offcanvas`, or stays open with `none`. Defaults to icon. */
  collapsible?: CollapseMode;
  /** `sidebar` sits flush against the page; `inset` sets the page on a card beside it. Defaults to sidebar. */
  variant?: "sidebar" | "inset";
  /** Lets the edge be dragged, or moved with the arrow keys, to change the width. Defaults to true. */
  resizable?: boolean;
  /** The keys that toggle it, or `false` for none. Defaults to `mod+b`. */
  shortcut?: string | false;
  /** A nonce for the script that restores the saved state, for a strict Content Security Policy. */
  nonce?: string;
  /** Replaces the sidebar's words, for other languages. */
  labels?: Partial<SidebarLabels>;
};

/**
 * Holds the state and lays out the sidebar and the page. Wrap both in it.
 * @cssvar --qui-sidebar-width Its open width. Defaults to 15rem.
 * @cssvar --qui-sidebar-rail The width of the collapsed rail.
 */
export function SidebarProvider({
  collapsed: controlled,
  defaultCollapsed = false,
  onCollapsedChange,
  storageKey,
  collapsible = "icon",
  variant = "sidebar",
  resizable = true,
  shortcut = "mod+b",
  nonce,
  labels: customLabels,
  className,
  style,
  children,
  ...props
}: SidebarProviderProps) {
  const labels = { ...defaultLabels, ...customLabels };
  const [own, setOwn] = useState(defaultCollapsed);
  const [width, setOwnWidth] = useState<number>();
  const [openMobile, setOpenMobile] = useState(false);
  const [peek, setPeek] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const insetRef = useRef<HTMLElement>(null);
  const mobile = useSyncExternalStore(
    subscribePhone,
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
  // Only while hydrating: React does not run a script it creates on the client, and warns about it.
  const hydrating = useSyncExternalStore(
    subscribeNothing,
    () => false,
    () => true,
  );
  const collapsed = collapsible !== "none" && (controlled ?? own);

  useLayoutEffect(() => {
    if (!storageKey) return;
    const saved = read(storageKey);
    if (saved.collapsed !== undefined) setOwn(saved.collapsed);
    if (saved.width) setOwnWidth(saved.width);
  }, [storageKey]);

  const save = (change: { collapsed?: boolean; width?: number }) => {
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify({ ...read(storageKey), ...change }));
  };

  const setCollapsed = (next: boolean) => {
    const inset = insetRef.current;
    const before = inset?.getBoundingClientRect().left;
    flushSync(() => {
      setOwn(next);
      setPeek(false);
    });
    onCollapsedChange?.(next);
    save({ collapsed: next });
    // The page's width changes at once and only its position glides, so nothing animates width.
    if (inset && before !== undefined) {
      inset.dataset.flip = "";
      inset.style.translate = `${before - inset.getBoundingClientRect().left}px 0`;
      inset.getBoundingClientRect();
      delete inset.dataset.flip;
      inset.style.translate = "";
    }
  };

  const toggle = () => {
    if (mobile) setOpenMobile(!openMobile);
    else if (collapsible !== "none") setCollapsed(!collapsed);
  };

  const setWidth = (next: number, keep = true) => {
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(next)));
    setOwnWidth(clamped);
    if (keep) save({ width: clamped });
  };

  const latestToggle = useRef(toggle);
  latestToggle.current = toggle;
  useEffect(() => {
    if (!shortcut) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!matchesShortcut(event, shortcut)) return;
      // Bold, in anything you can type in.
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      latestToggle.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut]);

  return (
    <SidebarContext
      value={{
        collapsed,
        setCollapsed,
        toggle,
        mobile,
        openMobile,
        setOpenMobile,
        peek,
        setPeek,
        collapsible,
        resizable,
        width,
        setWidth,
        labels,
        rootRef,
        insetRef,
      }}
    >
      {/* The restore script writes to this element before hydration, on purpose. */}
      <div
        ref={rootRef}
        data-slot="sidebar-provider"
        data-collapsed={collapsed || undefined}
        data-peek={peek || undefined}
        data-collapsible={collapsible}
        data-variant={variant}
        suppressHydrationWarning
        style={{ ...(width ? { "--qui-sidebar-width": `${width}px` } : null), ...style } as CSSProperties}
        className={cn(
          "flex min-h-dvh w-full overflow-x-clip bg-bg text-fg [--qui-sidebar-rail:calc(var(--qui-item-h)+1rem+1px)] [--qui-sidebar-width:15rem]",
          // The column the page sits beside, and the panel drawn over it. A peek opens only the panel.
          "[--sidebar-column:var(--qui-sidebar-width)] [--sidebar-panel:var(--sidebar-column)]",
          "data-collapsed:[--sidebar-column:var(--qui-sidebar-rail)] data-collapsed:data-[collapsible=offcanvas]:[--sidebar-column:0px]",
          "data-peek:[--sidebar-panel:var(--qui-sidebar-width)]",
          "data-[variant=inset]:bg-surface-muted",
          onRail,
          className,
        )}
        {...props}
      >
        {hydrating && storageKey && (
          // biome-ignore lint/security/noDangerouslySetInnerHtml: a fixed script, with the key escaped
          <script nonce={nonce} dangerouslySetInnerHTML={{ __html: restore(storageKey) }} />
        )}
        {children}
      </div>
    </SidebarContext>
  );
}

function ResizeEdge() {
  const { width, setWidth, labels, rootRef } = useSidebar();
  const current = () => width ?? rootRef.current?.querySelector("[data-sidebar-surface]")?.clientWidth ?? 240;

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const handle = event.currentTarget;
    const startX = event.clientX;
    const start = current();
    handle.setPointerCapture(event.pointerId);
    const onMove = (move: PointerEvent) => setWidth(start + move.clientX - startX, false);
    const onUp = (up: PointerEvent) => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      setWidth(start + up.clientX - startX);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  };

  const onKeyDown = (event: ReactKeyboardEvent) => {
    const step = { ArrowLeft: -RESIZE_STEP, ArrowRight: RESIZE_STEP }[event.key];
    if (step) {
      event.preventDefault();
      setWidth(current() + step);
    }
  };

  return (
    // A focusable separator with a value is how a splitter is exposed; it is interactive, not decoration.
    // biome-ignore lint/a11y/useSemanticElements: an hr cannot take focus or a value
    <div
      data-slot="sidebar-resize"
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={labels.resize}
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      aria-valuenow={width ?? 240}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={cn(
        "focus-ring absolute inset-y-0 z-10 w-2 -translate-x-1/2 cursor-col-resize touch-none left-(--qui-sidebar-width)",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 hover:after:bg-border-strong",
      )}
    />
  );
}

export type SidebarProps = ComponentProps<"aside">;

/** The panel itself: a column on wide screens, and a sheet from the left on phones. */
export function Sidebar({ className, children, ...props }: SidebarProps) {
  const { mobile, openMobile, setOpenMobile, collapsed, collapsible, peek, setPeek, resizable, labels } = useSidebar();
  const asideRef = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const canPeek = collapsed && collapsible === "icon";

  useEffect(() => () => clearTimeout(timer.current), []);

  // Pointer leave cannot tell a menu opened from here apart from leaving, so ask where the pointer is.
  useEffect(() => {
    if (!peek) return;
    const onMove = (event: PointerEvent) => {
      const aside = asideRef.current;
      if (!aside || aside.contains(event.target as Node) || aside.querySelector("[data-popup-open]")) return;
      setPeek(false);
    };
    document.addEventListener("pointermove", onMove);
    return () => document.removeEventListener("pointermove", onMove);
  }, [peek, setPeek]);

  if (mobile) {
    return (
      <Sheet side="left" open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent showClose={false} className="w-[min(18rem,85vw)] bg-surface-muted p-0">
          <SheetTitle className="sr-only">{labels.title}</SheetTitle>
          <div data-slot="sidebar" className="flex h-full flex-col">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      ref={asideRef}
      data-slot="sidebar"
      onPointerEnter={(event) => {
        if (canPeek && event.pointerType !== "touch") timer.current = setTimeout(() => setPeek(true), PEEK_DELAY);
      }}
      onPointerLeave={() => clearTimeout(timer.current)}
      onFocus={(event) => {
        if (canPeek && event.target.matches(":focus-visible")) setPeek(true);
      }}
      onBlur={(event) => {
        if (peek && !event.currentTarget.contains(event.relatedTarget)) setPeek(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && peek) setPeek(false);
      }}
      className={cn("sticky top-0 z-30 h-dvh max-h-full w-(--sidebar-column) shrink-0 max-md:hidden", className)}
      {...props}
    >
      {/* Slides out of the way instead of narrowing, so the collapse moves only with translate. */}
      <div
        data-sidebar-surface
        className={cn(
          "motion-reorder absolute inset-y-0 left-0 w-(--qui-sidebar-width) translate-x-[calc(var(--sidebar-panel)-var(--qui-sidebar-width))] border-r border-border bg-surface-muted",
          "in-data-[variant=inset]:border-transparent in-data-peek:border-border in-data-peek:shadow-float",
        )}
      />
      {/* The content stays put, so the icons never move, and this clips it to the panel. */}
      <div className="relative h-full w-(--sidebar-panel) overflow-hidden">
        <div className="flex h-full w-(--qui-sidebar-width) flex-col">{children}</div>
      </div>
      {resizable && !collapsed && <ResizeEdge />}
    </aside>
  );
}

/** The page beside the sidebar. */
export function SidebarInset({ className, ...props }: ComponentProps<"main">) {
  const { insetRef } = useSidebar();
  return (
    <main
      ref={insetRef}
      data-slot="sidebar-inset"
      className={cn(
        "motion-reorder relative flex min-w-0 flex-1 flex-col bg-bg",
        "in-data-[variant=inset]:my-2 in-data-[variant=inset]:mr-2 in-data-[variant=inset]:rounded-float in-data-[variant=inset]:border in-data-[variant=inset]:border-border",
        className,
      )}
      {...props}
    />
  );
}

export type SidebarTriggerProps = ComponentProps<typeof Button>;

/** Opens and closes the sidebar, and the sheet on phones. */
export function SidebarTrigger({ children, onClick, ...props }: SidebarTriggerProps) {
  const { toggle, labels, collapsed, mobile, openMobile } = useSidebar();
  return (
    <Button
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      aria-label={labels.toggle}
      aria-expanded={mobile ? openMobile : !collapsed}
      onClick={(event) => {
        onClick?.(event);
        toggle();
      }}
      {...props}
    >
      {children ?? <SidebarSimpleIcon />}
    </Button>
  );
}

/**
 * The top of the panel, for a logo or a workspace switcher. Stays in place while the content scrolls.
 * Mark text with `data-sidebar-label`, and it fades on the rail the way an item's does.
 */
export function SidebarHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sidebar-header" className={cn("flex shrink-0 flex-col gap-2 p-2", className)} {...props} />;
}

/** The bottom of the panel, for the signed-in user. `data-sidebar-label` works here as well. */
export function SidebarFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sidebar-footer" className={cn("flex shrink-0 flex-col gap-1 p-2", className)} {...props} />;
}

/** The part that scrolls, holding the groups. It is the page's navigation landmark. */
export function SidebarContent({ className, ...props }: ComponentProps<"nav">) {
  return (
    <nav
      data-slot="sidebar-content"
      aria-label="Main"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto overscroll-contain px-2 py-1",
        "[scrollbar-width:none]",
        className,
      )}
      {...props}
    />
  );
}

/** A set of items, with an optional heading. On the rail the heading keeps its height, so icons do not jump. */
export function SidebarGroup({
  label,
  action,
  className,
  children,
  ...props
}: Omit<ComponentProps<"section">, "aria-labelledby"> & {
  /** The heading above the items. */
  label?: ReactNode;
  /** A small button at the end of the heading, like "New project". */
  action?: ReactNode;
}) {
  const id = useId();
  return (
    <section data-slot="sidebar-group" aria-labelledby={label ? id : undefined} className={className} {...props}>
      {label && (
        <div
          data-sidebar-label
          className="motion-fade flex h-7 items-center justify-between gap-2 px-[calc((var(--qui-item-h)-1rem)/2)] text-[calc(var(--qui-text)-0.0625rem)] text-fg-subtle"
        >
          <span id={id} className="truncate">
            {label}
          </span>
          {action}
        </div>
      )}
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </section>
  );
}

const item = cn(
  "focus-ring motion-control relative flex h-(--qui-item-h) w-full min-w-0 items-center gap-2 rounded-control px-[calc((var(--qui-item-h)-1rem)/2)] text-left text-(length:--qui-text) text-fg-muted",
  "hover:bg-surface-hover hover:text-fg data-active:bg-surface-active data-active:font-medium data-active:text-fg",
  "[&_svg]:size-4 [&_svg]:shrink-0",
);
const label = "motion-fade min-w-0 flex-1 truncate";

export type SidebarItemProps = useRender.ComponentProps<"a"> & {
  /** The icon, which is all that shows on the rail. */
  icon?: ReactNode;
  /** The page you are on. */
  active?: boolean;
  /** A count or short word at the end of the row. On the rail it becomes a dot on the icon. */
  badge?: ReactNode;
  /** A small button at the end of the row, shown on hover. */
  action?: ReactNode;
};

/** A link in the sidebar. Use `render` for your router's link, like `render={<Link href="/" />}`. */
export function SidebarItem({
  icon,
  active = false,
  badge,
  action,
  render,
  className,
  children,
  onClick,
  ...props
}: SidebarItemProps) {
  const { mobile, setOpenMobile } = useSidebar();
  const element = useRender({
    render,
    defaultTagName: "a",
    props: {
      "data-slot": "sidebar-item",
      "data-sidebar-row": "",
      "data-active": active || undefined,
      "aria-current": active ? ("page" as const) : undefined,
      className: cn(item, className),
      onClick: (event: ReactMouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        // On a phone the sheet covers the page you just asked for.
        if (mobile) setOpenMobile(false);
      },
      children: (
        <>
          {icon}
          {badge !== undefined && (
            <span
              aria-hidden
              data-sidebar-dot
              className="absolute top-1 left-[calc((var(--qui-item-h)+0.5rem)/2)] hidden size-1.5 rounded-full bg-primary"
            />
          )}
          <span data-sidebar-label className={label}>
            {children}
          </span>
          {badge !== undefined && (
            <span
              data-slot="sidebar-badge"
              data-sidebar-label
              className="motion-fade nums shrink-0 text-xs text-fg-muted"
            >
              {badge}
            </span>
          )}
        </>
      ),
      ...props,
    },
  });
  return (
    <li data-slot="sidebar-list-item" className="group/item relative">
      {element}
      {action && (
        <span
          data-slot="sidebar-item-action"
          data-sidebar-hide
          className="motion-fade absolute inset-y-0 right-1 flex items-center opacity-0 group-focus-within/item:opacity-100 group-hover/item:opacity-100"
        >
          {action}
        </span>
      )}
    </li>
  );
}

/** An item that opens to more items. Sub-items wait on the rail, and a peek shows them. */
export function SidebarSub({
  icon,
  label: title,
  active = false,
  defaultOpen,
  open,
  onOpenChange,
  className,
  children,
}: {
  /** The icon, which is all that shows on the rail. */
  icon?: ReactNode;
  /** The row's text. */
  label: ReactNode;
  /** One of its items is the page you are on. It starts open, and the row is marked when closed. */
  active?: boolean;
  /** Whether it starts open. Defaults to `active`. */
  defaultOpen?: boolean;
  /** Whether it is open, when you control it. */
  open?: boolean;
  /** Called with the new state. */
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <li data-slot="sidebar-sub" className={className}>
      <Collapsible.Root defaultOpen={defaultOpen ?? active} open={open} onOpenChange={onOpenChange}>
        <Collapsible.Trigger
          className={cn(
            item,
            "group/sub data-panel-open:data-active:bg-transparent data-panel-open:data-active:font-normal",
          )}
          data-active={active || undefined}
          data-sidebar-row=""
        >
          {icon}
          <span data-sidebar-label className={label}>
            {title}
          </span>
          <span data-sidebar-label className="motion-fade shrink-0 text-fg-subtle">
            <CaretRightIcon weight="bold" className="group-data-panel-open/sub:rotate-90" />
          </span>
        </Collapsible.Trigger>
        <Collapsible.Panel data-sidebar-hide className="motion-fade">
          <ul className="ml-[calc(var(--qui-item-h)/2)] flex flex-col gap-0.5 border-l border-border pl-2">
            {children}
          </ul>
        </Collapsible.Panel>
      </Collapsible.Root>
    </li>
  );
}

/** A placeholder row while the items load, the same height as a real one. */
export function SidebarItemSkeleton({ className, ...props }: ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-item-skeleton"
      aria-hidden
      className={cn(
        "flex h-(--qui-item-h) items-center gap-2 px-[calc((var(--qui-item-h)-1rem)/2)] text-(length:--qui-text)",
        className,
      )}
      {...props}
    >
      <Skeleton className="size-4 shrink-0" />
      <SkeletonText data-sidebar-label className="motion-fade flex-1" />
    </li>
  );
}
