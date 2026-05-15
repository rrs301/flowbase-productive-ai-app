import "server-only";

import { currentUser } from "@clerk/nextjs/server";

import { db, users } from "@/db";

export async function syncCurrentUserToDatabase() {
  const user = await currentUser();

  const email = user?.primaryEmailAddress?.emailAddress;

  if (!email) {
    return;
  }

  const name =
    user.fullName ||
    user.username ||
    email.split("@")[0] ||
    null;

  await db
    .insert(users)
    .values({
      email,
      name,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name,
      },
    });
}
