"use client";

interface Props {
  speaker: "patient" | "provider";
  recording: boolean;
}

export function SpeakerIndicator({ speaker, recording }: Props) {
  const isPatient = speaker === "patient";

  return (
    <div
      className={`relative flex flex-col items-center justify-center py-6 px-4 rounded-2xl ${
        isPatient ? "bg-blue-50 border-2 border-primary" : "bg-green-50 border-2 border-accent"
      }`}
    >
      {recording && (
        <div className="absolute inset-0 rounded-2xl border-2 border-current animate-pulse-ring opacity-40" />
      )}
      <div className="text-4xl mb-2">{isPatient ? "🗣️" : "👨‍⚕️"}</div>
      <div
        className={`text-2xl font-bold ${
          isPatient ? "text-primary" : "text-accent"
        }`}
      >
        {isPatient ? "PATIENT" : "PROVIDER"}
      </div>
      <div className="text-sm text-gray-500 mt-1">
        {recording ? "Listening..." : "Tap mic to speak"}
      </div>
    </div>
  );
}
