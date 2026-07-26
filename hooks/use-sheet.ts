"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CellRef = { row: number; col: number };
export type SheetRange = { top: number; left: number; bottom: number; right: number };

export interface SheetMenuState {
  x: number;
  y: number;
  row: number;
}

interface UseSheetOptions {
  rowCount: number;
  /** One entry per data column. `null` marks a column clipboard cannot touch. */
  columnKeys: (string | null)[];
  readCell: (row: number, col: number) => string;
  writeCell: (row: number, col: number, value: string) => void;
  /** Grow the sheet so at least `count` rows exist, for pasting a taller block. */
  ensureRows: (count: number) => void;
  insertRow: (at: number) => void;
  deleteRow: (at: number) => void;
  onSelectionChange?: (cell: CellRef | null) => void;
}

const rangeOf = (a: CellRef, b: CellRef): SheetRange => ({
  top: Math.min(a.row, b.row),
  bottom: Math.max(a.row, b.row),
  left: Math.min(a.col, b.col),
  right: Math.max(a.col, b.col),
});

const clamp = (value: number, max: number) => Math.max(0, Math.min(value, max));

/**
 * The spreadsheet behaviour people already know: drag a range, copy it as TSV,
 * paste a block from Excel across many cells and rows, clear with Delete, and
 * right-click for row operations.
 *
 * Every cell stays a live input, so single-cell editing is unchanged. The range
 * layer only takes over once more than one cell is involved, or when pasted
 * text contains tabs or newlines.
 */
