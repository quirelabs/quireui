"use client";

import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { Children, type ComponentProps, type CSSProperties, createContext, isValidElement, type ReactElement, use } from "react";
import { cn } from "@/registry/lib/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/ui/tooltip";

const sizes = {
  xs: "[--avatar-size:1.25rem] text-[0.5625rem]",
  sm: "[--avatar-size:1.5rem] text-[0.625rem]",
  md: "[--avatar-size:2rem] text-xs",
  lg: "[--avatar-size:2.5rem] text-sm",
  xl: "[--avatar-size:3.5rem] text-lg",
} as const;

type Size = keyof typeof sizes;
type Status = "online" | "away" | "busy" | "offline";

const statuses: Record<Status, string> = {
  online: "bg-success",
  away: "bg-warning",
  busy: "bg-danger",
  offline: "bg-fg-subtle",
};

// A group sets one size for everything in it.
const GroupContext = createContext<{ size?: Size; inGroup: boolean }>({ inGroup: false });

/** "Ada Okafor" → "AO", "Hooli" → "H". */
function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// The same name always gets the same hue, so a person is recognisable by colour across the app.
function hueOf(name: string) {
  let hash = 7;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

export type AvatarProps = Omit<ComponentProps<typeof BaseAvatar.Root>, "children"> & {
  /** Who it is. Used for the initials, the colour and the accessible name. */
  name: string;
  /** A photo or logo. Until it loads (or if it fails) the initials show instead. */
  src?: string;
  size?: Size;
  /** `circle` for people, `square` for companies and teams. Defaults to circle. */
  shape?: "circle" | "square";
  /** A presence dot in the corner. */
  status?: Status;
  /** Tint the initials with a colour picked from the name. Defaults to true. */
  colored?: boolean;
};

export function Avatar({
  name,
  src,
  size,
  shape = "circle",
  status,
  colored = true,
  className,
  style,
  ...props
}: AvatarProps) {
  const group = use(GroupContext);
  const resolved = size ?? group.size ?? "md";
  return (
    <BaseAvatar.Root
      data-slot="avatar"
      role="img"
      aria-label={status ? `${name}, ${status}` : name}
      style={(state) => ({
        "--avatar-hue": hueOf(name),
        ...(typeof style === "function" ? style(state) : style),
      }) as CSSProperties}
      className={cn(
        "relative inline-grid size-(--avatar-size) shrink-0 place-items-center font-semibold select-none",
        shape === "circle" ? "rounded-full" : "rounded-[28%]",
        colored
          ? "bg-[color-mix(in_oklab,oklch(62%_0.11_var(--avatar-hue))_20%,var(--qui-surface))] text-[color-mix(in_oklab,oklch(50%_0.12_var(--avatar-hue))_72%,var(--qui-fg))]"
          : "bg-surface-hover text-fg-muted",
        // In a stack, a ring in the background colour keeps each face separate. Set --avatar-ring
        // when the stack sits on something other than the surface.
        group.inGroup && "ring-2 ring-(--avatar-ring,var(--qui-surface))",
        sizes[resolved],
        className,
      )}
      {...props}
    >
      {src && (
        <BaseAvatar.Image
          src={src}
          alt=""
          className="motion-fade col-start-1 row-start-1 size-full rounded-[inherit] object-cover starting:opacity-0"
        />
      )}
      {/* With a photo, wait a moment before showing initials, so a fast load never flashes them. */}
      <BaseAvatar.Fallback aria-hidden delay={src ? 500 : undefined} className="col-start-1 row-start-1 leading-none">
        {initialsOf(name)}
      </BaseAvatar.Fallback>
      {status && (
        <span
          aria-hidden
          className={cn(
            "absolute right-0 bottom-0 size-[max(0.375rem,calc(var(--avatar-size)*0.28))] rounded-full ring-2 ring-(--avatar-ring,var(--qui-surface))",
            shape === "square" && "translate-x-[15%] translate-y-[15%]",
            statuses[status],
          )}
        />
      )}
    </BaseAvatar.Root>
  );
}

export type AvatarGroupProps = ComponentProps<"div"> & {
  /** How many to show before the rest fold into a "+N". Shows all by default. */
  max?: number;
  size?: Size;
};

/** A stack of overlapping avatars. Each shows its name on hover; "+N" lists the rest. */
export function AvatarGroup({ max, size = "md", className, children, ...props }: AvatarGroupProps) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<AvatarProps>[];
  const shown = max !== undefined && items.length > max ? items.slice(0, max - 1) : items;
  const hidden = items.slice(shown.length);
  const names = hidden.map((item) => item.props.name);

  return (
    <GroupContext value={{ size, inGroup: true }}>
      <div
        data-slot="avatar-group"
        className={cn(
          "flex items-center [&>*:not(:first-child)]:-ml-[calc(var(--avatar-size)*0.2)]",
          sizes[size],
          className,
        )}
        {...props}
      >
        {shown.map((item) => (
          <Tooltip key={item.key ?? item.props.name}>
            {/* Lifts above its neighbours on hover, so the whole face is visible. */}
            <TooltipTrigger render={<span className="motion-control relative rounded-full hover:z-10 hover:-translate-y-0.5" />}>
              {item}
            </TooltipTrigger>
            <TooltipContent>{item.props.name}</TooltipContent>
          </Tooltip>
        ))}
        {hidden.length > 0 && (
          <Tooltip>
            <TooltipTrigger
              render={
                // Focusable, so keyboard users can read who is folded away too.
                // biome-ignore lint/a11y/noNoninteractiveTabindex: the tooltip holds the hidden names
                <span tabIndex={0} aria-label={`and ${hidden.length} more: ${names.join(", ")}`} />
              }
              className="focus-ring relative inline-grid size-(--avatar-size) place-items-center rounded-full bg-surface-hover font-semibold text-fg-muted ring-2 ring-(--avatar-ring,var(--qui-surface))"
            >
              +{hidden.length}
            </TooltipTrigger>
            <TooltipContent className="max-w-56">{names.join(", ")}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </GroupContext>
  );
}
