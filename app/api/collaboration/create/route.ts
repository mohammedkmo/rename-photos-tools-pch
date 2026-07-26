import { NextResponse } from "next/server";
import {
  cookieOptions,
  acceptsRequest,
  getLiveblocks,
  mintAccessToken,
  roomCookieName,
} from "@/lib/collaboration/server";
import {
  sanitizeSnapshot,
  snapshotToPlainLson,
} from "@/lib/collaboration/storage";
import type { SheetKind } from "@/lib/collaboration/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!acceptsRequest(request)) {
      return NextResponse.json({ error: "Request rejected." }, { status: 413 });
    }
    const body = (await request.json()) as { kind?: unknown; snapshot?: unknown };
    if (body.kind !== "personal" && body.kind !== "vehicles") {
      return NextResponse.json({ error: "Invalid sheet type." }, { status: 400 });
    }

    const kind = body.kind as SheetKind;
    const roomId = `hfyc-${kind}-${crypto.randomUUID()}`;
    const liveblocks = getLiveblocks();
    const snapshot = sanitizeSnapshot(kind, body.snapshot);

    await liveblocks.createRoom(roomId, {
      defaultAccesses: [],
      metadata: {
        kind,
        createdAt: new Date().toISOString(),
        shareVersion: "1",
      },
    });
    await liveblocks.initializeStorageDocument(
      roomId,
      snapshotToPlainLson(snapshot)
    );

    const ownerToken = mintAccessToken(roomId, "owner", kind);
    const shareToken = mintAccessToken(roomId, "editor", kind);
    const response = NextResponse.json({ roomId, kind, shareToken });
    response.cookies.set(roomCookieName(roomId), ownerToken, cookieOptions);
    return response;
  } catch (error) {
    console.error("Unable to create collaboration room", error);
    return NextResponse.json(
      { error: "Collaboration is not configured or the room could not be created." },
      { status: 503 }
    );
  }
}
