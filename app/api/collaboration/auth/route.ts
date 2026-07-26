import { cookies } from "next/headers";
import {
  cookieOptions,
  acceptsRequest,
  createGuestToken,
  getLiveblocks,
  GUEST_COOKIE,
  identityFor,
  isValidRoomId,
  readAccessToken,
  readGuestToken,
  roomCookieName,
} from "@/lib/collaboration/server";

export const runtime = "nodejs";

const serializeCookie = (name: string, value: string) => {
  const secure = cookieOptions.secure ? "; Secure" : "";
  return `${name}=${value}; Path=/; Max-Age=${cookieOptions.maxAge}; HttpOnly; SameSite=Lax${secure}`;
};

export async function POST(request: Request) {
  try {
    if (!acceptsRequest(request, 16_000)) {
      return new Response("Request rejected.", { status: 413 });
    }
    const body = (await request.json()) as {
      room?: unknown;
      roomId?: unknown;
    };
    const roomId =
      typeof body.room === "string"
        ? body.room
        : typeof body.roomId === "string"
          ? body.roomId
          : "";
    if (!isValidRoomId(roomId)) {
      return new Response("Invalid room.", { status: 400 });
    }

    const accessToken = cookies().get(roomCookieName(roomId))?.value;
    const access = readAccessToken(accessToken, roomId);
    if (!access) return new Response("Forbidden", { status: 403 });

    let guestToken = cookies().get(GUEST_COOKIE)?.value;
    let guest = readGuestToken(guestToken);
    let setGuestCookie = false;
    if (!guest) {
      guestToken = createGuestToken();
      guest = readGuestToken(guestToken);
      setGuestCookie = true;
    }
    if (!guest) return new Response("Unable to create guest.", { status: 500 });

    const liveblocks = getLiveblocks();
    const session = liveblocks.prepareSession(guest.guestId, {
      userInfo: identityFor(guest.guestId, access.role),
    });
    session.allow(roomId, ["*:write"]);
    const { body: authBody, status } = await session.authorize();
    const headers = new Headers({ "Content-Type": "application/json" });
    if (setGuestCookie && guestToken) {
      headers.set("Set-Cookie", serializeCookie(GUEST_COOKIE, guestToken));
    }
    return new Response(authBody, { status, headers });
  } catch (error) {
    console.error("Unable to authorize collaboration session", error);
    return new Response("Collaboration is not configured.", { status: 503 });
  }
}
