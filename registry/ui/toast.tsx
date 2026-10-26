"use client";

import { Toast as BaseToast } from "@base-ui/react/toast";
import { CheckCircleIcon, CircleNotchIcon, InfoIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react/ssr";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn } from "@/registry/lib/cn";
import { Button } from "@/registry/ui/button";

type ToastType = "default" | "success" | "error" | "info" | "loading" | "progress";
type ToastOptions = {
  description?: ReactNode;
  /** Milliseconds before it closes on its own; 0 keeps it until dismissed. Defaults to 5000. */
  timeout?: number;
  /** An inline action, e.g. Undo. Clicking it also closes the toast. */
  action?: { label: ReactNode; onClick: () => void };
  /** `high` announces it to screen readers straight away, for errors that need attention. */
  priority?: "low" | "high";
  /** Runs once the toast has closed, however it closed. */
  onClose?: () => void;
};
type Progress = { value: number; detail?: ReactNode };

// One manager for the whole app, so `toast()` works from anywhere, even outside React.
const manager = BaseToast.createToastManager();

// An action is a quick reversal: running it also closes the toast it belongs to.
function actionProps(action: ToastOptions["action"], id: () => string) {
  if (!action) return undefined;
  return {
    children: action.label,
    onClick: () => {
      action.onClick();
      manager.close(id());
    },
  };
}

function add(type: ToastType, title: ReactNode, options: ToastOptions = {}, data?: Progress) {
  const { action, ...rest } = options;
  let id = "";
  id = manager.add({
    title,
    type,
    // Errors wait for the user: an error that disappears unread is worse than one that stays.
    timeout: rest.timeout ?? (type === "error" ? 8000 : type === "loading" || type === "progress" ? 0 : undefined),
    priority: rest.priority ?? (type === "error" ? "high" : "low"),
    description: rest.description,
    onClose: rest.onClose,
    data,
    actionProps: actionProps(action, () => id),
  });
  return id;
}

/** Changes a toast in place, e.g. a loading toast that finished. */
function update(id: string, title: ReactNode, options: ToastOptions & { type?: ToastType } = {}) {
  const { action, type } = options;
  manager.update(id, {
    title,
    type,
    description: options.description,
    timeout: options.timeout ?? (type === "loading" ? 0 : type === "error" ? 8000 : 5000),
    priority: options.priority ?? (type === "error" ? "high" : undefined),
    // Only set when given, so updating a toast keeps its action unless it is replaced.
    ...("action" in options && { actionProps: actionProps(action, () => id) }),
  });
}

/**
 * Shows a toast and returns its id. `toast.success`, `.error`, `.info` and `.loading` set the
 * icon and sensible timing; `toast.promise` turns a loading toast into success or error.
 */
export const toast = Object.assign((title: ReactNode, options?: ToastOptions) => add("default", title, options), {
  success: (title: ReactNode, options?: ToastOptions) => add("success", title, options),
  error: (title: ReactNode, options?: ToastOptions) => add("error", title, options),
  info: (title: ReactNode, options?: ToastOptions) => add("info", title, options),
  loading: (title: ReactNode, options?: ToastOptions) => add("loading", title, options),
  update,
  /**
   * A toast with a progress bar that stays until it finishes. `value` runs from 0 to 1; `detail` is
   * the small line under the title, e.g. "5 of 12 files", and defaults to the percentage.
   */
  progress: (title: ReactNode, options: Omit<ToastOptions, "timeout"> & Partial<Progress> = {}) => {
    const { value = 0, detail, ...rest } = options;
    const id = add("progress", title, rest, { value, detail });
    // Finishing drops the bar and the action (often Cancel), and starts the normal timer.
    const finish = (type: "success" | "error") => (title: ReactNode, opts?: ToastOptions) =>
      update(id, title, { ...opts, type, action: opts?.action });
    return {
      id,
      update: (value: number, detail?: ReactNode) => manager.update(id, { data: { value, detail } }),
      success: finish("success"),
      error: finish("error"),
      dismiss: () => manager.close(id),
    };
  },
  dismiss: (id?: string) => manager.close(id),
  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: ReactNode; success: ReactNode | ((value: T) => ReactNode); error: ReactNode | ((error: unknown) => ReactNode) },
  ) =>
    manager.promise(promise, {
      loading: { title: messages.loading, type: "loading" },
      success: (value: T) => ({
        title: typeof messages.success === "function" ? messages.success(value) : messages.success,
        type: "success",
      }),
      error: (error: unknown) => ({
        title: typeof messages.error === "function" ? messages.error(error) : messages.error,
        type: "error",
        priority: "high",
      }),
    }),
});

