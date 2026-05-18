"use client";

import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Editor } from "@tiptap/core";
import { EditorContent, JSONContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import {
  Archive,
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Folder,
  Grid2X2,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  List,
  ListOrdered,
  Mic,
  Minus,
  MoreHorizontal,
  PanelRight,
  Plus,
  Quote,
  Search,
  Share2,
  Star,
  Trash2,
  Type,
  Users,
  Wand2,
  X,
} from "lucide-react";
import {
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  createPage,
  createSpace,
  deletePage,
  deleteSpace,
  duplicatePage,
  duplicateSpace,
  inviteSpaceCollaborator,
  LinkedTaskDTO,
  PageTemplate,
  refineSelectedPageText,
  RefineAction,
  RefineTone,
  SpaceColor,
  SpaceDTO,
  SpacePageDTO,
  SpacesDataDTO,
  updatePage,
  updatePageContent,
  updatePageTaskLinks,
  updateSpace,
} from "@/app/spaces/actions";
import { useAssemblyAIStreaming } from "@/app/notes/use-assemblyai-streaming";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "favorites" | "recent" | "archived";
type ViewMode = "grid" | "list";
type SortMode = "recent" | "name" | "pages" | "favorites";
type SaveState = "saved" | "saving" | "error";

const filterTabs: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All Spaces" },
  { value: "favorites", label: "Favorites" },
  { value: "recent", label: "Recently Opened" },
  { value: "archived", label: "Archived" },
];

const sortOptions: { value: SortMode; label: string }[] = [
  { value: "recent", label: "Recently Updated" },
  { value: "name", label: "Name" },
  { value: "pages", label: "Most Pages" },
  { value: "favorites", label: "Favorites" },
];

const pageTemplates: PageTemplate[] = ["Blank Page", "Project Plan", "Meeting Notes", "PRD", "Research Notes", "Task Plan"];
const refineOptions: { label: string; action: RefineAction }[] = [
  { label: "Improve grammar", action: "grammar" },
  { label: "Rephrase", action: "rephrase" },
  { label: "Make shorter", action: "shorter" },
  { label: "Make longer", action: "longer" },
  { label: "Simplify language", action: "simplify" },
];
const toneOptions: RefineTone[] = ["Friendly", "Professional", "Confident", "Casual"];

const colorStyles: Record<
  SpaceColor,
  {
    label: string;
    dot: string;
    soft: string;
    folder: string;
    border: string;
    chip: string;
  }
> = {
  violet: {
    label: "Violet",
    dot: "bg-violet-500",
    soft: "bg-violet-100",
    folder: "text-violet-600",
    border: "border-violet-200",
    chip: "bg-violet-100 text-violet-800",
  },
  sky: {
    label: "Sky",
    dot: "bg-sky-500",
    soft: "bg-sky-100",
    folder: "text-sky-600",
    border: "border-sky-200",
    chip: "bg-sky-100 text-sky-800",
  },
  sage: {
    label: "Sage",
    dot: "bg-sage-600",
    soft: "bg-sage-100",
    folder: "text-sage-700",
    border: "border-sage-200",
    chip: "bg-sage-100 text-sage-800",
  },
  amber: {
    label: "Amber",
    dot: "bg-amber-500",
    soft: "bg-amber-100",
    folder: "text-amber-700",
    border: "border-amber-200",
    chip: "bg-amber-100 text-amber-800",
  },
  clay: {
    label: "Clay",
    dot: "bg-clay-600",
    soft: "bg-clay-100",
    folder: "text-clay-700",
    border: "border-clay-200",
    chip: "bg-clay-100 text-clay-800",
  },
  rose: {
    label: "Rose",
    dot: "bg-rose-500",
    soft: "bg-rose-100",
    folder: "text-rose-600",
    border: "border-rose-200",
    chip: "bg-rose-100 text-rose-800",
  },
};

const colorOptions = Object.keys(colorStyles) as SpaceColor[];

function formatUpdatedAt(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minute = 60 * 1000;
  const hour = minute * 60;
  const day = hour * 24;

  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 2) return "yesterday";
  if (diff < day * 7) return `${Math.floor(diff / day)} days ago`;
  return "last week";
}

function toEditorContent(content: SpacePageDTO["content"]): JSONContent {
  return content as JSONContent;
}

function extractPlainText(json: JSONContent) {
  const chunks: string[] = [];

  function walk(node: JSONContent) {
    if (node.text) chunks.push(node.text);
    node.content?.forEach(walk);
    if (["paragraph", "heading", "blockquote", "codeBlock", "listItem"].includes(node.type || "")) {
      chunks.push(" ");
    }
  }

  walk(json);
  return chunks.join("").replace(/\s+/g, " ").trim();
}

function pageContains(page: SpacePageDTO, query: string) {
  const needle = query.toLowerCase();
  return [page.title, page.template, page.pageType, page.description, page.plainText].some((value) => value?.toLowerCase().includes(needle));
}

