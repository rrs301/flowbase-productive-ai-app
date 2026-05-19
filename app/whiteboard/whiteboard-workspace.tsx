"use client";

import dynamic from "next/dynamic";
import {
  Bot,
  Check,
  Download,
  FilePenLine,
  Loader2,
  MoreHorizontal,
  Plus,
  Sparkles,
  StickyNote,
  Trash2,
  X,
  ChevronDown,
} from "lucide-react";
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
  DataURL,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type {
  FileId,
  OrderedExcalidrawElement,
} from "@excalidraw/excalidraw/element/types";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  CSSProperties,
} from "react";

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

/* ─── Design tokens ──────────────────────────────────── */
const serif = "'Playfair Display', Georgia, serif";
const amberMain = "#c9873a";
const darkInk = "#1e1408";
const mutedText = "#6b5c44";
const faintText = "#8b7a60";
const surfaceBg = "#faf8f5";
const pageBg = "#fffcf7";
const borderCol = "#ede8df";
const cardBg = "#ffffff";

/* ─── Canvas (lazy) ──────────────────────────────────── */
const Canvas = dynamic(
  () => import("./whiteboard-canvas").then((m) => m.WhiteboardCanvas),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, fontSize: 13, color: faintText, background: surfaceBg, gap: 8 }}>
        <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
        Loading canvas…
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    ),
  }
);

/* ─── Board colour palette ───────────────────────────── */
const boardPalette: Record<WhiteboardColor, { name: string; dot: string; pill: string; pillText: string }> = {
  sage: { name: "Sage", dot: "#3a7d5c", pill: "#d4ead9", pillText: "#2d6e47" },
  clay: { name: "Clay", dot: "#c9873a", pill: "#f5e4c4", pillText: "#8b5a14" },
  amber: { name: "Amber", dot: "#d4a017", pill: "#fdf0de", pillText: "#8b5a14" },
  sky: { name: "Sky", dot: "#1a6fa8", pill: "#d4e4f5", pillText: "#1a4f85" },
  violet: { name: "Violet", dot: "#6b3fa0", pill: "#e8daef", pillText: "#4e2d78" },
};

/* ─── Types ──────────────────────────────────────────── */
type SaveStatus = "saved" | "saving" | "error";
type SceneSnapshot = { elements: readonly OrderedExcalidrawElement[]; appState: Partial<AppState> };
type ScenePayload = { elements: readonly OrderedExcalidrawElement[]; appState: Partial<AppState> };

