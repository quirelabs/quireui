"use client";

import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import {
  type ComponentProps,
  type CSSProperties,
  createContext,
  type ReactNode,
  type RefObject,
  use,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/registry/lib/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/ui/tooltip";

const sizes = {
  sm: "h-[calc(var(--qui-control-h)-0.5rem)] px-2 text-[calc(var(--qui-text)-0.0625rem)] [&_svg]:size-3.5 data-[icon]:w-[calc(var(--qui-control-h)-0.5rem)]",
  md: "h-[calc(var(--qui-control-h)-0.25rem)] px-2.5 text-(length:--qui-text) [&_svg]:size-4 data-[icon]:w-[calc(var(--qui-control-h)-0.25rem)]",
  lg: "h-[calc(var(--qui-control-h)+0.25rem)] px-3 text-(length:--qui-text) [&_svg]:size-4 data-[icon]:w-[calc(var(--qui-control-h)+0.25rem)]",
} as const;
type Size = keyof typeof sizes;
const SizeContext = createContext<Size>("md");
const ModeContext = createContext({ multiple: false, joined: false });

type Common = Omit<ComponentProps<typeof BaseToggleGroup>, "value" | "defaultValue" | "onValueChange" | "multiple"> & {
  /** Follows the density tokens. Defaults to md. */
  size?: Size;
};
type Single = Common & {
  multiple?: false;
  /** The chosen item, or the pressed items with `multiple`. */
  value?: string;
  /** The value to start with when it is not controlled. */
  defaultValue?: string;
  /** Called with the new value: the chosen item, or the pressed items with `multiple`. */
  onValueChange?: (value: string) => void;
};
type Multiple = Common & {
  /** Any number of items can be on, like Bold and Italic. */
  multiple: true;
  /**
   * Pressed neighbours join into one shape, for sets where adjacency means a range, like
   * weekdays. Leave it off for independent toggles like text styles. Defaults to false.
   */
  joined?: boolean;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
};
export type ToggleGroupProps = Single | Multiple;

/**
 * A segmented control: a few options side by side, one chosen, with a marker that slides to it.
 * With `multiple`, a row of independent toggles instead.
 */
export function ToggleGroup(props: ToggleGroupProps) {
  const { size = "md", className, children, ...rest } = props;
  const joined = props.multiple === true && props.joined === true;
  delete (rest as { joined?: boolean }).joined;
  const ref = useRef<HTMLDivElement>(null);
  const marker = useMarker(ref, !props.multiple);

  // Single choice is always one: pressing the chosen item again keeps it.
  const [inner, setInner] = useState<string[]>(() =>
    props.multiple ? (props.defaultValue ?? []) : props.defaultValue ? [props.defaultValue] : [],
  );
  const controlled = props.value !== undefined;
  const value = controlled ? (props.multiple ? props.value : [props.value as string]) : inner;

  return (
    <SizeContext value={size}>
      <ModeContext value={{ multiple: props.multiple ?? false, joined }}>
        <BaseToggleGroup
          {...(rest as ComponentProps<typeof BaseToggleGroup>)}
          ref={ref}
          data-slot="toggle-group"
          multiple={props.multiple ?? false}
          value={value}
          onValueChange={(next) => {
            const values = next as string[];
            if (!props.multiple && values.length === 0) return;
            if (!controlled) setInner(values);
            if (props.multiple) props.onValueChange?.(values);
            else props.onValueChange?.(values[0]);
          }}
          data-ready={marker.ready || undefined}
          style={marker.style}
          className={cn(
            "relative inline-flex w-fit items-center gap-0.5 rounded-control border border-border bg-surface-muted p-0.5",
            // Joined toggles sit edge to edge, so pressed neighbours can become one shape.
            joined && "gap-0",
            // Until the marker has measured itself, the pressed item draws its own chip.
            "[--pressed-bg:var(--qui-surface-raised)] [--pressed-ring:var(--qui-border)] data-[ready]:[--pressed-bg:transparent] data-[ready]:[--pressed-ring:transparent]",
            className,
          )}
        >
          {!props.multiple && (
            <span
              aria-hidden
              className={cn(
                "motion-indicator pointer-events-none absolute top-0 left-0 rounded-[calc(var(--radius-control)-0.125rem)] bg-surface-raised shadow-[0_0_0_1px_var(--qui-border)]",
                "h-(--marker-h) w-(--marker-w) translate-x-(--marker-x) translate-y-(--marker-y)",
                !marker.ready && "opacity-0",
              )}
            />
          )}
          {children}
        </BaseToggleGroup>
      </ModeContext>
    </SizeContext>
  );
}

/** Measures the pressed item and keeps the marker on it, through clicks, keys and resizes. */
function useMarker(ref: RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [box, setBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  useLayoutEffect(() => {
    const group = ref.current;
    if (!enabled || !group) return;
    const measure = () => {
      const pressed = group.querySelector<HTMLElement>("[data-pressed]");
      if (!pressed) return setBox(null);
      setBox({
        x: pressed.offsetLeft,
        y: pressed.offsetTop,
        w: pressed.offsetWidth,
        h: pressed.offsetHeight,
      });
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(group);
    const changes = new MutationObserver(measure);
    changes.observe(group, {
      attributes: true,
      attributeFilter: ["data-pressed"],
      subtree: true,
    });
    return () => {
      resize.disconnect();
      changes.disconnect();
    };
  }, [ref, enabled]);
  return {
    ready: box !== null,
    style: box
      ? ({
          "--marker-x": `${box.x}px`,
          "--marker-y": `${box.y}px`,
          "--marker-w": `${box.w}px`,
          "--marker-h": `${box.h}px`,
        } as CSSProperties)
      : undefined,
  };
}

export type ToggleGroupItemProps = Omit<ComponentProps<typeof BaseToggle>, "value"> & {
  /** The value this item stands for in the group. */
  value: string;
  /** For icon-only items: the tooltip and the accessible name. */
  label?: ReactNode;
};

export function ToggleGroupItem({ label, className, children, ...props }: ToggleGroupItemProps) {
  const size = use(SizeContext);
  const { multiple, joined } = use(ModeContext);
  const iconOnly = label !== undefined;
  const item = (
    <BaseToggle
      data-slot="toggle-group-item"
      data-icon={iconOnly || undefined}
      aria-label={iconOnly && typeof label === "string" ? label : undefined}
      className={cn(
        // Above the marker; the label colour follows it.
        "motion-control focus-ring relative z-[1] inline-flex shrink-0 cursor-default select-none items-center justify-center gap-1.5 rounded-[calc(var(--radius-control)-0.125rem)] whitespace-nowrap font-medium text-fg-muted",
        "hover:text-fg data-[pressed]:text-fg",
        // A chosen segment is raised out of the track; a toggle that is on is pressed in.
        multiple
          ? "data-[pressed]:bg-surface-active"
          : "data-[pressed]:bg-(--pressed-bg) data-[pressed]:shadow-[0_0_0_1px_var(--pressed-ring)]",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 [&_svg]:shrink-0",
        iconOnly && "px-0",
        // Joined: pressed neighbours share one shape, square where they meet, with a hairline between.
        joined &&
          "data-[pressed]:has-[+[data-pressed]]:rounded-r-none [[data-pressed]+&]:data-[pressed]:rounded-l-none [[data-pressed]+&]:data-[pressed]:shadow-[inset_1px_0_0_var(--qui-border-strong)]",
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </BaseToggle>
  );
  if (!iconOnly) return item;
  return (
    <Tooltip>
      <TooltipTrigger render={item} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
