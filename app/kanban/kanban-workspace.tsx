"use client";

import {
  CalendarDays,
  Check,
  Columns3,
  FileText,
  GripVertical,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Share2,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { RoomProvider, useOthers, useSelf, useThreads } from "@liveblocks/react";
import { Composer, Thread } from "@liveblocks/react-ui";
import { FormEvent, ReactNode, useMemo, useState, useTransition } from "react";

import {
  BoardColor,
  createKanbanBoard,
  createKanbanColumn,
  createKanbanTask,
  deleteKanbanBoard,
  deleteKanbanColumn,
  deleteKanbanTask,
  inviteKanbanCollaborator,
  KanbanBoardDTO,
  KanbanColumnDTO,
  KanbanCollaboratorDTO,
  KanbanLabelDTO,
  KanbanTaskDTO,
  moveKanbanTask,
  TaskPriority,
  updateKanbanBoard,
  updateKanbanColumn,
  updateKanbanTask,
} from "@/app/kanban/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBoardRoomId } from "@/lib/liveblocks-room";
import { cn } from "@/lib/utils";

type BoardForm = {
  name: string;
  color: BoardColor;
};

type TaskForm = {
  columnId: number;
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  labelName: string;
  labelColor: KanbanLabelDTO["color"];
  labels: KanbanLabelDTO[];
  syncCalendar: boolean;
  linkNotes: boolean;
};

const boardStyles: Record<BoardColor, { label: string; dot: string; chip: string; soft: string; ring: string }> = {
  sage: { label: "Sage", dot: "bg-sage-600", chip: "bg-sage-100 text-sage-800", soft: "bg-sage-100/70", ring: "ring-sage-400" },
  clay: { label: "Clay", dot: "bg-clay-600", chip: "bg-clay-100 text-clay-800", soft: "bg-clay-100/70", ring: "ring-clay-400" },
  amber: { label: "Amber", dot: "bg-amber-600", chip: "bg-amber-100 text-amber-800", soft: "bg-amber-100/70", ring: "ring-amber-400" },
  sky: { label: "Sky", dot: "bg-sky-500", chip: "bg-sky-100 text-sky-800", soft: "bg-sky-100/70", ring: "ring-sky-400" },
  violet: { label: "Violet", dot: "bg-violet-500", chip: "bg-violet-100 text-violet-800", soft: "bg-violet-100/70", ring: "ring-violet-400" },
};

const priorityStyles: Record<TaskPriority, string> = {
  low: "border-sage-200 bg-sage-100 text-sage-800",
  medium: "border-amber-200 bg-amber-100 text-amber-800",
  high: "border-clay-200 bg-clay-100 text-clay-800",
};

const labelStyles: Record<KanbanLabelDTO["color"], string> = {
  sage: "border-sage-200 bg-sage-100 text-sage-800",
  clay: "border-clay-200 bg-clay-100 text-clay-800",
  amber: "border-amber-200 bg-amber-100 text-amber-800",
  sky: "border-sky-200 bg-sky-100 text-sky-800",
  violet: "border-violet-200 bg-violet-100 text-violet-800",
};

const emptyBoardForm: BoardForm = { name: "", color: "sage" };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function emptyTaskForm(columnId = 0): TaskForm {
  return {
    columnId,
    title: "",
    description: "",
    dueDate: todayKey(),
    priority: "medium",
    labelName: "",
    labelColor: "sage",
    labels: [],
    syncCalendar: false,
    linkNotes: false,
  };
}

export function KanbanWorkspace({ initialBoards }: { initialBoards: KanbanBoardDTO[] }) {
  const [boards, setBoards] = useState(initialBoards);
  const [selectedBoardId, setSelectedBoardId] = useState(initialBoards[0]?.id ?? null);
  const [boardDialogOpen, setBoardDialogOpen] = useState(false);
  const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
  const [boardForm, setBoardForm] = useState<BoardForm>(emptyBoardForm);
  const [columnName, setColumnName] = useState("");
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTaskForm());
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [commentingTask, setCommentingTask] = useState<KanbanTaskDTO | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId) || boards[0] || null,
    [boards, selectedBoardId],
  );

  function replaceBoards(nextBoards: KanbanBoardDTO[]) {
    setBoards(nextBoards);
    setSelectedBoardId((current) => {
      if (nextBoards.some((board) => board.id === current)) return current;
      return nextBoards[0]?.id ?? null;
    });
  }

  function openCreateBoard() {
    setEditingBoardId(null);
    setBoardForm(emptyBoardForm);
    setError("");
    setBoardDialogOpen(true);
  }

  function openEditBoard(board: KanbanBoardDTO) {
    if (!board.canManage) return;
    setEditingBoardId(board.id);
    setBoardForm({ name: board.name, color: board.color });
    setError("");
    setBoardDialogOpen(true);
  }

  function submitBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        if (editingBoardId) {
          replaceBoards(await updateKanbanBoard(editingBoardId, boardForm));
        } else {
          const board = await createKanbanBoard(boardForm);
          setBoards((current) => [...current, board]);
          setSelectedBoardId(board.id);
        }
        setBoardDialogOpen(false);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not save that board.");
      }
    });
  }

  function removeBoard(boardId: number) {
    const board = boards.find((nextBoard) => nextBoard.id === boardId);
    if (!board?.canManage) return;
    if (!window.confirm("Delete this board and all of its tasks?")) return;
    setError("");
    startTransition(async () => {
      try {
        replaceBoards(await deleteKanbanBoard(boardId));
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not delete that board.");
      }
    });
  }

  function submitColumn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBoard) return;
    setError("");
    startTransition(async () => {
      try {
        const nextBoards = editingColumnId
          ? await updateKanbanColumn(editingColumnId, columnName)
          : await createKanbanColumn({ boardId: selectedBoard.id, name: columnName });
        replaceBoards(nextBoards);
        setColumnName("");
        setEditingColumnId(null);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not save that column.");
      }
    });
  }

  function removeColumn(columnId: number) {
    if (!window.confirm("Delete this column and its tasks?")) return;
    setError("");
    startTransition(async () => {
      try {
        replaceBoards(await deleteKanbanColumn(columnId));
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not delete that column.");
      }
    });
  }

  function openCreateTask(columnId: number) {
    setEditingTaskId(null);
    setTaskForm(emptyTaskForm(columnId));
    setError("");
    setTaskDialogOpen(true);
  }

  function openEditTask(task: KanbanTaskDTO) {
    setEditingTaskId(task.id);
    setTaskForm({
      columnId: task.columnId,
      title: task.title,
      description: task.description || "",
      dueDate: task.dueDate || todayKey(),
      priority: task.priority,
      labelName: "",
      labelColor: "sage",
      labels: task.labels,
      syncCalendar: task.syncCalendar,
      linkNotes: task.linkNotes,
    });
    setError("");
    setTaskDialogOpen(true);
  }

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = {
      columnId: taskForm.columnId,
      title: taskForm.title,
      description: taskForm.description,
      dueDate: taskForm.dueDate,
      priority: taskForm.priority,
      labels: taskForm.labels,
      syncCalendar: taskForm.syncCalendar,
      linkNotes: taskForm.linkNotes,
    };
    setError("");
    startTransition(async () => {
      try {
        replaceBoards(editingTaskId ? await updateKanbanTask(editingTaskId, input) : await createKanbanTask(input));
        setTaskDialogOpen(false);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not save that task.");
      }
    });
  }

  function addLabel(color = taskForm.labelColor) {
    const name = taskForm.labelName.trim();
    if (!name) return;
    setTaskForm((current) => ({
      ...current,
      labelName: "",
      labelColor: color,
      labels: [...current.labels, { name, color }].slice(0, 5),
    }));
  }

  function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBoard) return;
    setError("");
    startTransition(async () => {
      try {
        replaceBoards(await inviteKanbanCollaborator({ boardId: selectedBoard.id, email: inviteEmail }));
        setInviteEmail("");
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not invite that collaborator.");
      }
    });
  }

  function removeTask(taskId: number) {
    if (!window.confirm("Delete this task?")) return;
    setError("");
    startTransition(async () => {
      try {
        replaceBoards(await deleteKanbanTask(taskId));
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not delete that task.");
      }
    });
  }

  function dropTask(columnId: number, position: number) {
    if (!draggingTaskId) return;
    setError("");
    const taskId = draggingTaskId;
    setDraggingTaskId(null);
    startTransition(async () => {
      try {
        replaceBoards(await moveKanbanTask(taskId, columnId, position));
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not move that task.");
      }
    });
  }

  return (
    <div className="grid h-[calc(100vh-7.5rem)] min-h-[34rem] min-w-0 gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <Card className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border-border bg-card shadow-sm">
        <CardHeader className="shrink-0 gap-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Boards</CardTitle>
            <Button size="sm" className="rounded-lg" onClick={openCreateBoard}>
              <Plus className="mr-2 size-3.5" aria-hidden="true" />
              New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4 pt-0">
          {boards.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-background p-5 text-center">
              <Columns3 className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium">No boards yet</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Create a board to begin shaping your tasks.</p>
            </div>
          ) : (
            boards.map((board) => (
              <div key={board.id} className="group flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBoardId(board.id)}
                  className={cn(
                    "flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium transition-colors",
                    selectedBoard?.id === board.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <span className={cn("size-2.5 shrink-0 rounded-full", boardStyles[board.color].dot)} aria-hidden="true" />
                  <span className="truncate">{board.name}</span>
                </button>
                {board.canManage && (
                  <>
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100" onClick={() => openEditBoard(board)}>
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => removeBoard(board.id)}>
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex min-h-0 min-w-0 flex-col space-y-4">
        {error && <p className="rounded-lg border border-clay-200 bg-clay-100 px-3 py-2 text-sm text-clay-800">{error}</p>}

        {selectedBoard ? (
          <RoomProvider key={selectedBoard.id} id={getBoardRoomId(selectedBoard.id)} initialPresence={{ status: "active" }}>
            <Card className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border-border bg-card shadow-sm">
              <CardHeader className="shrink-0 gap-4 p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={cn("size-3 shrink-0 rounded-full", boardStyles[selectedBoard.color].dot)} aria-hidden="true" />
                      <CardTitle className="truncate text-xl">{selectedBoard.name}</CardTitle>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedBoard.columns.length}/5 columns · {selectedBoard.columns.reduce((count, column) => count + column.tasks.length, 0)} tasks
                    </p>
                    <ActiveCollaborators board={selectedBoard} />
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto">
                    <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                      <Button type="button" variant="outline" className="rounded-lg bg-background" onClick={() => setCollaborationOpen(true)}>
                        <Users className="mr-2 size-4" aria-hidden="true" />
                        Collaboration
                      </Button>
                      {selectedBoard.canManage && (
                        <Button type="button" variant="outline" size="icon" className="rounded-lg bg-background" onClick={() => openEditBoard(selectedBoard)} aria-label="Board settings">
                          <Settings className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                    <form className="flex w-full flex-col gap-2 sm:min-w-72 sm:flex-row" onSubmit={submitColumn}>
                      <input
                        value={columnName}
                        onChange={(event) => setColumnName(event.target.value)}
                        className="h-9 min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                        placeholder={editingColumnId ? "Rename column" : "New column name"}
                        disabled={!editingColumnId && selectedBoard.columns.length >= 5}
                      />
                      <Button className="rounded-lg" disabled={isPending || (!editingColumnId && selectedBoard.columns.length >= 5)}>
                        {editingColumnId ? <Check className="mr-2 size-4" aria-hidden="true" /> : <Plus className="mr-2 size-4" aria-hidden="true" />}
                        {editingColumnId ? "Save" : "Column"}
                      </Button>
                      {editingColumnId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="rounded-lg bg-background"
                          onClick={() => {
                            setEditingColumnId(null);
                            setColumnName("");
                          }}
                        >
                          <X className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                    </form>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="min-h-0 flex-1 p-4 pt-0 sm:p-5 sm:pt-0">
                <div className="flex h-full min-w-0 gap-4 overflow-x-auto pb-2">
                  {selectedBoard.columns.map((column) => (
                    <KanbanColumn
                      key={column.id}
                      column={column}
                      onAddTask={openCreateTask}
                      onEditColumn={(nextColumn) => {
                        setEditingColumnId(nextColumn.id);
                        setColumnName(nextColumn.name);
                      }}
                      onDeleteColumn={removeColumn}
                      onEditTask={openEditTask}
                      onOpenComments={setCommentingTask}
                      onDeleteTask={removeTask}
                      onDragTask={setDraggingTaskId}
                      onDropTask={dropTask}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
            {collaborationOpen && (
              <CollaborationDialog
                board={selectedBoard}
                inviteEmail={inviteEmail}
                isPending={isPending}
                onInviteEmailChange={setInviteEmail}
                onInvite={submitInvite}
                onClose={() => setCollaborationOpen(false)}
              />
            )}
            {commentingTask && <TaskCommentsDialog board={selectedBoard} task={commentingTask} onClose={() => setCommentingTask(null)} />}
          </RoomProvider>
        ) : (
          <Card className="rounded-lg border-border bg-card shadow-sm">
            <CardContent className="p-10 text-center">
              <Columns3 className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold">Create your first board</h2>
              <p className="mt-2 text-sm text-muted-foreground">Boards hold columns, tasks, labels, and calendar sync settings.</p>
              <Button className="mt-5 rounded-lg" onClick={openCreateBoard}>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                New board
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {boardDialogOpen && (
        <Dialog title={editingBoardId ? "Edit board" : "Create board"} onClose={() => setBoardDialogOpen(false)}>
          <form className="space-y-4" onSubmit={submitBoard}>
            <label className="block text-sm font-medium">
              Board name
              <input
                value={boardForm.name}
                onChange={(event) => setBoardForm((current) => ({ ...current, name: event.target.value }))}
                className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                placeholder="Product launch"
                required
              />
            </label>
            <div>
              <p className="text-sm font-medium">Board color</p>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {(Object.keys(boardStyles) as BoardColor[]).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setBoardForm((current) => ({ ...current, color }))}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-lg border border-border transition",
                      boardStyles[color].soft,
                      boardForm.color === color && "ring-2",
                      boardForm.color === color && boardStyles[color].ring,
                    )}
                    aria-label={boardStyles[color].label}
                    title={boardStyles[color].label}
                  >
                    <span className={cn("size-4 rounded-full", boardStyles[color].dot)} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full rounded-lg" disabled={isPending}>
              {editingBoardId ? "Save board" : "Create board"}
            </Button>
          </form>
        </Dialog>
      )}

      {taskDialogOpen && selectedBoard && (
        <Dialog title={editingTaskId ? "Edit task" : "Create task"} onClose={() => setTaskDialogOpen(false)}>
          <form className="space-y-4" onSubmit={submitTask}>
            <label className="block text-sm font-medium">
              Title
              <input
                value={taskForm.title}
                onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))}
                className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                placeholder="Write campaign brief"
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Description
              <textarea
                value={taskForm.description}
                onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))}
                className="mt-2 min-h-24 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                placeholder="Add helpful context"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Column
                <select
                  value={taskForm.columnId}
                  onChange={(event) => setTaskForm((current) => ({ ...current, columnId: Number(event.target.value) }))}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                >
                  {selectedBoard.columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Due date
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </label>
            </div>
            <div>
              <p className="text-sm font-medium">Priority</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["low", "medium", "high"] as TaskPriority[]).map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setTaskForm((current) => ({ ...current, priority }))}
                    className={cn(
                      "h-9 rounded-lg border px-3 text-xs font-semibold capitalize transition",
                      priorityStyles[priority],
                      taskForm.priority === priority ? "ring-1 ring-ring" : "opacity-75 hover:opacity-100",
                    )}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Labels</p>
              <div className="mt-2 space-y-2">
                <input
                  value={taskForm.labelName}
                  onChange={(event) => setTaskForm((current) => ({ ...current, labelName: event.target.value }))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addLabel();
                    }
                  }}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Design"
                  disabled={taskForm.labels.length >= 5}
                />
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(labelStyles) as KanbanLabelDTO["color"][]).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setTaskForm((current) => ({ ...current, labelColor: color }));
                        addLabel(color);
                      }}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg border transition hover:-translate-y-0.5",
                        labelStyles[color],
                        taskForm.labelColor === color ? "ring-2 ring-ring" : "opacity-80 hover:opacity-100",
                      )}
                      aria-label={`${color} label color`}
                      title={color}
                      disabled={taskForm.labels.length >= 5}
                    >
                      <span className="size-3.5 rounded-full bg-current" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {taskForm.labels.map((label, index) => (
                  <button
                    key={`${label.name}-${index}`}
                    type="button"
                    onClick={() => setTaskForm((current) => ({ ...current, labels: current.labels.filter((_, labelIndex) => labelIndex !== index) }))}
                    className={cn("rounded-md border px-2 py-1 text-xs font-medium", labelStyles[label.color])}
                  >
                    {label.name} ×
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <ToggleRow
                icon={<CalendarDays className="size-4 text-sage-600" aria-hidden="true" />}
                label="Sync with Calendar"
                checked={taskForm.syncCalendar}
                onChange={(checked) => setTaskForm((current) => ({ ...current, syncCalendar: checked }))}
              />
              <ToggleRow
                icon={<FileText className="size-4 text-sky-600" aria-hidden="true" />}
                label="Link with Notes"
                checked={taskForm.linkNotes}
                onChange={(checked) => setTaskForm((current) => ({ ...current, linkNotes: checked }))}
              />
            </div>
            <Button className="w-full rounded-lg" disabled={isPending}>
              {editingTaskId ? "Save task" : "Create task"}
            </Button>
          </form>
        </Dialog>
      )}
    </div>
  );
}

