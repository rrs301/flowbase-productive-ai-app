"use client";

import { Excalidraw, MainMenu, WelcomeScreen } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { Bot, Sparkles, StickyNote } from "lucide-react";
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";

import type { WhiteboardDTO } from "@/app/whiteboard/actions";

type WhiteboardCanvasProps = {
  board: WhiteboardDTO;
  onApi: (api: ExcalidrawImperativeAPI) => void;
  onChange: (elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) => void;
  onAddStickyNote: () => void;
  onOpenAiDiagram: () => void;
};

export function WhiteboardCanvas({ board, onApi, onChange, onAddStickyNote, onOpenAiDiagram }: WhiteboardCanvasProps) {
  return (
    <Excalidraw
      key={board.id}
      name={board.name}
      excalidrawAPI={onApi}
      initialData={{
        elements: Array.isArray(board.scene.elements) ? board.scene.elements : [],
        appState: {
          viewBackgroundColor: "#fffdf8",
          ...(typeof board.scene.appState === "object" && board.scene.appState ? board.scene.appState : {}),
        },
        files: board.files as BinaryFiles,
        scrollToContent: true,
      }}
      onChange={onChange}
      UIOptions={{
        canvasActions: {
          export: false,
          saveAsImage: false,
          loadScene: false,
          saveToActiveFile: false,
          toggleTheme: false,
        },
        tools: {
          image: true,
        },
      }}
    >
      <WelcomeScreen>
        <WelcomeScreen.Center>
          <WelcomeScreen.Center.Logo>
            <div className="flex flex-col items-center gap-2">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              <span className="text-lg font-semibold text-foreground">Flowbase Whiteboard</span>
            </div>
          </WelcomeScreen.Center.Logo>
          <WelcomeScreen.Center.Heading>Start with a sketch, note, or diagram.</WelcomeScreen.Center.Heading>
          <WelcomeScreen.Center.Menu>
            <WelcomeScreen.Center.MenuItem icon={<StickyNote className="size-4" aria-hidden="true" />} onSelect={onAddStickyNote}>
              Add sticky note
            </WelcomeScreen.Center.MenuItem>
            <WelcomeScreen.Center.MenuItem icon={<Bot className="size-4" aria-hidden="true" />} onSelect={onOpenAiDiagram}>
              Generate AI diagram
            </WelcomeScreen.Center.MenuItem>
          </WelcomeScreen.Center.Menu>
        </WelcomeScreen.Center>
        <WelcomeScreen.Hints.ToolbarHint>
          <p>Pick a drawing tool to begin.</p>
        </WelcomeScreen.Hints.ToolbarHint>
        <WelcomeScreen.Hints.MenuHint>
          <p>Open board options from the menu.</p>
        </WelcomeScreen.Hints.MenuHint>
        <WelcomeScreen.Hints.HelpHint>
          <p>Use help for shortcuts and canvas controls.</p>
        </WelcomeScreen.Hints.HelpHint>
      </WelcomeScreen>
      <MainMenu>
        <MainMenu.DefaultItems.ClearCanvas />
        <MainMenu.DefaultItems.Help />
      </MainMenu>
    </Excalidraw>
  );
}
