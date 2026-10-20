"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react/ssr";
import { type ComponentProps, createContext, type ReactNode, use, useRef, useState } from "react";
import { cn } from "@/registry/lib/cn";
import { Button } from "@/registry/ui/button";
import { Form } from "@/registry/ui/form";
import { ScrollArea } from "@/registry/ui/scroll-area";

/* Close guard: shared by Dialog and Sheet. */

type GuardDetails = { reason: string; cancel: () => void };
type Guard = { prompting: boolean; message: ReactNode; keep: () => void; discard: () => void };

const GuardContext = createContext<Guard | null>(null);

/**
 * While `dirty`, closing (Esc, outside click, close button) is held back and the
 * CloseGuardBar asks first. "Discard" closes through actionsRef, which the guard lets through.
 */
export function useCloseGuard<D extends GuardDetails>({
  dirty,
  message,
  onOpenChange,
}: {
  dirty: boolean;
  message: ReactNode;
  onOpenChange?: (open: boolean, details: D) => void;
}) {
  const actionsRef = useRef<{ close: () => void; unmount: () => void } | null>(null);
  const [prompting, setPrompting] = useState(false);

  const handleOpenChange = (open: boolean, details: D) => {
    if (!open && dirty && details.reason !== "imperative-action") {
      details.cancel();
      // Esc while the question is showing means "keep editing".
      setPrompting((asking) => !(asking && details.reason === "escape-key"));
      return;
    }
    setPrompting(false);
    onOpenChange?.(open, details);
  };

  const guard: Guard = {
    prompting,
    message,
    keep: () => setPrompting(false),
    discard: () => {
      setPrompting(false);
      actionsRef.current?.close();
    },
  };
  return { actionsRef, handleOpenChange, guard, GuardProvider: GuardContext };
}

/** The "Discard unsaved changes?" bar. Rendered by DialogContent and SheetContent. */
export function CloseGuardBar() {
  const guard = use(GuardContext);
  if (!guard?.prompting) return null;
  return (
    <div
      role="alert"
      className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 border-t border-border bg-surface px-5 py-3 text-sm transition-[opacity,translate] duration-(--uil-duration-fast) ease-(--uil-ease-out) starting:translate-y-2 starting:opacity-0"
    >
      <span className="mr-auto font-medium">{guard.message}</span>
      {/* biome-ignore lint/a11y/noAutofocus: the question needs focus so Enter keeps editing, never discards */}
      <Button size="sm" variant="ghost" autoFocus onClick={guard.keep}>
        Keep editing
      </Button>
      <Button size="sm" variant="danger" onClick={guard.discard}>
        Discard
      </Button>
    </div>
  );
}

/* Dialog */

export type DialogProps = ComponentProps<typeof BaseDialog.Root> & {
  /** Unsaved changes: closing asks first. Set it back to false after saving. */
  dirty?: boolean;
  dirtyMessage?: ReactNode;
};

export function Dialog({ dirty = false, dirtyMessage = "Discard unsaved changes?", onOpenChange, ...props }: DialogProps) {
  const { actionsRef, handleOpenChange, guard, GuardProvider } = useCloseGuard<BaseDialog.Root.ChangeEventDetails>({
    dirty,
    message: dirtyMessage,
    onOpenChange,
  });
  return (
    <GuardProvider value={guard}>
      <BaseDialog.Root actionsRef={actionsRef} onOpenChange={handleOpenChange} {...props} />
    </GuardProvider>
  );
}

export const DialogTrigger = BaseDialog.Trigger;
export const DialogClose = BaseDialog.Close;

const sizes = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-3xl",
  full: "h-[calc(100dvh-2rem)] max-h-none max-w-[calc(100vw-2rem)]",
} as const;

export function DialogContent({
  className,
  children,
  size = "md",
  showClose = true,
  onKeyDown,
  ...props
}: ComponentProps<typeof BaseDialog.Popup> & { size?: keyof typeof sizes; showClose?: boolean }) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="motion-fade fixed inset-0 bg-backdrop" />
      <BaseDialog.Viewport className="fixed inset-0 grid place-items-center p-4">
        <BaseDialog.Popup
          data-slot="dialog"
          onKeyDown={(event) => {
            // Cmd/Ctrl+Enter submits the dialog's form from any field, textareas included.
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              const form = event.currentTarget.querySelector("form");
              if (form) {
                event.preventDefault();
                form.requestSubmit();
              }
            }
            onKeyDown?.(event);
          }}
          className={cn(
            "motion-dialog relative flex max-h-[min(85dvh,48rem)] w-full flex-col overflow-hidden rounded-float border border-border bg-surface text-fg shadow-float outline-none",
            // A dialog opened on top pushes this one back a step.
            "[scale:calc(1-0.04*var(--nested-dialogs,0))] [translate:0_calc(-0.75rem*var(--nested-dialogs,0))]",
            "after:pointer-events-none after:absolute after:inset-0 after:bg-fg/5 after:opacity-0 after:transition-opacity after:duration-(--uil-duration-base) data-[nested-dialog-open]:after:opacity-100",
            sizes[size],
            className,
          )}
          {...props}
        >
          {children}
          <CloseGuardBar />
          {showClose && (
            <BaseDialog.Close
              aria-label="Close"
              className="motion-control focus-ring absolute top-3 right-3 grid size-7 place-items-center rounded-md text-fg-muted hover:bg-surface-hover hover:text-fg"
            >
              <XIcon className="size-4" />
            </BaseDialog.Close>
          )}
        </BaseDialog.Popup>
      </BaseDialog.Viewport>
    </BaseDialog.Portal>
  );
}

/** Wrap header, body and footer to submit with the footer button or Cmd/Ctrl+Enter. */
export function DialogForm({ className, ...props }: ComponentProps<typeof Form>) {
  return <Form className={cn("flex min-h-0 flex-1 flex-col gap-0", className)} {...props} />;
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex shrink-0 flex-col gap-1 px-5 pt-5 pb-3 pr-12", className)} {...props} />;
}

/** The only part that scrolls, so the title and the buttons stay in view. */
export function DialogBody({ className, ...props }: ComponentProps<typeof ScrollArea>) {
  return <ScrollArea className="flex-1" contentClassName={cn("px-5 py-2", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex shrink-0 justify-end gap-2 px-5 pt-3 pb-5", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof BaseDialog.Title>) {
  return <BaseDialog.Title className={cn("text-base font-semibold", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof BaseDialog.Description>) {
  return <BaseDialog.Description className={cn("text-sm text-fg-muted", className)} {...props} />;
}
