"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LiveList, LiveObject } from "@liveblocks/client";
import { LiveblocksProvider } from "@liveblocks/react";
import {
  ClientSideSuspense,
  RoomProvider,
  useMutation,
  useOthers,
  useSelf,
  useStorage,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import {
  createSharedRow,
  EMPTY_REQUEST,
  type CollaborationRole,
  type CollaborationUserInfo,
  type RoomSnapshot,
  type SharedRequest,
  type SharedRow,
  type SheetKind,
} from "@/lib/collaboration/types";

interface CollaborationContextValue {
  roomId: string;
  kind: SheetKind;
  role: CollaborationRole;
  isOwner: boolean;
  snapshot: RoomSnapshot;
  people: Array<{ id: string; info: CollaborationUserInfo; isSelf: boolean }>;
  updateRequest: (field: keyof SharedRequest, value: string) => void;
  updateRow: (
    rowId: string,
    field: keyof SharedRow,
    value: string | boolean
  ) => void;
  addRow: (at?: number) => string;
  removeRow: (rowId: string) => void;
  setSelection: (selection: { row: number; col: number } | null) => void;
}

const CollaborationContext =
  createContext<CollaborationContextValue | null>(null);

export const useCollaboration = () => useContext(CollaborationContext);

type SessionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; role: CollaborationRole; kind: SheetKind };