export function SpacesWorkspace({ initialData }: { initialData: SpacesDataDTO }) {
  const [data, setData] = useState(initialData);
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [spacePanelOpen, setSpacePanelOpen] = useState(false);
  const [pagePanelOpen, setPagePanelOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [openSpaceMenuId, setOpenSpaceMenuId] = useState<number | null>(null);
  const [openPageMenuId, setOpenPageMenuId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [toneOpen, setToneOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dictationRange = useRef<{ from: number; to: number } | null>(null);
  const dictationInsertPosition = useRef<number | null>(null);

  const selectedSpace = useMemo(
    () => data.spaces.find((space) => space.id === selectedSpaceId) ?? null,
    [data.spaces, selectedSpaceId],
  );
  const selectedPage = useMemo(
    () => selectedSpace?.pages.find((page) => page.id === selectedPageId) ?? null,
    [selectedPageId, selectedSpace],
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      CharacterCount,
      Placeholder.configure({
        placeholder: "Write the page. Use / for blocks, the mic for voice, or AI Refine on selected text.",
      }),
    ],
    content: selectedPage ? toEditorContent(selectedPage.content) : { type: "doc", content: [{ type: "paragraph" }] },
    immediatelyRender: false,
    editable: Boolean(selectedPage && !selectedPage.isArchived),
    editorProps: {
      attributes: {
        class: "notes-editor-content",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "/" && editor) {
          setMessage("Slash commands: try toolbar buttons for headings, lists, quote, code, or divider.");
        }
        return false;
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      if (!selectedPage || selectedPage.isArchived) return;
      const json = activeEditor.getJSON();
      const plainText = extractPlainText(json);
      setSaveState("saving");

      startTransition(async () => {
        try {
          setData(await updatePageContent(selectedPage.id, {
            content: json as Record<string, unknown>,
            plainText,
            wordCount: activeEditor.storage.characterCount.words(),
          }));
          setSaveState("saved");
        } catch (error) {
          setSaveState("error");
          setMessage(error instanceof Error ? error.message : "Could not save page.");
        }
      });
    },
  });

  const {
    isRecording,
    partialTranscript,
    status: dictationStatus,
    error: dictationError,
    start: startStreaming,
    stop: stopStreaming,
  } = useAssemblyAIStreaming({
    onTranscript: ({ transcript, isFinal }) => {
      if (!editor || !selectedPage || selectedPage.isArchived) return;
      const cleaned = transcript.trim();
      if (!cleaned) return;

      const existingRange = dictationRange.current;
      const insertAt = dictationInsertPosition.current ?? editor.state.doc.content.size;
      const from = existingRange?.from ?? Math.min(insertAt, editor.state.doc.content.size);
      const to = existingRange?.to ?? from;
      const phrase = `${cleaned}${isFinal ? " " : ""}`;

      editor.chain().focus().deleteRange({ from, to }).insertContent(phrase).run();
      const nextTo = from + phrase.length;

      if (isFinal) {
        dictationRange.current = null;
        dictationInsertPosition.current = nextTo;
      } else {
        dictationRange.current = { from, to: nextTo };
      }
    },
    onSessionLimit: () => {
      dictationRange.current = null;
      dictationInsertPosition.current = null;
      setMessage("Recording stopped after 2 minutes.");
    },
  });

  useEffect(() => {
    if (!selectedPage || !editor) return;
    editor.commands.setContent(toEditorContent(selectedPage.content));
    editor.setEditable(!selectedPage.isArchived);
    setSaveState("saved");
  }, [editor, selectedPage?.id]);

  useEffect(() => {
    if (dictationError) setMessage(dictationError);
  }, [dictationError]);

  useEffect(() => {
    function closeOpenMenus(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-options-popover]")) return;

      setOpenPageMenuId(null);
      setOpenSpaceMenuId(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      setOpenPageMenuId(null);
      setOpenSpaceMenuId(null);
    }

    document.addEventListener("mousedown", closeOpenMenus);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOpenMenus);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const visibleSpaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const spaces = data.spaces.filter((space) => {
      if (filter === "favorites" && !space.isFavorite) return false;
      if (filter === "archived" && !space.isArchived) return false;
      if (filter !== "archived" && space.isArchived) return false;
      if (filter === "recent") {
        const updated = Date.now() - new Date(space.updatedAt).getTime();
        if (updated > 7 * 24 * 60 * 60 * 1000) return false;
      }
      if (!normalized) return true;
      return (
        space.name.toLowerCase().includes(normalized) ||
        space.description?.toLowerCase().includes(normalized) ||
        space.pages.some((page) => pageContains(page, normalized))
      );
    });

    return [...spaces].sort((left, right) => {
      if (sortMode === "name") return left.name.localeCompare(right.name);
      if (sortMode === "pages") return right.pageCount - left.pageCount || left.name.localeCompare(right.name);
      if (sortMode === "favorites") return Number(right.isFavorite) - Number(left.isFavorite) || left.name.localeCompare(right.name);
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [data.spaces, filter, query, sortMode]);

  const selectedLinkedTaskIds = selectedPage?.linkedTaskIds ?? [];

  function replaceData(nextData: SpacesDataDTO) {
    setData(nextData);
    setSelectedSpaceId((current) => {
      if (current && nextData.spaces.some((space) => space.id === current)) return current;
      return null;
    });
    setSelectedPageId((current) => {
      if (current && nextData.spaces.some((space) => space.pages.some((page) => page.id === current))) return current;
      return null;
    });
  }

  function runMutation(task: () => Promise<SpacesDataDTO>, success?: string) {
    setMessage("");
    startTransition(async () => {
      try {
        replaceData(await task());
        if (success) setMessage(success);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Something went wrong.");
      }
    });
  }

  function openSpace(space: SpaceDTO) {
    setSelectedSpaceId(space.id);
    setSelectedPageId(null);
  }

  function startDictation() {
    if (!editor || !selectedPage || selectedPage.isArchived) return;
    const hasActiveCursor = editor.view.hasFocus();
    const { from } = editor.state.selection;
    dictationRange.current = null;
    dictationInsertPosition.current = hasActiveCursor ? from : editor.state.doc.content.size;
    setMessage("");
    void startStreaming();
  }

  function stopDictation() {
    dictationRange.current = null;
    dictationInsertPosition.current = null;
    stopStreaming();
  }

  function refineText(action: RefineAction, tone?: RefineTone) {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, "\n");

    if (!text.trim()) {
      setMessage("Select text first.");
      return;
    }

    setAiMenuOpen(false);
    setToneOpen(false);
    setMessage("Refining selected text...");
    startTransition(async () => {
      try {
        const replacement = await refineSelectedPageText({ text, action, tone });
        editor.chain().focus().deleteRange({ from, to }).insertContent(replacement).run();
        setMessage("");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not refine selected text.");
      }
    });
  }

  function exportPage(page: SpacePageDTO) {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            title: page.title,
            template: page.template,
            description: page.description,
            plainText: page.plainText,
            content: page.content,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${page.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "page"}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="relative min-h-0 flex-1">
      {!selectedSpace && (
        <section className="min-h-0 overflow-y-auto rounded-lg bg-card p-4 shadow-sm ring-1 ring-border/70">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-normal">All Spaces</h2>
              <p className="mt-1 text-sm text-muted-foreground">{visibleSpaces.length} spaces</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button className="h-9 rounded-lg" onClick={() => setSpacePanelOpen(true)}>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                New Space
              </Button>
              <Button variant="outline" className="h-9 rounded-lg" onClick={() => setPagePanelOpen(true)} disabled={!selectedSpace}>
                <FileText className="mr-2 size-4" aria-hidden="true" />
                New Page
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search spaces or pages..."
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </label>

            <div className="flex h-10 rounded-lg border border-border bg-background p-1">
              <IconButton label="Grid view" active={viewMode === "grid"} onClick={() => setViewMode("grid")}>
                <Grid2X2 className="size-4" aria-hidden="true" />
              </IconButton>
              <IconButton label="List view" active={viewMode === "list"} onClick={() => setViewMode("list")}>
                <List className="size-4" aria-hidden="true" />
              </IconButton>
            </div>

            <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm">
              <span className="text-muted-foreground">Sort</span>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="bg-transparent font-medium outline-none">
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted/60 p-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                className={cn(
                  "h-8 shrink-0 rounded-md px-3 text-sm font-medium transition-colors",
                  filter === tab.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={cn("mt-4", viewMode === "grid" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3" : "space-y-2")}>
            {visibleSpaces.map((space) => (
              <SpaceCard
                key={space.id}
                space={space}
                selected={false}
                menuOpen={openSpaceMenuId === space.id}
                viewMode={viewMode}
                onOpen={() => openSpace(space)}
                onFavorite={() => runMutation(() => updateSpace(space.id, { isFavorite: !space.isFavorite }))}
                onMenu={() => setOpenSpaceMenuId((current) => (current === space.id ? null : space.id))}
                onRename={() => {
                  const name = window.prompt("Rename Space", space.name);
                  if (name !== null) runMutation(() => updateSpace(space.id, { name }));
                }}
                onColor={(color) => runMutation(() => updateSpace(space.id, { color }))}
                onInvite={() => {
                  setSelectedSpaceId(space.id);
                  setInviteOpen(true);
                }}
                onAddPage={() => {
                  setSelectedSpaceId(space.id);
                  setPagePanelOpen(true);
                }}
                onDuplicate={() => runMutation(() => duplicateSpace(space.id), "Space duplicated.")}
                onArchive={() => runMutation(() => updateSpace(space.id, { isArchived: !space.isArchived }))}
                onDelete={() => {
                  if (window.confirm(`Delete ${space.name}?`)) runMutation(() => deleteSpace(space.id));
                }}
              />
            ))}
          </div>

          {visibleSpaces.length === 0 && (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-lg px-4 text-center">
              <Folder className="size-8 text-muted-foreground" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold">No spaces found</h3>
              <p className="mt-1 text-sm text-muted-foreground">Create a space or adjust the current search and filters.</p>
            </div>
          )}
        </section>
      )}

      {selectedSpace && (
        <section className={cn("grid min-h-0 gap-5", selectedPage && "lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_20rem]")}>
          <div className="flex min-h-[42rem] min-w-0 flex-col overflow-hidden rounded-lg bg-[hsl(42_82%_99%)] shadow-sm ring-1 ring-border/70">
            {selectedSpace ? (
              <>
                <div className="shrink-0 border-b border-border/70 bg-card/80 px-4 py-3 backdrop-blur">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedPage) {
                            setSelectedPageId(null);
                            return;
                          }
                          setSelectedSpaceId(null);
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        <ArrowLeft className="size-3.5" aria-hidden="true" />
                        {selectedPage ? `${selectedSpace.name} > Pages` : "All Spaces"}
                      </button>
                      <div className="mt-2 flex min-w-0 items-center gap-3">
                        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", colorStyles[selectedSpace.color].soft)}>
                          <Folder className={cn("size-5", colorStyles[selectedSpace.color].folder)} aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <h2 className="truncate text-xl font-semibold">{selectedSpace.name}</h2>
                          <p className="truncate text-sm text-muted-foreground">{selectedSpace.pageCount} pages</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" className="h-8 rounded-lg" onClick={() => setPagePanelOpen(true)}>
                        <Plus className="mr-1.5 size-3.5" aria-hidden="true" />
                        New Page
                      </Button>
                      <Button variant="outline" size="icon" className="size-8 rounded-lg" title="Space options" aria-label="Space options" onClick={() => setOpenSpaceMenuId(selectedSpace.id)}>
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1">
                  {!selectedPage && (
                    <div className="h-full min-h-[34rem] overflow-y-auto bg-card/45 p-4">
                      <div className="min-h-full overflow-visible rounded-lg border border-border bg-card">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 font-semibold">Page Name</th>
                              <th className="hidden px-3 py-2 font-semibold sm:table-cell">Type</th>
                              <th className="px-3 py-2 font-semibold">Updated</th>
                              <th className="w-10 px-2 py-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {selectedSpace.pages.map((page) => (
                              <PageRow
                                key={page.id}
                                page={page}
                                selected={false}
                                menuOpen={openPageMenuId === page.id}
                                onSelect={() => setSelectedPageId(page.id)}
                                onFavorite={() => runMutation(() => updatePage(page.id, { isFavorite: !page.isFavorite }))}
                                onMenu={() => setOpenPageMenuId((current) => (current === page.id ? null : page.id))}
                                onRename={() => {
                                  const title = window.prompt("Rename Page", page.title);
                                  if (title !== null) runMutation(() => updatePage(page.id, { title }));
                                }}
                                onMove={(spaceId) => runMutation(() => updatePage(page.id, { spaceId }))}
                                spaces={data.spaces}
                                onDuplicate={() => runMutation(() => duplicatePage(page.id), "Page duplicated.")}
                                onShare={() => setInviteOpen(true)}
                                onExport={() => exportPage(page)}
                                onArchive={() => runMutation(() => updatePage(page.id, { isArchived: !page.isArchived }))}
                                onDelete={() => {
                                  if (window.confirm(`Delete ${page.title}?`)) runMutation(() => deletePage(page.id));
                                }}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {selectedPage && (
                    <div className="relative flex min-h-0 min-w-0 flex-col">
                      <>
                        <div className="shrink-0 border-b border-border/70 bg-[hsl(42_82%_99%)]/95 px-4 py-3 backdrop-blur">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <input
                                value={selectedPage.title}
                                onChange={(event) => runMutation(() => updatePage(selectedPage.id, { title: event.target.value }))}
                                disabled={selectedPage.isArchived}
                                className="w-full min-w-0 bg-transparent text-2xl font-semibold leading-9 outline-none disabled:opacity-60"
                                aria-label="Page title"
                              />
                              <p className="text-xs text-muted-foreground">
                                {selectedPage.template} · Updated {formatUpdatedAt(selectedPage.updatedAt)} · {selectedPage.updatedBy?.initials ?? "You"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className={cn("rounded-full px-2.5 py-1", saveState === "error" ? "bg-destructive/10 text-destructive" : "bg-muted")}>
                                {saveState === "saving" ? "Saving..." : saveState === "error" ? "Save error" : "Saved"}
                              </span>
                              <span className="rounded-full bg-muted px-2.5 py-1">{editor?.storage.characterCount.words() ?? selectedPage.wordCount} words</span>
                            </div>
                          </div>

                          <Toolbar
                            editor={editor}
                            disabled={selectedPage.isArchived}
                            isRecording={isRecording}
                            dictationStatus={dictationStatus}
                            partialTranscript={partialTranscript}
                            onStartRecording={startDictation}
                            onStopRecording={stopDictation}
                          />
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6">
                          {editor && (
                            <BubbleMenu editor={editor} shouldShow={({ editor: activeEditor }) => !selectedPage.isArchived && !activeEditor.state.selection.empty}>
                              <div className="flex items-center gap-1 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg">
                                <BubbleButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
                                  B
                                </BubbleButton>
                                <BubbleButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
                                  I
                                </BubbleButton>
                                <BubbleButton label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                                  U
                                </BubbleButton>
                                <div className="relative">
                                  <button
                                    type="button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => setAiMenuOpen((value) => !value)}
                                    className="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-violet-700 hover:bg-violet-100"
                                  >
                                    <Wand2 className="size-3.5" aria-hidden="true" />
                                    AI Refine
                                  </button>
                                  {aiMenuOpen && (
                                    <div className="absolute left-0 top-10 z-20 w-48 rounded-lg border border-border bg-popover p-1 shadow-xl">
                                      {refineOptions.map((option) => (
                                        <button key={option.action} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => refineText(option.action)} className="block w-full rounded-md px-2.5 py-2 text-left text-xs hover:bg-accent">
                                          {option.label}
                                        </button>
                                      ))}
                                      <div className="relative border-t border-border pt-1">
                                        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setToneOpen((value) => !value)} className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs hover:bg-accent">
                                          Change tone
                                          <ChevronDown className="size-3" aria-hidden="true" />
                                        </button>
                                        {toneOpen && (
                                          <div className="absolute left-full top-1 z-30 ml-1 w-36 rounded-lg border border-border bg-popover p-1 shadow-xl">
                                            {toneOptions.map((tone) => (
                                              <button key={tone} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => refineText("tone", tone)} className="block w-full rounded-md px-2.5 py-2 text-left text-xs hover:bg-accent">
                                                {tone}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </BubbleMenu>
                          )}
                          <EditorContent editor={editor} className={cn("mx-auto max-w-4xl rounded-lg bg-card px-5 py-6 shadow-sm ring-1 ring-border/60 sm:px-8 lg:px-10", selectedPage.isArchived && "pointer-events-none opacity-60")} />
                        </div>
                      </>

                      {message && (
                        <div className="absolute bottom-4 left-1/2 z-20 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-lg">
                          {message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <EmptyEditor onNewPage={() => setSpacePanelOpen(true)} />
            )}
          </div>

          {selectedPage && (
            <PagePreview
              page={selectedPage}
              space={selectedSpace}
              tasks={data.tasks}
              linkedTaskIds={selectedLinkedTaskIds}
              onLinkTasks={() => setLinkOpen(true)}
              onFavorite={() => selectedPage && runMutation(() => updatePage(selectedPage.id, { isFavorite: !selectedPage.isFavorite }))}
              onArchive={() => selectedPage && runMutation(() => updatePage(selectedPage.id, { isArchived: !selectedPage.isArchived }))}
              onDuplicate={() => selectedPage && runMutation(() => duplicatePage(selectedPage.id), "Page duplicated.")}
              onExport={() => selectedPage && exportPage(selectedPage)}
            />
          )}
        </section>
      )}

      {spacePanelOpen && (
        <SpacePanel
          onClose={() => setSpacePanelOpen(false)}
          onCreate={(input) =>
            runMutation(async () => {
              const nextData = await createSpace(input);
              setSpacePanelOpen(false);
              return nextData;
            })
          }
          pending={isPending}
        />
      )}

      {pagePanelOpen && (
        <PagePanel
          spaces={data.spaces.filter((space) => !space.isArchived)}
          selectedSpaceId={selectedSpace?.id ?? data.spaces[0]?.id ?? 0}
          onClose={() => setPagePanelOpen(false)}
          onCreate={(input) =>
            runMutation(async () => {
              const nextData = await createPage(input);
              setPagePanelOpen(false);
              const target = nextData.spaces.find((space) => space.id === input.spaceId);
              const created = [...(target?.pages ?? [])].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
              if (target) setSelectedSpaceId(target.id);
              if (created) setSelectedPageId(created.id);
              return nextData;
            })
          }
          pending={isPending}
        />
      )}

      {inviteOpen && selectedSpace && (
        <InvitePanel
          space={selectedSpace}
          onClose={() => setInviteOpen(false)}
          onInvite={(email) =>
            runMutation(async () => {
              const nextData = await inviteSpaceCollaborator({ spaceId: selectedSpace.id, email });
              setInviteOpen(false);
              return nextData;
            })
          }
          pending={isPending}
        />
      )}

      {linkOpen && selectedPage && (
        <TaskLinkPanel
          page={selectedPage}
          tasks={data.tasks}
          onClose={() => setLinkOpen(false)}
          onSave={(taskIds) =>
            runMutation(async () => {
              const nextData = await updatePageTaskLinks(selectedPage.id, taskIds);
              setLinkOpen(false);
              return nextData;
            })
          }
          pending={isPending}
        />
      )}
    </div>
  );
}

function SpaceCard({
  space,
  selected,
  menuOpen,
  viewMode,
  onOpen,
  onFavorite,
  onMenu,
  onRename,
  onColor,
  onInvite,
  onAddPage,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  space: SpaceDTO;
  selected: boolean;
  menuOpen: boolean;
  viewMode: ViewMode;
  onOpen: () => void;
  onFavorite: () => void;
  onMenu: () => void;
  onRename: () => void;
  onColor: (color: SpaceColor) => void;
  onInvite: () => void;
  onAddPage: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const compact = viewMode === "list";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "group w-full rounded-lg border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
          colorStyles[space.color].border,
          selected && "ring-2 ring-primary/20",
          compact && "flex items-center gap-4",
        )}
      >
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg", colorStyles[space.color].soft)}>
          <Folder className={cn("size-5", colorStyles[space.color].folder)} aria-hidden="true" />
        </span>
        <span className={cn("block min-w-0", compact && "flex-1")}>
          <span className="mt-3 flex min-w-0 items-center justify-between gap-2">
            <span className="truncate text-base font-semibold">{space.name}</span>
            <span className="flex shrink-0 items-center gap-1">
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onFavorite();
                }}
                onKeyDown={(event: ReactKeyboardEvent<HTMLSpanElement>) => {
                  if (event.key === "Enter" || event.key === " ") onFavorite();
                }}
                className={cn("flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-amber-600", space.isFavorite && "text-amber-600")}
                title={space.isFavorite ? "Unfavorite space" : "Favorite space"}
                aria-label={space.isFavorite ? "Unfavorite space" : "Favorite space"}
              >
                <Star className={cn("size-4", space.isFavorite && "fill-current")} aria-hidden="true" />
              </span>
              <span
                role="button"
                tabIndex={0}
                data-options-popover
                onClick={(event) => {
                  event.stopPropagation();
                  onMenu();
                }}
                onKeyDown={(event: ReactKeyboardEvent<HTMLSpanElement>) => {
                  if (event.key === "Enter" || event.key === " ") onMenu();
                }}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Space actions"
                aria-label="Space actions"
              >
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </span>
            </span>
          </span>
          <span className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{space.description}</span>
          <span className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="flex -space-x-2">
              {[space.owner, ...space.shares].slice(0, 4).map((member) => (
                <Avatar key={`${member.role}-${member.email}`} member={member} />
              ))}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {space.pageCount} Pages · Updated {formatUpdatedAt(space.updatedAt)}
            </span>
          </span>
        </span>
      </button>

      {menuOpen && (
        <div data-options-popover className="absolute right-2 top-14 z-30 w-64 rounded-lg border border-border bg-popover p-2 shadow-xl">
          <MenuButton icon={Type} label="Rename Space" onClick={onRename} />
          <div className="px-2 py-1.5">
            <p className="mb-1 text-[11px] font-medium uppercase text-muted-foreground">Change Color</p>
            <div className="grid grid-cols-6 gap-1">
              {colorOptions.map((color) => (
                <button key={color} type="button" onClick={() => onColor(color)} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted" title={colorStyles[color].label} aria-label={colorStyles[color].label}>
                  <span className={cn("size-4 rounded-full", colorStyles[color].dot)} />
                </button>
              ))}
            </div>
          </div>
          <MenuButton icon={Plus} label="Add Page" onClick={onAddPage} />
          <MenuButton icon={Users} label="Invite Collaborators" onClick={onInvite} />
          <MenuButton icon={Copy} label="Duplicate" onClick={onDuplicate} />
          <MenuButton icon={Archive} label={space.isArchived ? "Restore" : "Archive"} onClick={onArchive} />
          <MenuButton icon={Trash2} label="Delete" onClick={onDelete} danger />
        </div>
      )}
    </div>
  );
}

function PageRow({
  page,
  selected,
  menuOpen,
  spaces,
  onSelect,
  onFavorite,
  onMenu,
  onRename,
  onMove,
  onDuplicate,
  onShare,
  onExport,
  onArchive,
  onDelete,
}: {
  page: SpacePageDTO;
  selected: boolean;
  menuOpen: boolean;
  spaces: SpaceDTO[];
  onSelect: () => void;
  onFavorite: () => void;
  onMenu: () => void;
  onRename: () => void;
  onMove: (spaceId: number) => void;
  onDuplicate: () => void;
  onShare: () => void;
  onExport: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className={cn("relative border-t border-border transition-colors hover:bg-muted/50", selected && "bg-violet-50/80")}>
      <td className="max-w-40 px-3 py-2">
        <button type="button" onClick={onSelect} className="flex min-w-0 items-center gap-2 text-left">
          <FileText className="size-4 shrink-0 text-violet-600" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block truncate font-medium">{page.title}</span>
            <span className="block truncate text-xs text-muted-foreground">By {page.updatedBy?.initials ?? "You"}</span>
          </span>
        </button>
      </td>
      <td className="hidden px-3 py-2 text-xs text-muted-foreground sm:table-cell">{page.pageType}</td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{formatUpdatedAt(page.updatedAt)}</td>
      <td className="px-2 py-2">
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={onFavorite} className={cn("flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-card hover:text-amber-600", page.isFavorite && "text-amber-600")} title="Favorite" aria-label="Favorite">
            <Star className={cn("size-3.5", page.isFavorite && "fill-current")} aria-hidden="true" />
          </button>
          <button type="button" data-options-popover onClick={onMenu} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-card hover:text-foreground" title="Page actions" aria-label="Page actions">
            <MoreHorizontal className="size-3.5" aria-hidden="true" />
          </button>
        </div>
        {menuOpen && (
          <div data-options-popover className="absolute right-2 z-40 mt-1 w-60 rounded-lg border border-border bg-popover p-2 shadow-xl">
            <MenuButton icon={Type} label="Rename" onClick={onRename} />
            <label className="my-1 block rounded-md px-2 py-1.5 text-xs text-muted-foreground">
              Move
              <select value={page.spaceId} onChange={(event) => onMove(Number(event.target.value))} className="mt-1 w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground outline-none">
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.name}
                  </option>
                ))}
              </select>
            </label>
            <MenuButton icon={Copy} label="Duplicate" onClick={onDuplicate} />
            <MenuButton icon={Star} label={page.isFavorite ? "Unfavorite" : "Favorite"} onClick={onFavorite} />
            <MenuButton icon={Share2} label="Share" onClick={onShare} />
            <MenuButton icon={Download} label="Export" onClick={onExport} />
            <MenuButton icon={Archive} label={page.isArchived ? "Restore" : "Archive"} onClick={onArchive} />
            <MenuButton icon={Trash2} label="Delete" onClick={onDelete} danger />
          </div>
        )}
      </td>
    </tr>
  );
}

function PagePreview({
  page,
  space,
  tasks,
  linkedTaskIds,
  onLinkTasks,
  onFavorite,
  onArchive,
  onDuplicate,
  onExport,
}: {
  page: SpacePageDTO | null;
  space: SpaceDTO | null;
  tasks: LinkedTaskDTO[];
  linkedTaskIds: number[];
  onLinkTasks: () => void;
  onFavorite: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
  onExport: () => void;
}) {
  if (!page || !space) {
    return (
      <aside className="rounded-lg bg-card p-4 shadow-sm ring-1 ring-border/70">
        <PanelRight className="size-5 text-muted-foreground" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium">Select a page</p>
      </aside>
    );
  }

  const linkedTasks = tasks.filter((task) => linkedTaskIds.includes(task.id));

  return (
    <aside className="rounded-lg bg-card p-4 shadow-sm ring-1 ring-border/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">{page.pageType}</p>
          <h3 className="mt-3 truncate text-lg font-semibold">{page.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{space.name}</p>
        </div>
        <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={onFavorite} title="Favorite page" aria-label="Favorite page">
          <Star className={cn("size-4", page.isFavorite && "fill-current text-amber-600")} aria-hidden="true" />
        </Button>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{page.description || page.plainText || "No description yet."}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <Stat label="Comments" value={String(page.commentsCount)} />
        <Stat label="Linked tasks" value={String(page.linkedTasksCount)} />
        <Stat label="Last edited by" value={page.updatedBy?.initials ?? "You"} />
        <Stat label="Template" value={page.template} />
      </div>
      {linkedTasks.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {linkedTasks.slice(0, 4).map((task) => (
            <p key={task.id} className="truncate rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
              {task.title} · {task.boardName}
            </p>
          ))}
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="rounded-lg" onClick={onLinkTasks}>
          Link Tasks
        </Button>
        <Button variant="outline" size="sm" className="rounded-lg" onClick={onExport}>
          Export
        </Button>
        <Button variant="outline" size="sm" className="rounded-lg" onClick={onDuplicate}>
          Duplicate
        </Button>
        <Button variant="outline" size="sm" className="rounded-lg" onClick={onArchive}>
          {page.isArchived ? "Restore" : "Archive"}
        </Button>
      </div>
    </aside>
  );
}

function SpacePanel({ onClose, onCreate, pending }: { onClose: () => void; onCreate: (input: { name: string; description: string; color: SpaceColor }) => void; pending: boolean }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<SpaceColor>("violet");

  return (
    <SidePanel title="Create New Space" onClose={onClose}>
      <Field label="Space Name">
        <input value={name} onChange={(event) => setName(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 outline-none focus:ring-2 focus:ring-primary/15" />
      </Field>
      <Field label="Description">
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 w-full resize-none rounded-lg border border-border bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-primary/15" />
      </Field>
      <div>
        <p className="mb-2 text-sm font-medium">Color</p>
        <div className="grid grid-cols-6 gap-2">
          {colorOptions.map((option) => (
            <button key={option} type="button" onClick={() => setColor(option)} className={cn("flex size-10 items-center justify-center rounded-lg border", color === option ? "border-foreground" : "border-border")} title={colorStyles[option].label} aria-label={colorStyles[option].label}>
              <span className={cn("size-5 rounded-full", colorStyles[option].dot)} />
            </button>
          ))}
        </div>
      </div>
      <Button disabled={pending || !name.trim()} onClick={() => onCreate({ name, description, color })} className="mt-2 h-10 rounded-lg">
        Create Space
      </Button>
    </SidePanel>
  );
}

function PagePanel({ spaces, selectedSpaceId, onClose, onCreate, pending }: { spaces: SpaceDTO[]; selectedSpaceId: number; onClose: () => void; onCreate: (input: { title: string; spaceId: number; template: PageTemplate; description: string }) => void; pending: boolean }) {
  const [title, setTitle] = useState("");
  const [spaceId, setSpaceId] = useState(selectedSpaceId);
  const [template, setTemplate] = useState<PageTemplate>("Blank Page");
  const [description, setDescription] = useState("");

  return (
    <SidePanel title="Create New Page" onClose={onClose}>
      <Field label="Page Name">
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 outline-none focus:ring-2 focus:ring-primary/15" />
      </Field>
      <Field label="Add to Space">
        <select value={spaceId} onChange={(event) => setSpaceId(Number(event.target.value))} className="h-10 w-full rounded-lg border border-border bg-card px-3 outline-none">
          {spaces.map((space) => (
            <option key={space.id} value={space.id}>
              {space.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Template">
        <select value={template} onChange={(event) => setTemplate(event.target.value as PageTemplate)} className="h-10 w-full rounded-lg border border-border bg-card px-3 outline-none">
          {pageTemplates.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description">
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-20 w-full resize-none rounded-lg border border-border bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-primary/15" />
      </Field>
      <Button disabled={pending || !title.trim() || !spaceId} onClick={() => onCreate({ title, spaceId, template, description })} className="mt-2 h-10 rounded-lg">
        Create Page
      </Button>
    </SidePanel>
  );
}

function InvitePanel({ space, onClose, onInvite, pending }: { space: SpaceDTO; onClose: () => void; onInvite: (email: string) => void; pending: boolean }) {
  const [email, setEmail] = useState("");
  return (
    <SidePanel title="Invite Collaborators" onClose={onClose}>
      <p className="text-sm leading-6 text-muted-foreground">Invite collaborators to {space.name}. They can create and edit pages inside this space.</p>
      <Field label="Email">
        <input value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 outline-none focus:ring-2 focus:ring-primary/15" />
      </Field>
      <div className="space-y-2">
        {[space.owner, ...space.shares].map((member) => (
          <div key={`${member.role}-${member.email}`} className="flex items-center gap-2 rounded-lg bg-muted p-2">
            <Avatar member={member} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{member.name || member.email}</p>
              <p className="truncate text-xs text-muted-foreground">{member.role}</p>
            </div>
          </div>
        ))}
      </div>
      <Button disabled={pending || !email.trim()} onClick={() => onInvite(email)} className="mt-2 h-10 rounded-lg">
        Invite
      </Button>
    </SidePanel>
  );
}

function TaskLinkPanel({ page, tasks, onClose, onSave, pending }: { page: SpacePageDTO; tasks: LinkedTaskDTO[]; onClose: () => void; onSave: (taskIds: number[]) => void; pending: boolean }) {
  const [selected, setSelected] = useState(page.linkedTaskIds);
  return (
    <SidePanel title="Link Tasks" onClose={onClose}>
      <p className="text-sm leading-6 text-muted-foreground">Select Kanban tasks that should appear in the quick preview for {page.title}.</p>
      <div className="max-h-96 space-y-2 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">No Kanban tasks available yet.</p>
        ) : (
          tasks.map((task) => (
            <label key={task.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(task.id)}
                onChange={(event) => setSelected((current) => (event.target.checked ? [...current, task.id] : current.filter((id) => id !== task.id)))}
              />
              <span className="min-w-0">
                <span className="block truncate font-medium">{task.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{task.boardName}</span>
              </span>
            </label>
          ))
        )}
      </div>
      <Button disabled={pending} onClick={() => onSave(selected)} className="mt-2 h-10 rounded-lg">
        Save Links
      </Button>
    </SidePanel>
  );
}

function Toolbar({
  editor,
  disabled,
  isRecording,
  dictationStatus,
  partialTranscript,
  onStartRecording,
  onStopRecording,
}: {
  editor: Editor | null;
  disabled: boolean;
  isRecording: boolean;
  dictationStatus: string;
  partialTranscript: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
}) {
  if (!editor) return null;

  function run(command: (activeEditor: Editor) => void) {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    editor.chain().focus().setTextSelection({ from, to }).run();
    command(editor);
  }

  return (
    <div className="mt-3 flex max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted/60 p-1">
      <ToolButton label="Paragraph" active={editor.isActive("paragraph")} disabled={disabled} onClick={() => run((activeEditor) => activeEditor.chain().focus().setParagraph().run())}>
        <Type className="size-4" aria-hidden="true" />
      </ToolButton>
      <ToolButton label="Heading 1" active={editor.isActive("heading", { level: 1 })} disabled={disabled} onClick={() => run((activeEditor) => activeEditor.chain().focus().toggleHeading({ level: 1 }).run())}>
        <Heading1 className="size-4" aria-hidden="true" />
      </ToolButton>
      <ToolButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} disabled={disabled} onClick={() => run((activeEditor) => activeEditor.chain().focus().toggleHeading({ level: 2 }).run())}>
        <Heading2 className="size-4" aria-hidden="true" />
      </ToolButton>
      <ToolButton label="Heading 3" active={editor.isActive("heading", { level: 3 })} disabled={disabled} onClick={() => run((activeEditor) => activeEditor.chain().focus().toggleHeading({ level: 3 }).run())}>
        <Heading3 className="size-4" aria-hidden="true" />
      </ToolButton>
      <span className="mx-1 h-6 w-px shrink-0 bg-border" />
      <ToolButton label="Bold" active={editor.isActive("bold")} disabled={disabled} onClick={() => run((activeEditor) => activeEditor.chain().focus().toggleBold().run())}>
        <strong>B</strong>
      </ToolButton>
      <ToolButton label="Italic" active={editor.isActive("italic")} disabled={disabled} onClick={() => run((activeEditor) => activeEditor.chain().focus().toggleItalic().run())}>
        <em>I</em>
      </ToolButton>
      <ToolButton label="Underline" active={editor.isActive("underline")} disabled={disabled} onClick={() => run((activeEditor) => activeEditor.chain().focus().toggleUnderline().run())}>
        <span className="underline">U</span>
      </ToolButton>
      <span className="mx-1 h-6 w-px shrink-0 bg-border" />
      <ToolButton label="Bullet list" active={editor.isActive("bulletList")} disabled={disabled} onClick={() => run((activeEditor) => activeEditor.chain().focus().toggleBulletList().run())}>
        <List className="size-4" aria-hidden="true" />
      </ToolButton>
      <ToolButton label="Numbered list" active={editor.isActive("orderedList")} disabled={disabled} onClick={() => run((activeEditor) => activeEditor.chain().focus().toggleOrderedList().run())}>
        <ListOrdered className="size-4" aria-hidden="true" />
      </ToolButton>
      <ToolButton label="Quote" active={editor.isActive("blockquote")} disabled={disabled} onClick={() => run((activeEditor) => activeEditor.chain().focus().toggleBlockquote().run())}>
        <Quote className="size-4" aria-hidden="true" />
      </ToolButton>
      <ToolButton label="Code block" active={editor.isActive("codeBlock")} disabled={disabled} onClick={() => run((activeEditor) => activeEditor.chain().focus().toggleCodeBlock().run())}>
        <Highlighter className="size-4" aria-hidden="true" />
      </ToolButton>
      <ToolButton label="Divider" active={false} disabled={disabled} onClick={() => run((activeEditor) => activeEditor.chain().focus().setHorizontalRule().run())}>
        <Minus className="size-4" aria-hidden="true" />
      </ToolButton>
      <span className="mx-1 h-6 w-px shrink-0 bg-border" />
      <button
        type="button"
        disabled={disabled || dictationStatus === "requesting"}
        onMouseDown={(event) => {
          event.preventDefault();
          if (isRecording) onStopRecording();
          else onStartRecording();
        }}
        title={isRecording ? "Stop Recording" : "Speak to Page"}
        aria-label={isRecording ? "Stop Recording" : "Speak to Page"}
        className={cn(
          "flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
          isRecording ? "bg-destructive/10 text-destructive" : "text-muted-foreground hover:bg-card hover:text-foreground",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        <Mic className="size-4" aria-hidden="true" />
        {isRecording ? "Listening" : "Voice"}
        {partialTranscript && <span className="max-w-32 truncate text-muted-foreground">{partialTranscript}</span>}
      </button>
    </div>
  );
}

function EmptyEditor({ onNewPage }: { onNewPage: () => void }) {
  return (
    <div className="flex min-h-96 flex-1 flex-col items-center justify-center px-6 text-center">
      <BookOpen className="size-8 text-muted-foreground" aria-hidden="true" />
      <h2 className="mt-3 text-lg font-semibold">Open a space page</h2>
      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Create or select a page to write with rich text, AI refinement, and voice dictation.</p>
      <Button className="mt-4 rounded-lg" onClick={onNewPage}>
        <Plus className="mr-2 size-4" aria-hidden="true" />
        New Page
      </Button>
    </div>
  );
}

function SidePanel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/20 backdrop-blur-sm">
      <aside className="flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto bg-background p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={onClose} aria-label="Close">
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Avatar({ member }: { member: { initials: string; color: string; name: string | null; email: string } }) {
  return (
    <span title={member.name || member.email} className="flex size-8 items-center justify-center rounded-full border-2 border-card text-[11px] font-semibold text-white" style={{ backgroundColor: member.color }}>
      {member.initials}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function IconButton({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex size-8 items-center justify-center rounded-md transition-colors", active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} title={label} aria-label={label}>
      {children}
    </button>
  );
}

function ToolButton({ label, active, disabled, onClick, children }: { label: string; active: boolean; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={onClick} title={label} aria-label={label} className={cn("flex size-8 shrink-0 items-center justify-center rounded-md text-sm transition-colors", active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:bg-card hover:text-foreground", "disabled:pointer-events-none disabled:opacity-50")}>
      {children}
    </button>
  );
}

function BubbleButton({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onClick} className={cn("flex size-8 items-center justify-center rounded-md text-xs font-semibold", active ? "bg-accent text-accent-foreground" : "hover:bg-accent")} title={label} aria-label={label}>
      {children}
    </button>
  );
}

function MenuButton({ icon: Icon, label, onClick, danger = false }: { icon: typeof Type; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent", danger && "text-destructive hover:bg-destructive/10")}>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </button>
  );
}
