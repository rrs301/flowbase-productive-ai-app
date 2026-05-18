"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AssistantActionProposal } from "@/app/ai-assistant/actions";

const SAMPLE_RATE = 24000;

type VoiceStatus = "idle" | "connecting" | "listening" | "user-speaking" | "agent-speaking" | "processing" | "error";

type TokenResponse = {
  token?: string;
  error?: string;
};

type VoiceAgentMessage = {
  type?: string;
  session_id?: string;
  text?: string;
  data?: string;
  status?: string;
  message?: string;
  code?: string;
  call_id?: string;
  name?: string;
  arguments?: Record<string, unknown>;
};

type UseAssemblyAIVoiceAgentOptions = {
  onUserTranscript?: (text: string) => void;
  onAgentTranscript?: (text: string) => void;
  onActionProposal?: (proposal: AssistantActionProposal) => void;
  onError?: (message: string) => void;
};

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function base64ToInt16Array(value: string) {
  const raw = atob(value);
  const pcm = new Int16Array(raw.length / 2);
  for (let index = 0; index < pcm.length; index += 1) {
    pcm[index] = raw.charCodeAt(index * 2) | (raw.charCodeAt(index * 2 + 1) << 8);
  }
  return pcm;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function toActionProposal(name: string | undefined, args: Record<string, unknown> | undefined): AssistantActionProposal | null {
  const payload = args || {};
  const type = typeof payload.type === "string" ? payload.type : name;
  const allowed = [
    "create_kanban_board",
    "create_kanban_task",
    "create_calendar_item",
    "create_note",
    "update_note_content",
    "create_whiteboard",
    "generate_whiteboard_diagram",
    "generate_template_app",
    "update_settings",
  ];

  if (!type || !allowed.includes(type)) return null;

  return {
    type: type as AssistantActionProposal["type"],
    title: typeof payload.title === "string" ? payload.title : "Confirm action",
    summary: typeof payload.summary === "string" ? payload.summary : "Review and confirm this voice action.",
    appArea: typeof payload.appArea === "string" ? payload.appArea : "Flowbase",
    requiresConfirmation: true,
    payload: payload.payload && typeof payload.payload === "object" && !Array.isArray(payload.payload) ? payload.payload as Record<string, unknown> : payload,
  };
}

export function useAssemblyAIVoiceAgent({
  onUserTranscript,
  onAgentTranscript,
  onActionProposal,
  onError,
}: UseAssemblyAIVoiceAgentOptions = {}) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState("");

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const playbackTimeRef = useRef(0);
  const readyRef = useRef(false);
  const startIdRef = useRef(0);
  const pendingToolResultsRef = useRef<Array<{ callId: string; result: Record<string, unknown> }>>([]);
  const callbacksRef = useRef({ onUserTranscript, onAgentTranscript, onActionProposal, onError });

  useEffect(() => {
    callbacksRef.current = { onUserTranscript, onAgentTranscript, onActionProposal, onError };
  }, [onUserTranscript, onAgentTranscript, onActionProposal, onError]);

  const cleanupAudio = useCallback(() => {
    workletRef.current?.disconnect();
    workletRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    silentGainRef.current?.disconnect();
    silentGainRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    playbackTimeRef.current = 0;
    readyRef.current = false;
    pendingToolResultsRef.current = [];
  }, []);

  const stop = useCallback(() => {
    startIdRef.current += 1;
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState <= WebSocket.OPEN) {
      socket.close();
    }
    cleanupAudio();
    setStatus("idle");
  }, [cleanupAudio]);

  const start = useCallback(async () => {
    if (socketRef.current || status === "connecting") return;

    const startId = startIdRef.current + 1;
    startIdRef.current = startId;
    setStatus("connecting");
    setError("");

    try {
      const tokenResponse = await fetch("/api/assemblyai/voice-agent-token", { cache: "no-store" });
      const tokenPayload = (await tokenResponse.json().catch(() => ({}))) as TokenResponse;
      if (!tokenResponse.ok || !tokenPayload.token) {
        throw new Error(tokenPayload.error || "Could not start AssemblyAI Voice Agent.");
      }

      const AudioContextConstructor =
        window.AudioContext ||
        (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextConstructor) {
        throw new Error("This browser does not support microphone audio.");
      }

      const audioContext = new AudioContextConstructor({ sampleRate: SAMPLE_RATE });
      await audioContext.resume();
      audioContextRef.current = audioContext;

      const workletUrl = URL.createObjectURL(
        new Blob(
          [
            `
              class FlowbasePcmProcessor extends AudioWorkletProcessor {
                process(inputs) {
                  const channel = inputs[0] && inputs[0][0];
                  if (channel) {
                    const buffer = new Int16Array(channel.length);
                    for (let i = 0; i < channel.length; i += 1) {
                      const sample = Math.max(-1, Math.min(1, channel[i]));
                      buffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
                    }
                    this.port.postMessage(buffer.buffer, [buffer.buffer]);
                  }
                  return true;
                }
              }
              registerProcessor("flowbase-pcm", FlowbasePcmProcessor);
            `,
          ],
          { type: "application/javascript" },
        ),
      );
      await audioContext.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      if (startIdRef.current !== startId) {
        cleanupAudio();
        return;
      }

      const source = audioContext.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(audioContext, "flowbase-pcm");
      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0;

      source.connect(worklet);
      worklet.connect(silentGain);
      silentGain.connect(audioContext.destination);

      sourceRef.current = source;
      workletRef.current = worklet;
      silentGainRef.current = silentGain;

      const socketUrl = new URL("wss://agents.assemblyai.com/v1/ws");
      socketUrl.searchParams.set("token", tokenPayload.token);
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      worklet.port.onmessage = ({ data }: MessageEvent<ArrayBuffer>) => {
        if (!readyRef.current || socket.readyState !== WebSocket.OPEN) return;
        socket.send(JSON.stringify({ type: "input.audio", audio: arrayBufferToBase64(data) }));
      };

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            type: "session.update",
            session: {
              system_prompt:
                "You are Flowbase AI Assistant. Keep spoken replies concise and natural. When the user asks to save or change workspace data, call the propose_action tool instead of claiming it is saved.",
              greeting: "Hey, I am ready. What should we work on?",
              output: { voice: "ivy" },
              tools: [
                {
                  type: "function",
                  name: "propose_action",
                  description: "Propose a Flowbase action for the user to confirm in the app UI.",
                  parameters: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      title: { type: "string" },
                      summary: { type: "string" },
                      appArea: { type: "string" },
                      payload: { type: "object" },
                    },
                    required: ["type", "title", "summary", "appArea", "payload"],
                  },
                },
              ],
            },
          }),
        );
      };

      socket.onmessage = (event) => {
        if (startIdRef.current !== startId) return;
        const message = JSON.parse(String(event.data)) as VoiceAgentMessage;

        if (message.type === "session.ready") {
          readyRef.current = true;
          setStatus("listening");
          return;
        }

        if (message.type === "input.speech.started") {
          setStatus("user-speaking");
          return;
        }

        if (message.type === "input.speech.stopped") {
          setStatus("processing");
          return;
        }

        if (message.type === "reply.started") {
          setStatus("agent-speaking");
          return;
        }

        if (message.type === "reply.audio" && message.data && audioContextRef.current) {
          const pcm = base64ToInt16Array(message.data);
          const samples = new Float32Array(pcm.length);
          for (let index = 0; index < pcm.length; index += 1) {
            samples[index] = pcm[index] / 32768;
          }

          const buffer = audioContextRef.current.createBuffer(1, samples.length, SAMPLE_RATE);
          buffer.getChannelData(0).set(samples);
          const sourceNode = audioContextRef.current.createBufferSource();
          sourceNode.buffer = buffer;
          sourceNode.connect(audioContextRef.current.destination);
          playbackTimeRef.current = Math.max(playbackTimeRef.current, audioContextRef.current.currentTime);
          sourceNode.start(playbackTimeRef.current);
          playbackTimeRef.current += buffer.duration;
          return;
        }

        if (message.type === "reply.done") {
          if (message.status === "interrupted" && audioContextRef.current) {
            playbackTimeRef.current = audioContextRef.current.currentTime;
            pendingToolResultsRef.current = [];
          } else if (pendingToolResultsRef.current.length && socket.readyState === WebSocket.OPEN) {
            for (const pendingTool of pendingToolResultsRef.current) {
              socket.send(
                JSON.stringify({
                  type: "tool.result",
                  call_id: pendingTool.callId,
                  result: JSON.stringify(pendingTool.result),
                }),
              );
            }
            pendingToolResultsRef.current = [];
          }
          setStatus("listening");
          return;
        }

        if (message.type === "transcript.user" && message.text) {
          callbacksRef.current.onUserTranscript?.(message.text);
          return;
        }

        if (message.type === "transcript.agent" && message.text) {
          callbacksRef.current.onAgentTranscript?.(message.text);
          return;
        }

        if (message.type === "tool.call") {
          const proposal = toActionProposal(message.name, message.arguments);
          if (proposal) callbacksRef.current.onActionProposal?.(proposal);
          if (message.call_id) {
            pendingToolResultsRef.current = [
              ...pendingToolResultsRef.current,
              {
                callId: message.call_id,
                result: proposal ? { status: "proposed_for_confirmation" } : { status: "unsupported_tool" },
              },
            ];
          }
          return;
        }

        if (message.type === "session.error") {
          const nextError = message.message || message.code || "AssemblyAI Voice Agent error.";
          setError(nextError);
          setStatus("error");
          callbacksRef.current.onError?.(nextError);
        }
      };

      socket.onerror = () => {
        const nextError = "AssemblyAI Voice Agent connection failed.";
        setError(nextError);
        setStatus("error");
        callbacksRef.current.onError?.(nextError);
      };

      socket.onclose = () => {
        if (startIdRef.current !== startId) return;
        cleanupAudio();
        socketRef.current = null;
        setStatus("idle");
      };
    } catch (startError) {
      cleanupAudio();
      const nextError = getErrorMessage(startError, "Could not start voice assistant.");
      setError(nextError);
      setStatus("error");
      callbacksRef.current.onError?.(nextError);
    }
  }, [cleanupAudio, status]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    status,
    error,
    isActive: status !== "idle" && status !== "error",
    start,
    stop,
  };
}