/* ─── Helpers ────────────────────────────────────────── */
function relativeTime(value: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (s < 60) return "Just now";
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function sanitizeAppState(a: AppState): Partial<AppState> {
  return { viewBackgroundColor: a.viewBackgroundColor, currentItemStrokeColor: a.currentItemStrokeColor, currentItemBackgroundColor: a.currentItemBackgroundColor, currentItemFillStyle: a.currentItemFillStyle, currentItemStrokeWidth: a.currentItemStrokeWidth, currentItemStrokeStyle: a.currentItemStrokeStyle, currentItemRoughness: a.currentItemRoughness, currentItemOpacity: a.currentItemOpacity, currentItemFontFamily: a.currentItemFontFamily, currentItemFontSize: a.currentItemFontSize, currentItemTextAlign: a.currentItemTextAlign, currentItemStartArrowhead: a.currentItemStartArrowhead, currentItemEndArrowhead: a.currentItemEndArrowhead, scrollX: a.scrollX, scrollY: a.scrollY, zoom: a.zoom };
}

function sceneSignature(s: ScenePayload, f: BinaryFiles) { return JSON.stringify({ s, f }); }
function sceneFromBoard(b: WhiteboardDTO): ScenePayload {
  return { elements: Array.isArray(b.scene.elements) ? (b.scene.elements as readonly OrderedExcalidrawElement[]) : [], appState: typeof b.scene.appState === "object" && b.scene.appState ? (b.scene.appState as Partial<AppState>) : {} };
}
function safeSlug(v: string) { return v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "whiteboard"; }
function viewportCenter(api: ExcalidrawImperativeAPI) {
  const a = api.getAppState();
  const z = typeof a.zoom === "object" ? a.zoom.value : 1;
  return { x: -a.scrollX + window.innerWidth / 2 / z, y: -a.scrollY + window.innerHeight / 2 / z };
}
function makeGroupId(p = "g") { return `${p}-${crypto.randomUUID()}`; }

const stickyNoteFileId = "flowbase-sticky-note-template" as FileId;
const defaultTextColor = "#1e1408";
let stickyNoteFilePromise: Promise<BinaryFileData> | null = null;
async function getStickyNoteFile(): Promise<BinaryFileData> {
  if (!stickyNoteFilePromise) {
    stickyNoteFilePromise = fetch("/stickynote.png").then((r) => {
      if (!r.ok) throw new Error("Could not load sticky note image.");
      return r.blob();
    }).then((blob) => new Promise<BinaryFileData>((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res({ id: stickyNoteFileId, mimeType: "image/png", dataURL: reader.result as DataURL, created: Date.now(), lastRetrieved: Date.now() });
      reader.onerror = () => rej(new Error("Could not read sticky note image."));
      reader.readAsDataURL(blob);
    }));
  }
  return stickyNoteFilePromise;
}

function layoutDiagram(diagram: GeneratedDiagram, originX: number, originY: number) {
  const nodeById = new Map(diagram.nodes.map((n) => [n.id, n]));
  const skeleton: Record<string, unknown>[] = [{ type: "text", x: originX, y: originY - 92, text: diagram.title, fontSize: 28, strokeColor: darkInk, backgroundColor: "transparent" }];
  const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
  if (diagram.kind === "mindmap") {
    const root = diagram.nodes[0];
    positions.set(root.id, { x: originX, y: originY, width: 220, height: 92 });
    diagram.nodes.slice(1).forEach((node, i, arr) => {
      const angle = (Math.PI * 2 * i) / Math.max(1, arr.length) - Math.PI / 2;
      positions.set(node.id, { x: originX + Math.cos(angle) * 300, y: originY + Math.sin(angle) * 300, width: 190, height: 84 });
      if (!diagram.edges.some((e) => e.from === root.id && e.to === node.id)) diagram.edges.push({ from: root.id, to: node.id });
    });
  } else if (diagram.kind === "architecture") {
    const groups = [...new Set(diagram.nodes.map((n) => n.group || "Core"))];
    groups.forEach((group, gi) => {
      const gn = diagram.nodes.filter((n) => (n.group || "Core") === group);
      const x = originX + gi * 330;
      const h = Math.max(180, gn.length * 110 + 72);
      skeleton.push({ type: "rectangle", x: x - 28, y: originY - 28, width: 270, height: h, strokeColor: "#c9b89a", backgroundColor: "#fdf8f0", fillStyle: "solid", roughness: 1, strokeStyle: "dashed" });
      skeleton.push({ type: "text", x, y: originY - 8, text: group, fontSize: 17, strokeColor: mutedText, backgroundColor: "transparent" });
      gn.forEach((node, ni) => positions.set(node.id, { x, y: originY + 46 + ni * 110, width: 214, height: 74 }));
    });
  } else {
    diagram.nodes.forEach((node, i) => positions.set(node.id, { x: originX + i * 260, y: originY + (i % 2 === 0 ? 0 : 90), width: 200, height: 84 }));
  }
  for (const node of diagram.nodes) {
    const pos = positions.get(node.id); if (!pos) continue;
    const gid = makeGroupId("d");
    skeleton.push({ type: diagram.kind === "mindmap" && node === diagram.nodes[0] ? "ellipse" : "rectangle", x: pos.x, y: pos.y, width: pos.width, height: pos.height, strokeColor: "#8b7a60", backgroundColor: diagram.kind === "mindmap" && node === diagram.nodes[0] ? "#d4ead9" : "#fffcf7", fillStyle: "solid", roundness: { type: 3 }, groupIds: [gid] });
    skeleton.push({ type: "text", x: pos.x + 18, y: pos.y + 18, width: pos.width - 36, text: node.detail ? `${node.label}\n${node.detail}` : node.label, fontSize: node.detail ? 16 : 18, strokeColor: darkInk, backgroundColor: "transparent", groupIds: [gid] });
  }
  for (const edge of diagram.edges) {
    const from = positions.get(edge.from); const to = positions.get(edge.to);
    if (!from || !to || !nodeById.has(edge.from) || !nodeById.has(edge.to)) continue;
    skeleton.push({ type: "arrow", x: from.x + from.width, y: from.y + from.height / 2, width: to.x - (from.x + from.width), height: to.y + to.height / 2 - (from.y + from.height / 2), points: [[0, 0], [to.x - (from.x + from.width), to.y + to.height / 2 - (from.y + from.height / 2)]], strokeColor: faintText, endArrowhead: "arrow", label: edge.label ? { text: edge.label, fontSize: 14, strokeColor: faintText } : undefined });
  }
  return skeleton;
}

/* ─── Shared UI primitives ───────────────────────────── */
function Btn({
  children, onClick, variant = "primary", size = "md", disabled = false, type = "button", style: extra,
}: { children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "outline" | "danger"; size?: "sm" | "md" | "icon"; disabled?: boolean; type?: "button" | "submit"; style?: CSSProperties }) {
  const base: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, border: "none", cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 600, transition: "all 0.15s", borderRadius: 9, opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap" };
  const sizes: Record<string, CSSProperties> = { sm: { fontSize: 12, padding: "5px 12px", height: 30 }, md: { fontSize: 13, padding: "7px 16px", height: 36 }, icon: { fontSize: 13, padding: 0, width: 32, height: 32 } };
  const variants: Record<string, CSSProperties> = { primary: { background: amberMain, color: "#fff" }, ghost: { background: "transparent", color: mutedText }, outline: { background: cardBg, color: darkInk, border: `1px solid ${borderCol}` }, danger: { background: "transparent", color: "#a03030" } };
  return <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...sizes[size], ...variants[variant], ...extra }}>{children}</button>;
}

