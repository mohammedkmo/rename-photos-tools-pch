import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  acceptsRequest,
  isValidRoomId,
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
  const token = cookies().get(roomCookieName(body.roomId))?.value;
  const access = readAccessToken(token, body.roomId);
  if (!access) {
    return NextResponse.json(
      { error: "Open a valid invitation link to join this sheet." },
      { status: 403 }
    );
  }
  return NextResponse.json({
    roomId: access.roomId,
    kind: access.kind,
    role: access.role,
  });
}
