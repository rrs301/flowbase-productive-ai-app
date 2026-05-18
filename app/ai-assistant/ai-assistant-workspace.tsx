"use client";

import {
  Bot,
  CalendarDays,
  Check,
  Columns3,
  FileText,
  LayoutTemplate,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Square,
  Wand2,
  X,
} from "lucide-react";
import { KeyboardEvent, useMemo, useRef, useState, useTransition } from "react";

import {
  executeAssistantAction,
  sendAssistantMessage,
  type AssistantActionProposal,
  type AssistantExecutionResult,
  type AssistantMessageInput,
} from "@/app/ai-assistant/actions";
import type { getAssistantSnapshot } from "@/app/ai-assistant/actions";
import { useAssemblyAIVoiceAgent } from "@/app/ai-assistant/use-assemblyai-voice-agent";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AssistantSnapshot = Awaited<ReturnType<typeof getAssistantSnapshot>>;

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  action?: AssistantActionProposal;
  actionState?: "pending" | "running" | "done" | "cancelled" | "error";
  result?: AssistantExecutionResult;
};

const suggestions = [
  { text: "Create a task for tomorrow", icon: Columns3 },
  { text: "Add meeting reminder on calendar", icon: CalendarDays },
  { text: "Summarize my notes", icon: FileText },
  { text: "Create a Kanban board", icon: Columns3 },
  { text: "Plan my week", icon: Sparkles },
  { text: "Generate a habit tracker template", icon: LayoutTemplate },
];

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function voiceLabel(status: ReturnType<typeof useAssemblyAIVoiceAgent>["status"]) {
  if (status === "connecting") return "Connecting";
  if (status === "user-speaking") return "Listening";
  if (status === "agent-speaking") return "Speaking";
  if (status === "processing") return "Processing";
  if (status === "listening") return "Listening";
  if (status === "error") return "Voice error";
  return "Talk";
}

function actionTone(appArea: string) {
  const area = appArea.toLowerCase();
  if (area.includes("calendar")) return "bg-sage-100/70 text-sage-800";
  if (area.includes("kanban") || area.includes("task")) return "bg-amber-100/70 text-amber-800";
  if (area.includes("note")) return "bg-sky-100/70 text-sky-800";
  if (area.includes("whiteboard")) return "bg-clay-100/70 text-clay-800";
  return "bg-violet-100/70 text-violet-800";
}

