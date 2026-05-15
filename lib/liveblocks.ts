import "server-only";

import { createHash } from "crypto";

import { Liveblocks } from "@liveblocks/node";
export { getBoardRoomId } from "@/lib/liveblocks-room";

export function normalizeCollaborationEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getLiveblocksUserId(email: string) {
  const normalizedEmail = normalizeCollaborationEmail(email);
  const digest = createHash("sha256").update(normalizedEmail).digest("hex").slice(0, 24);

  return `user:${digest}`;
}

export function getAvatarColor(seed: string) {
  const colors = ["#d97757", "#2f8f74", "#d99a20", "#3b82a6", "#8b5cf6", "#dc5f7c"];
  const total = seed.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);

  return colors[total % colors.length];
}

export function getInitials(nameOrEmail: string) {
  const [name] = nameOrEmail.split("@");
  const parts = name.replace(/[._-]+/g, " ").split(" ").filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

  return initials || nameOrEmail[0]?.toUpperCase() || "?";
}

export function createLiveblocksClient() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;

  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is required for Kanban collaboration.");
  }

  return new Liveblocks({ secret });
}