/** Wrap the app once. `limit` is how many toasts show before the oldest hide; defaults to 3. */
export function ToastProvider({ children, limit = 3, ...props }: ComponentProps<typeof BaseToast.Provider>) {
  return (
    <BaseToast.Provider toastManager={manager} limit={limit} {...props}>
      {children}
    </BaseToast.Provider>
  );
}

type Position = "bottom-right" | "bottom-left" | "bottom-center" | "top-right" | "top-left" | "top-center";

const positions: Record<Position, string> = {
  "bottom-right": "right-4 bottom-4",
  "bottom-left": "left-4 bottom-4",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
};

/** Where toasts appear. Place it once, inside ToastProvider. */
export function Toaster({
  position = "bottom-right",
  className,
}: {
  /** The corner or edge toasts stack from. Top positions stack downward. Defaults to bottom-right. */
  position?: Position;
  className?: string;
}) {
  const top = position.startsWith("top");
  return (
    <BaseToast.Portal>
      <BaseToast.Viewport
        data-slot="toaster"
        data-side={top ? "top" : "bottom"}
        className={cn(
          // --dir flips every offset, so top positions stack downward with the same rules.
          "group/toaster fixed z-50 w-[min(22rem,calc(100vw-2rem))] outline-none",
          top ? "[--dir:-1]" : "[--dir:1]",
          positions[position],
          className,
        )}
      >
        <ToastList />
      </BaseToast.Viewport>
    </BaseToast.Portal>
  );
}

function ToastList() {
  const { toasts } = BaseToast.useToastManager();
  return toasts.map((t) => <ToastItem key={t.id} toast={t} />);
}

const icons: Partial<Record<ToastType, ReactNode>> = {
  success: <CheckCircleIcon weight="fill" className="text-success" />,
  error: <WarningCircleIcon weight="fill" className="text-danger" />,
  info: <InfoIcon weight="fill" className="text-info" />,
  // motion-exception: a continuous spinner says "still working"; it has no start or end state.
  loading: <CircleNotchIcon className="animate-spin text-fg-muted" />,
};

