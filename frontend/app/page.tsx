"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { LanguageSelector } from "@/components/LanguageSelector";
import { getWsClient } from "@/lib/websocket";
import { getApiUrl } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [sourceLang, setSourceLang] = useState("es-US");
  const [targetLang, setTargetLang] = useState("en-US");
  const [mode, setMode] = useState("conversation");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const ws = getWsClient();
    ws.connect();

    const unsub = ws.onMessage((msg) => {
      if (msg.type === "config_ack") setConnected(true);
    });

    // Check connection periodically
    const interval = setInterval(() => {
      setConnected(ws.connected);
    }, 1000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const startSession = async () => {
    setStarting(true);
    try {
      const res = await fetch(getApiUrl("/api/session/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_lang: sourceLang,
          target_lang: targetLang,
          mode,
        }),
      });
      const data = await res.json();

      // Configure WebSocket
      const ws = getWsClient();
      ws.send({
        type: "config",
        source_lang: sourceLang,
        target_lang: targetLang,
        session_id: data.session_id,
      });

      // Navigate to session
      const params = new URLSearchParams({
        id: data.session_id,
        src: sourceLang,
        tgt: targetLang,
        mode,
      });
      router.push(`/session/?${params.toString()}`);
    } catch (err) {
      console.error("Failed to start session:", err);
      alert("Could not connect to GB10. Check your connection.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🏥</div>
        <h1 className="text-3xl font-bold text-primary">MedInter</h1>
        <p className="text-gray-500 mt-2 text-lg">
          Every second matters. Every word matters.
        </p>
        <p className="text-sm text-gray-400 mt-1">No internet required.</p>
      </div>

      {/* Connection */}
      <div className="mb-6">
        <ConnectionStatus connected={connected} />
      </div>

      {/* Language Selection */}
      <div className="w-full max-w-sm space-y-4 mb-6">
        <LanguageSelector
          label="Patient Language"
          value={sourceLang}
          onChange={setSourceLang}
        />
        <div className="flex justify-center text-2xl text-gray-300">⇅</div>
        <LanguageSelector
          label="Provider Language"
          value={targetLang}
          onChange={setTargetLang}
        />
      </div>

      {/* Mode */}
      <div className="w-full max-w-sm mb-8">
        <label className="block text-sm font-semibold text-gray-600 mb-1">
          Mode
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { val: "conversation", label: "💬 Convo" },
            { val: "one-way", label: "➡️ One-Way" },
            { val: "dictation", label: "📝 Dictate" },
          ].map((m) => (
            <button
              key={m.val}
              onClick={() => setMode(m.val)}
              className={`touch-target px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                mode === m.val
                  ? "bg-primary text-white shadow-md"
                  : "bg-white border-2 border-gray-200 text-gray-600 hover:border-primary"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Start */}
      <button
        onClick={startSession}
        disabled={starting}
        className="touch-target w-full max-w-sm px-8 py-5 bg-primary text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-blue-800 transition-all active:scale-95 disabled:opacity-50"
      >
        {starting ? "Connecting..." : "Start Session"}
      </button>

      {/* Footer */}
      <p className="text-xs text-gray-400 mt-8 text-center">
        Powered by NVIDIA DGX Spark GB10
        <br />
        All processing happens locally. No data leaves this device.
      </p>
    </div>
  );
}
