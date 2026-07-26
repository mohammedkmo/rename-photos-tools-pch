import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  acceptsRequest,
  isValidRoomId,
  mintAccessToken,
  readAccessToken,
  roomCookieName,
} from "@/lib/collaboration/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!acceptsRequest(request, 4_000)) {
    return NextResponse.json({ error: "Request rejected." }, { status: 413 });
  }
  const body = (await request.json().catch(() => null)) as {
    roomId?: unknown;
  } | null;
  if (!body || !isValidRoomId(body.roomId)) {
    return NextResponse.json({ error: "Invalid room." }, { status: 400 });
  }
  const current = cookies().get(roomCookieName(body.roomId))?.value;
  const access = readAccessToken(current, body.roomId);
  if (!access || access.role !== "owner") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }
  return NextResponse.json({
    shareToken: mintAccessToken(body.roomId, "editor", access.kind),
  });
}
