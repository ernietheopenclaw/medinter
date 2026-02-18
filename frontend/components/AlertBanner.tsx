"use client";

interface Props {
  message: string;
  urgency?: string;
}

export function AlertBanner({ message, urgency }: Props) {
  const colors =
    urgency === "critical"
      ? "bg-red-100 border-red-400 text-red-800"
      : urgency === "high"
      ? "bg-amber-100 border-amber-400 text-amber-800"
      : "bg-blue-50 border-blue-300 text-blue-700";

  return (
    <div className={`px-3 py-2 rounded-lg border text-xs font-medium mt-1 ${colors}`}>
      ⚠️ {message}
    </div>
  );
}
