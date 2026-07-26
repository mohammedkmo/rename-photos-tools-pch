import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { Liveblocks } from "@liveblocks/node";
import type {
  CollaborationRole,
  CollaborationUserInfo,
  SheetKind,
} from "@/lib/collaboration/types";

const ACCESS_DAYS = 30;
const SHARE_DAYS = 30;
const COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#d97706",
  "#059669", "#0891b2", "#4f46e5", "#c2410c",
];
const ADJECTIVES = [
  "Bright", "Calm", "Clever", "Kind", "Quick", "Sunny",
  "Brave", "Curious", "Gentle", "Lucky", "Quiet", "Wise",
];
const NOUNS = [
  "Falcon", "River", "Cedar", "Comet", "Panda", "Fox",
  "Otter", "Orchid", "Maple", "Dolphin", "Sparrow", "Turtle",
];

type AccessPayload = {
  roomId: string;
  role: CollaborationRole;
  kind: SheetKind;
  exp: number;
  version: 1;
};

type GuestPayload = {
  guestId: string;
  exp: number;
};

const requiredSecret = () => {
  const secret = process.env.COLLABORATION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("COLLABORATION_SECRET must contain at least 32 characters.");
  }
  return secret;
};

export const getLiveblocks = () => {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret?.startsWith("sk_")) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is not configured.");
  }
  return new Liveblocks({ secret });
};

const encode = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

const signatureFor = (encoded: string) =>
  createHmac("sha256", requiredSecret()).update(encoded).digest("base64url");

const sign = (value: object) => {
  const encoded = encode(value);
  return `${encoded}.${signatureFor(encoded)}`;
};

const verify = <T extends { exp: number }>(token: string | undefined): T | null => {
  if (!token) return null;
  const [encoded, supplied] = token.split(".");
  if (!encoded || !supplied) return null;
  const expected = signatureFor(encoded);
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as T;
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
};

export const roomCookieName = (roomId: string) =>
  `hfyc_room_${roomId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64)}`;

export const GUEST_COOKIE = "hfyc_collaboration_guest";

export const isValidRoomId = (roomId: unknown): roomId is string =>
  typeof roomId === "string" &&
  /^hfyc-(personal|vehicles)-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    roomId
  );

export const acceptsRequest = (request: Request, maxBytes = 1_000_000) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return false;
  const size = Number(request.headers.get("content-length") || "0");
  return Number.isFinite(size) && size <= maxBytes;
};

export const mintAccessToken = (
  roomId: string,
  role: CollaborationRole,
  kind: SheetKind
) =>
  sign({
    roomId,
    role,
    kind,
    version: 1,
    exp: Date.now() + (role === "owner" ? ACCESS_DAYS : SHARE_DAYS) * 86_400_000,
  } satisfies AccessPayload);

export const readAccessToken = (
  token: string | undefined,
  roomId: string
): AccessPayload | null => {
  const payload = verify<AccessPayload>(token);
  return payload?.roomId === roomId && payload.version === 1 ? payload : null;
};

export const createGuestToken = () =>
  sign({
    guestId: randomBytes(16).toString("base64url"),
    exp: Date.now() + ACCESS_DAYS * 86_400_000,
  } satisfies GuestPayload);

export const readGuestToken = (token: string | undefined) =>
  verify<GuestPayload>(token);

const stableNumber = (value: string) => {
  const digest = createHmac("sha256", requiredSecret()).update(value).digest();
  return digest.readUInt32BE(0);
};

export const identityFor = (
  guestId: string,
  role: CollaborationRole
): CollaborationUserInfo => {
  const number = stableNumber(guestId);
  return {
    name: `${ADJECTIVES[number % ADJECTIVES.length]} ${
      NOUNS[Math.floor(number / ADJECTIVES.length) % NOUNS.length]
    }`,
    color: COLORS[number % COLORS.length],
    avatar: `/avatars/guest-${String((number % 12) + 1).padStart(2, "0")}.svg`,
    role,
  };
};

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ACCESS_DAYS * 86_400,
};