function KanbanColumn({
  column,
  onAddTask,
  onEditColumn,
  onDeleteColumn,
  onEditTask,
  onOpenComments,
  onDeleteTask,
  onDragTask,
  onDropTask,
}: {
  column: KanbanColumnDTO;
  onAddTask: (columnId: number) => void;
  onEditColumn: (column: KanbanColumnDTO) => void;
  onDeleteColumn: (columnId: number) => void;
  onEditTask: (task: KanbanTaskDTO) => void;
  onOpenComments: (task: KanbanTaskDTO) => void;
  onDeleteTask: (taskId: number) => void;
  onDragTask: (taskId: number | null) => void;
  onDropTask: (columnId: number, position: number) => void;
}) {
  return (
    <section
      className="flex min-h-0 w-[19rem] shrink-0 flex-col rounded-lg border border-border bg-background shadow-sm"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDropTask(column.id, column.tasks.length);
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{column.name}</h2>
          <p className="text-xs text-muted-foreground">{column.tasks.length} tasks</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => onAddTask(column.id)} aria-label={`Add task to ${column.name}`}>
            <Plus className="size-4 text-primary" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => onEditColumn(column)} aria-label={`Edit ${column.name}`}>
            <Pencil className="size-3.5" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => onDeleteColumn(column.id)} aria-label={`Delete ${column.name}`}>
            <Trash2 className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {column.tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={() => onEditTask(task)}
            onOpenComments={() => onOpenComments(task)}
            onDelete={() => onDeleteTask(task.id)}
            onDragTask={onDragTask}
            onDropBefore={() => onDropTask(column.id, index)}
          />
        ))}
        {column.tasks.length === 0 && (
          <button
            type="button"
            onClick={() => onAddTask(column.id)}
            className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-border bg-card text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <Plus className="mr-2 size-4" aria-hidden="true" />
            Add task
          </button>
        )}
      </div>
    </section>
  );
}

