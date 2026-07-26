"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DriverBadgesCellProps {
  /** Comma separated badge numbers, e.g. "HFYC1234,HFYC5678". */
  value?: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}

const MAX_DRIVERS = 20;

const parse = (value?: string) =>
  (value ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);

// Badge numbers are always HFYC plus four digits, so the user only ever needs
// to type the digits — anything else they paste in gets normalised to match.
const normalise = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length === 4 ? `HFYC${digits}` : null;
};

export default function DriverBadgesCell({ value, onChange, invalid }: DriverBadgesCellProps) {
  const badges = parse(value);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    const badge = normalise(raw);
    if (!badge) return false;
    if (badges.includes(badge) || badges.length >= MAX_DRIVERS) {
      setDraft("");
      return true;
    }
    onChange([...badges, badge].join(","));
    setDraft("");
    return true;
  };

  const removeAt = (index: number) =>
    onChange(badges.filter((_, position) => position !== index).join(","));

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "," || event.key === " " || event.key === "Tab") {
      if (!draft) return;
      // Tab still moves on once the pending badge is stored.
      if (event.key !== "Tab") event.preventDefault();
      commit(draft);
      return;
    }
    if (event.key === "Backspace" && !draft && badges.length) {
      event.preventDefault();
      removeAt(badges.length - 1);
    }
  };

  return (
    <div
      dir="ltr"
      className={cn(
        "flex items-center gap-1 h-full px-2 overflow-x-auto scrollbar-none",
        invalid && "bg-pch-stopBg/50"
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {badges.map((badge, index) => (
        <span
          key={badge}
          className="group/badge shrink-0 inline-flex items-center gap-1 h-6 ps-2 pe-1 rounded bg-pch-accentSoft text-pch-accentInk font-mono text-[11px] tabular-nums"
        >
          {badge}
          <button
            type="button"
            tabIndex={-1}
            onClick={(event) => { event.stopPropagation(); removeAt(index); }}
            className="opacity-40 group-hover/badge:opacity-100 hover:text-pch-stopInk transition-opacity"
            aria-label={`Remove ${badge}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <input
        ref={inputRef}
        value={draft}
        inputMode="numeric"
        maxLength={4}
        placeholder={badges.length ? "" : "0000"}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, "").slice(0, 4))}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (draft) commit(draft); else setDraft(""); }}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text/plain");
          if (!/[,\s]/.test(text)) return;
          event.preventDefault();
          const added = text.split(/[,\s]+/).map(normalise).filter(Boolean) as string[];
          const merged = Array.from(new Set([...badges, ...added])).slice(0, MAX_DRIVERS);
          onChange(merged.join(","));
        }}
        className={cn(
          "min-w-[3.5rem] flex-1 h-full bg-transparent outline-none font-mono text-[12.5px] tabular-nums",
          "placeholder:text-pch-ink3/50 placeholder:font-sans"
        )}
      />
    </div>
  );
}
