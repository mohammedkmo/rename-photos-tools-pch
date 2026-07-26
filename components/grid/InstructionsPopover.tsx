"use client";

import { useEffect, useRef, useState } from "react";
import { Info, Mail, ShieldCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface InstructionsPopoverProps {
  title: string;
  body: string;
}

/**
 * The guidance from the old page header, kept one click away instead of taking
 * a paragraph of space above every request.
 */
export default function InstructionsPopover({ title, body }: InstructionsPopoverProps) {
  const t = useTranslations("common");
  const g = useTranslations("grid");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", dismiss);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", dismiss);
      window.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const email = t("emailAddress");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-[12px] transition-colors",
          open
            ? "bg-pch-subtle text-pch-ink"
            : "text-pch-ink3 hover:bg-pch-subtle hover:text-pch-ink2"
        )}
      >
        <Info className="h-3.5 w-3.5" />
        {g("instructions")}
      </button>

      {open && (
        <div className="absolute z-40 mt-1.5 w-[26rem] max-w-[calc(100vw-3rem)] rounded-xl border border-pch-line2 bg-white shadow-[0_16px_40px_-12px_rgba(10,37,64,0.3)]">
          <div className="flex items-start gap-3 p-4 pb-3">
            <p className="flex-1 text-[13px] font-semibold text-pch-ink">{title}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-pch-ink3 hover:text-pch-ink"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="px-4 pb-3 text-[12.5px] leading-relaxed text-pch-ink2">{body}</p>

          <div className="border-t border-pch-line px-4 py-3 space-y-2">
            <p className="flex items-center gap-2 text-[12px] text-pch-ink2">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-pch-okInk" />
              {g("clientSideNote")}
            </p>
            <p className="flex items-center gap-2 text-[12px]">
              <Mail className="h-3.5 w-3.5 shrink-0 text-pch-ink3" />
              <a href={`mailto:${email}`} className="text-pch-ink font-medium hover:underline underline-offset-2">
                {email}
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
