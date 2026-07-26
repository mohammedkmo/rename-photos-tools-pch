"use client";

import { useEffect, useRef } from "react";
import { ArrowDownToLine, ArrowUpToLine, Clipboard, Copy, Eraser, Scissors, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface SheetContextMenuProps {
  x: number;
  y: number;
  canDeleteRow: boolean;
  onClose: () => void;
  actions: {
    copy: () => void;
    cut: () => void;
    paste: () => void;
    clear: () => void;
    insertAbove: () => void;
    insertBelow: () => void;
    remove: () => void;
  };
}

export default function SheetContextMenu({ x, y, canDeleteRow, onClose, actions }: SheetContextMenuProps) {
  const t = useTranslations("grid");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dismiss = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("mousedown", dismiss);
    window.addEventListener("keydown", onEscape);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("mousedown", dismiss);
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  // Keep the menu on screen when opened near an edge.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    if (box.right > window.innerWidth) node.style.left = `${window.innerWidth - box.width - 8}px`;
    if (box.bottom > window.innerHeight) node.style.top = `${window.innerHeight - box.height - 8}px`;
  }, []);

  const items = [
    { key: "cut", label: t("menuCut"), icon: Scissors, run: actions.cut, shortcut: "⌘X" },
    { key: "copy", label: t("menuCopy"), icon: Copy, run: actions.copy, shortcut: "⌘C" },
    { key: "paste", label: t("menuPaste"), icon: Clipboard, run: actions.paste, shortcut: "⌘V" },
    { key: "clear", label: t("menuClear"), icon: Eraser, run: actions.clear, shortcut: "⌫", divider: true },
    { key: "above", label: t("menuInsertAbove"), icon: ArrowUpToLine, run: actions.insertAbove, divider: true },
    { key: "below", label: t("menuInsertBelow"), icon: ArrowDownToLine, run: actions.insertBelow },
    { key: "delete", label: t("menuDeleteRow"), icon: Trash2, run: actions.remove, danger: true, disabled: !canDeleteRow },
  ];

  return (
    <div
      ref={ref}
      role="menu"
      style={{ left: x, top: y }}
      className="fixed z-50 min-w-[13rem] py-1 rounded-lg border border-pch-line2 bg-white shadow-[0_12px_32px_-8px_rgba(10,37,64,0.28)]"
    >
      {items.map((item) => (
        <div key={item.key}>
          {item.divider && <div className="my-1 h-px bg-pch-line" />}
          <button
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={item.run}
            className={[
              "w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-start transition-colors",
              item.disabled
                ? "text-pch-ink3/50 cursor-not-allowed"
                : item.danger
                  ? "text-pch-stopInk hover:bg-pch-stopBg"
                  : "text-pch-ink2 hover:bg-pch-subtle hover:text-pch-ink",
            ].join(" ")}
          >
            <item.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="font-mono text-[10.5px] text-pch-ink3/70">{item.shortcut}</span>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
