"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import {
  newDocumentName,
  readDocument,
  writeDocument,
  type DocumentKind,
  type DocumentMeta,
  type WriteOutcome,
} from "@/lib/documents";

const SAVE_DEBOUNCE_MS = 700;

interface UseDocumentOptions<T extends FieldValues> {
  id: string | null;
  kind: DocumentKind;
  form: UseFormReturn<T>;
  arrayName: "employees" | "vehicles";
  /** Collaboration owns the data in a room, so autosave stands down. */
  enabled?: boolean;
}

export type DocumentStatus = "idle" | "loading" | "ready" | "saving" | "saved" | "partial";

/**
 * Binds a sheet to a stored application: loads it on open, then writes every
 * change back. There is no restore prompt because there is nothing to restore -
 * the document on the list is always what the user last had.
 */
export function useDocument<T extends FieldValues>({
  id, kind, form, arrayName, enabled = true,
}: UseDocumentOptions<T>) {
  const [meta, setMeta] = useState<DocumentMeta | null>(null);
  const [status, setStatus] = useState<DocumentStatus>(id ? "loading" : "idle");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const loaded = useRef(false);

  // Load once per document. Identity (the name in the top bar) loads even
  // while collaboration owns the data - only restoring values is gated,
  // because the room is the source of truth for those.
  useEffect(() => {
    if (!id) {
      setStatus("idle");
      return;
    }
    let cancelled = false;
    loaded.current = false;
    if (enabled) setStatus("loading");

    readDocument(id).then((stored) => {
      if (cancelled) return;
      if (stored) {
        setMeta(stored.meta);
        if (enabled && stored.values) form.reset(stored.values as T);
      } else {
        // Opening an id that does not exist yet creates it on first save.
        const now = new Date().toISOString();
        setMeta({
          id, kind, name: newDocumentName(kind),
          createdAt: now, updatedAt: now,
          contractor: "", rowCount: 0, photoCount: 0,
        });
      }
      loaded.current = true;
      setStatus(enabled ? "ready" : "idle");
    });

    return () => { cancelled = true; };
  }, [id, kind, enabled, form]);

  const persist = useCallback((values: T, current: DocumentMeta) => {
    const rows = (values[arrayName] as unknown as Record<string, unknown>[]) ?? [];
    const photoField = kind === "personal" ? "photo" : "photo";
    const next: DocumentMeta = {
      ...current,
      updatedAt: new Date().toISOString(),
      contractor: String(values.contractor ?? ""),
      rowCount: rows.length,
      photoCount: rows.filter((row) => row?.[photoField]).length,
    };

    setStatus("saving");
    writeDocument(next, values).then((outcome: WriteOutcome) => {
      setMeta(next);
      setStatus(outcome === "saved" ? "saved" : outcome === "saved-without-files" ? "partial" : "ready");
    });
  }, [arrayName, kind]);

  // Autosave on every change, once the initial load has settled.
  useEffect(() => {
    if (!id || !enabled) return;
    const subscription = form.watch((values) => {
      if (!loaded.current || !meta) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => persist(values as T, meta), SAVE_DEBOUNCE_MS);
    });
    return () => {
      subscription.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [id, enabled, form, meta, persist]);

  return { meta, status };
}