/* ─── Main component ─────────────────────────────────── */
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
  const activeBoardIdRef = useRef<number | null>(initialBoards[0]?.id ?? null);
  const pendingSaveSignatureRef = useRef("");
  const lastSavedSignatureRef = useRef(initialBoards[0] ? sceneSignature(sceneFromBoard(initialBoards[0]), initialBoards[0].files as BinaryFiles) : "");

  const selectedBoard = useMemo(() => boards.find((b) => b.id === selectedBoardId) || boards[0] || null, [boards, selectedBoardId]);

  useEffect(() => { return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }; }, []);
  useEffect(() => {
    if (!selectedBoard || activeBoardIdRef.current === selectedBoard.id) return;
    const scene = sceneFromBoard(selectedBoard);
    const files = selectedBoard.files as BinaryFiles;
    activeBoardIdRef.current = selectedBoard.id;
    snapshotRef.current = scene; filesRef.current = files;
    pendingSaveSignatureRef.current = "";
    lastSavedSignatureRef.current = sceneSignature(scene, files);
    setSaveStatus("saved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, [selectedBoard]);

  function replaceBoards(next: WhiteboardDTO[]) {
    setBoards(next);
    setSelectedBoardId((cur) => (next.some((b) => b.id === cur) ? cur : next[0]?.id ?? null));
  }

  function updateCurrentBoard(updated: WhiteboardDTO, scene?: ScenePayload, files?: BinaryFiles) {
    setBoards((cur) => cur.map((b) => b.id === updated.id ? { ...updated, scene: scene ?? b.scene, files: files ?? b.files } : b).sort((a, z) => new Date(z.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
  }

  function handleCanvasChange(elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) {
    if (!selectedBoard) return;
    const scene = { elements, appState: sanitizeAppState(appState) };
    const sig = sceneSignature(scene, files);
    if (sig === lastSavedSignatureRef.current) { setSaveStatus((c) => c === "saving" ? "saved" : c); return; }
    if (sig === pendingSaveSignatureRef.current) return;
    snapshotRef.current = scene; filesRef.current = files;
    pendingSaveSignatureRef.current = sig;
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const boardId = selectedBoard.id;
    saveTimerRef.current = setTimeout(async () => {
      try {
        const updated = await updateWhiteboardScene(boardId, { scene, files });
        lastSavedSignatureRef.current = sig; pendingSaveSignatureRef.current = "";
        updateCurrentBoard(updated, scene, files); setSaveStatus("saved");
      } catch { pendingSaveSignatureRef.current = ""; setSaveStatus("error"); }
    }, 900);
  }

  function createBoard() {
    startTransition(async () => {
      const b = await createWhiteboard();
      setBoards((c) => [b, ...c]); setSelectedBoardId(b.id);
    });
  }

  function submitRename(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const id = editingBoardId; if (!id) return;
    startTransition(async () => {
      const b = await renameWhiteboard(id, editingName);
      setBoards((c) => c.map((x) => x.id === b.id ? { ...x, name: b.name, updatedAt: b.updatedAt } : x));
      setEditingBoardId(null);
    });
  }

  function removeBoard(id: number) {
    if (!window.confirm("Delete this whiteboard?")) return;
    startTransition(async () => { replaceBoards(await deleteWhiteboard(id)); });
  }

  async function addStickyNote() {
    const api = apiRef.current; if (!api) return;
    const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw");
    const file = await getStickyNoteFile();
    const center = viewportCenter(api);
    const gid = makeGroupId("sticky");
    api.addFiles([file]);
    const sticky = convertToExcalidrawElements([
      { type: "image", x: center.x - 128, y: center.y - 128, width: 256, height: 256, fileId: stickyNoteFileId, status: "saved", groupIds: [gid] },
      { type: "rectangle", x: center.x - 82, y: center.y - 74, width: 164, height: 142, strokeColor: "transparent", backgroundColor: "transparent", fillStyle: "solid", opacity: 100, roundness: { type: 3 }, label: { text: "Type here", fontSize: 20, textAlign: "center", verticalAlign: "middle", strokeColor: defaultTextColor }, groupIds: [gid] },
    ] as never, { regenerateIds: true });
    api.updateScene({ elements: [...api.getSceneElements(), ...sticky], captureUpdate: "IMMEDIATELY" });
  }

  async function exportPng() {
    if (!selectedBoard || !apiRef.current) return;
    const { exportToBlob } = await import("@excalidraw/excalidraw");
    const blob = await exportToBlob({ elements: apiRef.current.getSceneElements(), appState: { ...apiRef.current.getAppState(), exportWithDarkMode: false, exportBackground: true, viewBackgroundColor: apiRef.current.getAppState().viewBackgroundColor || "#fffdf8" }, files: apiRef.current.getFiles(), mimeType: "image/png" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `${safeSlug(selectedBoard.name)}.png`; link.click();
    URL.revokeObjectURL(url);
  }

  function submitAi(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const api = apiRef.current; if (!api) return;
    setAiError("");
    startGenerating(async () => {
      try {
        const diagram = await generateWhiteboardDiagram(aiPrompt);
        const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw");
        const center = viewportCenter(api);
        const elements = convertToExcalidrawElements(layoutDiagram(diagram, center.x - 360, center.y - 160) as never, { regenerateIds: true });
        api.updateScene({ elements: [...api.getSceneElements(), ...elements], captureUpdate: "IMMEDIATELY" });
        setAiOpen(false); setAiPrompt("");
      } catch (err) { setAiError(err instanceof Error ? err.message : "Could not generate diagram."); }
    });
  }

  function clearCanvas() {
    if (!apiRef.current || !window.confirm("Clear this whiteboard?")) return;
    apiRef.current.updateScene({ elements: [], captureUpdate: "IMMEDIATELY" });
    setMoreOpen(false);
  }

  if (!selectedBoard) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "'DM Sans', system-ui, sans-serif", color: faintText, fontSize: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: surfaceBg, border: `1px solid ${borderCol}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={22} color={faintText} />
        </div>
        <p>No whiteboards yet.</p>
        <Btn onClick={createBoard}><Plus size={14} />New whiteboard</Btn>
      </div>
    );
  }

  const pal = boardPalette[selectedBoard.color];

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap'); @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0, fontFamily: "'DM Sans', system-ui, sans-serif" }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: 264, flexShrink: 0, display: "flex", flexDirection: "column", background: pageBg, borderRight: `1px solid ${borderCol}` }}>
          {/* Sidebar header */}
          <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${borderCol}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: amberMain, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={13} color="#fff" />
              </span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, fontFamily: serif, color: darkInk, margin: 0, lineHeight: 1 }}>Whiteboards</p>
                <p style={{ fontSize: 11, color: faintText, margin: 0, marginTop: 2 }}>{boards.length} board{boards.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <Btn size="sm" onClick={createBoard} disabled={isPending}><Plus size={13} />New</Btn>
          </div>

          {/* Board list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
            {boards.map((board) => {
              const active = board.id === selectedBoard.id;
              const bp = boardPalette[board.color];
              return (
                <div key={board.id}
                  style={{ borderRadius: 10, border: `1px solid ${active ? bp.pill : "transparent"}`, background: active ? bp.pill : "transparent", marginBottom: 2, overflow: "hidden", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = surfaceBg; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                  {editingBoardId === board.id ? (
                    <form onSubmit={submitRename} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 8px" }}>
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        autoFocus
                        style={{ flex: 1, height: 30, borderRadius: 7, border: `1px solid ${borderCol}`, background: cardBg, padding: "0 8px", fontSize: 12, color: darkInk, fontFamily: "inherit", outline: "none" }}
                      />
                      <Btn type="submit" size="icon" variant="ghost" style={{ width: 28, height: 28 }}><Check size={12} /></Btn>
                      <Btn size="icon" variant="ghost" onClick={() => setEditingBoardId(null)} style={{ width: 28, height: 28 }}><X size={12} /></Btn>
                    </form>
                  ) : (
                    <div style={{ padding: "6px 8px" }}>
                      <button
                        type="button"
                        onClick={() => { setSelectedBoardId(board.id); setSaveStatus("saved"); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", padding: 0 }}
                      >
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: bp.dot, flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 13, fontWeight: active ? 600 : 500, color: active ? bp.pillText : darkInk, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{board.name}</span>
                          <span style={{ display: "block", fontSize: 11, color: faintText, marginTop: 1 }}>{relativeTime(board.updatedAt)}</span>
                        </span>
                      </button>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 2, marginTop: 4 }}>
                        <Btn variant="ghost" size="icon" style={{ width: 24, height: 24, opacity: 0.6 }} onClick={() => { setEditingBoardId(board.id); setEditingName(board.name); }}>
                          <FilePenLine size={11} />
                        </Btn>
                        <Btn variant="danger" size="icon" style={{ width: 24, height: 24, opacity: 0.6 }} onClick={() => removeBoard(board.id)}>
                          <Trash2 size={11} />
                        </Btn>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── Main canvas area ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${borderCol}`, background: cardBg, flexShrink: 0, flexWrap: "wrap" }}>
            {/* Board name + status */}
            <div style={{ marginRight: "auto", minWidth: 160 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: pal.dot, flexShrink: 0 }} />
                <h1 style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: darkInk, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedBoard.name}
                </h1>
              </div>
              <p style={{ fontSize: 11, color: saveStatus === "error" ? "#a03030" : saveStatus === "saving" ? amberMain : "#3a7d5c", margin: "2px 0 0 18px", display: "flex", alignItems: "center", gap: 4 }}>
                {saveStatus === "saving" && <Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} />}
                {saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Could not save" : "Saved"}
              </p>
            </div>

            <Btn variant="outline" size="sm" onClick={addStickyNote}><StickyNote size={13} color={faintText} />Sticky note</Btn>
            <Btn variant="outline" size="sm" onClick={() => setAiOpen(true)}><Bot size={13} color="#6b3fa0" />AI diagram</Btn>
            <Btn size="sm" onClick={exportPng}><Download size={13} />Export PNG</Btn>

            {/* More menu */}
            <div style={{ position: "relative" }}>
              <Btn variant="ghost" size="icon" onClick={() => setMoreOpen((v) => !v)}><MoreHorizontal size={16} /></Btn>
              {moreOpen && (
                <div style={{ position: "absolute", right: 0, top: 40, zIndex: 30, width: 196, background: pageBg, border: `1px solid ${borderCol}`, borderRadius: 12, padding: 6, boxShadow: "0 12px 32px rgba(30,20,8,0.12)" }}>
                  {[
                    { icon: <FilePenLine size={13} />, label: "Rename board", action: () => { setEditingBoardId(selectedBoard.id); setEditingName(selectedBoard.name); setMoreOpen(false); } },
                    { icon: <Sparkles size={13} />, label: "Clear canvas", action: clearCanvas },
                  ].map(({ icon, label, action }) => (
                    <button key={label} type="button" onClick={action}
                      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: darkInk, fontFamily: "inherit", textAlign: "left" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = surfaceBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >{icon}{label}</button>
                  ))}
                  <div style={{ height: 1, background: borderCol, margin: "4px 6px" }} />
                  <button type="button" onClick={() => { removeBoard(selectedBoard.id); setMoreOpen(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#a03030", fontFamily: "inherit", textAlign: "left" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fdf0f0")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  ><Trash2 size={13} />Delete board</button>
                </div>
              )}
            </div>
          </div>

          {/* Canvas */}
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", background: surfaceBg }}>
            <Canvas
              board={selectedBoard}
              onApi={(api) => (apiRef.current = api)}
              onChange={handleCanvasChange}
              onAddStickyNote={addStickyNote}
              onOpenAiDiagram={() => setAiOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* ── AI diagram modal ── */}
      {aiOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="ai-dialog-title"
          style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(30,20,8,0.35)", backdropFilter: "blur(4px)", padding: 16 }}
        >
          <form onSubmit={submitAi}
            style={{ width: "100%", maxWidth: 520, background: pageBg, border: `1px solid ${borderCol}`, borderRadius: 16, padding: 28, boxShadow: "0 24px 64px rgba(30,20,8,0.18)" }}
          >
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 9, background: "#e8daef", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Bot size={15} color="#6b3fa0" />
                  </span>
                  <h2 id="ai-dialog-title" style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: darkInk, margin: 0 }}>AI Diagram</h2>
                </div>
                <p style={{ fontSize: 13, color: mutedText, margin: 0, lineHeight: 1.5 }}>Describe a flowchart, mind map, architecture, journey, or process.</p>
              </div>
              <Btn variant="ghost" size="icon" onClick={() => setAiOpen(false)}><X size={15} /></Btn>
            </div>

            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Example: Create a user onboarding journey from signup to first successful project."
              style={{ width: "100%", minHeight: 120, borderRadius: 10, border: `1px solid ${borderCol}`, background: cardBg, padding: "10px 14px", fontSize: 13, color: darkInk, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }}
            />

            {aiError && (
              <div style={{ marginTop: 10, background: "#fdf0f0", border: "1px solid #f0d0d0", borderRadius: 9, padding: "9px 12px", fontSize: 13, color: "#8b2020" }}>{aiError}</div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <Btn variant="outline" onClick={() => setAiOpen(false)}>Cancel</Btn>
              <Btn type="submit" disabled={isGenerating || !aiPrompt.trim()}>
                {isGenerating ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <ChevronDown size={13} style={{ transform: "rotate(-90deg)" }} />}
                Generate
              </Btn>
            </div>
          </form>
        </div>
      )}
    </>
  );
}