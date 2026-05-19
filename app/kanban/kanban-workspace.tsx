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
  Sparkles,
} from "lucide-react";
import {
  RoomProvider,
  useOthers,
  useSelf,
  useThreads,
} from "@liveblocks/react";
import { Composer, Thread } from "@liveblocks/react-ui";
import {
  FormEvent,
  ReactNode,
  useMemo,
  useState,
  useTransition,
  CSSProperties,
} from "react";

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
import type { UserCategoryDTO } from "@/lib/user-preferences";
import { getBoardRoomId } from "@/lib/liveblocks-room";

/* ─── Design tokens ─────────────────────────────────── */
const serif = "'Playfair Display', Georgia, serif";
const amberMain = "#c9873a";
const darkInk = "#1e1408";
const mutedText = "#6b5c44";
const faintText = "#8b7a60";
const surfaceBg = "#faf8f5";
const pageBg = "#fffcf7";
const borderCol = "#ede8df";
const cardBg = "#ffffff";

/* ─── Types ─────────────────────────────────────────── */
type BoardForm = { name: string; color: BoardColor };
type TaskForm = {
  columnId: number;
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  category: string;
  labelName: string;
  labelColor: KanbanLabelDTO["color"];
  labels: KanbanLabelDTO[];
  syncCalendar: boolean;
  linkNotes: boolean;
};

/* ─── Board colour configs ──────────────────────────── */
const boardPalette: Record<BoardColor, { name: string; dot: string; pill: string; pillText: string; ring: string }> = {
  sage: { name: "Sage", dot: "#3a7d5c", pill: "#d4ead9", pillText: "#2d6e47", ring: "#3a7d5c" },
  clay: { name: "Clay", dot: "#c9873a", pill: "#f5e4c4", pillText: "#8b5a14", ring: "#c9873a" },
  amber: { name: "Amber", dot: "#d4a017", pill: "#fdf0de", pillText: "#8b5a14", ring: "#d4a017" },
  sky: { name: "Sky", dot: "#1a6fa8", pill: "#d4e4f5", pillText: "#1a4f85", ring: "#1a6fa8" },
  violet: { name: "Violet", dot: "#6b3fa0", pill: "#e8daef", pillText: "#4e2d78", ring: "#6b3fa0" },
};

const priorityConfig: Record<TaskPriority, { pill: string; text: string; dot: string }> = {
  low: { pill: "#d4ead9", text: "#2d6e47", dot: "#3a7d5c" },
  medium: { pill: "#fdf0de", text: "#8b5a14", dot: "#c9873a" },
  high: { pill: "#f5d8d8", text: "#8b2020", dot: "#a03030" },
};

const labelPalette: Record<KanbanLabelDTO["color"], { pill: string; text: string }> = {
  sage: { pill: "#d4ead9", text: "#2d6e47" },
  clay: { pill: "#f5e4c4", text: "#8b5a14" },
  amber: { pill: "#fdf0de", text: "#8b5a14" },
  sky: { pill: "#d4e4f5", text: "#1a4f85" },
  violet: { pill: "#e8daef", text: "#4e2d78" },
};

function todayKey() { return new Date().toISOString().slice(0, 10); }
const emptyBoardForm: BoardForm = { name: "", color: "sage" };
function emptyTaskForm(columnId = 0): TaskForm {
  return { columnId, title: "", description: "", dueDate: todayKey(), priority: "medium", category: "", labelName: "", labelColor: "sage", labels: [], syncCalendar: false, linkNotes: false };
}

/* ─── Shared UI primitives ──────────────────────────── */
function Pill({ bg, color, children }: { bg: string; color: string; children: ReactNode }) {
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Btn({
  children, onClick, variant = "primary", size = "md", disabled = false, type = "button", style: extraStyle,
}: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "icon"; disabled?: boolean; type?: "button" | "submit"; style?: CSSProperties;
}) {
  const base: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, border: "none", cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 600, transition: "all 0.15s", borderRadius: 9, opacity: disabled ? 0.5 : 1 };
  const sizes: Record<string, CSSProperties> = { sm: { fontSize: 12, padding: "5px 12px", height: 30 }, md: { fontSize: 13, padding: "7px 16px", height: 36 }, icon: { fontSize: 13, padding: 0, width: 32, height: 32 } };
  const variants: Record<string, CSSProperties> = {
    primary: { background: amberMain, color: "#fff" },
    ghost: { background: "transparent", color: mutedText },
    outline: { background: cardBg, color: darkInk, border: `1px solid ${borderCol}` },
    danger: { background: "transparent", color: "#a03030" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...sizes[size], ...variants[variant], ...extraStyle }}>
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, required, type = "text", disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} required={required} disabled={disabled}
      style={{ height: 38, width: "100%", borderRadius: 9, border: `1px solid ${borderCol}`, background: cardBg, padding: "0 12px", fontSize: 13, color: darkInk, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
    />
  );
}

