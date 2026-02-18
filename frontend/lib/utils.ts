import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const LANGUAGES = [
  { code: "en-US", name: "English", flag: "🇺🇸" },
  { code: "es-US", name: "Spanish", flag: "🇪🇸" },
  { code: "zh-CN", name: "Mandarin", flag: "🇨🇳" },
  { code: "ar-AR", name: "Arabic", flag: "🇸🇦" },
  { code: "fr-FR", name: "French", flag: "🇫🇷" },
  { code: "de-DE", name: "German", flag: "🇩🇪" },
  { code: "hi-IN", name: "Hindi", flag: "🇮🇳" },
  { code: "ko-KR", name: "Korean", flag: "🇰🇷" },
  { code: "ja-JP", name: "Japanese", flag: "🇯🇵" },
  { code: "pt-BR", name: "Portuguese", flag: "🇧🇷" },
  { code: "ru-RU", name: "Russian", flag: "🇷🇺" },
  { code: "it-IT", name: "Italian", flag: "🇮🇹" },
  { code: "vi-VN", name: "Vietnamese", flag: "🇻🇳" },
] as const;

export type Language = (typeof LANGUAGES)[number];

export interface MedicalTerm {
  term: string;
  category: string;
  original: string;
}

export interface TranslationResult {
  type: "translation_result";
  original: string;
  translation: string;
  medical_terms: MedicalTerm[];
  flags: string[];
  urgency: string;
  audio?: string;
}

export interface Exchange {
  id: string;
  speaker: "patient" | "provider";
  original: string;
  translation: string;
  medical_terms: MedicalTerm[];
  flags: string[];
  urgency: string;
  audio?: string;
  timestamp: number;
}

export interface SessionSummary {
  session_id: string;
  duration_seconds: number;
  source_lang: string;
  target_lang: string;
  exchange_count: number;
  medical_terms: MedicalTerm[];
  clinical_summary: {
    chief_complaint: string[];
    symptoms: string[];
    conditions: string[];
    medications: string[];
    allergies: string[];
    vitals: string[];
    onset_duration: string[];
    severity: string[];
    procedures: string[];
  };
  flags: string[];
  mode: string;
}

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  symptom: { bg: "bg-red-100", text: "text-red-800", label: "Symptom" },
  condition: { bg: "bg-blue-100", text: "text-blue-800", label: "Condition" },
  medication: { bg: "bg-green-100", text: "text-green-800", label: "Medication" },
  allergy: { bg: "bg-amber-100", text: "text-amber-800", label: "Allergy" },
  vital_sign: { bg: "bg-purple-100", text: "text-purple-800", label: "Vital Sign" },
  procedure: { bg: "bg-cyan-100", text: "text-cyan-800", label: "Procedure" },
  dosage: { bg: "bg-indigo-100", text: "text-indigo-800", label: "Dosage" },
  onset: { bg: "bg-gray-100", text: "text-gray-800", label: "Onset" },
  severity: { bg: "bg-rose-100", text: "text-rose-800", label: "Severity" },
};

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function getWsUrl(): string {
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/translate`;
}

export function getApiUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}
