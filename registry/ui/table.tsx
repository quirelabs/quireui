"use client";

import { useRender } from "@base-ui/react/use-render";
import { ArrowUpIcon } from "@phosphor-icons/react/ssr";
import { type ComponentProps, createContext, use } from "react";
import { cn } from "@/registry/lib/cn";
import { ScrollArea } from "@/registry/ui/scroll-area";

type Align = "start" | "end";

// Body cells draw the inset from the box edge as a border in the table's own colour and keep their
// highlight inside it. With a border on one side only, separate horizontal and vertical radii keep
// the inner corner round.
const inset = cn(
  "border-(--table-bg) bg-clip-padding first:border-l-[0.375rem] last:border-r-[0.375rem]",
  "first:[border-bottom-left-radius:calc(var(--radius-control)+0.375rem)_var(--radius-control)] first:[border-top-left-radius:calc(var(--radius-control)+0.375rem)_var(--radius-control)]",
  "last:[border-bottom-right-radius:calc(var(--radius-control)+0.375rem)_var(--radius-control)] last:[border-top-right-radius:calc(var(--radius-control)+0.375rem)_var(--radius-control)]",
);

// Cells that sit on top of others (the header, the footer, a sticky column) are solid, square boxes
// in the table's colour that draw their band, hairline or highlight inside, on ::before. A rounded
// cell would let the rows scrolling beneath it show through its corners.
const solid = cn(
  "border-(--table-bg) bg-(--table-bg) first:border-l-[0.375rem] last:border-r-[0.375rem]",
  // Each band reaches a pixel under its neighbours, so fractional screen scales never leave a seam.
  "before:absolute before:inset-0 before:-z-10 not-first:before:-left-px not-last:before:-right-px",
);
const roundEnds = "first:before:rounded-l-control last:before:rounded-r-control";

const SectionContext = createContext<"body" | "footer">("body");

export type TableProps = ComponentProps<"table"> & {
  /** `card` sits in a bordered, rounded box; `plain` drops the box for tables inside a card. Defaults to card. */
  variant?: "card" | "plain";
  /** Classes for the box around the table, e.g. a max height so it scrolls and the header sticks. */
  containerClassName?: string;
};

/**
 * Rows of data with a sticky header and footer, inset highlights and soft scroll edges.
 * @cssvar --table-bg The table's background, which its sticky parts and insets are drawn in. Set it when the table sits on something other than the surface.
 */
export function Table({ variant = "card", className, containerClassName, ...props }: TableProps) {
  return (
    <ScrollArea
      data-slot="table"
      orientation="both"
      // The table draws its own edges: shadows under the sticky header, footer and column.
      fade={false}
      className={cn(
        // Tints come from the surface scale, not from the text colour, so they keep the surface's
        // warmth in dark mode instead of turning a flat grey.
        "w-full bg-(--table-bg) [--table-bg:var(--qui-surface)]",
        "[--table-band:color-mix(in_oklab,var(--qui-surface-hover)_55%,var(--table-bg))] [--table-hover:color-mix(in_oklab,var(--qui-surface-hover)_65%,var(--table-bg))] [--table-selected:color-mix(in_oklab,var(--qui-surface-active)_55%,var(--table-bg))]",
        variant === "card" && "rounded-float border border-border",
        containerClassName,
      )}
      // Sideways scrolling stays in the table; reaching the bottom hands back to the page. The
      // scroll padding keeps a row that gets focus clear of the sticky header and footer.
      // The header and footer bring their own inset, as a solid border that also covers the strip.
      viewportClassName="py-1.5 has-[thead]:pt-0 has-[tfoot]:pb-0 overscroll-x-contain overscroll-y-auto scroll-py-[calc(var(--qui-item-h)+1rem)]"
    >
      <table className={cn("w-full border-separate border-spacing-0 text-(length:--qui-text)", className)} {...props} />
    </ScrollArea>
  );
}

export function TableHeader({ children, ...props }: ComponentProps<"thead">) {
  return (
    <thead data-slot="table-header" {...props}>
      {children}
      {/* A little air between the band and the first row. */}
      <tr role="presentation" aria-hidden className="h-1" />
    </thead>
  );
}

export function TableBody(props: ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" {...props} />;
}

/** Totals and summaries. Sticks to the bottom while there are rows below it. */
export function TableFooter({ children, ...props }: ComponentProps<"tfoot">) {
  return (
    <tfoot data-slot="table-footer" {...props}>
      <tr role="presentation" aria-hidden className="h-1" />
      <SectionContext value="footer">{children}</SectionContext>
    </tfoot>
  );
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      // Rows with a TableLink are one big target.
      className={cn("group/row relative has-[[data-slot=table-link]]:cursor-pointer", className)}
      {...props}
    />
  );
}

export type TableHeadProps = Omit<ComponentProps<"th">, "align"> & {
  /** `end` right-aligns the column, for numbers. Use the same on its cells. */
  align?: Align;
  /** Makes the header a sort button. Sorting the rows is up to you. */
  onSort?: () => void;
  /** The column's current sort, shown with an arrow and announced to screen readers. */
  sort?: "ascending" | "descending" | false;
  /** Keeps the column in view while the table scrolls sideways. Use it on the first column. */
  sticky?: boolean;
};

