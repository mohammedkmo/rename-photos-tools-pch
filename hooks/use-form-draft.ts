"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 600;

export type Draft<T> = { savedAt: string; values: T };

// Files cannot be serialised, so uploads are left out of the draft.
const stripFiles = (value: unknown): unknown => {
  if (value instanceof File || value instanceof Blob) return undefined;
  if (Array.isArray(value)) return value.map(stripFiles);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, stripFiles(entry)] as const)
      .filter(([, entry]) => entry !== undefined);
    return Object.fromEntries(entries);
  }
  return value;
};

const hasContent = (value: unknown): boolean => {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasContent);
  if (value && typeof value === "object") {
    return Object.values(value).some(hasContent);
  }
  return value !== undefined && value !== null;
};

/**
 * Keeps a copy of the typed-in values in localStorage so a refresh or a stray
 * back navigation does not throw away a long request. Uploads are not stored -
 * they are far too large - so a restored draft still needs its photos re-added.
 */
export function useFormDraft<T>(storageKey: string) {
  const [draft, setDraft] = useState<Draft<T> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) setDraft(JSON.parse(stored) as Draft<T>);
    } catch {
      // A corrupt or unreadable draft should never block the form.
    }
  }, [storageKey]);

  const save = useCallback(
    (values: T) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const stripped = stripFiles(values);
        // Never overwrite a stored draft with an empty form, otherwise mounting
        // the page would wipe the draft before it could be restored.
        if (!hasContent(stripped)) return;
        try {
          window.localStorage.setItem(
            storageKey,
            JSON.stringify({ savedAt: new Date().toISOString(), values: stripped })
          );
        } catch {
          // Private browsing or a full quota - drafts are a convenience only.
        }
      }, DEBOUNCE_MS);
    },
    [storageKey]
  );

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Nothing to do if storage is unavailable.
    }
    setDraft(null);
  }, [storageKey]);

  // Hides the banner but keeps the stored copy, for when a draft is restored.
  const dismiss = useCallback(() => setDraft(null), []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { draft, save, clear, dismiss };
}