function ToastItem({ toast: t }: { toast: BaseToast.Root.ToastObject }) {
  const icon = icons[t.type as ToastType];
  const progress = t.type === "progress" && t.data ? readProgress(t.data as Progress) : undefined;
  return (
    <BaseToast.Root
      toast={t}
      data-slot="toast"
      swipeDirection={["right", "down"]}
      className={cn(
        "motion-toast absolute inset-x-0 z-[calc(1000-var(--toast-index))] select-none rounded-float border border-border bg-surface text-fg shadow-float",
        "[--gap:0.625rem] [--peek:0.625rem]",
        // Bottom positions anchor to the bottom edge and stack upward; top positions mirror it.
        "bottom-0 origin-bottom group-data-[side=top]/toaster:top-0 group-data-[side=top]/toaster:bottom-auto group-data-[side=top]/toaster:origin-top",
        // Collapsed: a deck. Each toast behind sits a little higher and smaller, at the height of
        // the front one, so the stack reads as neat paper edges.
        "[--y:calc(var(--toast-index)*var(--peek)*-1*var(--dir))] [--s:calc(1-var(--toast-index)*0.05)] h-(--toast-frontmost-height)",
        "[--drift:0px] [transform:translateX(var(--toast-swipe-movement-x,0px))_translateY(calc(var(--y)+var(--drift)+var(--toast-swipe-movement-y,0px)))_scale(var(--s))]",
        // Expanded on hover or focus: a full list with its natural heights.
        "data-[expanded]:h-(--toast-height) data-[expanded]:[--s:1] data-[expanded]:[--y:calc((var(--toast-offset-y)+var(--toast-index)*var(--gap))*-1*var(--dir))]",
        // A strip in each gap keeps the pointer "on" the stack, so it does not collapse in between.
        "after:absolute after:inset-x-0 after:top-full after:h-(--gap) group-data-[side=top]/toaster:after:top-auto group-data-[side=top]/toaster:after:bottom-full",
        // In from the edge. Closed, it sinks back and shrinks a little, like it is put away; the
        // stack keeps its place, so an expanded toast leaves from where it is.
        "data-[starting-style]:[--y:calc(110%*var(--dir))] data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0 data-[ending-style]:not-data-[swipe-direction]:[--drift:calc(8px*var(--dir))] data-[ending-style]:not-data-[swipe-direction]:scale-[0.96]",
        // Swiped, it carries on in the swipe's direction instead.
        "data-[ending-style]:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+110%))_translateY(var(--y))_scale(var(--s))]",
        "data-[ending-style]:data-[swipe-direction=down]:[--drift:110%]",
        "data-[limited]:opacity-0",
      )}
    >
      {/* Toasts behind the front one hide their text, so the deck reads as clean edges. */}
      <BaseToast.Content className="group/toast flex h-full flex-wrap items-start gap-x-2.5 gap-y-2.5 overflow-hidden p-3 pr-8 motion-fade data-[behind]:not-data-[expanded]:opacity-0">
        {icon && (
          // Keyed by type, so a loading toast that resolves stamps its new icon in.
          <span key={t.type} data-toast-icon className="flex h-5 shrink-0 items-center [&_svg]:size-4">
            {icon}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <BaseToast.Title className="text-sm leading-5 font-medium" />
          {t.description && <BaseToast.Description className="text-sm leading-5 text-fg-muted" />}
          {progress && <p className="nums truncate text-xs leading-4 text-fg-muted">{progress.detail ?? progress.percent}</p>}
        </div>
        {t.actionProps && <BaseToast.Action render={<Button size="sm" className="-my-0.5" />} />}
        {progress && <ToastProgressBar {...progress} />}
        <BaseToast.Close
          aria-label="Close"
          className="motion-control focus-ring absolute top-2.5 right-2.5 grid size-5 active:scale-90 place-items-center rounded-sm text-fg-subtle opacity-0 group-hover/toast:opacity-100 hover:bg-surface-hover hover:text-fg focus-visible:opacity-100 pointer-coarse:opacity-100 [&_svg]:size-3.5"
        >
          <XIcon />
        </BaseToast.Close>
      </BaseToast.Content>
    </BaseToast.Root>
  );
}

function readProgress({ value, detail }: Progress) {
  const fraction = Math.min(1, Math.max(0, value));
  return { fraction, detail, percent: `${Math.round(fraction * 100)}%` };
}

// Its own row under everything, so the bar is the same length with or without an action. The
// basis cancels the negative margin, which reaches into the close button gutter, so it always wraps.
function ToastProgressBar({ fraction, detail, percent }: ReturnType<typeof readProgress>) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fraction * 100)}
      aria-valuetext={typeof detail === "string" ? detail : percent}
      className="mb-0.5 -mr-5 h-1 basis-[calc(100%+1.25rem)] overflow-hidden rounded-full bg-surface-active"
    >
      {/* Slides rather than scales, so the rounded end keeps its shape at any value. */}
      <div
        data-toast-progress
        className="h-full rounded-full bg-primary [transform:translateX(calc((var(--value)-1)*100%))]"
        style={{ "--value": fraction } as CSSProperties}
      />
    </div>
  );
}