export function TableHead({ align = "start", onSort, sort = false, sticky, className, children, ...props }: TableHeadProps) {
  // On end-aligned columns the arrow leads, so the label lines up with the numbers below.
  const arrow = (
    <ArrowUpIcon
      weight="bold"
      className={cn(
        "size-3 shrink-0",
        !sort && "opacity-0 group-hover/sort:opacity-50",
        sort === "descending" && "rotate-180",
      )}
    />
  );
  return (
    <th
      data-slot="table-head"
      data-sticky={sticky || undefined}
      aria-sort={sort || (onSort ? "none" : undefined)}
      className={cn(
        "sticky top-0 z-[2] h-[calc(var(--qui-item-h)+0.625rem)] px-3 text-left align-middle text-[calc(var(--qui-text)-0.125rem)] font-medium whitespace-nowrap text-fg-muted",
        solid,
        // No fill: a hairline under the labels keeps the header out of the way.
        "border-t-[0.375rem] before:shadow-[inset_0_-1px_0_var(--qui-border)]",
        align === "end" && "text-right",
        sticky && "left-0 z-[3]",
        // A shadow below the band once rows scroll under it.
        "after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-3 after:bg-linear-to-b after:from-(--qui-edge) after:scroll-edge-top",
        className,
      )}
      {...props}
    >
      {/* Every header gets the same box, so sortable and plain labels share one baseline. */}
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            "group/sort motion-control focus-ring -mx-1.5 inline-flex h-6 items-center align-middle gap-1 rounded-[calc(var(--radius-control)-0.125rem)] px-1.5 hover:bg-surface-hover hover:text-fg",
            sort && "text-fg",
          )}
        >
          {align === "end" && arrow}
          {children}
          {align === "start" && arrow}
        </button>
      ) : (
        <span className="inline-flex h-6 items-center align-middle">{children}</span>
      )}
    </th>
  );
}

export type TableCellProps = Omit<ComponentProps<"td">, "align"> & {
  /** `end` right-aligns the cell with tabular numbers. Match it on the column's TableHead. */
  align?: Align;
  /** Keeps the cell in view while the table scrolls sideways. Use it on the first column. */
  sticky?: boolean;
};

export function TableCell({ align = "start", sticky, className, ...props }: TableCellProps) {
  const section = use(SectionContext);
  const body = section === "body";
  return (
    <td
      data-slot="table-cell"
      data-sticky={sticky || undefined}
      className={cn(
        // Data reads best on one line; pass whitespace-normal for a column of prose.
        "h-[calc(var(--qui-item-h)+0.75rem)] px-3 align-middle whitespace-nowrap",
        sticky || !body ? [solid, roundEnds] : inset,
        align === "end" && "nums text-right",
        body && [
          // Hairline dividers drawn as a background, so they can start where the text starts.
          "bg-bottom bg-no-repeat [background-image:linear-gradient(var(--qui-border),var(--qui-border))] [background-size:100%_1px]",
          "first:bg-right-bottom first:[background-size:calc(100%-0.75rem)_1px] last:bg-left-bottom last:[background-size:calc(100%-0.75rem)_1px]",
          // The highlight replaces the dividers around it, so it reads as one soft shape.
          "group-last/row:bg-none group-hover/row:bg-none [tr:has(+tr:hover)>&]:bg-none group-data-[selected]/row:bg-none [tr:has(+tr[data-selected])>&]:bg-none",
          sticky
            ? "group-hover/row:before:bg-(--table-hover) group-data-[selected]/row:before:bg-(--table-selected)"
            : "group-hover/row:bg-(--table-hover) group-data-[selected]/row:bg-(--table-selected)",
        ],
        sticky && "sticky left-0 z-[1]",
        sticky &&
          body &&
          "after:pointer-events-none after:absolute after:inset-y-0 after:left-full after:w-3 after:bg-linear-to-r after:from-(--qui-edge) after:scroll-edge-start",
        // Totals stick to the bottom, with a shadow above them while rows are underneath.
        !body && [
          "sticky bottom-0 z-[2] h-[calc(var(--qui-item-h)+0.625rem)] border-b-[0.375rem] font-medium before:bg-(--table-band)",
          "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-full after:h-3 after:bg-linear-to-t after:from-(--qui-edge) after:scroll-edge-bottom",
          sticky && "z-[3]",
        ],
        className,
      )}
      {...props}
    />
  );
}

/**
 * The row's main link, e.g. the invoice number. It covers the whole row, so anywhere on the row
 * opens it, while it stays one real link for the keyboard, middle-click and "open in new tab".
 */
export function TableLink({ render, className, ...props }: useRender.ComponentProps<"a">) {
  return useRender({
    render,
    defaultTagName: "a",
    props: {
      "data-slot": "table-link",
      className: cn(
        "font-medium text-fg outline-none",
        "after:absolute after:inset-x-1.5 after:inset-y-0 after:rounded-control after:outline-2 after:outline-offset-[-2px] after:outline-transparent after:content-[''] focus-visible:after:outline-ring",
        className,
      ),
      ...props,
    },
  });
}

/**
 * Buttons and menus at the end of a row. They show on hover and focus so a long table stays
 * calm, stay while their menu is open, and are always there on touch screens.
 */
export function TableActions({ className, children, ...props }: Omit<ComponentProps<"td">, "align">) {
  return (
    <TableCell align="end" className={cn("w-px pr-1.5", className)} {...props}>
      {/* Above the row link, so they get their own clicks. */}
      <div className="motion-fade relative z-[1] inline-flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 has-[[data-popup-open]]:opacity-100 pointer-coarse:opacity-100">
        {children}
      </div>
    </TableCell>
  );
}

/** One row across every column for when there is nothing to show, e.g. no search results. */
export function TableEmpty({ className, ...props }: ComponentProps<"td">) {
  return (
    <tr data-slot="table-empty">
      <td colSpan={999} className={cn("h-48 px-6 text-center align-middle text-fg-muted", className)} {...props} />
    </tr>
  );
}

export function TableCaption({ className, ...props }: ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("caption-bottom px-3 pt-3 pb-1.5 text-left text-xs text-fg-muted", className)}
      {...props}
    />
  );
}
