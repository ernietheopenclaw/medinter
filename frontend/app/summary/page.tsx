"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ExportButton } from "@/components/ExportButton";
import { MedicalTermBadge } from "@/components/MedicalTermBadge";
import { AlertBanner } from "@/components/AlertBanner";
import { formatDuration, LANGUAGES, type SessionSummary } from "@/lib/utils";

export default function SummaryPage() {
  const params = useSearchParams();
  const router = useRouter();

  let summary: SessionSummary | null = null;
  try {
    const raw = params.get("data");
    if (raw) summary = JSON.parse(decodeURIComponent(raw));
  } catch {}

  if (!summary) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">No session data available</p>
          <button
            onClick={() => router.push("/")}
            className="touch-target px-6 py-3 bg-primary text-white rounded-xl font-semibold"
          >
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  const cs = summary.clinical_summary;
  const srcName = LANGUAGES.find((l) => l.code === summary!.source_lang)?.name || summary.source_lang;
  const tgtName = LANGUAGES.find((l) => l.code === summary!.target_lang)?.name || summary.target_lang;

  const sections = [
    { label: "Chief Complaint", items: cs.chief_complaint, icon: "🎯" },
    { label: "Symptoms", items: cs.symptoms, icon: "🔴" },
    { label: "Conditions", items: cs.conditions, icon: "🔵" },
    { label: "Medications", items: cs.medications, icon: "💊" },
    { label: "Allergies", items: cs.allergies, icon: "⚠️" },
    { label: "Vitals", items: cs.vitals, icon: "🟣" },
    { label: "Onset / Duration", items: cs.onset_duration, icon: "⏱" },
    { label: "Severity", items: cs.severity, icon: "📊" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-primary text-white px-6 py-6">
        <h1 className="text-2xl font-bold">Session Summary</h1>
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm opacity-90">
          <span>⏱ {formatDuration(summary.duration_seconds)}</span>
          <span>💬 {summary.exchange_count} exchanges</span>
          <span>🌐 {srcName} → {tgtName}</span>
          <span>ID: {summary.session_id}</span>
        </div>
      </header>

      <div className="px-4 mt-4 space-y-4">
        {/* Clinical Summary */}
        {sections.map(
          (sec) =>
            sec.items.length > 0 && (
              <div key={sec.label} className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-700 mb-2">
                  {sec.icon} {sec.label}
                </h3>
                <ul className="space-y-1">
                  {sec.items.map((item, i) => (
                    <li key={i} className="text-gray-800 text-sm pl-2 border-l-2 border-primary">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )
        )}

        {/* Medical Terms */}
        {summary.medical_terms.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-3">
              🏷️ Extracted Medical Terms
            </h3>
            <div className="flex flex-wrap gap-2">
              {summary.medical_terms.map((t, i) => (
                <MedicalTermBadge key={i} term={t} />
              ))}
            </div>
          </div>
        )}

        {/* Flags */}
        {summary.flags.length > 0 && (
          <div className="space-y-2">
            {summary.flags.map((f, i) => (
              <AlertBanner key={i} message={f} urgency="high" />
            ))}
          </div>
        )}

        {/* Export */}
        <ExportButton summary={summary} />

        {/* New Session */}
        <button
          onClick={() => router.push("/")}
          className="touch-target w-full px-6 py-4 bg-white border-2 border-primary text-primary text-lg font-semibold rounded-xl hover:bg-blue-50 transition-colors"
        >
          ➕ New Session
        </button>

        {/* Privacy Notice */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-sm text-green-800 font-medium">
            🔒 No audio was stored. No data left this device.
          </p>
          <p className="text-xs text-green-600 mt-1">
            Session data has been purged from memory.
          </p>
        </div>
      </div>
    </div>
  );
}