function Select({ value, onChange, children }: { value: string | number; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ height: 38, width: "100%", borderRadius: 9, border: `1px solid ${borderCol}`, background: cardBg, padding: "0 12px", fontSize: 13, color: darkInk, fontFamily: "inherit", outline: "none" }}>
      {children}
    </select>
  );
}

function Label({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <p style={{ fontSize: 12, fontWeight: 600, color: faintText, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, ...style }}>{children}</p>;
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(30,20,8,0.35)", backdropFilter: "blur(4px)", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 520, background: pageBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: 28, boxShadow: "0 24px 64px rgba(30,20,8,0.18)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: darkInk, margin: 0 }}>{title}</h2>
          <Btn variant="ghost" size="icon" onClick={onClose}><X size={16} /></Btn>
        </div>
        {children}
      </div>
    </div>
  );
}

function ToggleRow({ icon, label, checked, onChange }: { icon: ReactNode; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: surfaceBg, border: `1px solid ${borderCol}`, borderRadius: 9, padding: "9px 12px", cursor: "pointer" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: darkInk }}>
        {icon} {label}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: amberMain, width: 16, height: 16 }} />
    </label>
  );
}

/* ─── Avatar ────────────────────────────────────────── */
function Avatar({ label, initials, color, active }: { label: string; initials: string; color: string; active: boolean }) {
  return (
    <span title={label} aria-label={label} style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", border: `2px solid ${pageBg}`, background: color, color: "#fff", fontSize: 11, fontWeight: 700, boxShadow: active ? `0 0 0 2px #3a7d5c` : "none", flexShrink: 0 }}>
      {initials}
      <span style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${pageBg}`, background: active ? "#3a7d5c" : "#ccc" }} />
    </span>
  );
}

/* ─── Main Workspace ────────────────────────────────── */
export function KanbanWorkspace({ initialBoards, categories }: { initialBoards: KanbanBoardDTO[]; categories: UserCategoryDTO[] }) {
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

  const selectedBoard = useMemo(() => boards.find((b) => b.id === selectedBoardId) || boards[0] || null, [boards, selectedBoardId]);

  function replaceBoards(next: KanbanBoardDTO[]) {
    setBoards(next);
    setSelectedBoardId((cur) => (next.some((b) => b.id === cur) ? cur : next[0]?.id ?? null));
  }

  function openCreateBoard() { setEditingBoardId(null); setBoardForm(emptyBoardForm); setError(""); setBoardDialogOpen(true); }
  function openEditBoard(board: KanbanBoardDTO) {
    if (!board.canManage) return;
    setEditingBoardId(board.id); setBoardForm({ name: board.name, color: board.color }); setError(""); setBoardDialogOpen(true);
  }

  function submitBoard(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    startTransition(async () => {
      try {
        if (editingBoardId) { replaceBoards(await updateKanbanBoard(editingBoardId, boardForm)); }
        else { const b = await createKanbanBoard(boardForm); setBoards((c) => [...c, b]); setSelectedBoardId(b.id); }
        setBoardDialogOpen(false);
      } catch (err) { setError(err instanceof Error ? err.message : "Could not save board."); }
    });
  }

  function removeBoard(id: number) {
    const board = boards.find((b) => b.id === id);
    if (!board?.canManage || !window.confirm("Delete this board and all tasks?")) return;
    startTransition(async () => {
      try { replaceBoards(await deleteKanbanBoard(id)); } catch (err) { setError(err instanceof Error ? err.message : "Could not delete board."); }
    });
  }

  function submitColumn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!selectedBoard) return; setError("");
    startTransition(async () => {
      try {
        const next = editingColumnId
          ? await updateKanbanColumn(editingColumnId, columnName)
          : await createKanbanColumn({ boardId: selectedBoard.id, name: columnName });
        replaceBoards(next); setColumnName(""); setEditingColumnId(null);
      } catch (err) { setError(err instanceof Error ? err.message : "Could not save column."); }
    });
  }

  function removeColumn(id: number) {
    if (!window.confirm("Delete this column and its tasks?")) return;
    startTransition(async () => {
      try { replaceBoards(await deleteKanbanColumn(id)); } catch (err) { setError(err instanceof Error ? err.message : "Could not delete column."); }
    });
  }

  function openCreateTask(columnId: number) { setEditingTaskId(null); setTaskForm(emptyTaskForm(columnId)); setError(""); setTaskDialogOpen(true); }
  function openEditTask(task: KanbanTaskDTO) {
    setEditingTaskId(task.id);
    setTaskForm({ columnId: task.columnId, title: task.title, description: task.description || "", dueDate: task.dueDate || todayKey(), priority: task.priority, category: task.category || "", labelName: "", labelColor: "sage", labels: task.labels, syncCalendar: task.syncCalendar, linkNotes: task.linkNotes });
    setError(""); setTaskDialogOpen(true);
  }

  function submitTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = { columnId: taskForm.columnId, title: taskForm.title, description: taskForm.description, dueDate: taskForm.dueDate, priority: taskForm.priority, category: taskForm.category, labels: taskForm.labels, syncCalendar: taskForm.syncCalendar, linkNotes: taskForm.linkNotes };
    startTransition(async () => {
      try { replaceBoards(editingTaskId ? await updateKanbanTask(editingTaskId, input) : await createKanbanTask(input)); setTaskDialogOpen(false); }
      catch (err) { setError(err instanceof Error ? err.message : "Could not save task."); }
    });
  }

  function addLabel(color = taskForm.labelColor) {
    const name = taskForm.labelName.trim();
    if (!name) return;
    setTaskForm((c) => ({ ...c, labelName: "", labelColor: color, labels: [...c.labels, { name, color }].slice(0, 5) }));
  }

  function submitInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!selectedBoard) return;
    startTransition(async () => {
      try { replaceBoards(await inviteKanbanCollaborator({ boardId: selectedBoard.id, email: inviteEmail })); setInviteEmail(""); }
      catch (err) { setError(err instanceof Error ? err.message : "Could not invite collaborator."); }
    });
  }

  function removeTask(id: number) {
    if (!window.confirm("Delete this task?")) return;
    startTransition(async () => {
      try { replaceBoards(await deleteKanbanTask(id)); } catch (err) { setError(err instanceof Error ? err.message : "Could not delete task."); }
    });
  }

  function dropTask(columnId: number, position: number) {
    if (!draggingTaskId) return;
    const taskId = draggingTaskId; setDraggingTaskId(null);
    startTransition(async () => {
      try { replaceBoards(await moveKanbanTask(taskId, columnId, position)); }
      catch (err) { setError(err instanceof Error ? err.message : "Could not move task."); }
    });
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');`}</style>
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, height: "calc(100vh - 7.5rem)", minHeight: 520, fontFamily: "'DM Sans', system-ui, sans-serif" }}>

        {/* ── Sidebar ── */}
        <aside style={{ display: "flex", flexDirection: "column", background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "18px 18px 12px", borderBottom: `1px solid ${borderCol}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 28, height: 28, borderRadius: 7, background: amberMain, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={13} color="#fff" />
              </span>
              <span style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: darkInk }}>Boards</span>
            </div>
            <Btn size="sm" onClick={openCreateBoard}><Plus size={13} />New</Btn>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
            {boards.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 16px", border: `1px dashed ${borderCol}`, borderRadius: 10, margin: "8px 0" }}>
                <Columns3 size={20} color={faintText} />
                <p style={{ fontSize: 13, fontWeight: 600, color: darkInk, marginTop: 10 }}>No boards yet</p>
                <p style={{ fontSize: 12, color: mutedText, marginTop: 4, lineHeight: 1.5 }}>Create a board to get started.</p>
              </div>
            ) : (
              boards.map((board) => {
                const active = selectedBoard?.id === board.id;
                const pal = boardPalette[board.color];
                return (
                  <div key={board.id} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                    <button
                      type="button"
                      onClick={() => setSelectedBoardId(board.id)}
                      style={{ flex: 1, display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 9, border: "none", background: active ? pal.pill : "transparent", cursor: "pointer", textAlign: "left", minWidth: 0, fontFamily: "inherit" }}
                    >
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: pal.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active ? pal.pillText : mutedText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{board.name}</span>
                    </button>
                    {board.canManage && (
                      <>
                        <Btn variant="ghost" size="icon" onClick={() => openEditBoard(board)} style={{ width: 28, height: 28 }}><Pencil size={12} /></Btn>
                        <Btn variant="danger" size="icon" onClick={() => removeBoard(board.id)} style={{ width: 28, height: 28 }}><Trash2 size={12} /></Btn>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Main board area ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0, minHeight: 0 }}>
          {error && (
            <div style={{ background: "#fdf0f0", border: "1px solid #f0d0d0", borderRadius: 9, padding: "10px 14px", fontSize: 13, color: "#8b2020" }}>{error}</div>
          )}

          {selectedBoard ? (
            <RoomProvider key={selectedBoard.id} id={getBoardRoomId(selectedBoard.id)} initialPresence={{ status: "active" }}>
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 14, overflow: "hidden" }}>

                {/* Board header */}
                <div style={{ padding: "18px 22px", borderBottom: `1px solid ${borderCol}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ width: 11, height: 11, borderRadius: "50%", background: boardPalette[selectedBoard.color].dot, flexShrink: 0 }} />
                      <h1 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: darkInk, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedBoard.name}</h1>
                    </div>
                    <p style={{ fontSize: 12, color: faintText, margin: 0 }}>
                      {selectedBoard.columns.length}/5 columns · {selectedBoard.columns.reduce((n, c) => n + c.tasks.length, 0)} tasks
                    </p>
                    <ActiveCollaborators board={selectedBoard} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn variant="outline" onClick={() => setCollaborationOpen(true)}><Users size={14} color={faintText} />Collaboration</Btn>
                      {selectedBoard.canManage && (
                        <Btn variant="outline" size="icon" onClick={() => openEditBoard(selectedBoard)}><Settings size={15} /></Btn>
                      )}
                    </div>
                    <form onSubmit={submitColumn} style={{ display: "flex", gap: 8 }}>
                      <Input
                        value={columnName}
                        onChange={setColumnName}
                        placeholder={editingColumnId ? "Rename column…" : "New column name…"}
                        disabled={!editingColumnId && selectedBoard.columns.length >= 5}
                      />
                      <Btn type="submit" disabled={isPending || (!editingColumnId && selectedBoard.columns.length >= 5)}>
                        {editingColumnId ? <Check size={14} /> : <Plus size={14} />}
                        {editingColumnId ? "Save" : "Column"}
                      </Btn>
                      {editingColumnId && (
                        <Btn variant="outline" size="icon" onClick={() => { setEditingColumnId(null); setColumnName(""); }}><X size={14} /></Btn>
                      )}
                    </form>
                  </div>
                </div>

                {/* Columns */}
                <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 14, overflowX: "auto", padding: "18px 22px 22px" }}>
                  {selectedBoard.columns.map((col) => (
                    <KanbanColumn
                      key={col.id}
                      column={col}
                      onAddTask={openCreateTask}
                      onEditColumn={(c) => { setEditingColumnId(c.id); setColumnName(c.name); }}
                      onDeleteColumn={removeColumn}
                      onEditTask={openEditTask}
                      onOpenComments={setCommentingTask}
                      onDeleteTask={removeTask}
                      onDragTask={setDraggingTaskId}
                      onDropTask={dropTask}
                    />
                  ))}
                </div>
              </div>

              {collaborationOpen && (
                <CollaborationDialog board={selectedBoard} inviteEmail={inviteEmail} isPending={isPending} onInviteEmailChange={setInviteEmail} onInvite={submitInvite} onClose={() => setCollaborationOpen(false)} />
              )}
              {commentingTask && (
                <TaskCommentsDialog board={selectedBoard} task={commentingTask} onClose={() => setCommentingTask(null)} />
              )}
            </RoomProvider>
          ) : (
            <div style={{ flex: 1, background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: surfaceBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, border: `1px solid ${borderCol}` }}>
                <Columns3 size={24} color={faintText} />
              </div>
              <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: darkInk, margin: "0 0 8px" }}>Create your first board</h2>
              <p style={{ fontSize: 14, color: mutedText, lineHeight: 1.6, margin: "0 0 24px", maxWidth: 320 }}>Boards hold columns, tasks, labels, and calendar sync settings.</p>
              <Btn onClick={openCreateBoard}><Plus size={14} />New board</Btn>
            </div>
          )}
        </div>
      </div>

      {/* ── Board dialog ── */}
      {boardDialogOpen && (
        <Dialog title={editingBoardId ? "Edit board" : "Create board"} onClose={() => setBoardDialogOpen(false)}>
          <form onSubmit={submitBoard} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <Label>Board name</Label>
              <Input value={boardForm.name} onChange={(v) => setBoardForm((c) => ({ ...c, name: v }))} placeholder="Product launch" required />
            </div>
            <div>
              <Label>Color</Label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
                {(Object.keys(boardPalette) as BoardColor[]).map((color) => {
                  const pal = boardPalette[color];
                  const selected = boardForm.color === color;
                  return (
                    <button
                      key={color} type="button"
                      onClick={() => setBoardForm((c) => ({ ...c, color }))}
                      title={pal.name}
                      style={{ height: 40, borderRadius: 9, background: pal.pill, border: selected ? `2px solid ${pal.ring}` : `1px solid ${borderCol}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                    >
                      <span style={{ width: 14, height: 14, borderRadius: "50%", background: pal.dot }} />
                    </button>
                  );
                })}
              </div>
            </div>
            {error && <p style={{ fontSize: 13, color: "#a03030", margin: 0 }}>{error}</p>}
            <Btn type="submit" disabled={isPending}>{editingBoardId ? "Save board" : "Create board"}</Btn>
          </form>
        </Dialog>
      )}

      {/* ── Task dialog ── */}
      {taskDialogOpen && selectedBoard && (
        <Dialog title={editingTaskId ? "Edit task" : "New task"} onClose={() => setTaskDialogOpen(false)}>
          <form onSubmit={submitTask} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <Label>Title</Label>
              <Input value={taskForm.title} onChange={(v) => setTaskForm((c) => ({ ...c, title: v }))} placeholder="Write campaign brief" required />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm((c) => ({ ...c, description: e.target.value }))}
                placeholder="Add context…"
                style={{ width: "100%", minHeight: 80, borderRadius: 9, border: `1px solid ${borderCol}`, background: cardBg, padding: "9px 12px", fontSize: 13, color: darkInk, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <Label>Column</Label>
                <Select value={taskForm.columnId} onChange={(v) => setTaskForm((c) => ({ ...c, columnId: Number(v) }))}>
                  {selectedBoard.columns.map((col) => <option key={col.id} value={col.id}>{col.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Due date</Label>
                <Input type="date" value={taskForm.dueDate} onChange={(v) => setTaskForm((c) => ({ ...c, dueDate: v }))} />
              </div>
            </div>
            <div>
              <Label>Priority</Label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {(["low", "medium", "high"] as TaskPriority[]).map((p) => {
                  const pc = priorityConfig[p];
                  const active = taskForm.priority === p;
                  return (
                    <button
                      key={p} type="button"
                      onClick={() => setTaskForm((c) => ({ ...c, priority: p }))}
                      style={{ height: 36, borderRadius: 9, background: active ? pc.pill : surfaceBg, border: active ? `2px solid ${pc.dot}` : `1px solid ${borderCol}`, color: pc.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}
                    >{p}</button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={taskForm.category} onChange={(v) => setTaskForm((c) => ({ ...c, category: v }))}>
                <option value="">No category</option>
                {categories.map((cat) => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>Labels</Label>
              <input
                value={taskForm.labelName}
                onChange={(e) => setTaskForm((c) => ({ ...c, labelName: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLabel(); } }}
                placeholder="Type label name…"
                disabled={taskForm.labels.length >= 5}
                style={{ height: 38, width: "100%", borderRadius: 9, border: `1px solid ${borderCol}`, background: cardBg, padding: "0 12px", fontSize: 13, color: darkInk, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 8 }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {(Object.keys(labelPalette) as KanbanLabelDTO["color"][]).map((color) => {
                  const lp = labelPalette[color];
                  return (
                    <button
                      key={color} type="button"
                      disabled={taskForm.labels.length >= 5}
                      onClick={() => { setTaskForm((c) => ({ ...c, labelColor: color })); addLabel(color); }}
                      title={color}
                      style={{ width: 32, height: 32, borderRadius: 9, background: lp.pill, border: taskForm.labelColor === color ? `2px solid ${lp.text}` : `1px solid ${borderCol}`, cursor: "pointer" }}
                    />
                  );
                })}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {taskForm.labels.map((lbl, i) => (
                  <button
                    key={`${lbl.name}-${i}`} type="button"
                    onClick={() => setTaskForm((c) => ({ ...c, labels: c.labels.filter((_, idx) => idx !== i) }))}
                    style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 100, background: labelPalette[lbl.color].pill, color: labelPalette[lbl.color].text, border: "none", cursor: "pointer", fontFamily: "inherit" }}
                  >{lbl.name} ×</button>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <ToggleRow icon={<CalendarDays size={14} color="#3a7d5c" />} label="Sync Calendar" checked={taskForm.syncCalendar} onChange={(v) => setTaskForm((c) => ({ ...c, syncCalendar: v }))} />
              <ToggleRow icon={<FileText size={14} color="#1a4f85" />} label="Link Notes" checked={taskForm.linkNotes} onChange={(v) => setTaskForm((c) => ({ ...c, linkNotes: v }))} />
            </div>
            {error && <p style={{ fontSize: 13, color: "#a03030", margin: 0 }}>{error}</p>}
            <Btn type="submit" disabled={isPending}>{editingTaskId ? "Save task" : "Create task"}</Btn>
          </form>
        </Dialog>
      )}
    </>
  );
}

/* ─── Column ─────────────────────────────────────────── */
function KanbanColumn({
  column, onAddTask, onEditColumn, onDeleteColumn, onEditTask, onOpenComments, onDeleteTask, onDragTask, onDropTask,
}: {
  column: KanbanColumnDTO;
  onAddTask: (id: number) => void;
  onEditColumn: (col: KanbanColumnDTO) => void;
  onDeleteColumn: (id: number) => void;
  onEditTask: (task: KanbanTaskDTO) => void;
  onOpenComments: (task: KanbanTaskDTO) => void;
  onDeleteTask: (id: number) => void;
  onDragTask: (id: number | null) => void;
  onDropTask: (colId: number, pos: number) => void;
}) {
  return (
    <section
      style={{ display: "flex", flexDirection: "column", width: 284, flexShrink: 0, background: surfaceBg, border: `1px solid ${borderCol}`, borderRadius: 12, overflow: "hidden", minHeight: 0 }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDropTask(column.id, column.tasks.length); }}
    >
      {/* Column header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid ${borderCol}`, background: cardBg }}>
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: darkInk, margin: 0 }}>{column.name}</h2>
          <p style={{ fontSize: 11, color: faintText, margin: 0, marginTop: 1 }}>{column.tasks.length} task{column.tasks.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          <Btn variant="ghost" size="icon" onClick={() => onAddTask(column.id)} style={{ width: 28, height: 28 }}><Plus size={14} color={amberMain} /></Btn>
          <Btn variant="ghost" size="icon" onClick={() => onEditColumn(column)} style={{ width: 28, height: 28 }}><Pencil size={12} /></Btn>
          <Btn variant="danger" size="icon" onClick={() => onDeleteColumn(column.id)} style={{ width: 28, height: 28 }}><Trash2 size={12} /></Btn>
        </div>
      </div>

      {/* Tasks */}
      <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
        {column.tasks.map((task, i) => (
          <TaskCard key={task.id} task={task} onEdit={() => onEditTask(task)} onOpenComments={() => onOpenComments(task)} onDelete={() => onDeleteTask(task.id)} onDragTask={onDragTask} onDropBefore={() => onDropTask(column.id, i)} />
        ))}
        {column.tasks.length === 0 && (
          <button
            type="button" onClick={() => onAddTask(column.id)}
            style={{ minHeight: 100, borderRadius: 10, border: `1.5px dashed ${borderCol}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 500, color: faintText, cursor: "pointer", fontFamily: "inherit" }}
          >
            <Plus size={14} />Add task
          </button>
        )}
      </div>
    </section>
  );
}

/* ─── Task card ─────────────────────────────────────── */
function TaskCard({
  task, onEdit, onOpenComments, onDelete, onDragTask, onDropBefore,
}: {
  task: KanbanTaskDTO;
  onEdit: () => void;
  onOpenComments: () => void;
  onDelete: () => void;
  onDragTask: (id: number | null) => void;
  onDropBefore: () => void;
}) {
  const [hov, setHov] = useState(false);
  const { threads } = useThreads({ query: { metadata: { kind: "kanban-task", taskId: task.id } }, scrollOnLoad: false });
  const commentCount = threads?.reduce((n, t) => n + t.comments.filter((c) => !c.deletedAt).length, 0) ?? 0;
  const pc = priorityConfig[task.priority];

  return (
    <article
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(task.id)); onDragTask(task.id); }}
      onDragEnd={() => onDragTask(null)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDropBefore(); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: cardBg, border: `1px solid ${hov ? "#d9c9b0" : borderCol}`, borderRadius: 10, padding: "12px 12px 10px", boxShadow: hov ? "0 4px 16px rgba(100,70,20,0.08)" : "none", transform: hov ? "translateY(-1px)" : "none", transition: "all 0.15s", cursor: "default" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <GripVertical size={14} color={faintText} style={{ marginTop: 2, cursor: "grab", flexShrink: 0 }} />
        <button type="button" onClick={onEdit} style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit", minWidth: 0 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: darkInk, margin: 0, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{task.title}</h3>
          {task.description && <p style={{ fontSize: 12, color: mutedText, margin: "4px 0 0", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{task.description}</p>}
        </button>
        <Btn variant="ghost" size="icon" onClick={onEdit} style={{ width: 24, height: 24, opacity: hov ? 1 : 0, transition: "opacity 0.15s", flexShrink: 0 }}><MoreHorizontal size={13} /></Btn>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
        <Pill bg={pc.pill} color={pc.text}>{task.priority}</Pill>
        <Pill bg={surfaceBg} color={faintText}>{task.dueDate}</Pill>
        {task.category && <Pill bg="#fdf0de" color="#8b5a14">{task.category}</Pill>}
        {task.labels.map((lbl, i) => <Pill key={`${lbl.name}-${i}`} bg={labelPalette[lbl.color].pill} color={labelPalette[lbl.color].text}>{lbl.name}</Pill>)}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {task.syncCalendar && <span title="Calendar synced" style={{ width: 26, height: 26, borderRadius: 6, background: "#d4ead9", display: "flex", alignItems: "center", justifyContent: "center" }}><CalendarDays size={12} color="#2d6e47" /></span>}
          {task.linkNotes && <span title="Notes linked" style={{ width: 26, height: 26, borderRadius: 6, background: "#d4e4f5", display: "flex", alignItems: "center", justifyContent: "center" }}><FileText size={12} color="#1a4f85" /></span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button type="button" onClick={onOpenComments} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: faintText, background: "none", border: "none", cursor: "pointer", padding: "3px 6px", borderRadius: 6, fontFamily: "inherit" }}>
            <MessageCircle size={12} />{commentCount}
          </button>
          <Btn variant="danger" size="icon" onClick={onDelete} style={{ width: 26, height: 26 }}><Trash2 size={12} /></Btn>
        </div>
      </div>
    </article>
  );
}

/* ─── Active collaborators ──────────────────────────── */
function ActiveCollaborators({ board }: { board: KanbanBoardDTO }) {
  const self = useSelf((me) => ({ id: me.id, info: me.info }));
  const others = useOthers((oth) => oth.map((o) => ({ connectionId: o.connectionId, id: o.id, info: o.info })));
  const active = [
    ...(self ? [{ key: `self-${self.id}`, ...self.info }] : []),
    ...others.map((o) => ({ key: `${o.id}-${o.connectionId}`, ...o.info })),
  ];
  const collab = [board.owner, ...board.shares];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
      <div style={{ display: "flex" }}>
        {(active.length > 0 ? active : collab.slice(0, 4)).map((c, i) => (
          <span key={"key" in c ? c.key : `${i}`} style={{ marginLeft: i === 0 ? 0 : -8 }}>
            <Avatar label={c.name || c.email} initials={c.initials} color={c.color} active={active.some((a) => a.email === c.email)} />
          </span>
        ))}
      </div>
      <span style={{ fontSize: 11, color: faintText }}>{active.length > 0 ? `${active.length} active now` : "No active collaborators"}</span>
    </div>
  );
}

/* ─── Collaboration dialog ──────────────────────────── */
function CollaborationDialog({ board, inviteEmail, isPending, onInviteEmailChange, onInvite, onClose }: {
  board: KanbanBoardDTO; inviteEmail: string; isPending: boolean;
  onInviteEmailChange: (v: string) => void; onInvite: (e: FormEvent<HTMLFormElement>) => void; onClose: () => void;
}) {
  const others = useOthers((oth) => oth.map((o) => o.info.email));
  const self = useSelf((me) => me.info.email);
  const activeEmails = new Set([...(self ? [self] : []), ...others]);
  const collabs = [board.owner, ...board.shares];

  return (
    <Dialog title="Collaboration" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: surfaceBg, border: `1px solid ${borderCol}`, borderRadius: 10, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 13, fontWeight: 600, color: darkInk }}>
            <Share2 size={14} color={amberMain} />Shared with
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {collabs.map((c) => (
              <div key={`${c.role}-${c.email}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: cardBg, borderRadius: 9, border: `1px solid ${borderCol}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Avatar label={c.name || c.email} initials={c.initials} color={c.color} active={activeEmails.has(c.email)} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: darkInk, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name || c.email}</p>
                    <p style={{ fontSize: 11, color: faintText, margin: 0 }}>{c.email}</p>
                  </div>
                </div>
                <Pill bg={surfaceBg} color={faintText}>{c.role}</Pill>
              </div>
            ))}
            {board.shares.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0", fontSize: 12, color: faintText, border: `1px dashed ${borderCol}`, borderRadius: 9 }}>
                No collaborators yet — invite someone below.
              </div>
            )}
          </div>
        </div>
        {board.canManage ? (
          <form onSubmit={onInvite} style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Input type="email" value={inviteEmail} onChange={onInviteEmailChange} placeholder="teammate@example.com" required />
            </div>
            <Btn type="submit" disabled={isPending}><UserPlus size={14} />Invite</Btn>
          </form>
        ) : (
          <p style={{ fontSize: 12, color: faintText, background: surfaceBg, borderRadius: 9, padding: "10px 12px" }}>Only the board owner can invite collaborators.</p>
        )}
      </div>
    </Dialog>
  );
}

/* ─── Task comments dialog ──────────────────────────── */
function TaskCommentsDialog({ board, task, onClose }: { board: KanbanBoardDTO; task: KanbanTaskDTO; onClose: () => void }) {
  const { threads, isLoading, error } = useThreads({ query: { metadata: { kind: "kanban-task", boardId: board.id, taskId: task.id } }, scrollOnLoad: false });

  return (
    <Dialog title="Task comments" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: surfaceBg, border: `1px solid ${borderCol}`, borderRadius: 10, padding: "12px 14px" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: darkInk, margin: 0 }}>{task.title}</p>
          {task.description && <p style={{ fontSize: 12, color: mutedText, margin: "4px 0 0", lineHeight: 1.5 }}>{task.description}</p>}
        </div>
        {isLoading && <p style={{ fontSize: 13, color: faintText, textAlign: "center", padding: 16 }}>Loading comments…</p>}
        {error && <p style={{ fontSize: 13, color: "#a03030", background: "#fdf0f0", borderRadius: 9, padding: "10px 12px" }}>Could not load comments.</p>}
        {!isLoading && !error && (
          <div style={{ maxHeight: "50vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {threads && threads.length > 0 ? (
              threads.map((t) => <Thread key={t.id} thread={t} showResolveAction={false} showReactions={false} className="rounded-lg border border-border bg-background p-2" />)
            ) : (
              <div style={{ textAlign: "center", padding: "28px 0", border: `1px dashed ${borderCol}`, borderRadius: 10 }}>
                <MessageCircle size={20} color={faintText} />
                <p style={{ fontSize: 13, fontWeight: 600, color: darkInk, margin: "10px 0 4px" }}>No comments yet</p>
                <p style={{ fontSize: 12, color: faintText }}>Start the discussion for this task.</p>
              </div>
            )}
          </div>
        )}
        <Composer
          metadata={{ kind: "kanban-task", boardId: board.id, taskId: task.id }}
          showAttachments={false} showFormattingControls={false} autoFocus
          className="rounded-lg border border-border bg-background p-2"
        />
      </div>
    </Dialog>
  );
}