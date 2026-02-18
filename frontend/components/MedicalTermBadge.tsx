"use client";

import { CATEGORY_COLORS, type MedicalTerm } from "@/lib/utils";

export function MedicalTermBadge({ term }: { term: MedicalTerm }) {
  const style = CATEGORY_COLORS[term.category] || CATEGORY_COLORS.symptom;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}
    >
      <span>{style.label}</span>
      <span className="font-normal">·</span>
      <span>{term.term}</span>
    </span>
  );
}
