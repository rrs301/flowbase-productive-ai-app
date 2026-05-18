"use client";

import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Editor } from "@tiptap/core";
import { EditorContent, JSONContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import {
  BookOpen,
  ChevronDown,
  Copy,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Lightbulb,
  List,
  ListOrdered,
  Mic,
  Minus,
  MoreHorizontal,
  PenLine,
  Pin,
  Plus,
  Quote,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Type,
  Wand2,
  X,
} from "lucide-react";
import {
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  createNote,
  deleteNoteForever,
  duplicateNote,
  NoteColor,
  NoteDTO,
  NoteIcon,
  refineSelectedText,
  RefineAction,
  RefineTone,
  restoreNote,
  trashNote,
  updateNoteContent,
  updateNoteMetadata,
  updateNoteTitle,
} from "@/app/notes/actions";
import { Button } from "@/components/ui/button";
import type { UserCategoryDTO } from "@/lib/user-preferences";
import { cn } from "@/lib/utils";
import { useAssemblyAIStreaming } from "./use-assemblyai-streaming";

type SaveState = "saved" | "saving" | "error";

type SlashCommand = {
  label: string;
  hint: string;
  icon: typeof Type;
  run: () => void;
};

type SlashState = {
  open: boolean;
  query: string;
  from: number;
  to: number;
  top: number;
  left: number;
  index: number;
};

const colorStyles: Record<
  NoteColor,
  {
    label: string;
    dot: string;
    chip: string;
    soft: string;
    active: string;
  }
> = {
  sage: {
    label: "Sage",
    dot: "bg-sage-600",
    chip: "bg-sage-100 text-sage-800",
    soft: "bg-sage-100/70",
    active: "border-sage-400 bg-sage-100/70",
  },
  clay: {
    label: "Clay",
    dot: "bg-clay-600",
    chip: "bg-clay-100 text-clay-800",
    soft: "bg-clay-100/70",
    active: "border-clay-400 bg-clay-100/70",
  },
  amber: {
    label: "Amber",
    dot: "bg-amber-600",
    chip: "bg-amber-100 text-amber-800",
    soft: "bg-amber-100/70",
    active: "border-amber-400 bg-amber-100/70",
  },
  sky: {
    label: "Sky",
    dot: "bg-sky-500",
    chip: "bg-sky-100 text-sky-800",
    soft: "bg-sky-100/70",
    active: "border-sky-400 bg-sky-100/70",
  },
  violet: {
    label: "Violet",
    dot: "bg-violet-500",
    chip: "bg-violet-100 text-violet-800",
    soft: "bg-violet-100/70",
    active: "border-violet-400 bg-violet-100/70",
  },
};

const iconMap: Record<NoteIcon, typeof FileText> = {
  FileText,
  BookOpen,
  Lightbulb,
  Sparkles,
  PenLine,
};

const iconOptions = Object.keys(iconMap) as NoteIcon[];
const colorOptions = Object.keys(colorStyles) as NoteColor[];

const refineOptions: { label: string; action: RefineAction }[] = [
  { label: "Improve grammar", action: "grammar" },
  { label: "Rephrase", action: "rephrase" },
  { label: "Make shorter", action: "shorter" },
  { label: "Make longer", action: "longer" },
  { label: "Simplify language", action: "simplify" },
];

const toneOptions: RefineTone[] = [
  "Friendly",
  "Professional",
  "Confident",
  "Casual",
];

function formatUpdatedAt(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minute = 60 * 1000;
  const hour = minute * 60;
  const day = hour * 24;

  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function toEditorContent(content: NoteDTO["content"]): JSONContent {
  return content as JSONContent;
}

function extractPlainText(json: JSONContent) {
  const chunks: string[] = [];

  function walk(node: JSONContent) {
    if (node.text) chunks.push(node.text);

    node.content?.forEach(walk);

    if (
      ["paragraph", "heading", "blockquote", "codeBlock", "listItem"].includes(
        node.type || ""
      )
    ) {
      chunks.push(" ");
    }
  }

  walk(json);

  return chunks.join("").replace(/\s+/g, " ").trim();
}

export function NotesWorkspace({
  initialNotes,
  categories,
}: {
  initialNotes: NoteDTO[];
  categories: UserCategoryDTO[];
}) {
  const [notes, setNotes] = useState(initialNotes);

  const [selectedNoteId, setSelectedNoteId] = useState(
    initialNotes.find((note) => !note.isTrashed)?.id ??
    initialNotes[0]?.id ??
    null
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [trashOpen, setTrashOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [message, setMessage] = useState("");
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [toneOpen, setToneOpen] = useState(false);

  const [slashState, setSlashState] = useState<SlashState>({
    open: false,
    query: "",
    from: 0,
    to: 0,
    top: 0,
    left: 0,
    index: 0,
  });

  const [isPending, startTransition] = useTransition();

  const selectedNote = useMemo(
    () =>
      notes.find((note) => note.id === selectedNoteId) ||
      notes.find((note) => !note.isTrashed) ||
      notes[0] ||
      null,
    [notes, selectedNoteId]
  );

  const activeNotes = useMemo(
    () => notes.filter((note) => !note.isTrashed),
    [notes]
  );

  const trashedNotes = useMemo(
    () => notes.filter((note) => note.isTrashed),
    [notes]
  );

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const visible = activeNotes.filter((note) => {
      if (!query) return true;

      return (
        note.title.toLowerCase().includes(query) ||
        note.plainText.toLowerCase().includes(query)
      );
    });

    return visible.sort(
      (left, right) =>
        Number(right.isPinned) - Number(left.isPinned) ||
        new Date(right.updatedAt).getTime() -
        new Date(left.updatedAt).getTime()
    );
  }, [activeNotes, searchQuery]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressSave = useRef(false);
  const slashRef = useRef(slashState);
  const dictationRange = useRef<{ from: number; to: number } | null>(null);
  const dictationInsertPosition = useRef<number | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder: "Press / for commands",
      }),
      CharacterCount,
    ],
    content: selectedNote ? toEditorContent(selectedNote.content) : undefined,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "notes-editor-content",
      },
      handleKeyDown: (_view, event) => {
        if (!slashRef.current.open) return false;

        const availableCommands = getSlashCommands().filter((command) =>
          command.label
            .toLowerCase()
            .includes(slashRef.current.query.toLowerCase())
        );

        if (event.key === "ArrowDown") {
          event.preventDefault();

          setSlashState((current) => ({
            ...current,
            index:
              (current.index + 1) % Math.max(availableCommands.length, 1),
          }));

          return true;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();

          setSlashState((current) => ({
            ...current,
            index:
              (current.index - 1 + Math.max(availableCommands.length, 1)) %
              Math.max(availableCommands.length, 1),
          }));

          return true;
        }

        if (event.key === "Enter" && availableCommands[slashRef.current.index]) {
          event.preventDefault();
          availableCommands[slashRef.current.index].run();

          return true;
        }

        if (event.key === "Escape") {
          setSlashState((current) => ({
            ...current,
            open: false,
          }));

          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      updateSlashMenu();

      if (suppressSave.current || !selectedNote || selectedNote.isTrashed) {
        return;
      }

      const content = activeEditor.getJSON();
      const plainText = extractPlainText(content);
      const wordCount = activeEditor.storage.characterCount.words();

      if (saveTimer.current) clearTimeout(saveTimer.current);

      setSaveState("saving");

      saveTimer.current = setTimeout(() => {
        startTransition(async () => {
          try {
            const updatedNote = await updateNoteContent(selectedNote.id, {
              content,
              plainText,
              wordCount,
            });

            upsertNote(updatedNote);
            setSaveState("saved");
            setMessage("");
          } catch (error) {
            setSaveState("error");
            setMessage(
              error instanceof Error ? error.message : "Could not save note."
            );
          }
        });
      }, 800);
    },
  });

  const insertTranscript = useCallback(
    ({
      transcript,
      isFinal,
    }: {
      transcript: string;
      isFinal: boolean;
    }) => {
      if (!editor || !selectedNote || selectedNote.isTrashed) return;

      const text = isFinal ? `${transcript.trim()} ` : transcript;
      if (!text.trim()) return;

      const docEnd = editor.state.doc.content.size;
      const range = dictationRange.current ?? {
        from: dictationInsertPosition.current ?? docEnd,
        to: dictationInsertPosition.current ?? docEnd,
      };
      const from = Math.min(range.from, editor.state.doc.content.size);
      const to = Math.min(range.to, editor.state.doc.content.size);

      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent({
          type: "text",
          text,
        })
        .run();

      const nextTo = from + text.length;
      dictationInsertPosition.current = nextTo;

      dictationRange.current = isFinal
        ? null
        : {
            from,
            to: nextTo,
          };
    },
    [editor, selectedNote]
  );

  const {
    status: dictationStatus,
    isRecording,
    partialTranscript,
    error: dictationError,
    start: startStreaming,
    stop: stopStreaming,
  } = useAssemblyAIStreaming({
    onTranscript: insertTranscript,
    onSessionLimit: () => {
      dictationRange.current = null;
      dictationInsertPosition.current = null;
      setMessage("Recording stopped after 2 minutes.");
    },
  });

  useEffect(() => {
    slashRef.current = slashState;
  }, [slashState]);

  useEffect(() => {
    if (!dictationError) return;

    setMessage(dictationError);
  }, [dictationError]);

  useEffect(() => {
    if (!["requesting", "connecting", "recording"].includes(dictationStatus)) {
      return;
    }

    stopStreaming();
    dictationRange.current = null;
    dictationInsertPosition.current = null;
  }, [selectedNote?.id]);

  useEffect(() => {
    if (!selectedNote) return;

    setTitleDraft(selectedNote.title);
    setSaveState("saved");
    setMessage("");
    setOpenMenuId(null);
    setAiMenuOpen(false);
    setToneOpen(false);

    setSlashState((current) => ({
      ...current,
      open: false,
    }));

    if (!editor) return;

    suppressSave.current = true;
    editor.commands.setContent(toEditorContent(selectedNote.content));

    queueMicrotask(() => {
      suppressSave.current = false;
    });
  }, [editor, selectedNote?.id]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (titleTimer.current) clearTimeout(titleTimer.current);
      stopStreaming();
    };
  }, [stopStreaming]);

  function upsertNote(note: NoteDTO) {
    setNotes((current) => {
      const exists = current.some((item) => item.id === note.id);

      const nextNotes = exists
        ? current.map((item) => (item.id === note.id ? note : item))
        : [note, ...current];

      return nextNotes.sort(
        (left, right) =>
          Number(right.isPinned) - Number(left.isPinned) ||
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime()
      );
    });
  }

  function replaceNotes(nextNotes: NoteDTO[]) {
    setNotes(nextNotes);

    setSelectedNoteId((current) => {
      if (nextNotes.some((note) => note.id === current)) return current;

      return nextNotes.find((note) => !note.isTrashed)?.id ?? nextNotes[0]?.id ?? null;
    });
  }

  function runAction(action: () => Promise<void>) {
    setMessage("");

    startTransition(async () => {
      try {
        await action();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Something went wrong."
        );
      }
    });
  }

  function addNote() {
    runAction(async () => {
      const note = await createNote();

      upsertNote(note);
      setSelectedNoteId(note.id);
      setTrashOpen(false);
    });
  }

  function saveTitle(value: string) {
    if (!selectedNote || selectedNote.isTrashed) return;

    setTitleDraft(value);

    if (titleTimer.current) clearTimeout(titleTimer.current);

    setSaveState("saving");

    titleTimer.current = setTimeout(() => {
      startTransition(async () => {
        try {
          const note = await updateNoteTitle(selectedNote.id, value);

          upsertNote(note);
          setSaveState("saved");
        } catch (error) {
          setSaveState("error");
          setMessage(
            error instanceof Error ? error.message : "Could not save title."
          );
        }
      });
    }, 600);
  }

  function updateMetadata(
    noteId: number,
    input: {
      color?: NoteColor;
      icon?: NoteIcon;
      category?: string | null;
      isPinned?: boolean;
    }
  ) {
    runAction(async () => {
      const note = await updateNoteMetadata(noteId, input);

      upsertNote(note);
      setOpenMenuId(null);
    });
  }

  function duplicateSelected(noteId: number) {
    runAction(async () => {
      const note = await duplicateNote(noteId);

      upsertNote(note);
      setSelectedNoteId(note.id);
      setOpenMenuId(null);
    });
  }

  function moveToTrash(noteId: number) {
    runAction(async () => {
      replaceNotes(await trashNote(noteId));
      setOpenMenuId(null);
    });
  }

  function restoreSelected(noteId: number) {
    runAction(async () => {
      const note = await restoreNote(noteId);

      upsertNote(note);
      setSelectedNoteId(note.id);
      setTrashOpen(false);
    });
  }

  function deleteForever(noteId: number) {
    if (!window.confirm("Permanently delete this note?")) return;

    runAction(async () => {
      replaceNotes(await deleteNoteForever(noteId));
    });
  }

  function updateSlashMenu() {
    if (!editor) return;

    const { state, view } = editor;
    const { $from } = state.selection;

    const textBefore = state.doc.textBetween(
      $from.start(),
      $from.pos,
      "\n",
      "\n"
    );

    const match = textBefore.match(/\/([a-z0-9]*)$/i);

    if (!match || state.selection.from !== state.selection.to) {
      setSlashState((current) => ({
        ...current,
        open: false,
      }));

      return;
    }

    const coords = view.coordsAtPos($from.pos);

    setSlashState({
      open: true,
      query: match[1],
      from: $from.pos - match[0].length,
      to: $from.pos,
      top: coords.bottom + 8,
      left: coords.left,
      index: 0,
    });
  }

  function deleteSlashRange() {
    const current = slashRef.current;

    editor
      ?.chain()
      .focus()
      .deleteRange({
        from: current.from,
        to: current.to,
      })
      .run();

    setSlashState((state) => ({
      ...state,
      open: false,
    }));
  }

  function getSlashCommands(): SlashCommand[] {
    return [
      {
        label: "Paragraph",
        hint: "Plain writing block",
        icon: Type,
        run: () => {
          deleteSlashRange();
          editor?.chain().focus().setParagraph().run();
        },
      },
      {
        label: "Heading 1",
        hint: "Large section title",
        icon: Heading1,
        run: () => {
          deleteSlashRange();
          editor?.chain().focus().toggleHeading({ level: 1 }).run();
        },
      },
      {
        label: "Heading 2",
        hint: "Medium section title",
        icon: Heading2,
        run: () => {
          deleteSlashRange();
          editor?.chain().focus().toggleHeading({ level: 2 }).run();
        },
      },
      {
        label: "Heading 3",
        hint: "Small section title",
        icon: Heading3,
        run: () => {
          deleteSlashRange();
          editor?.chain().focus().toggleHeading({ level: 3 }).run();
        },
      },
      {
        label: "Bullet list",
        hint: "Simple unordered list",
        icon: List,
        run: () => {
          deleteSlashRange();
          editor?.chain().focus().toggleBulletList().run();
        },
      },
      {
        label: "Numbered list",
        hint: "Ordered steps",
        icon: ListOrdered,
        run: () => {
          deleteSlashRange();
          editor?.chain().focus().toggleOrderedList().run();
        },
      },
      {
        label: "Quote",
        hint: "Indented quote block",
        icon: Quote,
        run: () => {
          deleteSlashRange();
          editor?.chain().focus().toggleBlockquote().run();
        },
      },
      {
        label: "Code block",
        hint: "Preformatted code",
        icon: Highlighter,
        run: () => {
          deleteSlashRange();
          editor?.chain().focus().toggleCodeBlock().run();
        },
      },
      {
        label: "Divider",
        hint: "Horizontal rule",
        icon: Minus,
        run: () => {
          deleteSlashRange();
          editor?.chain().focus().setHorizontalRule().run();
        },
      },
    ];
  }

  async function refineText(action: RefineAction, tone?: RefineTone) {
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
        const replacement = await refineSelectedText({
          text,
          action,
          tone,
        });

        editor
          .chain()
          .focus()
          .deleteRange({ from, to })
          .insertContent(replacement)
          .run();

        setMessage("");
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not refine selected text."
        );
      }
    });
  }

  function startDictation() {
    if (!editor || !selectedNote || selectedNote.isTrashed) return;

    const hasActiveCursor = editor.view.hasFocus();
    const { from } = editor.state.selection;
    const docEnd = editor.state.doc.content.size;
    const insertAt = hasActiveCursor ? from : docEnd;

    dictationRange.current = null;
    dictationInsertPosition.current = insertAt;
    setMessage("");
    void startStreaming();
  }

  function stopDictation() {
    dictationRange.current = null;
    dictationInsertPosition.current = null;
    stopStreaming();
  }

  const slashCommands = getSlashCommands().filter((command) =>
    command.label.toLowerCase().includes(slashState.query.toLowerCase())
  );

  const SelectedIcon = selectedNote ? iconMap[selectedNote.icon] : FileText;

  const pinnedCount = activeNotes.filter((note) => note.isPinned).length;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[21rem_minmax(0,1fr)]">
      <aside className="flex min-h-[22rem] flex-col overflow-hidden rounded-lg bg-sidebar/70 lg:min-h-0">
        <div className="shrink-0 px-3 pb-3 pt-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase leading-5 text-muted-foreground">Library</p>
              <h2 className="truncate text-lg font-semibold leading-7">Notes desk</h2>
            </div>
            <Button
              size="sm"
              className="h-8 shrink-0 rounded-lg px-3"
              aria-label="New note"
              title="New note"
              onClick={addNote}
              disabled={isPending}
            >
              <Plus className="mr-1.5 size-3.5" aria-hidden="true" />
              New
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{activeNotes.length} active</span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span>{pinnedCount} pinned</span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span>{trashedNotes.length} trashed</span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg bg-muted/70 px-3 text-sm focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/10">
              <Search
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search notes"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {filteredNotes.length === 0 ? (
            <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-lg px-4 text-center">
              <FileText
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="mt-2 text-sm font-medium">No notes found</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Create a fresh page or clear search.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotes.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  selected={note.id === selectedNote?.id}
                  menuOpen={openMenuId === note.id}
                  onSelect={() => setSelectedNoteId(note.id)}
                  onMenu={() =>
                    setOpenMenuId((current) =>
                      current === note.id ? null : note.id
                    )
                  }
                  onPin={() =>
                    updateMetadata(note.id, {
                      isPinned: !note.isPinned,
                    })
                  }
                  onColor={(color) => updateMetadata(note.id, { color })}
                  onIcon={(icon) => updateMetadata(note.id, { icon })}
                  onCategory={(category) => updateMetadata(note.id, { category })}
                  onDuplicate={() => duplicateSelected(note.id)}
                  onTrash={() => moveToTrash(note.id)}
                  categories={categories}
                />
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 px-2 pb-2 pt-1">
          <button
            type="button"
            onClick={() => setTrashOpen((value) => !value)}
            className="flex h-10 w-full items-center justify-between rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <Trash2 className="size-4" aria-hidden="true" />
              Trash
            </span>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px]">
              {trashedNotes.length}
            </span>
          </button>

          {trashOpen && (
            <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
              {trashedNotes.length === 0 ? (
                <p className="px-2.5 py-2 text-xs text-muted-foreground">
                  Trash is empty.
                </p>
              ) : (
                trashedNotes.map((note) => {
                  const Icon = iconMap[note.icon];

                  return (
                    <div
                      key={note.id}
                      className="flex items-center gap-2 rounded-lg bg-muted/60 p-2"
                    >
                      <Icon
                        className={cn(
                          "size-4 shrink-0",
                          colorStyles[note.color].chip
                        )}
                        aria-hidden="true"
                      />

                      <button
                        type="button"
                        onClick={() => setSelectedNoteId(note.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-xs font-medium">
                          {note.title}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {formatUpdatedAt(note.updatedAt)}
                        </p>
                      </button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg"
                        aria-label="Restore note"
                        title="Restore note"
                        onClick={() => restoreSelected(note.id)}
                      >
                        <RotateCcw className="size-3.5" aria-hidden="true" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-destructive"
                        aria-label="Delete forever"
                        title="Delete forever"
                        onClick={() => deleteForever(note.id)}
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </aside>

      <main className="relative flex min-h-[40rem] min-w-0 flex-col overflow-hidden rounded-lg bg-[hsl(42_82%_99%)] lg:min-h-0">
        {selectedNote ? (
          <>
            <div className="sticky top-0 z-10 shrink-0 bg-[hsl(42_82%_99%)]/95 px-3 py-3 backdrop-blur-xl sm:px-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-lg",
                      colorStyles[selectedNote.color].soft
                    )}
                  >
                    <SelectedIcon className="size-5" aria-hidden="true" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn("size-1.5 rounded-full", colorStyles[selectedNote.color].dot)} />
                      Updated {formatUpdatedAt(selectedNote.updatedAt)}
                    </p>
                    <input
                      value={titleDraft}
                      onChange={(event) => saveTitle(event.target.value)}
                      disabled={selectedNote.isTrashed}
                      className="mt-0.5 min-w-0 w-full bg-transparent text-2xl font-semibold leading-9 outline-none disabled:opacity-60"
                      aria-label="Note title"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1",
                      saveState === "error"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted/80 text-muted-foreground"
                    )}
                  >
                    {saveState === "saving"
                      ? "Saving..."
                      : saveState === "error"
                        ? "Save error"
                        : "Saved"}
                  </span>

                  <span className="rounded-full bg-muted/80 px-2.5 py-1">
                    {editor?.storage.characterCount.words() ??
                      selectedNote.wordCount}{" "}
                    words
                  </span>

                  {selectedNote.category && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                      {selectedNote.category}
                    </span>
                  )}

                  {selectedNote.isTrashed && (
                    <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-destructive">
                      In Trash
                    </span>
                  )}
                </div>
              </div>

              <Toolbar
                editor={editor}
                disabled={selectedNote.isTrashed}
                isRecording={isRecording}
                dictationStatus={dictationStatus}
                partialTranscript={partialTranscript}
                onStartRecording={startDictation}
                onStopRecording={stopDictation}
                onKeyDown={(event) => event.stopPropagation()}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6 lg:px-10">
              {selectedNote.isTrashed ? (
                <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm">
                  <span>
                    This note is in Trash. Restore it to continue editing.
                  </span>
                  <Button size="sm" onClick={() => restoreSelected(selectedNote.id)}>
                    Restore
                  </Button>
                </div>
              ) : null}

              {editor && (
                <BubbleMenu
                  editor={editor}
                  shouldShow={({ editor: activeEditor }) =>
                    !selectedNote.isTrashed && !activeEditor.state.selection.empty
                  }
                >
                  <div className="flex items-center gap-1 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg">
                    <BubbleButton
                      label="Bold"
                      active={editor.isActive("bold")}
                      onClick={() => editor.chain().focus().toggleBold().run()}
                    >
                      B
                    </BubbleButton>

                    <BubbleButton
                      label="Italic"
                      active={editor.isActive("italic")}
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                    >
                      I
                    </BubbleButton>

                    <BubbleButton
                      label="Underline"
                      active={editor.isActive("underline")}
                      onClick={() =>
                        editor.chain().focus().toggleUnderline().run()
                      }
                    >
                      U
                    </BubbleButton>

                    <BubbleButton
                      label="Strike"
                      active={editor.isActive("strike")}
                      onClick={() => editor.chain().focus().toggleStrike().run()}
                    >
                      S
                    </BubbleButton>

                    <BubbleButton
                      label="Code"
                      active={editor.isActive("code")}
                      onClick={() => editor.chain().focus().toggleCode().run()}
                    >
                      {"<>"}
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
                            <button
                              key={option.action}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => refineText(option.action)}
                              className="block w-full rounded-md px-2.5 py-2 text-left text-xs hover:bg-accent"
                            >
                              {option.label}
                            </button>
                          ))}

                          <div className="relative border-t border-border pt-1">
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => setToneOpen((value) => !value)}
                              className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs hover:bg-accent"
                            >
                              Change tone
                              <ChevronDown className="size-3" aria-hidden="true" />
                            </button>

                            {toneOpen && (
                              <div className="absolute left-full top-1 z-30 ml-1 w-36 rounded-lg border border-border bg-popover p-1 shadow-xl">
                                {toneOptions.map((tone) => (
                                  <button
                                    key={tone}
                                    type="button"
                                    onMouseDown={(event) =>
                                      event.preventDefault()
                                    }
                                    onClick={() => refineText("tone", tone)}
                                    className="block w-full rounded-md px-2.5 py-2 text-left text-xs hover:bg-accent"
                                  >
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

              <EditorContent
                editor={editor}
                  className={cn(
                  "mx-auto max-w-4xl px-5 py-6 sm:px-8 lg:px-12",
                  selectedNote.isTrashed && "pointer-events-none opacity-60"
                )}
              />
            </div>

            {slashState.open && slashCommands.length > 0 && (
              <div
                className="fixed z-50 w-64 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl"
                style={{
                  top: slashState.top,
                  left: slashState.left,
                }}
              >
                {slashCommands.map((command, index) => {
                  const Icon = command.icon;

                  return (
                    <button
                      key={command.label}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={command.run}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left",
                        index === slashState.index
                          ? "bg-accent"
                          : "hover:bg-accent"
                      )}
                    >
                      <Icon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {command.label}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {command.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {message && (
              <div className="absolute bottom-4 left-1/2 z-20 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-lg">
                {message}
              </div>
            )}
          </>
        ) : (
          <div className="flex min-h-96 flex-1 flex-col items-center justify-center px-6 text-center">
            <FileText className="size-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold">Start a note</h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
              Create a note page and start writing with blocks, slash commands,
              and AI refinement.
            </p>

            <Button className="mt-4" onClick={addNote}>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              New Note
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function NoteRow({
  note,
  selected,
  menuOpen,
  onSelect,
  onMenu,
  onPin,
  onColor,
  onIcon,
  onCategory,
  onDuplicate,
  onTrash,
  categories,
}: {
  note: NoteDTO;
  selected: boolean;
  menuOpen: boolean;
  onSelect: () => void;
  onMenu: () => void;
  onPin: () => void;
  onColor: (color: NoteColor) => void;
  onIcon: (icon: NoteIcon) => void;
  onCategory: (category: string | null) => void;
  onDuplicate: () => void;
  onTrash: () => void;
  categories: UserCategoryDTO[];
}) {
  const Icon = iconMap[note.icon];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "group relative flex w-full items-center gap-3 overflow-hidden rounded-lg p-3 text-left transition-colors",
          selected
            ? colorStyles[note.color].active.replace("border-", "ring-1 ring-")
            : "hover:bg-muted/70"
        )}
      >
        <span className={cn("absolute inset-y-2 left-0 w-1 rounded-r-full", colorStyles[note.color].dot)} />
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            colorStyles[note.color].soft
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{note.title}</span>
            {note.isPinned && (
              <Pin
                className="size-3 shrink-0 fill-current text-primary"
                aria-hidden="true"
              />
            )}
          </span>

          <span className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
            <span className={cn("rounded-full px-1.5 py-0.5", colorStyles[note.color].chip)}>
              {colorStyles[note.color].label}
            </span>
            {note.category && (
              <span className="max-w-24 truncate rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">
                {note.category}
              </span>
            )}
            <span className="truncate">{formatUpdatedAt(note.updatedAt)}</span>
          </span>
        </span>

        <span
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            onPin();
          }}
          onKeyDown={(event: ReactKeyboardEvent<HTMLSpanElement>) => {
            if (event.key === "Enter" || event.key === " ") onPin();
          }}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-60 transition-colors hover:bg-background hover:text-primary group-hover:opacity-100",
            note.isPinned && "text-primary"
          )}
          aria-label={note.isPinned ? "Unpin note" : "Pin note"}
          title={note.isPinned ? "Unpin note" : "Pin note"}
        >
          <Pin
            className={cn("size-3.5", note.isPinned && "fill-current")}
            aria-hidden="true"
          />
        </span>

        <span
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            onMenu();
          }}
          onKeyDown={(event: ReactKeyboardEvent<HTMLSpanElement>) => {
            if (event.key === "Enter" || event.key === " ") onMenu();
          }}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-60 transition-colors hover:bg-background hover:text-foreground group-hover:opacity-100"
          aria-label="Note options"
          title="Note options"
        >
          <MoreHorizontal className="size-3.5" aria-hidden="true" />
        </span>
      </button>

      {menuOpen && (
        <div className="absolute right-1 top-11 z-30 w-60 rounded-lg bg-popover p-2 shadow-xl ring-1 ring-border/70">
          <p className="px-1 pb-1 text-[11px] font-medium uppercase text-muted-foreground">
            Color
          </p>

          <div className="grid grid-cols-5 gap-1">
            {colorOptions.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onColor(color)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg",
                  note.color === color ? "bg-muted ring-1 ring-foreground/40" : "hover:bg-muted"
                )}
                aria-label={colorStyles[color].label}
                title={colorStyles[color].label}
              >
                <span className={cn("size-4 rounded-full", colorStyles[color].dot)} />
              </button>
            ))}
          </div>

          <p className="px-1 pb-1 pt-3 text-[11px] font-medium uppercase text-muted-foreground">
            Icon
          </p>

          <div className="grid grid-cols-5 gap-1">
            {iconOptions.map((icon) => {
              const MenuIcon = iconMap[icon];

              return (
                <button
                  key={icon}
                  type="button"
                  onClick={() => onIcon(icon)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg text-muted-foreground",
                    note.icon === icon
                      ? "bg-muted text-foreground ring-1 ring-foreground/40"
                      : "hover:bg-muted"
                  )}
                  aria-label={icon}
                  title={icon}
                >
                  <MenuIcon className="size-4" aria-hidden="true" />
                </button>
              );
            })}
          </div>

          <p className="px-1 pb-1 pt-3 text-[11px] font-medium uppercase text-muted-foreground">
            Category
          </p>
          <select
            value={note.category || ""}
            onChange={(event) => onCategory(event.target.value || null)}
            className="h-9 w-full rounded-lg border border-border bg-card px-2 text-xs outline-none"
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>

          <div className="mt-2 border-t border-border/70 pt-2">
            <MenuButton icon={Copy} label="Duplicate" onClick={onDuplicate} />
            <MenuButton
              icon={Trash2}
              label="Move to Trash"
              onClick={onTrash}
              danger
            />
          </div>
        </div>
      )}
    </div>
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
  onKeyDown,
}: {
  editor: Editor | null;
  disabled: boolean;
  isRecording: boolean;
  dictationStatus: string;
  partialTranscript: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
}) {
  if (!editor) return null;

  function runCommand(command: (activeEditor: Editor) => void) {
    if (!editor) return;

    const { from, to } = editor.state.selection;

    editor.chain().focus().setTextSelection({ from, to }).run();

    command(editor);
  }

  return (
    <div
      onKeyDown={onKeyDown}
      className="mt-4 flex max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted/60 p-1"
    >
      <ToolButton
        label="Paragraph"
        active={editor.isActive("paragraph")}
        disabled={disabled}
        onClick={() =>
          runCommand((activeEditor) => {
            activeEditor.chain().focus().setParagraph().run();
          })
        }
      >
        <Type className="size-4" aria-hidden="true" />
      </ToolButton>

      <ToolButton
        label="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        disabled={disabled}
        onClick={() =>
          runCommand((activeEditor) => {
            activeEditor.chain().focus().toggleHeading({ level: 1 }).run();
          })
        }
      >
        <Heading1 className="size-4" aria-hidden="true" />
      </ToolButton>

      <ToolButton
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        disabled={disabled}
        onClick={() =>
          runCommand((activeEditor) => {
            activeEditor.chain().focus().toggleHeading({ level: 2 }).run();
          })
        }
      >
        <Heading2 className="size-4" aria-hidden="true" />
      </ToolButton>

      <ToolButton
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        disabled={disabled}
        onClick={() =>
          runCommand((activeEditor) => {
            activeEditor.chain().focus().toggleHeading({ level: 3 }).run();
          })
        }
      >
        <Heading3 className="size-4" aria-hidden="true" />
      </ToolButton>

      <span className="mx-1 h-6 w-px shrink-0 bg-border/80" />

      <ToolButton
        label="Bold"
        active={editor.isActive("bold")}
        disabled={disabled}
        onClick={() =>
          runCommand((activeEditor) => {
            activeEditor.chain().focus().toggleBold().run();
          })
        }
      >
        <strong>B</strong>
      </ToolButton>

      <ToolButton
        label="Italic"
        active={editor.isActive("italic")}
        disabled={disabled}
        onClick={() =>
          runCommand((activeEditor) => {
            activeEditor.chain().focus().toggleItalic().run();
          })
        }
      >
        <em>I</em>
      </ToolButton>

      <ToolButton
        label="Underline"
        active={editor.isActive("underline")}
        disabled={disabled}
        onClick={() =>
          runCommand((activeEditor) => {
            activeEditor.chain().focus().toggleUnderline().run();
          })
        }
      >
        <span className="underline">U</span>
      </ToolButton>

      <ToolButton
        label="Strike"
        active={editor.isActive("strike")}
        disabled={disabled}
        onClick={() =>
          runCommand((activeEditor) => {
            activeEditor.chain().focus().toggleStrike().run();
          })
        }
      >
        <span className="line-through">S</span>
      </ToolButton>

      <span className="mx-1 h-6 w-px shrink-0 bg-border/80" />

      <ToolButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        disabled={disabled}
        onClick={() =>
          runCommand((activeEditor) => {
            activeEditor.chain().focus().toggleBulletList().run();
          })
        }
      >
        <List className="size-4" aria-hidden="true" />
      </ToolButton>

      <ToolButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        disabled={disabled}
        onClick={() =>
          runCommand((activeEditor) => {
            activeEditor.chain().focus().toggleOrderedList().run();
          })
        }
      >
        <ListOrdered className="size-4" aria-hidden="true" />
      </ToolButton>

      <ToolButton
        label="Quote"
        active={editor.isActive("blockquote")}
        disabled={disabled}
        onClick={() =>
          runCommand((activeEditor) => {
            activeEditor.chain().focus().toggleBlockquote().run();
          })
        }
      >
        <Quote className="size-4" aria-hidden="true" />
      </ToolButton>

      <ToolButton
        label="Code block"
        active={editor.isActive("codeBlock")}
        disabled={disabled}
        onClick={() =>
          runCommand((activeEditor) => {
            activeEditor.chain().focus().toggleCodeBlock().run();
          })
        }
      >
        <Highlighter className="size-4" aria-hidden="true" />
      </ToolButton>

      <ToolButton
        label="Divider"
        active={false}
        disabled={disabled}
        onClick={() =>
          runCommand((activeEditor) => {
            activeEditor.chain().focus().setHorizontalRule().run();
          })
        }
      >
        <Minus className="size-4" aria-hidden="true" />
      </ToolButton>

      <span className="mx-1 h-6 w-px shrink-0 bg-border/80" />

      <button
        type="button"
        disabled={disabled || dictationStatus === "requesting"}
        onMouseDown={(event) => {
          event.preventDefault();

          if (isRecording) {
            onStopRecording();
            return;
          }

          onStartRecording();
        }}
        title={isRecording ? "Stop Recording" : "Speak to Note"}
        aria-label={isRecording ? "Stop Recording" : "Speak to Note"}
        className={cn(
          "flex h-8 shrink-0 items-center gap-2 rounded-md px-2.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
          isRecording
            ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
            : "bg-background text-foreground shadow-sm hover:bg-card"
        )}
      >
        {isRecording ? (
          <>
            <Mic className="size-3.5 animate-pulse" aria-hidden="true" />
            Stop Recording
          </>
        ) : (
          <>
            <Mic className="size-3.5" aria-hidden="true" />
            Speak to Note
          </>
        )}
      </button>

      {dictationStatus === "connecting" || dictationStatus === "requesting" ? (
        <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
          Connecting...
        </span>
      ) : null}

      {isRecording && partialTranscript ? (
        <span className="max-w-56 shrink truncate rounded-full bg-primary/10 px-2 py-1 text-[11px] text-primary">
          {partialTranscript}
        </span>
      ) : null}
    </div>
  );
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
        active && "bg-background text-primary shadow-sm"
      )}
    >
      {children}
    </button>
  );
}

function BubbleButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={cn(
        "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-semibold transition-colors hover:bg-accent",
        active && "bg-primary/10 text-primary"
      )}
    >
      {children}
    </button>
  );
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-accent",
        danger && "text-destructive hover:bg-destructive/10"
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}
