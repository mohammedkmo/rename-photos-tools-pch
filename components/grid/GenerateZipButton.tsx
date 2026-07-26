"use client";

import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerateZipButtonProps {
  /** Id of the sheet's <form>; the button lives in the top bar, outside it. */
  formId: string;
  complete: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  label: string;
  busyLabel: string;
  restrictedLabel: string;
}

/**
 * The file's primary action, placed with the other file-level tools in the top
 * bar. It stays quiet until the request can actually be generated, then goes
 * solid - the sheet's completion state, readable from the button alone.
 */
export default function GenerateZipButton({
  formId, complete, isSubmitting, canSubmit, label, busyLabel, restrictedLabel,
}: GenerateZipButtonProps) {
  if (!canSubmit) {
    return (
      <span className="inline-flex h-7 items-center rounded-md border border-pch-line2 bg-pch-subtle px-2.5 text-[11.5px] font-medium text-pch-ink3">
        {restrictedLabel}
      </span>
    );
  }

  return (
    <button
      type="submit"
      form={formId}
      disabled={isSubmitting}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-semibold tracking-tight transition-colors",
        "disabled:cursor-wait disabled:opacity-60",
        complete
          ? "bg-pch-action text-white hover:bg-pch-actionInk"
          : "border  bg-pch-ink3/20 text-pch-ink3 hover:border-pch-ink3 hover:text-pch-ink"
      )}
    >
      {isSubmitting
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <Download className="h-3.5 w-3.5" />}
      {isSubmitting ? busyLabel : label}
    </button>
  );
}
