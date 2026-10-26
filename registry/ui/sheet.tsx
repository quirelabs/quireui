"use client";

import { Drawer } from "@base-ui/react/drawer";
import { XIcon } from "@phosphor-icons/react/ssr";
import { type CSSProperties, type ComponentProps, createContext, type ReactNode, use, useRef } from "react";
import { cn } from "@/registry/lib/cn";
import { CloseGuardBar, useCloseGuard } from "@/registry/ui/dialog";

type Side = "right" | "left" | "bottom";
const SideContext = createContext<Side>("right");

export type SheetProps = ComponentProps<typeof Drawer.Root> & {
  /** The edge it slides in from. Defaults to right. */
  side?: Side;
  /** Unsaved changes: closing asks first. Set it back to false after saving. */
  dirty?: boolean;
  /** The question asked before closing with unsaved changes. Defaults to "Discard unsaved changes?". */
  dirtyMessage?: ReactNode;
};

/** A panel from the edge of the screen. Swipe toward its edge to dismiss on touch. */
export function Sheet({
  side = "right",
  dirty = false,
  dirtyMessage = "Discard unsaved changes?",
  onOpenChange,
  ...props
}: SheetProps) {
  const { actionsRef, handleOpenChange, guard, GuardProvider } = useCloseGuard<Drawer.Root.ChangeEventDetails>({
    dirty,
    message: dirtyMessage,
    onOpenChange,
  });
  return (
    <GuardProvider value={guard}>
      <SideContext value={side}>
        <Drawer.Root swipeDirection={side === "bottom" ? "down" : side} actionsRef={actionsRef} onOpenChange={handleOpenChange} {...props} />
      </SideContext>
    </GuardProvider>
  );
}

export const SheetTrigger = Drawer.Trigger;
export const SheetClose = Drawer.Close;

const layout: Record<Side, { viewport: string; popup: string; hidden: string }> = {
  right: { viewport: "justify-end", popup: "h-full w-[min(28rem,100vw)] border-l", hidden: "translateX(100%)" },
  left: { viewport: "justify-start", popup: "h-full w-[min(28rem,100vw)] border-r", hidden: "translateX(-100%)" },
  bottom: { viewport: "items-end", popup: "max-h-[85dvh] w-full rounded-t-float border-t", hidden: "translateY(100%)" },
};

export function SheetContent({
  className,
  children,
  showClose = true,
  onKeyDown,
  ...props
}: ComponentProps<typeof Drawer.Popup> & {
  /** Shows the close button in the corner. Defaults to true. */
  showClose?: boolean;
}) {
  const side = use(SideContext);
  const l = layout[side];
  const popupRef = useRef<HTMLDivElement>(null);
  return (
    <Drawer.Portal>
      <Drawer.Backdrop className="motion-fade fixed inset-0 bg-backdrop" />
      <Drawer.Viewport className={cn("fixed inset-0 flex", l.viewport)}>
        <Drawer.Popup
          ref={popupRef}
          data-slot="sheet"
          data-side={side}
          // Like Dialog: start on the first field. On touch keep Base UI's default, so the
          // on-screen keyboard does not jump up the moment the sheet opens.
          initialFocus={(type) =>
            type === "touch" ? true : (popupRef.current?.querySelector<HTMLElement>("input, textarea, select") ?? true)
          }
          onKeyDown={(event) => {
            // Cmd/Ctrl+Enter submits a SheetForm from any field, the same as Dialog.
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              const form = event.currentTarget.querySelector("form");
              if (form) {
                event.preventDefault();
                form.requestSubmit();
              }
            }
            onKeyDown?.(event);
          }}
          style={{ "--qui-sheet-hidden": l.hidden } as CSSProperties}
          className={cn(
            "motion-sheet relative flex flex-col overflow-hidden border-border bg-surface text-fg shadow-float outline-none",
            l.popup,
            className,
          )}
          {...props}
        >
          {side === "bottom" && (
            // Grab handle: shows the sheet can be swiped down.
            <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-strong" />
          )}
          <Drawer.Content className="flex min-h-0 flex-1 flex-col">{children}</Drawer.Content>
          <CloseGuardBar />
          {showClose && (
            <Drawer.Close
              aria-label="Close"
              className="motion-control focus-ring absolute top-3 right-3 grid size-7 place-items-center rounded-md text-fg-muted hover:bg-surface-hover hover:text-fg"
            >
              <XIcon className="size-4" />
            </Drawer.Close>
          )}
        </Drawer.Popup>
      </Drawer.Viewport>
    </Drawer.Portal>
  );
}

export { DialogBody as SheetBody, DialogFooter as SheetFooter, DialogForm as SheetForm, DialogHeader as SheetHeader } from "@/registry/ui/dialog";

export function SheetTitle({ className, ...props }: ComponentProps<typeof Drawer.Title>) {
  return <Drawer.Title className={cn("text-base font-semibold", className)} {...props} />;
}

export function SheetDescription({ className, ...props }: ComponentProps<typeof Drawer.Description>) {
  return <Drawer.Description className={cn("text-sm text-fg-muted", className)} {...props} />;
}
