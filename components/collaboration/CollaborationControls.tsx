"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Check,
  Loader2,
  LockKeyhole,
  LogOut,
  Power,
  Share2,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useCollaboration } from "@/components/collaboration/CollaborationRoom";
import type { RoomSnapshot, SheetKind } from "@/lib/collaboration/types";
import {
  newDocumentId,
  newDocumentName,
  readDocument,
  writeDocument,
  type DocumentMeta,
} from "@/lib/documents";

interface CollaborationControlsProps {
  kind: SheetKind;
  getSnapshot: () => Omit<RoomSnapshot, "kind">;
}

export default function CollaborationControls({
  kind,
  getSnapshot,
}: CollaborationControlsProps) {
  const t = useTranslations("collaboration");
  const collaboration = useCollaboration();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  /**
   * Leaving a room writes the sheet's text back into the local application, so
   * the session's result is a file on the list rather than lost state. Files
   * only ever lived in the room as flags, so any documents already stored with
   * the application are kept by carrying them over row-for-row.
   */
  const persistToDocument = async () => {
    const snapshot = getSnapshot();
    const arrayKey = kind === "personal" ? "employees" : "vehicles";
    const dropFields = new Set([
      "mediaPhoto",
      "mediaIdDocument",
      "mediaDrivingLicense",
      "mediaMoiCard",
      "mediaSenewiyah",
      "mediaWakala",
      "mediaArmoredVehicleCertificate",
      "rowId",
    ]);
    const rows: Record<string, unknown>[] = snapshot.rows.map((row) =>
      Object.fromEntries(
        Object.entries(row as Record<string, unknown>).filter(
          ([field, value]) => !dropFields.has(field) && !(value instanceof File)
        )
      )
    );

    const url = new URL(window.location.href);
    const id = url.searchParams.get("doc") || newDocumentId();
    try {
      const existing = await readDocument(id);
      const storedRows =
        ((existing?.values as Record<string, unknown> | undefined)?.[arrayKey] as
          | Record<string, unknown>[]
          | undefined) ?? [];
      rows.forEach((row, index) => {
        for (const [field, value] of Object.entries(storedRows[index] ?? {})) {
          if (value instanceof File && row[field] === undefined) row[field] = value;
        }
      });

      const now = new Date().toISOString();
      const contractor = String(snapshot.request.contractor ?? "");
      const meta: DocumentMeta = existing?.meta
        ? { ...existing.meta, updatedAt: now, contractor, rowCount: rows.length,
            photoCount: rows.filter((row) => row.photo instanceof File).length }
        : { id, kind, name: newDocumentName(kind), createdAt: now, updatedAt: now,
            contractor, rowCount: rows.length,
            photoCount: rows.filter((row) => row.photo instanceof File).length };

      await writeDocument(meta, { ...snapshot.request, [arrayKey]: rows });
    } catch {
      // Leaving the room must still work if browser storage is unavailable.
    }
    return id;
  };

  const returnToStandaloneSheet = (documentId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    url.searchParams.set("doc", documentId);
    url.hash = "";
    window.location.assign(url.toString());
  };

  const copyShareLink = async () => {
    if (!collaboration?.isOwner) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/collaboration/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: collaboration.roomId }),
      });
      const data = (await response.json()) as {
        shareToken?: string;
        error?: string;
      };
      if (!response.ok || !data.shareToken) {
        throw new Error(data.error || t("error"));
      }
      const link = new URL(window.location.href);
      link.searchParams.set("room", collaboration.roomId);
      link.hash = `access=${encodeURIComponent(data.shareToken)}`;
      await navigator.clipboard.writeText(link.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("error"));
    } finally {
      setBusy(false);
    }
  };

  const startCollaboration = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/collaboration/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, snapshot: getSnapshot() }),
      });
      const data = (await response.json()) as {
        roomId?: string;
        error?: string;
      };
      if (!response.ok || !data.roomId) {
        throw new Error(data.error || t("error"));
      }
      const url = new URL(window.location.href);
      url.searchParams.set("room", data.roomId);
      url.hash = "";
      window.location.assign(url.toString());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("error"));
      setBusy(false);
    }
  };

  const stopCollaboration = async () => {
    if (!collaboration) return;
    if (
      collaboration.isOwner &&
      !window.confirm(t("endConfirm"))
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const documentId = await persistToDocument();
      const response = await fetch(
        collaboration.isOwner
          ? "/api/collaboration/end"
          : "/api/collaboration/leave",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: collaboration.roomId }),
        }
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || t("error"));
      returnToStandaloneSheet(documentId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("error"));
      setBusy(false);
    }
  };

  if (!collaboration) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={startCollaboration}
          disabled={busy}
          title={t("startHint")}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium",
            "border border-pch-line2 bg-white text-pch-ink2 hover:border-pch-accent hover:text-pch-accent",
            "disabled:cursor-wait disabled:opacity-60"
          )}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Users className="h-3.5 w-3.5" />
          )}
          {t("start")}
        </button>
        {error && (
          <span className="absolute start-0 top-9 z-40 w-72 rounded-md border border-pch-stopEdge/30 bg-white p-2 text-[11px] text-pch-stopInk shadow-md">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative ms-auto flex items-center gap-2">
      <div className="flex -space-x-2 rtl:space-x-reverse">
        {collaboration.people.slice(0, 5).map((person) => (
          <span
            key={`${person.id}-${person.isSelf}`}
            title={`${person.info.name}${person.isSelf ? ` (${t("you")})` : ""}`}
            className="relative block h-7 w-7 overflow-hidden rounded-md border-2 border-pch-ground bg-white"
          >
            <Image
              src={person.info.avatar}
              alt={person.info.name}
              width={28}
              height={28}
              className="h-full w-full object-cover"
            />
          </span>
        ))}
      </div>

      <span className="hidden xl:inline-flex items-center gap-1 text-[11.5px] text-pch-ink3">
        <LockKeyhole className="h-3 w-3" />
        {collaboration.isOwner ? t("owner") : t("editor")}
      </span>

      {collaboration.isOwner && (
        <div>
          <button
            type="button"
            onClick={copyShareLink}
            disabled={busy}
            className="inline-flex h-7 items-center gap-1.5 rounded-md bg-pch-action px-2.5 text-[12px] font-semibold text-white hover:bg-pch-actionInk disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Share2 className="h-3.5 w-3.5" />
            )}
            {copied ? t("copied") : t("share")}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={stopCollaboration}
        disabled={busy}
        title={collaboration.isOwner ? t("endHint") : t("leaveHint")}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium",
          "border border-pch-line2 bg-white text-pch-ink2 hover:border-pch-stopEdge hover:text-pch-stopInk",
          "disabled:cursor-wait disabled:opacity-60"
        )}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : collaboration.isOwner ? (
          <Power className="h-3.5 w-3.5" />
        ) : (
          <LogOut className="h-3.5 w-3.5" />
        )}
        {collaboration.isOwner ? t("end") : t("leave")}
      </button>
      {error && (
        <span className="absolute end-0 top-9 z-40 w-72 rounded-md border border-pch-stopEdge/30 bg-white p-2 text-[11px] text-pch-stopInk shadow-md">
          {error}
        </span>
      )}
    </div>
  );
}
