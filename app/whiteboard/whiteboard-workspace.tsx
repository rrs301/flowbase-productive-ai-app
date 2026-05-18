"use client";

import dynamic from "next/dynamic";
import {
  Bot,
  Check,
  ChevronDown,
  Download,
  FilePenLine,
  Loader2,
  MoreHorizontal,
  Plus,
  Sparkles,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import type { AppState, BinaryFileData, BinaryFiles, DataURL, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { FileId, OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  createWhiteboard,
  deleteWhiteboard,
  generateWhiteboardDiagram,
  GeneratedDiagram,
  renameWhiteboard,
  updateWhiteboardScene,
  WhiteboardColor,
  WhiteboardDTO,
} from "@/app/whiteboard/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Canvas = dynamic(() => import("./whiteboard-canvas").then((mod) => mod.WhiteboardCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-0 items-center justify-center bg-card text-sm text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
      Loading canvas
    </div>
  ),
});

const boardStyles: Record<WhiteboardColor, { label: string; dot: string; ring: string }> = {
  sage: { label: "Sage", dot: "bg-sage-600", ring: "ring-sage-400" },
  clay: { label: "Clay", dot: "bg-clay-600", ring: "ring-clay-400" },
  amber: { label: "Amber", dot: "bg-amber-600", ring: "ring-amber-400" },
  sky: { label: "Sky", dot: "bg-sky-500", ring: "ring-sky-400" },
  violet: { label: "Violet", dot: "bg-violet-500", ring: "ring-violet-400" },
};

const stickyNoteFileId = "flowbase-sticky-note-template" as FileId;
const defaultTextColor = "#111827";
let stickyNoteFilePromise: Promise<BinaryFileData> | null = null;

type SaveStatus = "saved" | "saving" | "error";

type SceneSnapshot = {
  elements: readonly OrderedExcalidrawElement[];
  appState: Partial<AppState>;
};

function relativeTime(value: string) {
  const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function sanitizeAppState(appState: AppState): Partial<AppState> {
  return {
    viewBackgroundColor: appState.viewBackgroundColor,
    currentItemStrokeColor: appState.currentItemStrokeColor,
    currentItemBackgroundColor: appState.currentItemBackgroundColor,
    currentItemFillStyle: appState.currentItemFillStyle,
    currentItemStrokeWidth: appState.currentItemStrokeWidth,
    currentItemStrokeStyle: appState.currentItemStrokeStyle,
    currentItemRoughness: appState.currentItemRoughness,
    currentItemOpacity: appState.currentItemOpacity,
    currentItemFontFamily: appState.currentItemFontFamily,
    currentItemFontSize: appState.currentItemFontSize,
    currentItemTextAlign: appState.currentItemTextAlign,
    currentItemStartArrowhead: appState.currentItemStartArrowhead,
    currentItemEndArrowhead: appState.currentItemEndArrowhead,
    scrollX: appState.scrollX,
    scrollY: appState.scrollY,
    zoom: appState.zoom,
  };
}

function safeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "whiteboard";
}

function viewportCenter(api: ExcalidrawImperativeAPI) {
  const appState = api.getAppState();
  const zoomValue = typeof appState.zoom === "object" ? appState.zoom.value : 1;
  return {
    x: -appState.scrollX + window.innerWidth / 2 / zoomValue,
    y: -appState.scrollY + window.innerHeight / 2 / zoomValue,
  };
}

function makeGroupId(prefix = "group") {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function getStickyNoteFile() {
  if (!stickyNoteFilePromise) {
    stickyNoteFilePromise = fetch("/stickynote.png")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load sticky note image.");
        return response.blob();
      })
      .then(
        (blob) =>
          new Promise<BinaryFileData>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                id: stickyNoteFileId,
                mimeType: "image/png",
                dataURL: reader.result as DataURL,
                created: Date.now(),
                lastRetrieved: Date.now(),
              });
            };
            reader.onerror = () => reject(new Error("Could not read sticky note image."));
            reader.readAsDataURL(blob);
          }),
      );
  }

  return stickyNoteFilePromise;
}

