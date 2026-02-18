"""Medical Named Entity Recognition — post-processing of LLM output."""

from __future__ import annotations

from typing import TypedDict


class MedicalEntity(TypedDict):
    term: str
    category: str
    original: str


# Valid categories
CATEGORIES = {
    "symptom",
    "condition",
    "medication",
    "allergy",
    "vital_sign",
    "procedure",
    "dosage",
    "onset",
    "severity",
}

CATEGORY_DISPLAY = {
    "symptom": {"color": "#DC2626", "emoji": "🔴", "label": "Symptom"},
    "condition": {"color": "#2563EB", "emoji": "🔵", "label": "Condition"},
    "medication": {"color": "#059669", "emoji": "🟢", "label": "Medication"},
    "allergy": {"color": "#D97706", "emoji": "🟡", "label": "Allergy"},
    "vital_sign": {"color": "#7C3AED", "emoji": "🟣", "label": "Vital Sign"},
    "procedure": {"color": "#0891B2", "emoji": "🔷", "label": "Procedure"},
    "dosage": {"color": "#4F46E5", "emoji": "💊", "label": "Dosage"},
    "onset": {"color": "#6B7280", "emoji": "⚪", "label": "Onset/Duration"},
    "severity": {"color": "#BE123C", "emoji": "⚠️", "label": "Severity"},
}


def validate_and_normalize(terms: list[dict]) -> list[MedicalEntity]:
    """Validate and normalize medical terms from LLM output."""
    normalized = []
    for t in terms:
        cat = t.get("category", "").lower().strip()
        if cat not in CATEGORIES:
            cat = "symptom"  # Default fallback
        normalized.append(
            MedicalEntity(
                term=t.get("term", "Unknown"),
                category=cat,
                original=t.get("original", ""),
            )
        )
    return normalized


def build_clinical_summary(terms: list[MedicalEntity]) -> dict:
    """Build a structured clinical summary from extracted terms."""
    summary: dict[str, list[str]] = {
        "chief_complaint": [],
        "symptoms": [],
        "conditions": [],
        "medications": [],
        "allergies": [],
        "vitals": [],
        "onset_duration": [],
        "severity": [],
        "procedures": [],
    }

    for t in terms:
        cat = t["category"]
        entry = t["term"]
        if cat == "symptom":
            summary["symptoms"].append(entry)
            if not summary["chief_complaint"]:
                summary["chief_complaint"].append(entry)
        elif cat == "condition":
            summary["conditions"].append(entry)
        elif cat == "medication":
            summary["medications"].append(entry)
        elif cat == "allergy":
            summary["allergies"].append(entry)
        elif cat == "vital_sign":
            summary["vitals"].append(entry)
        elif cat == "onset":
            summary["onset_duration"].append(entry)
        elif cat == "severity":
            summary["severity"].append(entry)
        elif cat == "procedure":
            summary["procedures"].append(entry)
        elif cat == "dosage":
            summary["medications"].append(entry)

    return summary


def get_category_display(category: str) -> dict:
    """Get display properties for a category."""
    return CATEGORY_DISPLAY.get(category, CATEGORY_DISPLAY["symptom"])
