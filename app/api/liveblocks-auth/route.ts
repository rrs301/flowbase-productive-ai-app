import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { db, kanbanBoardShares, kanbanBoards, users } from "@/db";
import {
  createLiveblocksClient,
  getAvatarColor,
  getInitials,
  getLiveblocksUserId,
  normalizeCollaborationEmail,
} from "@/lib/liveblocks";

function parseKanbanRoomId(room?: string) {
  const match = room?.match(/^kanban-board:(\d+)$/);
  return match ? Number(match[1]) : null;
}

export async function POST(request: Request) {
  const { room } = (await request.json().catch(() => ({}))) as { room?: string };
  const boardId = parseKanbanRoomId(room);

  if (!room || !boardId) {
    return new Response("Invalid Liveblocks room.", { status: 400 });
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress;
  const clerkId = clerkUser?.id;

  if (!email || !clerkId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const normalizedEmail = normalizeCollaborationEmail(email);
  const liveblocksId = getLiveblocksUserId(normalizedEmail);
  const name = clerkUser.fullName || clerkUser.username || normalizedEmail.split("@")[0] || null;

  const [databaseUser] = await db
    .insert(users)
    .values({ clerkId, email: normalizedEmail, liveblocksId, name })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: { email: normalizedEmail, liveblocksId, name },
    })
    .returning({ id: users.id });

  await db
    .update(kanbanBoardShares)
    .set({ acceptedUserId: databaseUser.id, updatedAt: new Date() })
    .where(and(eq(kanbanBoardShares.email, normalizedEmail), eq(kanbanBoardShares.role, "editor")));

  const ownedBoard = await db.query.kanbanBoards.findFirst({
    where: and(eq(kanbanBoards.id, boardId), eq(kanbanBoards.userId, databaseUser.id)),
  });
  const sharedBoard = ownedBoard
    ? null
    : await db.query.kanbanBoardShares.findFirst({
        where: and(eq(kanbanBoardShares.boardId, boardId), eq(kanbanBoardShares.email, normalizedEmail), eq(kanbanBoardShares.role, "editor")),
      });

  if (!ownedBoard && !sharedBoard) {
    return new Response("Forbidden", { status: 403 });
  }

  const session = createLiveblocksClient().prepareSession(liveblocksId, {
    userInfo: {
      name: name ?? normalizedEmail,
      email: normalizedEmail,
      color: getAvatarColor(normalizedEmail),
      initials: getInitials(name ?? normalizedEmail),
    },
  });

  session.allow(room, session.FULL_ACCESS);
  const response = await session.authorize();

  return new Response(response.body, { status: response.status });
}
