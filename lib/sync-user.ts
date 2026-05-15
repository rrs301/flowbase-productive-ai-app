import "server-only";

import { currentUser } from "@clerk/nextjs/server";

import { db, users } from "@/db";
import { getLiveblocksUserId, normalizeCollaborationEmail } from "@/lib/liveblocks";

export async function syncCurrentUserToDatabase() {
  const user = await currentUser();

  const email = user?.primaryEmailAddress?.emailAddress;
  const clerkId = user?.id;

  if (!email || !clerkId) {
    return;
  }

  const normalizedEmail = normalizeCollaborationEmail(email);
  const name =
    user.fullName ||
    user.username ||
    normalizedEmail.split("@")[0] ||
    null;

  await db
    .insert(users)
    .values({
      clerkId,
      email: normalizedEmail,
      liveblocksId: getLiveblocksUserId(normalizedEmail),
      name,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email: normalizedEmail,
        liveblocksId: getLiveblocksUserId(normalizedEmail),
        name,
      },
    });
}