export function useSheet({
  rowCount,
  columnKeys,
  readCell,
  writeCell,
  ensureRows,
  insertRow,
  deleteRow,
  onSelectionChange,
}: UseSheetOptions) {
  const lastCol = columnKeys.length - 1;
  const lastRow = Math.max(0, rowCount - 1);

  const [anchor, setAnchor] = useState<CellRef | null>(null);
  const [focus, setFocus] = useState<CellRef | null>(null);
  const [menu, setMenu] = useState<SheetMenuState | null>(null);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const range = anchor && focus ? rangeOf(anchor, focus) : null;
  const isMultiCell = Boolean(range && (range.top !== range.bottom || range.left !== range.right));

  useEffect(() => {
    const stop = () => { dragging.current = false; };
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  // Keyboard and clipboard only make sense on the container once a real range
  // exists; before that the focused input owns everything.
  const takeContainerFocus = useCallback(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active && containerRef.current?.contains(active) && active !== containerRef.current) {
      active.blur();
    }
    containerRef.current?.focus({ preventScroll: true });
  }, []);

  const selectCell = useCallback((cell: CellRef, extend = false) => {
    if (extend && anchor) {
      setFocus(cell);
      takeContainerFocus();
    } else {
      setAnchor(cell);
      setFocus(cell);
    }
    setMenu(null);
    onSelectionChange?.(cell);
  }, [anchor, onSelectionChange, takeContainerFocus]);

  const cellHandlers = useCallback((row: number, col: number) => ({
    onMouseDown: (event: React.MouseEvent) => {
      if (event.button === 2) return;              // right-click keeps the range
      dragging.current = true;
      selectCell({ row, col }, event.shiftKey);
    },
    onMouseEnter: () => {
      if (!dragging.current) return;
      setFocus({ row, col });
      takeContainerFocus();
    },
    onContextMenu: (event: React.MouseEvent) => {
      event.preventDefault();
      const inside = range && row >= range.top && row <= range.bottom
        && col >= range.left && col <= range.right;
      if (!inside) selectCell({ row, col });
      setMenu({ x: event.clientX, y: event.clientY, row });
    },
  }), [range, selectCell, takeContainerFocus]);

  const isSelected = useCallback((row: number, col: number) =>
    Boolean(range && row >= range.top && row <= range.bottom && col >= range.left && col <= range.right),
    [range]);

  const isAnchor = useCallback((row: number, col: number) =>
    Boolean(anchor && anchor.row === row && anchor.col === col), [anchor]);

  // ── clipboard ─────────────────────────────────────────────────────────────
  const selectionAsText = useCallback(() => {
    if (!range) return "";
    const lines: string[] = [];
    for (let row = range.top; row <= range.bottom; row++) {
      const cells: string[] = [];
      for (let col = range.left; col <= range.right; col++) {
        cells.push(columnKeys[col] === null ? "" : readCell(row, col));
      }
      lines.push(cells.join("\t"));
    }
    return lines.join("\n");
  }, [range, columnKeys, readCell]);

  const clearSelection = useCallback(() => {
    if (!range) return;
    for (let row = range.top; row <= range.bottom; row++) {
      for (let col = range.left; col <= range.right; col++) {
        if (columnKeys[col] !== null) writeCell(row, col, "");
      }
    }
  }, [range, columnKeys, writeCell]);

  const pasteText = useCallback((text: string) => {
    if (!anchor) return;
    const rows = text.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n").map((line) => line.split("\t"));
    if (!rows.length) return;

    ensureRows(anchor.row + rows.length);

    rows.forEach((cells, rowOffset) => {
      cells.forEach((value, colOffset) => {
        const col = anchor.col + colOffset;
        if (col > lastCol || columnKeys[col] === null) return;
        writeCell(anchor.row + rowOffset, col, value.trim());
      });
    });

    setFocus({
      row: anchor.row + rows.length - 1,
      col: clamp(anchor.col + Math.max(...rows.map((r) => r.length)) - 1, lastCol),
    });
  }, [anchor, columnKeys, ensureRows, lastCol, writeCell]);

  const containerProps = {
    ref: containerRef,
    tabIndex: -1,
    onCopy: (event: React.ClipboardEvent) => {
      if (!isMultiCell) return;                    // let the input copy itself
      event.preventDefault();
      event.clipboardData.setData("text/plain", selectionAsText());
    },
    onCut: (event: React.ClipboardEvent) => {
      if (!isMultiCell) return;
      event.preventDefault();
      event.clipboardData.setData("text/plain", selectionAsText());
      clearSelection();
    },
    onPaste: (event: React.ClipboardEvent) => {
      const text = event.clipboardData.getData("text/plain");
      // A plain value going into one cell is the browser's job.
      if (!isMultiCell && !/[\t\n]/.test(text)) return;
      event.preventDefault();
      pasteText(text);
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (!anchor || !focus) return;
      const editing = document.activeElement !== containerRef.current;

      if (event.key === "Escape") {
        setFocus(anchor);
        setMenu(null);
        return;
      }

      if (!editing && (event.key === "Delete" || event.key === "Backspace")) {
        event.preventDefault();
        clearSelection();
        return;
      }

      // Columns are mirrored in Arabic, so the arrow that moves "visually left"
      // is the one that moves to a higher column index. Follow what the user
      // sees, the way a spreadsheet does.
      const rtl =
        typeof window !== "undefined" &&
        containerRef.current !== null &&
        window.getComputedStyle(containerRef.current).direction === "rtl";
      const forward = rtl ? -1 : 1;

      const arrows: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -forward],
        ArrowRight: [0, forward],
      };
      const step = arrows[event.key];
      if (!step) return;
      // While typing, arrows belong to the caret unless Shift is extending.
      if (editing && !event.shiftKey) return;

      event.preventDefault();
      const from = event.shiftKey ? focus : anchor;
      const next = {
        row: clamp(from.row + step[0], lastRow),
        col: clamp(from.col + step[1], lastCol),
      };
      if (event.shiftKey) {
        setFocus(next);
        takeContainerFocus();
      } else {
        setAnchor(next);
        setFocus(next);
        // Move the caret into the newly active cell so typing just works.
        const target = containerRef.current?.querySelector<HTMLElement>(
          `[data-cell="${next.row}-${next.col}"] input, [data-cell="${next.row}-${next.col}"] select`
        );
        target?.focus();
      }
    },
  };

  const menuActions = {
    copy: async () => {
      try { await navigator.clipboard.writeText(selectionAsText()); } catch { /* denied */ }
      setMenu(null);
    },
    cut: async () => {
      try { await navigator.clipboard.writeText(selectionAsText()); } catch { /* denied */ }
      clearSelection();
      setMenu(null);
    },
    paste: async () => {
      try { pasteText(await navigator.clipboard.readText()); } catch { /* denied */ }
      setMenu(null);
    },
    clear: () => { clearSelection(); setMenu(null); },
    insertAbove: () => { if (menu) insertRow(menu.row); setMenu(null); },
    insertBelow: () => { if (menu) insertRow(menu.row + 1); setMenu(null); },
    remove: () => { if (menu && rowCount > 1) deleteRow(menu.row); setMenu(null); },
  };

  return {
    range,
    anchor,
    isMultiCell,
    isSelected,
    isAnchor,
    cellHandlers,
    containerProps,
    menu,
    closeMenu: () => setMenu(null),
    menuActions,
    selectedCount: range
      ? (range.bottom - range.top + 1) * (range.right - range.left + 1)
      : 0,
  };
}