function layoutDiagram(diagram: GeneratedDiagram, originX: number, originY: number) {
  const nodeById = new Map(diagram.nodes.map((node) => [node.id, node]));
  const skeleton: Record<string, unknown>[] = [
    {
      type: "text",
      x: originX,
      y: originY - 92,
      text: diagram.title,
      fontSize: 28,
      strokeColor: "#1f2937",
      backgroundColor: "transparent",
    },
  ];
  const positions = new Map<string, { x: number; y: number; width: number; height: number }>();

  if (diagram.kind === "mindmap") {
    const root = diagram.nodes[0];
    positions.set(root.id, { x: originX, y: originY, width: 220, height: 92 });
    const radius = 300;
    diagram.nodes.slice(1).forEach((node, index, nodes) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, nodes.length) - Math.PI / 2;
      positions.set(node.id, {
        x: originX + Math.cos(angle) * radius,
        y: originY + Math.sin(angle) * radius,
        width: 190,
        height: 84,
      });
      if (!diagram.edges.some((edge) => edge.from === root.id && edge.to === node.id)) {
        diagram.edges.push({ from: root.id, to: node.id });
      }
    });
  } else if (diagram.kind === "architecture") {
    const groups = [...new Set(diagram.nodes.map((node) => node.group || "Core"))];
    groups.forEach((group, groupIndex) => {
      const groupNodes = diagram.nodes.filter((node) => (node.group || "Core") === group);
      const x = originX + groupIndex * 330;
      const height = Math.max(180, groupNodes.length * 110 + 72);
      skeleton.push({
        type: "rectangle",
        x: x - 28,
        y: originY - 28,
        width: 270,
        height,
        strokeColor: "#94a3b8",
        backgroundColor: "#f8fafc",
        fillStyle: "solid",
        roughness: 1,
        strokeStyle: "dashed",
      });
      skeleton.push({
        type: "text",
        x,
        y: originY - 8,
        text: group,
        fontSize: 17,
        strokeColor: "#334155",
        backgroundColor: "transparent",
      });
      groupNodes.forEach((node, nodeIndex) => {
        positions.set(node.id, { x, y: originY + 46 + nodeIndex * 110, width: 214, height: 74 });
      });
    });
  } else {
    diagram.nodes.forEach((node, index) => {
      positions.set(node.id, {
        x: originX + index * 260,
        y: originY + (index % 2 === 0 ? 0 : 90),
        width: 200,
        height: 84,
      });
    });
  }

  for (const node of diagram.nodes) {
    const position = positions.get(node.id);
    if (!position) continue;
    const groupId = makeGroupId("diagram");
    skeleton.push({
      type: diagram.kind === "mindmap" && node === diagram.nodes[0] ? "ellipse" : "rectangle",
      x: position.x,
      y: position.y,
      width: position.width,
      height: position.height,
      strokeColor: "#334155",
      backgroundColor: diagram.kind === "mindmap" && node === diagram.nodes[0] ? "#c7f0db" : "#ffffff",
      fillStyle: "solid",
      roundness: { type: 3 },
      groupIds: [groupId],
    });
    skeleton.push({
      type: "text",
      x: position.x + 18,
      y: position.y + 18,
      width: position.width - 36,
      text: node.detail ? `${node.label}\n${node.detail}` : node.label,
      fontSize: node.detail ? 16 : 18,
      strokeColor: "#111827",
      backgroundColor: "transparent",
      groupIds: [groupId],
    });
  }

  for (const edge of diagram.edges) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to || !nodeById.has(edge.from) || !nodeById.has(edge.to)) continue;
    const startX = from.x + from.width;
    const startY = from.y + from.height / 2;
    const endX = to.x;
    const endY = to.y + to.height / 2;
    skeleton.push({
      type: "arrow",
      x: startX,
      y: startY,
      width: endX - startX,
      height: endY - startY,
      points: [
        [0, 0],
        [endX - startX, endY - startY],
      ],
      strokeColor: "#475569",
      endArrowhead: "arrow",
      label: edge.label ? { text: edge.label, fontSize: 14, strokeColor: "#475569" } : undefined,
    });
  }

  return skeleton;
}

