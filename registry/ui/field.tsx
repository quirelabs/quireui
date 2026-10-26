"use client";

import { Field as BaseField } from "@base-ui/react/field";
import { type ComponentProps, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/registry/lib/cn";

/** Wires a label, description and error to the control inside it (Input, Textarea). */
export function Field({ className, ...props }: ComponentProps<typeof BaseField.Root>) {
  return <BaseField.Root data-slot="field" className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

export function FieldLabel({ className, ...props }: ComponentProps<typeof BaseField.Label>) {
  return (
    <BaseField.Label
      className={cn("text-sm font-medium text-fg data-[disabled]:opacity-50", className)}
      {...props}
    />
  );
}

export function FieldDescription({ className, ...props }: ComponentProps<typeof BaseField.Description>) {
  return <BaseField.Description className={cn("text-xs text-fg-muted", className)} {...props} />;
}

// Browser messages are long and wrap, which would break the reserved line. These stay short.
const defaultMessages = {
  valueMissing: "Required",
  typeMismatch: "Check the format",
  patternMismatch: "Check the format",
  tooShort: "Too short",
  tooLong: "Too long",
  rangeUnderflow: "Too low",
  rangeOverflow: "Too high",
  stepMismatch: "Not an allowed value",
  badInput: "Not a valid value",
};

type ValidityKey = keyof typeof defaultMessages;

/**
 * Sharper defaults from the control itself: its type and its own limits, so a message
 * says what to do ("Use at least 8 characters") instead of only that something is wrong.
 */
function messagesFor(control: HTMLInputElement | HTMLTextAreaElement | null): Partial<Record<ValidityKey, string>> {
  if (!control) return {};
  const attr = (name: string) => control.getAttribute(name);
  const out: Partial<Record<ValidityKey, string>> = {};
  const type = attr("type");
  if (type === "email") out.typeMismatch = "Enter a valid email address";
  if (type === "url") out.typeMismatch = "Enter a full URL, like https://example.com";
  if (type === "number") out.badInput = "Enter a number";
  if (attr("minlength")) out.tooShort = `Use at least ${attr("minlength")} characters`;
  if (attr("maxlength")) out.tooLong = `Use at most ${attr("maxlength")} characters`;
  if (attr("min")) out.rangeUnderflow = `Use ${attr("min")} or more`;
  if (attr("max")) out.rangeOverflow = `Use ${attr("max")} or less`;
  return out;
}

/**
 * Reserves its line, so a message appearing never pushes the form down. Shows one short
 * message per failed check (override any with `messages`); messages from your own
 * `validate` function come through as written. Pass children to show one fixed message.
 */
export function FieldError({
  className,
  reserve = true,
  messages,
  children,
}: {
  className?: string;
  /** Keep the line's space when there is no error. Turn off for single fields like search. */
  reserve?: boolean;
  /** Your own wording per browser validity error, e.g. `{ valueMissing: "Enter an email" }`. */
  messages?: Partial<Record<ValidityKey, ReactNode>>;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [fromControl, setFromControl] = useState<Partial<Record<ValidityKey, string>>>({});
  // Read once the field has mounted; errors only show after interaction, so this is never late.
  useLayoutEffect(() => {
    const field = ref.current?.closest("[data-slot=field]");
    setFromControl(messagesFor(field?.querySelector("input, textarea") ?? null));
  }, []);

  const errorClass = cn("motion-message text-xs leading-4 text-danger", className);
  const all = { ...defaultMessages, ...fromControl, ...messages };
  return (
    // Several checks can fail at once; only the first message shows.
    <div ref={ref} className={cn(reserve && "min-h-4", "[&>*:not(:first-child)]:hidden")}>
      {children ? (
        <BaseField.Error className={errorClass}>{children}</BaseField.Error>
      ) : (
        <>
          {(Object.keys(all) as ValidityKey[]).map((key) => (
            <BaseField.Error key={key} match={key} className={errorClass}>
              {all[key]}
            </BaseField.Error>
          ))}
          <BaseField.Error match="customError" className={errorClass} />
        </>
      )}
    </div>
  );
}
