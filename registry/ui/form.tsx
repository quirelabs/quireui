"use client";

import { Form as BaseForm } from "@base-ui/react/form";
import type { ComponentProps } from "react";
import { cn } from "@/registry/lib/cn";

/**
 * Validates every Field on submit and calls onFormSubmit only when all pass.
 * noValidate turns off the browser's own popups, so errors always show in FieldError
 * with our wording instead of a browser-specific bubble.
 */
export function Form({ className, ...props }: ComponentProps<typeof BaseForm>) {
  return <BaseForm data-slot="form" noValidate className={cn("flex flex-col gap-1", className)} {...props} />;
}
