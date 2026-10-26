"use client";

import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { UserIcon } from "@phosphor-icons/react/ssr";
import {
  Children,
  type ComponentProps,
  type CSSProperties,
  createContext,
  isValidElement,
  type ReactElement,
  Fragment,
  use,
  useEffect,
  useState,
} from "react";
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
  /** Who it is. Used for the initials, the colour and the accessible name. Leave it out for an
   * empty slot, like an unassigned task: a dashed outline with a person icon. */
  name?: string;
  /** A photo or logo. Until it loads (or if it fails) the initials show instead. */
  src?: string;
  size?: Size;
  /** `circle` for people, `square` for companies and teams. Defaults to circle. */
  shape?: "circle" | "square";
  /** A presence dot in the corner. */
  status?: Status;
  /** Tint the initials with a colour picked from the name. Defaults to true. */
  colored?: boolean;
  /** Something waiting for them: a number shows a count, `true` an unread dot. */
  badge?: number | boolean;
};

export function Avatar({
  name,
  src,
  size,
  shape = "circle",
  status,
  colored = true,
  badge,
  className,
  style,
  ...props
}: AvatarProps) {
  const group = use(GroupContext);
  const resolved = size ?? group.size ?? "md";
  const count = typeof badge === "number" && badge > 0 ? badge : 0;
  const label = [
    name ?? "Unassigned",
    status,
    count ? `${count} ${count === 1 ? "notification" : "notifications"}` : badge === true && "unread",
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <BaseAvatar.Root
      data-slot="avatar"
      role="img"
      aria-label={label}
      style={(state) => ({
        "--avatar-hue": hueOf(name ?? ""),
        ...(typeof style === "function" ? style(state) : style),
      }) as CSSProperties}
      className={cn(
        "motion-notify-host relative inline-grid size-(--avatar-size) shrink-0 place-items-center font-semibold select-none",
        shape === "circle" ? "rounded-full" : "rounded-[28%]",
        !name
          ? "border border-dashed border-border-strong text-fg-subtle"
          : colored
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
      <BaseAvatar.Fallback
        aria-hidden
        delay={src ? 500 : undefined}
        className="col-start-1 row-start-1 leading-none [&_svg]:size-[calc(var(--avatar-size)*0.5)]"
      >
        {name ? initialsOf(name) : <UserIcon />}
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
      <NotificationBadge count={count} dot={badge === true} square={shape === "square"} />
    </BaseAvatar.Root>
  );
}

const countLabel = (n: number) => (n > 99 ? "99+" : String(n));

/**
 * The notification badge. A real arrival is a short, choreographed moment: the avatar dips as if
 * something landed, the badge squeezes out like a drop of liquid while two droplets fall back in
 * behind it, it lands with a small splash and a ripple, then the number pops in and a sheen
 * passes over. A count going up makes the badge gulp and the number roll. Badges that are
 * already there when the page loads just sit still.
 */
function NotificationBadge({ count, dot, square }: { count: number; dot: boolean; square: boolean }) {
  const visible = count > 0 || dot;
  const [mounted, setMounted] = useState(visible);
  const [leaving, setLeaving] = useState(false);
  const [shown, setShown] = useState(count);
  const [prev, setPrev] = useState<number | null>(null);
  // Counts arrivals since mount; each one replays the effects. `fresh` marks a new badge rather
  // than a count going up on one that was already there.
  const [arrival, setArrival] = useState(0);
  const [fresh, setFresh] = useState(false);
  const [settled, setSettled] = useState(0);

  // Follow the props during render, so every effect starts in the same frame as the change.
  if (visible && !mounted) {
    setMounted(true);
    setArrival((a) => a + 1);
    setFresh(true);
  }
  if (visible && leaving) setLeaving(false);
  if (!visible && mounted && !leaving) setLeaving(true);
  if (count > 0 && count !== shown) {
    setPrev(shown > 0 ? shown : null);
    setShown(count);
    if (count > shown && shown > 0) {
      setArrival((a) => a + 1);
      setFresh(false);
    }
  }

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => {
      setMounted(false);
      setLeaving(false);
    }, 140);
    return () => clearTimeout(timer);
  }, [leaving]);
  useEffect(() => {
    if (prev === null) return;
    const timer = setTimeout(() => setPrev(null), 260);
    return () => clearTimeout(timer);
  }, [prev]);
  useEffect(() => {
    if (arrival === settled) return;
    const timer = setTimeout(() => setSettled(arrival), 800);
    return () => clearTimeout(timer);
  }, [arrival, settled]);

  if (!mounted) return null;
  const isCount = !dot && shown > 0;
  const dir = prev !== null && shown < prev ? "down" : "up";
  const arriving = arrival !== settled;
  return (
    <span
      aria-hidden
      data-notify
      data-arrive={(arriving && fresh) || undefined}
      data-arriving={arriving || undefined}
      data-leaving={leaving || undefined}
      // The resting offset lives in --bx/--by, so the arrival can start from inside the avatar.
      className={cn(
        "motion-notify absolute top-0 right-0 grid translate-x-(--bx) translate-y-(--by) [--bx:0%] [--by:0%]",
        isCount ? "[--bx:30%] [--by:-30%]" : square && "[--bx:15%] [--by:-15%]",
      )}
    >
      {arriving && (
        <Fragment key={`effects-${arrival}`}>
          <span data-halo className="absolute inset-0 rounded-full bg-danger" />
          {fresh && <span data-trail="1" className="absolute inset-[18%] rounded-full bg-danger" />}
          {fresh && <span data-trail="2" className="absolute inset-[32%] rounded-full bg-danger" />}
          {splash.map((direction) => (
            <span
              key={direction}
              data-splash
              className={cn("absolute top-[calc(50%-1.5px)] left-[calc(50%-1.5px)] size-[3px] rounded-full bg-danger", direction)}
            />
          ))}
        </Fragment>
      )}
      <span
        key={`drop-${arrival}`}
        data-drop
        data-gulp={(arriving && !fresh) || undefined}
        className={cn(
          "relative grid place-items-center overflow-hidden rounded-full bg-danger font-semibold text-danger-fg ring-2 ring-(--avatar-ring,var(--qui-surface))",
          isCount
            ? "h-[max(0.875rem,calc(var(--avatar-size)*0.42))] min-w-[max(0.875rem,calc(var(--avatar-size)*0.42))] px-[0.3em] text-[max(0.5625rem,calc(var(--avatar-size)*0.26))] leading-none"
            : "size-[max(0.375rem,calc(var(--avatar-size)*0.28))]",
        )}
      >
        {arriving && (
          <span
            data-sheen
            className="pointer-events-none absolute inset-y-0 -left-full w-full bg-linear-to-r from-transparent via-white/40 to-transparent"
          />
        )}
        {isCount && (
          <span className="relative grid">
            {prev !== null && (
              <span data-roll="out" data-dir={dir} className="col-start-1 row-start-1 text-center">
                {countLabel(prev)}
              </span>
            )}
            <span
              key={shown}
              data-roll={arriving && fresh ? "pop" : prev !== null ? "in" : undefined}
              data-dir={dir}
              className="col-start-1 row-start-1 text-center"
            >
              {countLabel(shown)}
            </span>
          </span>
        )}
      </span>
    </span>
  );
}

// Where the four splash droplets fly, relative to the avatar's size.
const splash = [
  "[--sx:calc(var(--avatar-size)*-0.32)] [--sy:calc(var(--avatar-size)*-0.18)]",
  "[--sx:calc(var(--avatar-size)*0.3)] [--sy:calc(var(--avatar-size)*-0.26)]",
  "[--sx:calc(var(--avatar-size)*0.34)] [--sy:calc(var(--avatar-size)*0.16)]",
  "[--sx:calc(var(--avatar-size)*-0.06)] [--sy:calc(var(--avatar-size)*-0.38)]",
];

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
  const names = hidden.map((item) => item.props.name ?? "Unassigned");

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
            <TooltipContent>{item.props.name ?? "Unassigned"}</TooltipContent>
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
