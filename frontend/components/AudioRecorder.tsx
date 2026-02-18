"use client";

import { useCallback, useRef, useState } from "react";
import { AudioRecorderUtil } from "@/lib/audio";
import { WaveformVisualizer } from "./WaveformVisualizer";

interface Props {
  onAudioChunk: (b64: string) => void;
  disabled?: boolean;
}

export function AudioRecorder({ onAudioChunk, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<AudioRecorderUtil | null>(null);

  const toggle = useCallback(async () => {
    if (recording) {
      recorderRef.current?.stop();
      recorderRef.current = null;
      setRecording(false);
    } else {
      const rec = new AudioRecorderUtil();
      recorderRef.current = rec;
      await rec.start(onAudioChunk);
      setRecording(true);
    }
  }, [recording, onAudioChunk]);

  const getFreq = useCallback(() => {
    return recorderRef.current?.getFrequencyData() ?? new Uint8Array(0);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <WaveformVisualizer getFrequencyData={getFreq} active={recording} />
      <button
        onClick={toggle}
        disabled={disabled}
        className={`touch-target w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg transition-all ${
          recording
            ? "bg-danger text-white scale-110 animate-pulse"
            : "bg-primary text-white hover:bg-blue-800"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {recording ? "⏹" : "🎙️"}
      </button>
      <span className="text-xs text-gray-500">
        {recording ? "Tap to stop" : "Tap to speak"}
      </span>
    </div>
  );
}