async function acceptInvitation(roomId: string) {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const token = fragment.get("access");
  if (!token) return;
  const response = await fetch("/api/collaboration/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, token }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "This invitation could not be accepted.");
  }
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`
  );
}

function CollaborationGate({
  roomId,
  expectedKind,
  children,
}: {
  roomId: string;
  expectedKind: SheetKind;
  children: ReactNode;
}) {
  const [session, setSession] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        await acceptInvitation(roomId);
        const response = await fetch("/api/collaboration/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          role?: CollaborationRole;
          kind?: SheetKind;
        };
        if (!response.ok || !data.role || !data.kind) {
          throw new Error(data.error || "You do not have access to this sheet.");
        }
        if (data.kind !== expectedKind) {
          throw new Error("This shared room belongs to a different sheet.");
        }
        if (active) {
          setSession({ status: "ready", role: data.role, kind: data.kind });
        }
      } catch (error) {
        if (active) {
          setSession({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "This shared sheet could not be opened.",
          });
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [expectedKind, roomId]);

  if (session.status === "loading") {
    return (
      <div className="flex-1 grid place-items-center bg-pch-surface text-sm text-pch-ink3">
        Opening the shared sheet…
      </div>
    );
  }
  if (session.status === "error") {
    return (
      <div className="flex-1 grid place-items-center bg-pch-surface px-6">
        <div className="max-w-md text-center">
          <p className="font-semibold text-pch-ink">Shared sheet unavailable</p>
          <p className="mt-2 text-sm text-pch-ink3">{session.message}</p>
        </div>
      </div>
    );
  }

  return (
    <LiveblocksProvider authEndpoint="/api/collaboration/auth">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, selection: null }}
        initialStorage={{
          kind: expectedKind,
          request: new LiveObject(EMPTY_REQUEST),
          rows: new LiveList([new LiveObject(createSharedRow())]),
        }}
      >
        <ClientSideSuspense
          fallback={
            <div className="flex-1 grid place-items-center bg-pch-surface text-sm text-pch-ink3">
              Connecting collaborators…
            </div>
          }
        >
          <CollaborationRuntime
            roomId={roomId}
            kind={session.kind}
            role={session.role}
          >
            {children}
          </CollaborationRuntime>
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}

function CollaborationRuntime({
  roomId,
  kind,
  role,
  children,
}: {
  roomId: string;
  kind: SheetKind;
  role: CollaborationRole;
  children: ReactNode;
}) {
  const root = useStorage((storage) => ({
    kind: storage.kind,
    request: { ...storage.request },
    rows: storage.rows.map((row) => ({ ...row })),
  }));
  const others = useOthers();
  const self = useSelf();
  const updatePresence = useUpdateMyPresence();
  const frame = useRef<number>();

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        updatePresence({ cursor: { x: event.clientX, y: event.clientY } });
      });
    };
    const leave = () => updatePresence({ cursor: null });
    window.addEventListener("pointermove", move);
    document.documentElement.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("mouseleave", leave);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [updatePresence]);

  const updateRequest = useMutation(
    ({ storage }, field: keyof SharedRequest, value: string) => {
      storage.get("request").set(field, value.slice(0, 2_000));
    },
    []
  );

  const updateRow = useMutation(
    (
      { storage },
      rowId: string,
      field: keyof SharedRow,
      value: string | boolean
    ) => {
      const rows = storage.get("rows");
      let row: LiveObject<SharedRow> | undefined;
      for (let index = 0; index < rows.length; index++) {
        const candidate = rows.get(index);
        if (candidate?.get("rowId") === rowId) {
          row = candidate;
          break;
        }
      }
      if (!row || field === "rowId") return;
      row.set(
        field,
        (typeof value === "string" ? value.slice(0, 2_000) : value) as never
      );
    },
    []
  );

  const addRow = useMutation(({ storage }, at?: number) => {
    const row = createSharedRow();
    const rows = storage.get("rows");
    rows.insert(new LiveObject(row), at ?? rows.length);
    return row.rowId;
  }, []);

  const removeRow = useMutation(({ storage }, rowId: string) => {
    const rows = storage.get("rows");
    if (rows.length <= 1) return;
    let index = -1;
    for (let candidateIndex = 0; candidateIndex < rows.length; candidateIndex++) {
      if (rows.get(candidateIndex)?.get("rowId") === rowId) {
        index = candidateIndex;
        break;
      }
    }
    if (index >= 0) rows.delete(index);
  }, []);

  const people = useMemo(() => {
    const list = others
      .filter((person) => person.info)
      .map((person) => ({
        id: person.id,
        info: person.info as CollaborationUserInfo,
        isSelf: false,
      }));
    if (self?.info) {
      list.unshift({
        id: self.id,
        info: self.info as CollaborationUserInfo,
        isSelf: true,
      });
    }
    return list;
  }, [others, self]);

  const value = useMemo<CollaborationContextValue>(
    () => ({
      roomId,
      kind,
      role,
      isOwner: role === "owner",
      snapshot: {
        kind: root.kind,
        request: root.request,
        rows: root.rows,
      },
      people,
      updateRequest,
      updateRow,
      addRow,
      removeRow,
      setSelection: (selection) => updatePresence({ selection }),
    }),
    [
      addRow,
      kind,
      people,
      removeRow,
      role,
      roomId,
      root,
      updatePresence,
      updateRequest,
      updateRow,
    ]
  );

  return (
    <CollaborationContext.Provider value={value}>
      {children}
      <LiveCursors />
    </CollaborationContext.Provider>
  );
}

function LiveCursors() {
  const others = useOthers();
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {others.map((person) => {
        const cursor = person.presence.cursor;
        if (!cursor || !person.info) return null;
        return (
          <div
            key={person.connectionId}
            className="absolute transition-transform duration-75 ease-out"
            style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
          >
            <svg
              width="18"
              height="22"
              viewBox="0 0 18 22"
              fill="none"
              className="-translate-x-0.5 -translate-y-0.5 drop-shadow-sm"
            >
              <path
                d="M2 1.5 16 12l-7 .9L5.5 20 2 1.5Z"
                fill={person.info.color}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="ms-3 -mt-1 block w-max rounded-md px-2 py-1 text-[11px] font-semibold text-white shadow-sm"
              style={{ backgroundColor: person.info.color }}
            >
              {person.info.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function CollaborationRoom({
  roomId,
  kind,
  children,
}: {
  roomId?: string;
  kind: SheetKind;
  children: ReactNode;
}) {
  if (!roomId) return children;
  return (
    <CollaborationGate roomId={roomId} expectedKind={kind}>
      {children}
    </CollaborationGate>
  );
}
