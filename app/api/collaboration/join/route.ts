import { NextResponse } from "next/server";
import {
  cookieOptions,
  acceptsRequest,
  isValidRoomId,
  readAccessToken,
  roomCookieName,
} from "@/lib/collaboration/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!acceptsRequest(request, 16_000)) {
      return NextResponse.json({ error: "Request rejected." }, { status: 413 });
    }
    const body = (await request.json()) as {
      roomId?: unknown;
      token?: unknown;
    };
    if (!isValidRoomId(body.roomId) || typeof body.token !== "string") {
      return NextResponse.json({ error: "Invalid invitation." }, { status: 400 });
    }
    const access = readAccessToken(body.token, body.roomId);
    if (!access || access.role !== "editor") {
      return NextResponse.json(
        { error: "This invitation is invalid or has expired." },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      roomId: access.roomId,
      kind: access.kind,
      role: access.role,
    });
    response.cookies.set(roomCookieName(access.roomId), body.token, cookieOptions);
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid invitation." }, { status: 400 });
  }
}
