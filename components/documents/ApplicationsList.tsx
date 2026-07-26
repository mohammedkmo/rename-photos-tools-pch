"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Car, ChevronDown, Plus, Trash2, UserRound, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteDocument,
  listDocuments,
  newDocumentId,
  type DocumentKind,
  type DocumentMeta,
} from "@/lib/documents";
import { intlLocale } from "@/lib/helpers";
import { cn } from "@/lib/utils";

/**
 * A miniature, abstract spreadsheet drawn from the application's real row
 * count. It is the card's "file preview": what you see is a small picture of
 * what will open.
 */
function SheetThumbnail({ item }: { item: DocumentMeta }) {
  const rows = Math.max(1, Math.min(item.rowCount, 4));
  const overflow = item.rowCount - rows;
  const Icon = item.kind === "personal" ? UserRound : Car;

  return (
    <div className="relative h-28 overflow-hidden rounded-t-[11px] bg-pch-subtle border-b border-pch-line px-5 pt-5">
      <div className="mx-auto overflow-hidden rounded-t-md border border-b-0 border-pch-line2 bg-white shadow-[0_1px_3px_rgba(10,37,64,0.06)]">
        {/* header band */}
        <div className="flex h-4 items-stretch gap-px bg-pch-subtle border-b border-pch-line px-1.5 py-1">
          <span className="w-6 rounded-[2px] bg-pch-line2/70" />
          <span className="ms-1 w-10 rounded-[2px] bg-pch-line2/50" />
          <span className="ms-1 w-8 rounded-[2px] bg-pch-line2/50" />
        </div>
        {/* data rows */}
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex h-[18px] items-center gap-2 border-b border-pch-line px-2 last:border-b-0">
            <span className="h-1.5 w-6 rounded-full bg-pch-accent/25" />
            <span className="h-1.5 flex-1 max-w-[4.5rem] rounded-full bg-pch-line2/80" />
            <span className="h-1.5 w-5 rounded-full bg-pch-line2/50" />
          </div>
        ))}
      </div>

      {overflow > 0 && (
        <span className="absolute bottom-2 start-5 font-mono text-[10px] font-medium text-pch-ink3 tabular-nums">
          +{overflow}
        </span>
      )}

      <span className="absolute bottom-2 end-2 flex h-6 w-6 items-center justify-center rounded-md bg-white border border-pch-line text-pch-ink2 shadow-[0_1px_2px_rgba(10,37,64,0.08)]">
        <Icon className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

/** Overlapping stack of the guest avatars used by live collaboration. */
function AvatarStack({ count = 3, size = 24 }: { count?: number; size?: number }) {
  return (
    <span className="flex -space-x-2 rtl:space-x-reverse">
      {Array.from({ length: count }).map((_, index) => (
        <Image
          key={index}
          src={`/avatars/guest-${String(index + 2).padStart(2, "0")}.svg`}
          alt=""
          width={size}
          height={size}
          className="rounded-full ring-2 ring-white"
        />
      ))}
    </span>
  );
}

