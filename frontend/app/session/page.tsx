"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AudioRecorder } from "@/components/AudioRecorder";
import { SpeakerIndicator } from "@/components/SpeakerIndicator";
import { TranslationBubble } from "@/components/TranslationBubble";
import { SessionTimer } from "@/components/SessionTimer";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { getWsClient } from "@/lib/websocket";
import { playAudioBase64 } from "@/lib/audio";
import type { Exchange } from "@/lib/utils";

export default function SessionPage() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("id") || "";
  const sourceLang = params.get("src") || "es-US";
  const targetLang = params.get("tgt") || "en-US";
  const mode = params.get("mode") || "conversation";

  const [connected, setConnected] = useState(false);
  const [speaker, setSpeaker] = useState<"patient" | "provider">("patient");
  const [recording, setRecording] = useState(false);
  const [partialText, setPartialText] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [startTime] = useState(Date.now());

  const scrollRef = useRef<HTMLDivElement>(null);
  const ws = getWsClient();

  useEffect(() => {
    ws.connect();
    const unsub = ws.onMessage((msg) => {
      if (msg.type === "config_ack") {
        setConnected(true);
      } else if (msg.type === "partial_transcript") {
        setPartialText(msg.text);
      } else if (msg.type === "translation_result") {
        setPartialText("");
        const exchange: Exchange = {
          id: `${Date.now()}-${Math.random()}`,
          speaker,
          original: msg.original,
          translation: msg.translation,
          medical_terms: msg.medical_terms,
          flags: msg.flags,
          urgency: msg.urgency,
          audio: msg.audio,
          timestamp: Date.now(),
        };
        setExchanges((prev) => [...prev, exchange]);
        // Auto-play translation audio
        if (msg.audio) {
          playAudioBase64(msg.audio);
        }
      } else if (msg.type === "speaker_switched") {
        setSpeaker(msg.current_speaker as "patient" | "provider");
      } else if (msg.type === "session_ended") {
        const summaryData = encodeURIComponent(JSON.stringify(msg.summary));
        router.push(`/summary/?data=${summaryData}`);
      }
    });

    const interval = setInterval(() => setConnected(ws.connected), 1000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [speaker]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [exchanges, partialText]);

  const handleAudioChunk = useCallback(
    (b64: string) => {
      ws.send({
        type: "audio_chunk",
        audio: b64,
        session_id: sessionId,
        source_lang: speaker === "patient" ? sourceLang : targetLang,
        target_lang: speaker === "patient" ? targetLang : sourceLang,
      });
    },
    [sessionId, sourceLang, targetLang, speaker]
  );

  const switchSpeaker = () => {
    ws.send({ type: "switch_speaker" });
    setSpeaker((s) => (s === "patient" ? "provider" : "patient"));
  };

  const endSession = () => {
    ws.send({ type: "end_session" });
    // Also end via REST as fallback
    fetch(`${window.location.origin}/api/session/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then((r) => r.json())
      .then((summary) => {
        const data = encodeURIComponent(JSON.stringify(summary));
        router.push(`/summary/?data=${data}`);
      })
      .catch(() => router.push("/"));
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <ConnectionStatus connected={connected} />
        <SessionTimer startTime={startTime} />
      </header>

      {/* Speaker Indicator */}
      <div className="px-4 py-3">
        <SpeakerIndicator speaker={speaker} recording={recording} />
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2">
        {exchanges.map((ex) => (
          <TranslationBubble key={ex.id} exchange={ex} />
        ))}
        {/* Partial transcript */}
        {partialText && (
          <div className="flex justify-start mb-2">
            <div className="bg-gray-100 rounded-2xl px-4 py-3 text-gray-500 italic animate-pulse">
              {partialText}...
            </div>
          </div>
        )}
        {exchanges.length === 0 && !partialText && (
          <div className="flex items-center justify-center h-full text-gray-300 text-lg">
            Tap the microphone to begin
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 py-4 bg-white border-t shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={endSession}
            className="touch-target px-4 py-3 text-danger font-semibold rounded-xl border-2 border-danger hover:bg-red-50 transition-colors text-sm"
          >
            End
          </button>

          <AudioRecorder onAudioChunk={handleAudioChunk} disabled={!connected} />

          {mode === "conversation" && (
            <button
              onClick={switchSpeaker}
              className="touch-target px-4 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-green-700 transition-colors text-sm"
            >
              Switch
            </button>
          )}
          {mode !== "conversation" && <div className="w-16" />}
        </div>
      </div>
    </div>
  );
}
