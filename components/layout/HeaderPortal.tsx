"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Ids of the slots the top bar exposes for the open sheet to fill. */
export const HEADER_DOC_SLOT = "header-doc-slot";
export const HEADER_ACTION_SLOT = "header-action-slot";

/**
 * The top bar sits above the page in the tree, so a sheet cannot pass props to
 * it. It renders empty slots instead and the sheet portals its own chrome in,
 * which keeps document identity and sharing where they belong without lifting
 * form state out of the page.
 */
export default function HeaderPortal({ slot, children }: { slot: string; children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById(slot));
  }, [slot]);

  return target ? createPortal(children, target) : null;
}
