"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface SheetFooterProps {
  ready: number;
  total: number;
  selectedCount: number;
  isMultiCell: boolean;
}

/**
 * A status bar in the spreadsheet tradition: one slim strip that answers
 * "how much is here, how much is done, what do I have selected" - and nothing
 * else. The action itself lives in the top bar with the other file tools.
 */
export default function SheetFooter({
  ready, total, selectedCount, isMultiCell,
}: SheetFooterProps) {
  const t = useTranslations("grid");
  const attention = total - ready;
  const complete = total > 0 && attention === 0;

  return (
    <div className="flex-none h-7 flex items-center gap-4 px-4 bg-pch-subtle border-t border-pch-line text-[11.5px] text-pch-ink3 tabular-nums select-none">
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          complete ? "bg-pch-okInk" : "bg-pch-warnEdge"
        )}
      />
      <span className="font-medium text-pch-ink2">{t("rowCount", { count: total })}</span>

      {attention > 0 ? (
        <span className="text-pch-warnInk">{t("attentionCount", { count: attention })}</span>
      ) : (
        total > 0 && <span className="text-pch-okInk">{t("allRowsReady")}</span>
      )}

      {isMultiCell && (
        <span className="text-pch-accentInk font-medium">
          {t("selectedCells", { count: selectedCount })}
        </span>
      )}

      <span className="ms-auto hidden md:inline">{t("sheetHint")}</span>
    </div>
  );
}
