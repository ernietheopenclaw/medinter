"use client";

import { LANGUAGES } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  onChange: (code: string) => void;
}

export function LanguageSelector({ label, value, onChange }: Props) {
  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-gray-600 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full touch-target px-4 py-3 text-lg rounded-xl border-2 border-gray-200 bg-white focus:border-primary focus:outline-none appearance-none"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
