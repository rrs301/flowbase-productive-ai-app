import { inArray } from "drizzle-orm";

import { db, users } from "@/db";
import { getAvatarColor, getInitials } from "@/lib/liveblocks";

export async function POST(request: Request) {
  const { userIds } = (await request.json().catch(() => ({}))) as { userIds?: string[] };
  const ids = Array.isArray(userIds) ? userIds.filter(Boolean) : [];

  if (ids.length === 0) {
    return Response.json([]);
  }

  const records = await db.query.users.findMany({ where: inArray(users.liveblocksId, ids) });
  const byLiveblocksId = new Map(records.map((user) => [user.liveblocksId, user]));

  return Response.json(
    ids.map((id) => {
      const user = byLiveblocksId.get(id);
      const display = user?.name || user?.email || "Collaborator";

      return {
        name: display,
        email: user?.email || "",
        color: getAvatarColor(user?.email || id),
        initials: getInitials(display),
      };
    }),
  );
}
