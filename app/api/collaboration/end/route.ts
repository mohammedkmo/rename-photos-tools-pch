import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  acceptsRequest,
  getLiveblocks,
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

  const cookieName = roomCookieName(body.roomId);
  const access = readAccessToken(cookies().get(cookieName)?.value, body.roomId);
  if (!access || access.role !== "owner") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  try {
    await getLiveblocks().deleteRoom(body.roomId);
    const response = NextResponse.json({ ended: true });
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("Unable to end collaboration room", error);
    return NextResponse.json(
      { error: "The collaboration room could not be closed." },
      { status: 503 }
    );
  }
}

