import type { JsonObject } from "@liveblocks/client";

export type KanbanPresence = JsonObject & {
  status?: "active";
};

export type LiveblocksUserInfo = JsonObject & {
  name?: string;
  email: string;
  color: string;
  initials: string;
};

export type KanbanThreadMetadata = {
  kind: "kanban-task";
  boardId: number;
  taskId: number;
};

declare global {
  interface Liveblocks {
    Presence: KanbanPresence;
    UserMeta: {
      id: string;
      info: LiveblocksUserInfo;
    };
    RoomEvent: never;
    ThreadMetadata: KanbanThreadMetadata;
    CommentMetadata: never;
  }
}

export {};