function TaskCard({
  task,
  onEdit,
  onOpenComments,
  onDelete,
  onDragTask,
  onDropBefore,
}: {
  task: KanbanTaskDTO;
  onEdit: () => void;
  onOpenComments: () => void;
  onDelete: () => void;
  onDragTask: (taskId: number | null) => void;
  onDropBefore: () => void;
}) {
  const { threads } = useThreads({
    query: { metadata: { kind: "kanban-task", taskId: task.id } },
    scrollOnLoad: false,
  });
  const commentCount = threads?.reduce((count, thread) => count + thread.comments.filter((comment) => !comment.deletedAt).length, 0) ?? 0;

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", String(task.id));
        onDragTask(task.id);
      }}
      onDragEnd={() => onDragTask(null)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDropBefore();
      }}
      className="group rounded-lg border border-border bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-1 size-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden="true" />
        <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
          <h3 className="line-clamp-2 text-sm font-semibold leading-5">{task.title}</h3>
          {task.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{task.description}</p>}
        </button>
        <Button variant="ghost" size="icon" className="size-7 shrink-0 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100" onClick={onEdit} aria-label="Edit task">
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize", priorityStyles[task.priority])}>{task.priority}</span>
        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{task.dueDate}</span>
        {task.labels.map((label, index) => (
          <span key={`${label.name}-${index}`} className={cn("rounded-md border px-2 py-0.5 text-[11px] font-medium", labelStyles[label.color])}>
            {label.name}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {task.syncCalendar && (
            <span className="flex size-7 items-center justify-center rounded-lg bg-sage-100 text-sage-700" title="Synced with Calendar">
              <CalendarDays className="size-3.5" aria-hidden="true" />
            </span>
          )}
          {task.linkNotes && (
            <span className="flex size-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700" title="Linked with Notes">
              <FileText className="size-3.5" aria-hidden="true" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground" onClick={onOpenComments} aria-label="Open task comments">
            <MessageCircle className="mr-1 size-3.5" aria-hidden="true" />
            {commentCount}
          </Button>
          <Button variant="ghost" size="icon" className="size-7 rounded-lg text-muted-foreground hover:text-destructive" onClick={onDelete} aria-label="Delete task">
            <Trash2 className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </article>
  );
}

function ActiveCollaborators({ board }: { board: KanbanBoardDTO }) {
  const self = useSelf((me) => ({ id: me.id, info: me.info }));
  const others = useOthers((others) => others.map((other) => ({ connectionId: other.connectionId, id: other.id, info: other.info })));
  const active = [
    ...(self ? [{ key: `self-${self.id}`, id: self.id, name: self.info.name || self.info.email, email: self.info.email, color: self.info.color, initials: self.info.initials }] : []),
    ...others.map((other) => ({
      key: `${other.id}-${other.connectionId}`,
      id: other.id,
      name: other.info.name || other.info.email,
      email: other.info.email,
      color: other.info.color,
      initials: other.info.initials,
    })),
  ];
  const collaborators = [board.owner, ...board.shares];

  return (
    <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
      <div className="flex -space-x-2">
        {(active.length > 0 ? active : collaborators.slice(0, 4)).map((collaborator) => (
          <AvatarCircle
            key={"key" in collaborator ? collaborator.key : collaborator.liveblocksId}
            label={collaborator.name || collaborator.email}
            initials={collaborator.initials}
            color={collaborator.color}
            active={active.some((person) => person.email === collaborator.email)}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {active.length > 0 ? `${active.length} active now` : "No active collaborators"}
      </span>
    </div>
  );
}

function CollaborationDialog({
  board,
  inviteEmail,
  isPending,
  onInviteEmailChange,
  onInvite,
  onClose,
}: {
  board: KanbanBoardDTO;
  inviteEmail: string;
  isPending: boolean;
  onInviteEmailChange: (email: string) => void;
  onInvite: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  const others = useOthers((others) => others.map((other) => other.info.email));
  const self = useSelf((me) => me.info.email);
  const activeEmails = new Set([...(self ? [self] : []), ...others]);
  const collaborators = [board.owner, ...board.shares];

  return (
    <Dialog title="Collaboration" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Share2 className="size-4 text-primary" aria-hidden="true" />
            Shared with
          </div>
          <div className="space-y-2">
            {collaborators.map((collaborator) => (
              <CollaboratorRow key={`${collaborator.role}-${collaborator.email}`} collaborator={collaborator} active={activeEmails.has(collaborator.email)} />
            ))}
            {board.shares.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-card p-4 text-center text-sm text-muted-foreground">
                Invite someone to bring them into this board.
              </div>
            )}
          </div>
        </div>
        {board.canManage ? (
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={onInvite}>
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => onInviteEmailChange(event.target.value)}
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              placeholder="teammate@example.com"
              required
            />
            <Button className="rounded-lg" disabled={isPending}>
              <UserPlus className="mr-2 size-4" aria-hidden="true" />
              Invite
            </Button>
          </form>
        ) : (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Only the board owner can invite collaborators.</p>
        )}
      </div>
    </Dialog>
  );
}

function TaskCommentsDialog({ board, task, onClose }: { board: KanbanBoardDTO; task: KanbanTaskDTO; onClose: () => void }) {
  const { threads, isLoading, error } = useThreads({
    query: { metadata: { kind: "kanban-task", boardId: board.id, taskId: task.id } },
    scrollOnLoad: false,
  });

  return (
    <Dialog title="Task comments" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-sm font-semibold">{task.title}</p>
          {task.description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{task.description}</p>}
        </div>
        {isLoading && <p className="rounded-lg bg-muted px-3 py-4 text-center text-sm text-muted-foreground">Loading comments...</p>}
        {error && <p className="rounded-lg border border-clay-200 bg-clay-100 px-3 py-2 text-sm text-clay-800">Could not load comments.</p>}
        {!isLoading && !error && (
          <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {threads && threads.length > 0 ? (
              threads.map((thread) => (
                <Thread key={thread.id} thread={thread} showResolveAction={false} showReactions={false} className="rounded-lg border border-border bg-background p-2" />
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-background p-5 text-center">
                <MessageCircle className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium">No comments yet</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Start the discussion for this task.</p>
              </div>
            )}
          </div>
        )}
        <Composer
          metadata={{ kind: "kanban-task", boardId: board.id, taskId: task.id }}
          showAttachments={false}
          showFormattingControls={false}
          autoFocus
          className="rounded-lg border border-border bg-background p-2"
        />
      </div>
    </Dialog>
  );
}

function CollaboratorRow({ collaborator, active }: { collaborator: KanbanCollaboratorDTO; active: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <AvatarCircle label={collaborator.name || collaborator.email} initials={collaborator.initials} color={collaborator.color} active={active} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{collaborator.name || collaborator.email}</p>
          <p className="truncate text-xs text-muted-foreground">{collaborator.email}</p>
        </div>
      </div>
      <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[11px] font-semibold capitalize text-muted-foreground">
        {collaborator.role}
      </span>
    </div>
  );
}

function AvatarCircle({
  label,
  initials,
  color,
  active,
}: {
  label: string;
  initials: string;
  color: string;
  active: boolean;
}) {
  return (
    <span
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-card text-xs font-bold text-white shadow-sm",
        active && "ring-2 ring-sage-400",
      )}
      style={{ backgroundColor: color }}
      title={label}
      aria-label={label}
    >
      {initials}
      <span className={cn("absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border border-card", active ? "bg-sage-400" : "bg-muted")} aria-hidden="true" />
    </span>
  );
}

function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-xl rounded-lg border border-border bg-card p-5 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={onClose}>
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium">
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-primary" />
    </label>
  );
}