export function AiAssistantWorkspace({ initialSnapshot }: { initialSnapshot: AssistantSnapshot }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement | null>(null);

  const messageInputs = useMemo<AssistantMessageInput[]>(
    () =>
      messages
        .filter(
          (message): message is ChatMessage & { role: "user" | "assistant" } =>
            message.role === "user" || message.role === "assistant",
        )
        .map((message) => ({ role: message.role, content: message.content })),
    [messages],
  );

  function scrollToBottom() {
    window.requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  }

  function appendMessage(message: ChatMessage) {
    setMessages((current) => [...current, message]);
    scrollToBottom();
  }

  function sendPrompt(value = prompt) {
    const content = value.trim();
    if (!content || isPending) return;

    setPrompt("");
    setError("");
    const userMessage: ChatMessage = { id: createId(), role: "user", content };
    const nextInputs = [...messageInputs, { role: "user" as const, content }];
    appendMessage(userMessage);

    startTransition(async () => {
      try {
        const response = await sendAssistantMessage(nextInputs);
        appendMessage({
          id: createId(),
          role: "assistant",
          content: response.clarification || response.text,
          action: response.action,
          actionState: response.action ? "pending" : undefined,
        });
      } catch (sendError) {
        setError(sendError instanceof Error ? sendError.message : "AI Assistant could not respond.");
      }
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    sendPrompt();
  }

  function updateActionMessage(
    messageId: string,
    patch: Partial<Pick<ChatMessage, "actionState" | "result" | "content">>,
  ) {
    setMessages((current) =>
      current.map((message) => (message.id === messageId ? { ...message, ...patch } : message)),
    );
    scrollToBottom();
  }

  function confirmAction(message: ChatMessage) {
    if (!message.action || message.actionState === "running") return;

    updateActionMessage(message.id, { actionState: "running" });

    startTransition(async () => {
      try {
        const result = await executeAssistantAction(message.action!);
        updateActionMessage(message.id, {
          actionState: "done",
          result,
          content: `${message.content}\n\n${result.message}`,
        });
      } catch (actionError) {
        updateActionMessage(message.id, {
          actionState: "error",
          result: {
            message: actionError instanceof Error ? actionError.message : "Could not complete this action.",
          },
        });
      }
    });
  }

  function cancelAction(messageId: string) {
    updateActionMessage(messageId, { actionState: "cancelled" });
  }

  const voice = useAssemblyAIVoiceAgent({
    onUserTranscript: (text) => appendMessage({ id: createId(), role: "user", content: text }),
    onAgentTranscript: (text) => appendMessage({ id: createId(), role: "assistant", content: text }),
    onActionProposal: (action) =>
      appendMessage({
        id: createId(),
        role: "assistant",
        content: action.summary,
        action,
        actionState: "pending",
      }),
    onError: setError,
  });

  const hasMessages = messages.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={listRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 py-4"
      >
        {!hasMessages ? (
          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-7 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Bot className="size-5" aria-hidden="true" />
            </div>
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold leading-tight text-foreground">AI Assistant</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Ask questions, plan your day, and prepare actions for your tasks, calendar, notes, whiteboards, and generated apps.
              </p>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((suggestion) => {
                const Icon = suggestion.icon;
                return (
                  <button
                    key={suggestion.text}
                    type="button"
                    onClick={() => sendPrompt(suggestion.text)}
                    className="flex min-h-20 items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 leading-5">{suggestion.text}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid w-full max-w-2xl grid-cols-3 gap-2 text-xs text-muted-foreground">
              <span>{initialSnapshot.kanbanBoards.length} boards</span>
              <span>{initialSnapshot.notes.length} notes</span>
              <span>{initialSnapshot.calendarItems.length} calendar items</span>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex w-full",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[88%] rounded-lg border px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[75%]",
                    message.role === "user"
                      ? "border-primary/20 bg-primary text-primary-foreground"
                      : message.role === "system"
                        ? "border-border bg-muted text-muted-foreground"
                        : "border-border bg-card text-card-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.action ? (
                    <Card className="mt-3 rounded-lg border-border bg-background/80 p-3 shadow-none">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-md px-2 py-1 text-xs font-medium", actionTone(message.action.appArea))}>
                          {message.action.appArea}
                        </span>
                        <span className="text-sm font-semibold text-foreground">{message.action.title}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{message.action.summary}</p>
                      {message.result ? (
                        <p
                          className={cn(
                            "mt-3 rounded-md px-3 py-2 text-xs",
                            message.actionState === "error"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-sage-100/70 text-sage-800",
                          )}
                        >
                          {message.result.message}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.actionState === "pending" ? (
                          <>
                            <Button size="sm" onClick={() => confirmAction(message)} disabled={isPending}>
                              <Check className="mr-1.5 size-3.5" aria-hidden="true" />
                              Confirm
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => cancelAction(message.id)}>
                              <X className="mr-1.5 size-3.5" aria-hidden="true" />
                              Cancel
                            </Button>
                          </>
                        ) : null}
                        {message.actionState === "running" ? (
                          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                            Saving
                          </span>
                        ) : null}
                        {message.actionState === "cancelled" ? (
                          <span className="text-xs text-muted-foreground">Cancelled</span>
                        ) : null}
                      </div>
                    </Card>
                  ) : null}
                </div>
              </div>
            ))}
            {isPending ? (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Thinking
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-background/95 pt-4">
        <div className="mx-auto w-full max-w-4xl">
          {error || voice.error ? (
            <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error || voice.error}
            </div>
          ) : null}
          <div className="rounded-lg border border-border bg-card p-2 shadow-[0_8px_28px_rgba(70,54,40,0.08)]">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Flowbase AI to plan, summarize, or prepare an action..."
              rows={2}
              className="max-h-40 min-h-14 w-full resize-none bg-transparent px-2 py-2 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wand2 className="size-3.5 text-primary" aria-hidden="true" />
                <span className="hidden sm:inline">Actions require confirmation before saving.</span>
                <span className="sm:hidden">Confirm before saving.</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={voice.isActive ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => (voice.isActive ? voice.stop() : voice.start())}
                  className="min-w-24"
                >
                  {voice.isActive ? (
                    <Square className="mr-1.5 size-3.5" aria-hidden="true" />
                  ) : (
                    <Mic className="mr-1.5 size-3.5" aria-hidden="true" />
                  )}
                  {voice.isActive ? voiceLabel(voice.status) : voiceLabel(voice.status)}
                </Button>
                <Button type="button" size="icon" onClick={() => sendPrompt()} disabled={!prompt.trim() || isPending}>
                  {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
                  <span className="sr-only">Send message</span>
                </Button>
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Enter sends. Shift+Enter adds a new line.
          </p>
        </div>
      </div>
    </div>
  );
}
