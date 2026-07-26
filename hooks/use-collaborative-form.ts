"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useCollaboration } from "@/components/collaboration/CollaborationRoom";
import type {
  SharedRequest,
  SharedRow,
} from "@/lib/collaboration/types";

const REQUEST_FIELDS: (keyof SharedRequest)[] = [
  "contractor",
  "associatedPetroChinaContractNumber",
  "contractHoldingPetroChinaDepartment",
];

interface CollaborativeFormOptions<T extends FieldValues> {
  form: UseFormReturn<T>;
  arrayName: string;
  emptyRow: Record<string, unknown>;
  textFields: string[];
  mediaFields: Record<string, keyof SharedRow>;
  replaceRows: (rows: any[]) => void;
}

export function useCollaborativeForm<T extends FieldValues>({
  form,
  arrayName,
  emptyRow,
  textFields,
  mediaFields,
  replaceRows,
}: CollaborativeFormOptions<T>) {
  const collaboration = useCollaboration();
  const applyingRemote = useRef(false);
  const rowIds = useRef<string[]>([]);

  useEffect(() => {
    if (!collaboration) return;
    const { request, rows } = collaboration.snapshot;
    applyingRemote.current = true;

    for (const field of REQUEST_FIELDS) {
      const current = form.getValues(field as any);
      if (current !== request[field]) {
        form.setValue(field as any, request[field] as any, {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
    }

    const incomingIds = rows.map((row) => row.rowId);
    const structureChanged =
      incomingIds.length !== rowIds.current.length ||
      incomingIds.some((id, index) => id !== rowIds.current[index]);

    if (structureChanged) {
      const currentRows =
        ((form.getValues(arrayName as any) as unknown as Record<string, unknown>[]) ??
          []);
      const localFiles = new Map<string, Record<string, File>>();
      rowIds.current.forEach((id, index) => {
        const files: Record<string, File> = {};
        for (const field of Object.keys(mediaFields)) {
          const value = currentRows[index]?.[field];
          if (value instanceof File) files[field] = value;
        }
        localFiles.set(id, files);
      });
      replaceRows(
        rows.map((row) => {
          const local = { ...emptyRow };
          for (const field of textFields) {
            local[field] = String(row[field as keyof SharedRow] ?? "");
          }
          Object.assign(local, localFiles.get(row.rowId));
          return local;
        })
      );
      rowIds.current = incomingIds;
    } else {
      rows.forEach((row, index) => {
        for (const field of textFields) {
          const path = `${arrayName}.${index}.${field}`;
          const value = String(row[field as keyof SharedRow] ?? "");
          if (form.getValues(path as any) !== value) {
            form.setValue(path as any, value as any, {
              shouldDirty: false,
              shouldValidate: false,
            });
          }
        }
      });
    }

    queueMicrotask(() => {
      applyingRemote.current = false;
    });
  }, [
    arrayName,
    collaboration,
    emptyRow,
    form,
    mediaFields,
    replaceRows,
    textFields,
  ]);

  useEffect(() => {
    if (!collaboration) return;
    const subscription = form.watch((values, info) => {
      if (applyingRemote.current || !info.name) return;
      const name = info.name;
      if (REQUEST_FIELDS.includes(name as keyof SharedRequest)) {
        collaboration.updateRequest(
          name as keyof SharedRequest,
          String((values as Record<string, unknown>)[name] ?? "")
        );
        return;
      }

      const match = name.match(
        new RegExp(`^${arrayName}\\.(\\d+)\\.([a-zA-Z0-9]+)$`)
      );
      if (!match) return;
      const index = Number(match[1]);
      const field = match[2];
      const rowId = rowIds.current[index];
      if (!rowId) return;
      const rows = (values as Record<string, unknown>)[arrayName] as
        | Record<string, unknown>[]
        | undefined;
      const value = rows?.[index]?.[field];

      if (textFields.includes(field)) {
        collaboration.updateRow(
          rowId,
          field as keyof SharedRow,
          String(value ?? "")
        );
      } else if (mediaFields[field] && collaboration.isOwner) {
        collaboration.updateRow(
          rowId,
          mediaFields[field],
          value instanceof File
        );
      }
    });
    return () => subscription.unsubscribe();
  }, [arrayName, collaboration, form, mediaFields, textFields]);

  const addRow = useCallback(
    (at?: number) => {
      if (!collaboration) return false;
      collaboration.addRow(at);
      return true;
    },
    [collaboration]
  );

  const removeRow = useCallback(
    (index: number) => {
      if (!collaboration) return false;
      const rowId = rowIds.current[index];
      if (rowId) collaboration.removeRow(rowId);
      return true;
    },
    [collaboration]
  );

  const ensureRows = useCallback(
    (count: number) => {
      if (!collaboration) return false;
      const missing = count - collaboration.snapshot.rows.length;
      for (let index = 0; index < missing; index++) collaboration.addRow();
      return true;
    },
    [collaboration]
  );

  const mediaStatus = useCallback(
    (index: number, field: string) => {
      const statusField = mediaFields[field];
      return Boolean(
        collaboration &&
          statusField &&
          collaboration.snapshot.rows[index]?.[statusField]
      );
    },
    [collaboration, mediaFields]
  );

  return useMemo(
    () => ({
      collaboration,
      addRow,
      removeRow,
      ensureRows,
      mediaStatus,
      setSelection: collaboration?.setSelection,
    }),
    [
      addRow,
      collaboration,
      ensureRows,
      mediaStatus,
      removeRow,
    ]
  );
}

