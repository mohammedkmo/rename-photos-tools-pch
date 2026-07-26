import { NextResponse } from "next/server";
import {
  acceptsRequest,
  isValidRoomId,
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

  const response = NextResponse.json({ left: true });
  response.cookies.set(roomCookieName(body.roomId), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

