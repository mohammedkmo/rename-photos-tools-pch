"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_BYTES = 10_000_000;
const ACCEPTED = ["image/jpeg", "image/png", "image/gif"];

interface DocumentCellProps {
  value?: File;
  onChange: (file: File | null) => void;
  label: string;
  required?: boolean;
  invalid?: boolean;
}

/**
 * A single document in a grid row: a thumbnail once something is attached,
 * a dashed target before that. Accepts a click or a dropped file.
 */
export default function DocumentCell({
  value,
  onChange,
  label,
  required,
  invalid,
}: DocumentCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Object URLs rather than base64 data URLs: no megabytes of string in memory
  // for what is only ever a 32px thumbnail.
  useEffect(() => {
    if (!value) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const accept = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type) || file.size > MAX_BYTES) return;
    onChange(file);
  };

  return (
    <div
      className="flex items-center justify-center h-full"
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        accept(event.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(event) => accept(event.target.files?.[0])}
      />

      {preview ? (
        <span className="relative group/doc">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            title={`${label} — ${value?.name ?? ""}`}
            className="block h-8 w-8 rounded-md overflow-hidden ring-1 ring-black/10 hover:ring-pch-accent transition-shadow"
          >
            <Image
              src={preview}
              alt={label}
              width={64}
              height={64}
              unoptimized
              className="h-full w-full object-cover"
            />
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            title={`Remove ${label}`}
            className="absolute -top-1 -end-1 hidden group-hover/doc:flex h-4 w-4 items-center justify-center rounded-full bg-pch-stopEdge text-white shadow"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          title={label}
          className={cn(
            "h-8 w-8 rounded-md border-[1.5px] border-dashed flex items-center justify-center text-base leading-none transition-colors",
            dragOver
              ? "border-pch-accent text-pch-accent bg-pch-accentSoft"
              : invalid || required
                ? "border-pch-stopEdge text-pch-stopInk hover:bg-pch-stopBg"
                : "border-pch-line2 text-pch-ink3 hover:border-pch-accent hover:text-pch-accent hover:bg-pch-accentSoft"
          )}
        >
          +
        </button>
      )}
    </div>
  );
}