export function WhiteboardWorkspace({ initialBoards }: { initialBoards: WhiteboardDTO[] }) {
  const [boards, setBoards] = useState(initialBoards);
  const [selectedBoardId, setSelectedBoardId] = useState(initialBoards[0]?.id ?? null);
  const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiError, setAiError] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, startGenerating] = useTransition();
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const snapshotRef = useRef<SceneSnapshot>({ elements: [], appState: {} });
  const filesRef = useRef<BinaryFiles>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId) || boards[0] || null,
    [boards, selectedBoardId],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  function replaceBoards(nextBoards: WhiteboardDTO[]) {
    setBoards(nextBoards);
    setSelectedBoardId((current) => {
      if (nextBoards.some((board) => board.id === current)) return current;
      return nextBoards[0]?.id ?? null;
    });
  }

  function updateCurrentBoard(updated: WhiteboardDTO) {
    setBoards((current) =>
      current
        .map((board) => (board.id === updated.id ? { ...updated, scene: board.scene, files: board.files } : board))
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    );
  }

  function handleCanvasChange(elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) {
    if (!selectedBoard) return;
    snapshotRef.current = { elements, appState: sanitizeAppState(appState) };
    filesRef.current = files;
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const boardId = selectedBoard.id;
    const scene = {
      elements,
      appState: sanitizeAppState(appState),
    };
    const currentFiles = files;
    saveTimerRef.current = setTimeout(async () => {
      try {
        const updated = await updateWhiteboardScene(boardId, {
          scene,
          files: currentFiles,
        });
        updateCurrentBoard(updated);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 900);
  }

  function createBoard() {
    startTransition(async () => {
      const board = await createWhiteboard();
      setBoards((current) => [board, ...current]);
      setSelectedBoardId(board.id);
    });
  }

  function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const boardId = editingBoardId;
    if (!boardId) return;
    startTransition(async () => {
      const board = await renameWhiteboard(boardId, editingName);
      setBoards((current) => current.map((item) => (item.id === board.id ? { ...item, name: board.name, updatedAt: board.updatedAt } : item)));
      setEditingBoardId(null);
    });
  }

  function removeBoard(boardId: number) {
    if (!window.confirm("Delete this whiteboard?")) return;
    startTransition(async () => {
      replaceBoards(await deleteWhiteboard(boardId));
    });
  }

  async function addStickyNote() {
    const api = apiRef.current;
    if (!api) return;
    const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw");
    const stickyNoteFile = await getStickyNoteFile();
    const center = viewportCenter(api);
    const groupId = makeGroupId("sticky");
    api.addFiles([stickyNoteFile]);
    const sticky = convertToExcalidrawElements(
      [
        {
          type: "image",
          x: center.x - 128,
          y: center.y - 128,
          width: 256,
          height: 256,
          fileId: stickyNoteFileId,
          status: "saved",
          groupIds: [groupId],
        },
        {
          type: "rectangle",
          x: center.x - 82,
          y: center.y - 74,
          width: 164,
          height: 142,
          strokeColor: "transparent",
          backgroundColor: "transparent",
          fillStyle: "solid",
          opacity: 100,
          roundness: { type: 3 },
          label: {
            text: "Type here",
            fontSize: 20,
            textAlign: "center",
            verticalAlign: "middle",
            strokeColor: defaultTextColor,
          },
          groupIds: [groupId],
        },
      ] as never,
      { regenerateIds: true },
    );
    api.updateScene({
      elements: [...api.getSceneElements(), ...sticky],
      captureUpdate: "IMMEDIATELY",
    });
  }

  async function exportPng() {
    if (!selectedBoard || !apiRef.current) return;
    const { exportToBlob } = await import("@excalidraw/excalidraw");
    const blob = await exportToBlob({
      elements: apiRef.current.getSceneElements(),
      appState: {
        ...apiRef.current.getAppState(),
        exportWithDarkMode: false,
        exportBackground: true,
        viewBackgroundColor: apiRef.current.getAppState().viewBackgroundColor || "#fffdf8",
      },
      files: apiRef.current.getFiles(),
      mimeType: "image/png",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeSlug(selectedBoard.name)}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function submitAi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const api = apiRef.current;
    if (!api) return;
    setAiError("");
    startGenerating(async () => {
      try {
        const diagram = await generateWhiteboardDiagram(aiPrompt);
        const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw");
        const center = viewportCenter(api);
        const elements = convertToExcalidrawElements(layoutDiagram(diagram, center.x - 360, center.y - 160) as never, {
          regenerateIds: true,
        });
        api.updateScene({
          elements: [...api.getSceneElements(), ...elements],
          captureUpdate: "IMMEDIATELY",
        });
        setAiOpen(false);
        setAiPrompt("");
      } catch (error) {
        setAiError(error instanceof Error ? error.message : "Could not generate a diagram.");
      }
    });
  }

  function clearCanvas() {
    if (!apiRef.current || !window.confirm("Clear this whiteboard canvas?")) return;
    apiRef.current.updateScene({ elements: [], captureUpdate: "IMMEDIATELY" });
    setMoreOpen(false);
  }

  if (!selectedBoard) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
        No whiteboards yet.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-sidebar/95 max-md:w-64 max-sm:hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border p-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Whiteboards</p>
            <p className="text-xs text-muted-foreground">{boards.length} board{boards.length === 1 ? "" : "s"}</p>
          </div>
          <Button size="sm" className="gap-1.5 rounded-lg" onClick={createBoard} disabled={isPending}>
            <Plus className="size-3.5" aria-hidden="true" />
            New
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {boards.map((board) => {
            const selected = board.id === selectedBoard.id;
            return (
              <div
                key={board.id}
                className={cn(
                  "group rounded-lg border border-transparent p-2 transition",
                  selected ? "border-primary/20 bg-primary/10" : "hover:border-border hover:bg-card",
                )}
              >
                {editingBoardId === board.id ? (
                  <form className="flex items-center gap-1" onSubmit={submitRename}>
                    <input
                      className="h-8 min-w-0 flex-1 rounded-md border border-input bg-card px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="size-8" aria-label="Save name">
                      <Check className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      aria-label="Cancel rename"
                      onClick={() => setEditingBoardId(null)}
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </Button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="flex w-full min-w-0 items-center gap-2 text-left"
                    onClick={() => {
                      setSelectedBoardId(board.id);
                      setSaveStatus("saved");
                    }}
                  >
                    <span className={cn("size-2.5 shrink-0 rounded-full", boardStyles[board.color].dot)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{board.name}</span>
                      <span className="block text-xs text-muted-foreground">{relativeTime(board.updatedAt)}</span>
                    </span>
                  </button>
                )}
                {editingBoardId !== board.id && (
                  <div className="mt-2 flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      aria-label="Rename whiteboard"
                      onClick={() => {
                        setEditingBoardId(board.id);
                        setEditingName(board.name);
                      }}
                    >
                      <FilePenLine className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive hover:text-destructive"
                      aria-label="Delete whiteboard"
                      onClick={() => removeBoard(board.id)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
          <div className="mr-auto min-w-[12rem]">
            <div className="flex items-center gap-2">
              <span className={cn("size-2.5 rounded-full", boardStyles[selectedBoard.color].dot)} />
              <h1 className="truncate text-sm font-semibold text-foreground">{selectedBoard.name}</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              {saveStatus === "saving" ? "Saving..." : saveStatus === "error" ? "Could not save" : "Saved"}
            </p>
          </div>

          <Button variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={addStickyNote}>
            <StickyNote className="size-3.5" aria-hidden="true" />
            Sticky
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={() => setAiOpen(true)}>
            <Bot className="size-3.5" aria-hidden="true" />
            AI Diagram
          </Button>
          <Button size="sm" className="gap-1.5 rounded-lg" onClick={exportPng}>
            <Download className="size-3.5" aria-hidden="true" />
            Export PNG
          </Button>
          <div className="relative">
            <Button variant="ghost" size="icon" className="size-9 rounded-lg" aria-label="More options" onClick={() => setMoreOpen((value) => !value)}>
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
            {moreOpen && (
              <div className="absolute right-0 top-10 z-20 w-48 rounded-lg border border-border bg-popover p-1.5 shadow-lg">
                <button
                  type="button"
                  className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    setEditingBoardId(selectedBoard.id);
                    setEditingName(selectedBoard.name);
                    setMoreOpen(false);
                  }}
                >
                  <FilePenLine className="size-3.5" aria-hidden="true" />
                  Rename board
                </button>
                <button type="button" className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-accent" onClick={clearCanvas}>
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  Clear canvas
                </button>
                <button
                  type="button"
                  className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-destructive hover:bg-accent"
                  onClick={() => removeBoard(selectedBoard.id)}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Delete board
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden bg-card">
          <Canvas
            board={selectedBoard}
            onApi={(api) => (apiRef.current = api)}
            onChange={handleCanvasChange}
            onAddStickyNote={addStickyNote}
            onOpenAiDiagram={() => setAiOpen(true)}
          />
        </div>
      </div>

      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4" role="dialog" aria-modal="true" aria-labelledby="ai-diagram-title">
          <form className="w-full max-w-lg rounded-lg border border-border bg-popover p-4 shadow-2xl" onSubmit={submitAi}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="ai-diagram-title" className="text-base font-semibold text-foreground">
                  AI Diagram
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Describe a flowchart, mind map, architecture, journey, or process.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="size-8 rounded-lg" aria-label="Close AI diagram" onClick={() => setAiOpen(false)}>
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <textarea
              className="mt-4 min-h-36 w-full resize-none rounded-lg border border-input bg-card p-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              placeholder="Example: Create a user onboarding journey from signup to first successful project."
            />
            {aiError && <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{aiError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-lg" onClick={() => setAiOpen(false)}>
                Cancel
              </Button>
              <Button className="gap-1.5 rounded-lg" disabled={isGenerating || !aiPrompt.trim()}>
                {isGenerating ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <ChevronDown className="size-3.5 rotate-[-90deg]" aria-hidden="true" />}
                Generate
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
