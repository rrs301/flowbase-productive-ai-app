"use client";

import "@/liveblocks.config";

import { LiveblocksProvider } from "@liveblocks/react";
import { ReactNode } from "react";

export function LiveblocksAppProvider({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      resolveUsers={async ({ userIds }) => {
        const response = await fetch("/api/liveblocks-users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds }),
        });

        if (!response.ok) return [];

        return response.json();
      }}
    >
      {children}
    </LiveblocksProvider>
  );
}
