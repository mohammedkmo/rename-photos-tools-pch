"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface SheetFooterProps {
  ready: number;
  total: number;
  isSubmitting: boolean;
  submitLabel: string;
  busyLabel: string;
}

/**
 * A status bar, not a slab. Completion is carried by the top rule filling from
 * the left, so the only solid element is the action itself - and that stays
 * secondary until the request can actually be generated.
 */
export default function SheetFooter({
  ready, total, isSubmitting, submitLabel, busyLabel,
}: SheetFooterProps) {
  const t = useTranslations("grid");
  const attention = total - ready;
  const complete = total > 0 && attention === 0;
  const percent = total ? (ready / total) * 100 : 0;

  return (
    <div className="flex-none bg-pch-surface">
      {/* The border between sheet and footer doubles as the progress rule. */}
      <div className="relative h-px w-full bg-pch-line">
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0 start-0 transition-[width,background-color] duration-500 ease-out",
            complete ? "bg-pch-okInk" : "bg-pch-action"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="h-[52px] flex items-center gap-3 px-5">
        <p className="text-[12.5px] text-pch-ink3 tabular-nums">
          <span className="font-medium text-pch-ink2">{t("rowCount", { count: total })}</span>
          {attention > 0 ? (
            <span className="text-pch-warnInk font-medium">
              {" · "}{t("attentionCount", { count: attention })}
            </span>
          ) : (
            total > 0 && <span className="text-pch-okInk font-medium">{" · "}{t("allRowsReady")}</span>
          )}
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "ms-auto inline-flex items-center gap-2 h-9 px-4 rounded-lg",
            "text-[13px] font-semibold tracking-tight transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            complete
              ? "bg-pch-action text-white shadow-[0_1px_2px_rgba(0,0,0,0.22)] hover:bg-pch-actionInk"
              : "bg-white text-pch-ink2 border border-pch-line2 hover:border-pch-ink3 hover:text-pch-ink"
          )}
        >
          {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isSubmitting ? busyLabel : submitLabel}
        </button>
      </div>
    </div>
  );
}
