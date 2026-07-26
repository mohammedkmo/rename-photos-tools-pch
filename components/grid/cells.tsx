"use client";

import { forwardRef, type ChangeEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { Controller, type Control } from "react-hook-form";
import { cn } from "@/lib/utils";
import DocumentCell from "@/components/grid/DocumentCell";

export const cellInputClass = (invalid?: boolean, mono?: boolean) =>
  cn(
    "w-full h-full px-3 bg-transparent text-[13.5px] text-pch-ink outline-none",
    "placeholder:text-pch-ink3/50",
    invalid && "text-pch-stopInk font-medium",
    mono && "font-mono text-[12.5px] tabular-nums"
  );

export interface SheetCellProps {
  invalid?: boolean;
  message?: string;
  /** Grid coordinates, used by the selection layer. */
  row?: number;
  col?: number;
  selected?: boolean;
  anchor?: boolean;
  onMouseDown?: (event: React.MouseEvent) => void;
  onMouseEnter?: (event: React.MouseEvent) => void;
  onContextMenu?: (event: React.MouseEvent) => void;
}

// Ruled on every side so the sheet reads like a spreadsheet, with the selection
// tint and the anchor outline layered on top.
const cellTd = (props: SheetCellProps) =>
  cn(
    "relative p-0 h-11 border-b border-e border-pch-line",
    props.selected && "bg-pch-accent/[0.07]",
    props.anchor && "z-10 outline outline-[1.5px] -outline-offset-[1.5px] outline-pch-accent",
    props.invalid && "bg-pch-stopBg/60"
  );

const sheetAttrs = (props: SheetCellProps) => ({
  "data-cell": props.row !== undefined && props.col !== undefined ? `${props.row}-${props.col}` : undefined,
  "data-invalid": props.invalid || undefined,
  onMouseDown: props.onMouseDown,
  onMouseEnter: props.onMouseEnter,
  onContextMenu: props.onContextMenu,
  title: props.message,
});

type CellNativeProps<T> = Omit<T, "onMouseDown" | "onMouseEnter" | "onContextMenu">;

interface TextCellProps extends CellNativeProps<InputHTMLAttributes<HTMLInputElement>>, SheetCellProps {
  mono?: boolean;
  /** Static text shown before the input, e.g. the fixed HFYC- badge prefix. */
  prefix?: string;
  /** Strips anything that is not a digit, honouring maxLength. */
  digitsOnly?: boolean;
}

/**
 * These live at module scope on purpose. A component declared inside the form
 * body is a brand new type on every render, so React unmounts and remounts the
 * input on each keystroke and the field loses focus after a single letter.
 */
export const TextCell = forwardRef<HTMLInputElement, TextCellProps>(
  function TextCell(
    { invalid, message, row, col, selected, anchor, onMouseDown, onMouseEnter, onContextMenu,
      mono, prefix, digitsOnly, onChange, ...props },
    ref
  ) {
    const sheet = { invalid, message, row, col, selected, anchor, onMouseDown, onMouseEnter, onContextMenu };

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      if (digitsOnly) {
        const limit = typeof props.maxLength === "number" ? props.maxLength : undefined;
        const digits = event.target.value.replace(/\D/g, "");
        event.target.value = limit ? digits.slice(0, limit) : digits;
      }
      onChange?.(event);
    };

    return (
      <td className={cellTd(sheet)} {...sheetAttrs(sheet)}>
        <div className="flex items-center h-full">
          {prefix && (
            <span className="ps-3 font-mono text-[12.5px] text-pch-ink3 select-none">{prefix}</span>
          )}
          <input
            ref={ref}
            {...props}
            onChange={handleChange}
            className={cn(cellInputClass(invalid, mono), prefix && "ps-0")}
          />
        </div>
      </td>
    );
  }
);

interface SelectCellProps extends CellNativeProps<SelectHTMLAttributes<HTMLSelectElement>>, SheetCellProps {}

export const SelectCell = forwardRef<HTMLSelectElement, SelectCellProps>(
  function SelectCell(
    { invalid, message, row, col, selected, anchor, onMouseDown, onMouseEnter, onContextMenu, children, ...props },
    ref
  ) {
    const sheet = { invalid, message, row, col, selected, anchor, onMouseDown, onMouseEnter, onContextMenu };
    return (
      <td className={cellTd(sheet)} {...sheetAttrs(sheet)}>
        <select ref={ref} {...props} className={cn(cellInputClass(invalid), "appearance-none cursor-pointer")}>
          {children}
        </select>
      </td>
    );
  }
);

interface DateCellProps extends CellNativeProps<InputHTMLAttributes<HTMLInputElement>>, SheetCellProps {}

export const DateCell = forwardRef<HTMLInputElement, DateCellProps>(
  function DateCell(
    { invalid, message, row, col, selected, anchor, onMouseDown, onMouseEnter, onContextMenu, ...props },
    ref
  ) {
    const sheet = { invalid, message, row, col, selected, anchor, onMouseDown, onMouseEnter, onContextMenu };
    return (
      <td className={cellTd(sheet)} {...sheetAttrs(sheet)}>
        <input ref={ref} type="date" dir="ltr" {...props} className={cellInputClass(invalid, true)} />
      </td>
    );
  }
);

/** A cell whose editor is a custom component rather than a plain input. */
export function CustomCell({ children, ...sheet }: SheetCellProps & { children: ReactNode }) {
  return (
    <td className={cellTd(sheet)} {...sheetAttrs(sheet)}>
      {children}
    </td>
  );
}

interface DocumentTdProps extends SheetCellProps {
  control: Control<any>;
  name: string;
  label: string;
  required?: boolean;
}

export function DocumentTd({ control, name, label, required, ...sheet }: DocumentTdProps) {
  return (
    <td className={cellTd(sheet)} {...sheetAttrs(sheet)}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <DocumentCell
            value={field.value as File | undefined}
            onChange={(file) => field.onChange(file ?? undefined)}
            label={label}
            required={required}
            invalid={sheet.invalid}
          />
        )}
      />
    </td>
  );
}