export default function ApplicationsList() {
  const t = useTranslations("documents");
  const locale = useLocale();
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentMeta[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [choosingKind, setChoosingKind] = useState(false);

  useEffect(() => {
    listDocuments().then(setDocuments);
  }, []);

  const hrefFor = (kind: DocumentKind, id: string) =>
    `/${locale}/${kind === "personal" ? "personal" : "vehicles"}?doc=${id}`;

  const create = (kind: DocumentKind) => router.push(hrefFor(kind, newDocumentId()));

  const remove = async (id: string) => {
    await deleteDocument(id);
    setDocuments((current) => current?.filter((item) => item.id !== id) ?? null);
    setPendingDelete(null);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(intlLocale(locale), { day: "numeric", month: "short" });

  const CreateMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 h-9 ps-3.5 pe-3 rounded-lg bg-pch-action text-white text-[13px] font-semibold tracking-tight shadow-[0_1px_2px_rgba(0,0,0,0.22)] hover:bg-pch-actionInk transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("newShort")}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        <DropdownMenuItem onSelect={() => create("personal")} className="gap-2.5">
          <UserRound className="h-4 w-4 text-pch-ink3" />
          {t("typePersonal")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => create("vehicles")} className="gap-2.5">
          <Car className="h-4 w-4 text-pch-ink3" />
          {t("typeVehicles")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  /** In the empty state the choice IS the content: two equal tiles, no fake hierarchy. */
  const KindTile = ({ kind }: { kind: DocumentKind }) => {
    const Icon = kind === "personal" ? UserRound : Car;
    return (
      <button
        type="button"
        onClick={() => create(kind)}
        className="group flex w-52 flex-col items-center gap-2.5 rounded-xl bg-pch-ground/60 hover:bg-pch-ground px-5 py-5 transition-all "
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-lg text-pch-ink3 group-hover:text-pch-ink transition-colors ">
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-[13.5px] font-semibold text-pch-ink3 group-hover:text-pch-ink">
          {kind === "personal" ? t("typePersonal") : t("typeVehicles")}
        </span>
        <span className="text-[12px] text-pch-ink3">
          {kind === "personal" ? t("newPersonalHint") : t("newVehiclesHint")}
        </span>
      </button>
    );
  };

  if (documents === null) {
    return <div className="flex-1" aria-busy="true" />;
  }

  if (documents.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 pb-10 text-center">
        {/* An empty sheet with people arriving on it: what the tool is, in one image */}
        <div className="relative">
          <div className="w-56 overflow-hidden rounded-lg border border-pch-line2 bg-white shadow-[0_10px_30px_-12px_rgba(10,37,64,0.25)]">
            <div className="flex h-6 items-center gap-1 border-b border-pch-line bg-pch-subtle px-2">
              <span className="h-1.5 w-8 rounded-full bg-pch-line2" />
              <span className="h-1.5 w-5 rounded-full bg-pch-line2/60" />
            </div>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex h-7 items-center gap-2 border-b border-pch-line px-2.5 last:border-b-0">
                <span className="h-1.5 w-7 rounded-full bg-pch-accent/25" />
                <span className={cn("h-1.5 rounded-full bg-pch-line2/80", index % 2 ? "w-16" : "w-24")} />
              </div>
            ))}
          </div>
          <span className="absolute -bottom-3 -end-5">
            <AvatarStack count={3} size={28} />
          </span>
        </div>

        <h1 className="mt-8 text-[22px] font-semibold tracking-[-0.02em] text-pch-ink">
          {t("emptyTitle")}
        </h1>
        <p className="mt-1.5 max-w-[24rem] text-[13.5px] leading-relaxed text-pch-ink3">
          {t("emptyBody")}
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <KindTile kind="personal" />
          <KindTile kind="vehicles" />
        </div>

        <p className="mt-8 flex items-center gap-2 text-[12.5px] text-pch-ink3">
          <Users className="h-3.5 w-3.5" />
          {t("collabHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-none px-6 pt-4 pb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[14rem]">
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-pch-ink ms-1">
              {t("title")}
            </h1>
            <p className="mt-0.5 ms-1 text-[12.5px] text-pch-ink3">
              {t("subtitle", { count: documents.length })}
            </p>
          </div>
          <CreateMenu />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="grid gap-4 px-6 pb-4 pt-1 grid-cols-[repeat(auto-fill,minmax(15.5rem,1fr))]">
          {documents.map((item) => {
            const confirming = pendingDelete === item.id;
            return (
              <Link
                key={item.id}
                href={hrefFor(item.kind, item.id)}
                className="group relative rounded-xl border border-pch-line2 bg-white transition-all hover:border-pch-ink3 hover:shadow-[0_10px_24px_-14px_rgba(10,37,64,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-pch-accent"
              >
                <SheetThumbnail item={item} />

                <div className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[13px] font-semibold tracking-tight text-pch-ink">
                      {item.name}
                    </span>
                    <span className="shrink-0 text-[11.5px] text-pch-ink3 tabular-nums">
                      {formatDate(item.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-pch-ink2">
                    {item.contractor || <span className="italic text-pch-ink3/70">{t("untitled")}</span>}
                  </p>

                  {confirming ? (
                    <div
                      className="mt-2 flex items-center gap-1.5"
                      onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
                    >
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className="h-7 rounded-md bg-pch-stopInk px-2.5 text-[12px] font-semibold text-white hover:brightness-110"
                      >
                        {t("confirmDelete")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(null)}
                        className="h-7 rounded-md px-2 text-[12px] font-medium text-pch-ink2 hover:bg-pch-subtle"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 text-[11.5px] text-pch-ink3 tabular-nums">
                      {item.kind === "personal"
                        ? t("employeeRows", { count: item.rowCount })
                        : t("vehicleRows", { count: item.rowCount })}
                      {" · "}
                      {t("photoShort", { count: item.photoCount })}
                    </p>
                  )}
                </div>

                {!confirming && (
                  <button
                    type="button"
                    title={t("delete")}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setPendingDelete(item.id);
                    }}
                    className="absolute top-2 end-2 rounded-md bg-white/90 p-1.5 text-pch-ink3 opacity-0 shadow-[0_1px_2px_rgba(10,37,64,0.12)] backdrop-blur-sm transition-opacity hover:bg-pch-stopBg hover:text-pch-stopInk group-hover:opacity-100 focus:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </Link>
            );
          })}

          {/* Creating is part of the gallery too: a quiet dashed tile that
              asks which kind on the spot */}
          {choosingKind ? (
            <div className="flex min-h-[11rem] flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-pch-accent/60 px-4">
              <button
                type="button"
                onClick={() => create("personal")}
                className="inline-flex w-full max-w-[11rem] items-center justify-center gap-2 h-9 rounded-lg bg-pch-action text-white text-[12.5px] font-semibold hover:bg-pch-actionInk"
              >
                <UserRound className="h-3.5 w-3.5" />
                {t("typePersonal")}
              </button>
              <button
                type="button"
                onClick={() => create("vehicles")}
                className="inline-flex w-full max-w-[11rem] items-center justify-center gap-2 h-9 rounded-lg border border-pch-line2 bg-white text-[12.5px] font-semibold text-pch-ink2 hover:border-pch-ink3 hover:text-pch-ink"
              >
                <Car className="h-3.5 w-3.5" />
                {t("typeVehicles")}
              </button>
              <button
                type="button"
                onClick={() => setChoosingKind(false)}
                className="mt-1 text-[11.5px] font-medium text-pch-ink3 hover:text-pch-ink2"
              >
                {t("cancel")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setChoosingKind(true)}
              className="flex min-h-[11rem] flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-pch-line2 text-pch-ink3 transition-colors hover:border-pch-accent hover:text-pch-accent"
            >
              <Plus className="h-5 w-5" />
              <span className="text-[12.5px] font-medium">{t("newShort")}</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 px-6 pb-5">
          <p className="text-[12px] text-pch-ink3">{t("storageNote")}</p>
          <p className="flex shrink-0 items-center gap-2 text-[12px] text-pch-ink3">
            <AvatarStack count={3} size={18} />
            {t("collabHintShort")}
          </p>
        </div>
      </div>
    </div>
  );
}
