"use client";

import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import { type ComponentProps, createContext, type RefObject, use, useRef } from "react";
import { cn } from "@/registry/lib/cn";
import { Button } from "@/registry/ui/button";

/**
 * For irreversible actions. Focus starts on Cancel, so Enter never confirms by accident,
 * and it doesn't close on an outside click: it needs a deliberate answer.
 */
export const AlertDialog = BaseAlertDialog.Root;
export const AlertDialogTrigger = BaseAlertDialog.Trigger;

const CancelRef = createContext<RefObject<HTMLButtonElement | null> | null>(null);

export function AlertDialogContent({ className, children, ...props }: ComponentProps<typeof BaseAlertDialog.Popup>) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <BaseAlertDialog.Portal>
      <BaseAlertDialog.Backdrop className="motion-fade fixed inset-0 bg-backdrop" />
      <BaseAlertDialog.Viewport className="fixed inset-0 grid place-items-center p-4">
        <BaseAlertDialog.Popup
          data-slot="alert-dialog"
          initialFocus={cancelRef}
          className={cn(
            "motion-dialog flex w-full max-w-sm flex-col gap-2 rounded-float border border-border bg-surface p-5 text-fg shadow-float outline-none",
            className,
          )}
          {...props}
        >
          <CancelRef value={cancelRef}>{children}</CancelRef>
        </BaseAlertDialog.Popup>
      </BaseAlertDialog.Viewport>
    </BaseAlertDialog.Portal>
  );
}

export function AlertDialogTitle({ className, ...props }: ComponentProps<typeof BaseAlertDialog.Title>) {
  return <BaseAlertDialog.Title className={cn("text-base font-semibold", className)} {...props} />;
}

export function AlertDialogDescription({ className, ...props }: ComponentProps<typeof BaseAlertDialog.Description>) {
  return <BaseAlertDialog.Description className={cn("text-sm text-fg-muted", className)} {...props} />;
}

export function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-4 flex justify-end gap-2", className)} {...props} />;
}

export function AlertDialogCancel({ children = "Cancel", ...props }: ComponentProps<typeof Button>) {
  const ref = use(CancelRef);
  return <BaseAlertDialog.Close ref={ref} render={<Button variant="ghost" {...props} />}>{children}</BaseAlertDialog.Close>;
}

/** Runs onClick, then closes. Danger by default, since that is what alert dialogs are for. */
export function AlertDialogAction({ variant = "danger", ...props }: ComponentProps<typeof Button>) {
  return <BaseAlertDialog.Close render={<Button variant={variant} {...props} />} />;
}
