"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SAMPLE_RATE = 16000;
const SESSION_LIMIT_MS = 120000;

type StreamingStatus =
  | "idle"
  | "requesting"
  | "connecting"
  | "recording"
  | "stopping"
  | "error";

type AssemblyAITurn = {
  type?: string;
  transcript?: string;
  end_of_turn?: boolean;
};

type TokenResponse = {
  token?: string;
  maxSessionDurationSeconds?: number;
  error?: string;
};

type TranscriptEvent = {
  transcript: string;
  isFinal: boolean;
};

type UseAssemblyAIStreamingOptions = {
  onTranscript?: (event: TranscriptEvent) => void;
  onSessionLimit?: () => void;
};

function downsampleTo16Khz(input: Float32Array, inputSampleRate: number) {
  if (inputSampleRate === SAMPLE_RATE) return input;

  const ratio = inputSampleRate / SAMPLE_RATE;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(Math.floor((index + 1) * ratio), input.length);
    let sum = 0;
    let count = 0;

    for (let inputIndex = start; inputIndex < end; inputIndex += 1) {
      sum += input[inputIndex];
      count += 1;
    }

    output[index] = count > 0 ? sum / count : 0;
  }

  return output;
}

function floatToPcm16(input: Float32Array) {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);

  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index]));
    view.setInt16(
      index * 2,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true
    );
  }

  return buffer;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function normalizeTranscript(value: string) {
  return value.replace(/\s+/g, " ").trimStart();
}

export function useAssemblyAIStreaming({
  onTranscript,
  onSessionLimit,
}: UseAssemblyAIStreamingOptions = {}) {
  const [status, setStatus] = useState<StreamingStatus>("idle");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [error, setError] = useState("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const limitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppingRef = useRef(false);
  const startIdRef = useRef(0);
  const onTranscriptRef = useRef(onTranscript);
  const onSessionLimitRef = useRef(onSessionLimit);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onSessionLimitRef.current = onSessionLimit;
  }, [onSessionLimit]);

  const cleanup = useCallback(() => {
    if (limitTimerRef.current) {
      clearTimeout(limitTimerRef.current);
      limitTimerRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    sourceRef.current?.disconnect();
    sourceRef.current = null;

    silentGainRef.current?.disconnect();
    silentGainRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
  }, []);

  const closeSocket = useCallback((terminate: boolean) => {
    const socket = socketRef.current;
    socketRef.current = null;

    if (!socket) return;

    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;

    if (socket.readyState === WebSocket.OPEN) {
      if (terminate) {
        socket.send(JSON.stringify({ type: "Terminate" }));
      }

      socket.close();
      return;
    }

    if (socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  }, []);

  const stop = useCallback(
    (reason?: "limit" | "error") => {
      startIdRef.current += 1;
      stoppingRef.current = true;
      setStatus(reason === "error" ? "error" : "stopping");
      closeSocket(reason !== "error");
      cleanup();
      setPartialTranscript("");
      stoppingRef.current = false;

      if (reason !== "error") {
        setStatus("idle");
      }
    },
    [cleanup, closeSocket]
  );

  const startAudioProcessing = useCallback(
    (socket: WebSocket, stream: MediaStream) => {
      const AudioContextConstructor =
        window.AudioContext ||
        (
          window as Window &
            typeof globalThis & { webkitAudioContext?: typeof AudioContext }
        ).webkitAudioContext;

      if (!AudioContextConstructor) {
        throw new Error("This browser does not support microphone streaming.");
      }

      const audioContext = new AudioContextConstructor();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const silentGain = audioContext.createGain();

      silentGain.gain.value = 0;
      processor.onaudioprocess = (event) => {
        if (socket.readyState !== WebSocket.OPEN) return;

        const input = event.inputBuffer.getChannelData(0);
        const output = event.outputBuffer.getChannelData(0);
        output.fill(0);

        const downsampled = downsampleTo16Khz(input, audioContext.sampleRate);
        socket.send(floatToPcm16(downsampled));
      };

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      sourceRef.current = source;
      processorRef.current = processor;
      silentGainRef.current = silentGain;
    },
    []
  );

  const start = useCallback(async () => {
    if (socketRef.current || status === "requesting" || status === "connecting") {
      return;
    }

    setStatus("requesting");
    setError("");
    setPartialTranscript("");
    const startId = startIdRef.current + 1;
    startIdRef.current = startId;

    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      if (startIdRef.current !== startId) {
        cleanup();
        return;
      }

      const tokenResponse = await fetch("/api/assemblyai/token", {
        cache: "no-store",
      });
      const tokenPayload = (await tokenResponse.json().catch(() => ({}))) as
        TokenResponse;

      if (!tokenResponse.ok || !tokenPayload.token) {
        throw new Error(
          tokenPayload.error || "Could not start AssemblyAI streaming."
        );
      }

      if (startIdRef.current !== startId) {
        cleanup();
        return;
      }

      setStatus("connecting");

      const socketUrl = new URL("wss://streaming.assemblyai.com/v3/ws");
      socketUrl.searchParams.set("speech_model", "u3-rt-pro");
      socketUrl.searchParams.set("sample_rate", String(SAMPLE_RATE));
      socketUrl.searchParams.set("encoding", "pcm_s16le");
      socketUrl.searchParams.set("token", tokenPayload.token);

      const socket = new WebSocket(socketUrl);
      socket.binaryType = "arraybuffer";
      socketRef.current = socket;

      socket.onopen = () => {
        if (!streamRef.current || startIdRef.current !== startId) {
          closeSocket(false);
          cleanup();
          return;
        }

        try {
          startAudioProcessing(socket, streamRef.current);
          setStatus("recording");

          const maxSessionMs =
            (tokenPayload.maxSessionDurationSeconds || 120) * 1000;
          limitTimerRef.current = setTimeout(() => {
            onSessionLimitRef.current?.();
            stop("limit");
          }, Math.min(maxSessionMs, SESSION_LIMIT_MS));
        } catch (processingError) {
          setError(
            getErrorMessage(
              processingError,
              "Could not process microphone audio."
            )
          );
          stop("error");
        }
      };

      socket.onmessage = (event) => {
        if (startIdRef.current !== startId) return;

        const data = JSON.parse(String(event.data)) as AssemblyAITurn;

        if (data.type !== "Turn" || typeof data.transcript !== "string") {
          return;
        }

        const isFinal = Boolean(data.end_of_turn);
        const transcript = normalizeTranscript(data.transcript);

        if (!transcript.trim()) return;

        setPartialTranscript(isFinal ? "" : transcript);
        onTranscriptRef.current?.({
          transcript,
          isFinal,
        });
      };

      socket.onerror = () => {
        if (startIdRef.current !== startId) return;

        setError("AssemblyAI streaming connection failed.");
        stop("error");
      };

      socket.onclose = () => {
        if (stoppingRef.current || startIdRef.current !== startId) return;

        cleanup();
        socketRef.current = null;
        setPartialTranscript("");
        setStatus("idle");
      };
    } catch (startError) {
      if (stream && streamRef.current !== stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      cleanup();
      closeSocket(false);
      setPartialTranscript("");
      setError(
        getErrorMessage(startError, "Could not start microphone recording.")
      );
      setStatus("error");
    }
  }, [cleanup, closeSocket, startAudioProcessing, status, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    status,
    isRecording: status === "recording" || status === "connecting",
    partialTranscript,
    error,
    start,
    stop,
  };
}
