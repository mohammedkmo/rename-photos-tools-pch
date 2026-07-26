import {
  LiveList,
  LiveObject,
  toPlainLson,
  type PlainLsonObject,
} from "@liveblocks/client";
import {
  EMPTY_REQUEST,
  EMPTY_SHARED_ROW,
  type RoomSnapshot,
  type SharedRequest,
  type SharedRow,
  type SheetKind,
} from "@/lib/collaboration/types";

const MAX_ROWS = 500;
const MAX_VALUE_LENGTH = 2_000;
const REQUEST_FIELDS = Object.keys(EMPTY_REQUEST) as (keyof SharedRequest)[];
const ROW_FIELDS = Object.keys(EMPTY_SHARED_ROW) as (keyof typeof EMPTY_SHARED_ROW)[];

const text = (value: unknown) =>
  typeof value === "string" ? value.slice(0, MAX_VALUE_LENGTH) : "";

export const sanitizeSnapshot = (
  kind: SheetKind,
  input: unknown
): RoomSnapshot => {
  const candidate =
    input && typeof input === "object"
      ? (input as { request?: unknown; rows?: unknown })
      : {};
  const rawRequest =
    candidate.request && typeof candidate.request === "object"
      ? (candidate.request as Record<string, unknown>)
      : {};
  const request = { ...EMPTY_REQUEST };
  for (const field of REQUEST_FIELDS) request[field] = text(rawRequest[field]);

  const inputRows = Array.isArray(candidate.rows)
    ? candidate.rows.slice(0, MAX_ROWS)
    : [];
  const rows = (inputRows.length ? inputRows : [{}]).map((raw) => {
    const candidateRow =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const row = {
      ...EMPTY_SHARED_ROW,
      rowId:
        typeof candidateRow.rowId === "string" &&
        /^[a-zA-Z0-9-]{8,64}$/.test(candidateRow.rowId)
          ? candidateRow.rowId
          : crypto.randomUUID(),
    } as SharedRow;
    for (const field of ROW_FIELDS) {
      if (field.startsWith("media")) {
        row[field] = Boolean(candidateRow[field]) as never;
      } else {
        row[field] = text(candidateRow[field]) as never;
      }
    }
    return row;
  });

  return { kind, request, rows };
};

export const snapshotToPlainLson = (snapshot: RoomSnapshot): PlainLsonObject =>
  toPlainLson(
    new LiveObject({
      kind: snapshot.kind,
      request: new LiveObject(snapshot.request),
      rows: new LiveList(snapshot.rows.map((row) => new LiveObject(row))),
    })
  ) as PlainLsonObject;
