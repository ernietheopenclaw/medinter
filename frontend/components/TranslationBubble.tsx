"use client";

import { MedicalTermBadge } from "./MedicalTermBadge";
import { AlertBanner } from "./AlertBanner";
import type { Exchange } from "@/lib/utils";
import { playAudioBase64 } from "@/lib/audio";

export function TranslationBubble({ exchange }: { exchange: Exchange }) {
  const isPatient = exchange.speaker === "patient";

  return (
    <div className={`flex ${isPatient ? "justify-start" : "justify-end"} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
          isPatient
            ? "bg-white border border-gray-200 rounded-tl-sm"
            : "bg-blue-50 border border-blue-200 rounded-tr-sm"
        }`}
      >
        {/* Speaker label */}
        <div className="text-xs font-semibold text-gray-400 mb-1">
          {isPatient ? "🗣️ Patient" : "👨‍⚕️ Provider"}
        </div>

        {/* Original text */}
        <p className="text-sm text-gray-500 italic mb-1">{exchange.original}</p>

        {/* Translation */}
        <p className="text-lg font-medium text-gray-900 mb-2">
          {exchange.translation}
        </p>

        {/* Medical terms */}
        {exchange.medical_terms.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {exchange.medical_terms.map((t, i) => (
              <MedicalTermBadge key={i} term={t} />
            ))}
          </div>
        )}

        {/* Flags */}
        {exchange.flags.map((flag, i) => (
          <AlertBanner key={i} message={flag} urgency={exchange.urgency} />
        ))}

        {/* Audio replay */}
        {exchange.audio && (
          <button
            onClick={() => playAudioBase64(exchange.audio!)}
            className="mt-2 flex items-center gap-1 text-xs text-primary hover:text-blue-800 touch-target"
          >
            🔊 Replay
          </button>
        )}
      </div>
    </div>
  );
}
