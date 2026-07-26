"use client";

import type { ComponentType, ReactNode } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { cn } from "@/lib/utils";

interface MetaField {
  registration: UseFormRegisterReturn;
  value: string;
  label: string;
  placeholder: string;
  error?: string;
  icon: ComponentType<{ className?: string }>;
  mono?: boolean;
}

interface RequestHeaderProps {
  title: {
    registration: UseFormRegisterReturn;
    value: string;
    placeholder: string;
    error?: string;
  };
  meta: MetaField[];
  /** Sits at the end of the metadata row, e.g. the instructions popover. */
  children?: ReactNode;
}

// Inputs size themselves to their content so the pills hug the value.
const widthFor = (value: string, placeholder: string) =>
  `${Math.max(value.length, placeholder.length, 6) + 1}ch`;

/**
 * The contractor is effectively the name of the request, so it is treated like
 * a document title with the two contract details as metadata beneath it. Every
 * field is edited in place - no boxes, no stacked labels.
 */
export default function RequestHeader({ title, meta, children }: RequestHeaderProps) {
  return (
    <div className="flex-none px-6 pt-4 pb-3 bg-pch-surface border-b border-pch-line">
      <input
        {...title.registration}
        placeholder={title.placeholder}
        aria-invalid={Boolean(title.error) || undefined}
        className={cn(
          "block w-full max-w-[46rem] -mx-2 px-2 py-1 rounded-md bg-transparent outline-none",
          "text-[22px] font-semibold tracking-[-0.02em] text-pch-ink",
          "placeholder:text-pch-ink3/45 placeholder:font-medium",
          "hover:bg-pch-subtle focus:bg-white transition-colors",
          title.error
            ? "ring-[1.5px] ring-pch-stopEdge"
            : "focus:ring-[1.5px] focus:ring-pch-accent"
        )}
      />

      <div className="mt-1 flex flex-wrap items-center gap-1">
        {meta.map((field) => (
          <label
            key={field.label}
            title={field.error ?? field.label}
            className={cn(
              "group inline-flex items-center gap-1.5 h-7 px-2 rounded-md cursor-text",
              "border border-transparent transition-colors",
              "hover:bg-pch-subtle focus-within:bg-white focus-within:border-pch-accent",
              field.error && "border-pch-stopEdge/60 bg-pch-stopBg/40"
            )}
          >
            <field.icon
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                field.error ? "text-pch-stopInk" : "text-pch-ink3"
              )}
            />
            <span className="text-[12px] text-pch-ink3 select-none">{field.label}</span>
            <input
              {...field.registration}
              placeholder={field.placeholder}
              style={{ width: widthFor(field.value, field.placeholder) }}
              className={cn(
                "bg-transparent outline-none text-[12.5px] font-medium text-pch-ink",
                "placeholder:text-pch-ink3/50 placeholder:font-normal",
                field.mono && "font-mono tabular-nums",
                field.error && "text-pch-stopInk"
              )}
            />
          </label>
        ))}
        {children}
      </div>
    </div>
  );
}
