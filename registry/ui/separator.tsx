import { Separator as BaseSeparator } from "@base-ui/react/separator";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/registry/lib/cn";

export type SeparatorProps = ComponentProps<typeof BaseSeparator> & {
  /**
   * Text on the line: centred for a choice like "or", at the start for a small section title.
   * A labelled separator is always horizontal.
   */
  label?: ReactNode;
  /** Where the label sits. Defaults to center. */
  align?: "center" | "start";
};

/** A hairline between groups. Screen readers know it as a separator, not decoration. */
export function Separator({ orientation = "horizontal", label, align = "center", className, ...props }: SeparatorProps) {
  if (label) {
    return (
      <div
        data-slot="separator"
        className={cn(
          "flex items-center gap-3 text-xs text-fg-subtle",
          align === "start" && "font-medium tracking-wide",
          className,
        )}
      >
        {align === "center" && <BaseSeparator className="h-px flex-1 bg-border" {...props} />}
        <span className="shrink-0">{label}</span>
        <BaseSeparator className="h-px flex-1 bg-border" {...props} />
      </div>
    );
  }
  return (
    <BaseSeparator
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "w-px self-stretch",
        className,
      )}
      {...props}
    />
  );
}
