"""NVIDIA NIM LLM integration for medical translation."""

from __future__ import annotations

import json
import logging
import random
import time

import httpx

from backend.config import MOCK_MODE, NIM_ENDPOINT, NIM_MODEL

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a medical interpreter AI. Your task is to:

1. **Translate** the following text from {source_lang} to {target_lang} with perfect medical accuracy. Preserve the meaning, tone, and urgency of the original.

2. **Extract medical entities** from the text. Categorize each as one of: symptom, condition, medication, allergy, vital_sign, procedure, dosage, onset, severity.

3. **Flag ambiguities** — if a word or phrase could have multiple medical interpretations, note them.

4. **Assess urgency** — rate as "low", "medium", "high", or "critical" based on the medical content.

Respond ONLY with valid JSON in this exact format:
{{
  "translation": "translated text here",
  "medical_terms": [
    {{"term": "English medical term", "category": "symptom|condition|medication|allergy|vital_sign|procedure|dosage|onset|severity", "original": "term in source language"}}
  ],
  "flags": ["any ambiguity or warning notes"],
  "urgency": "low|medium|high|critical"
}}

Do NOT include any text outside the JSON object."""

# Mock translations for demo mode
MOCK_TRANSLATIONS = {
    "zh-CN": {
        "default": {
            "translation": "My chest has been hurting badly since last night",
            "original": "我胸口很痛，从昨天晚上开始的",
            "medical_terms": [
                {"term": "Chest pain", "category": "symptom", "original": "胸口很痛"},
                {"term": "Last night", "category": "onset", "original": "昨天晚上"},
            ],
            "flags": [],
            "urgency": "high",
        }
    },
    "es-US": {
        "default": {
            "translation": "I have a very strong headache and I feel dizzy",
            "original": "Tengo un dolor de cabeza muy fuerte y me siento mareado",
            "medical_terms": [
                {"term": "Severe headache", "category": "symptom", "original": "dolor de cabeza muy fuerte"},
                {"term": "Dizziness", "category": "symptom", "original": "mareado"},
            ],
            "flags": ["Dizziness combined with severe headache may indicate neurological emergency"],
            "urgency": "high",
        }
    },
}

MOCK_RESPONSES_POOL = [
    {
        "translation": "I am allergic to penicillin and I take metformin for diabetes",
        "medical_terms": [
            {"term": "Penicillin allergy", "category": "allergy", "original": "alergia a penicilina"},
            {"term": "Metformin", "category": "medication", "original": "metformina"},
            {"term": "Diabetes", "category": "condition", "original": "diabetes"},
        ],
        "flags": [],
        "urgency": "medium",
    },
    {
        "translation": "The pain is 8 out of 10, sharp, and radiating to my left arm",
        "medical_terms": [
            {"term": "Pain scale 8/10", "category": "severity", "original": "dolor 8 de 10"},
            {"term": "Sharp pain", "category": "symptom", "original": "dolor agudo"},
            {"term": "Radiating to left arm", "category": "symptom", "original": "se extiende al brazo izquierdo"},
        ],
        "flags": ["Chest pain radiating to left arm is a classic sign of myocardial infarction — URGENT"],
        "urgency": "critical",
    },
    {
        "translation": "I have been vomiting since this morning and I cannot keep water down",
        "medical_terms": [
            {"term": "Vomiting", "category": "symptom", "original": "vomitando"},
            {"term": "This morning", "category": "onset", "original": "desde esta mañana"},
            {"term": "Unable to tolerate fluids", "category": "symptom", "original": "no puedo retener agua"},
        ],
        "flags": ["Risk of dehydration — assess fluid status"],
        "urgency": "medium",
    },
    {
        "translation": "My blood pressure was 180 over 110 when I checked at home",
        "medical_terms": [
            {"term": "Blood pressure 180/110", "category": "vital_sign", "original": "presión arterial 180/110"},
            {"term": "Hypertensive crisis", "category": "condition", "original": "crisis hipertensiva"},
        ],
        "flags": ["BP 180/110 is hypertensive urgency/emergency — immediate evaluation needed"],
        "urgency": "critical",
    },
]


class NIMTranslator:
    """Medical translation via NVIDIA NIM LLM."""

    def __init__(self):
        self._client = httpx.AsyncClient(
            base_url=NIM_ENDPOINT,
            timeout=httpx.Timeout(30.0, connect=5.0),
        )
        self._mock_index = 0

    async def translate(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
    ) -> dict:
        """Translate text and extract medical entities.

        Returns dict with: translation, medical_terms, flags, urgency
        """
        if MOCK_MODE or not await self._check_nim():
            return self._mock_translate(text, source_lang, target_lang)

        prompt = SYSTEM_PROMPT.format(
            source_lang=source_lang, target_lang=target_lang
        )

        try:
            response = await self._client.post(
                "/v1/chat/completions",
                json={
                    "model": NIM_MODEL,
                    "messages": [
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": text},
                    ],
                    "temperature": 0.1,
                    "max_tokens": 1024,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            result = json.loads(content)

            # Validate structure
            return {
                "translation": result.get("translation", text),
                "medical_terms": result.get("medical_terms", []),
                "flags": result.get("flags", []),
                "urgency": result.get("urgency", "medium"),
            }

        except httpx.TimeoutException:
            logger.error("NIM LLM request timed out")
            return self._mock_translate(text, source_lang, target_lang)
        except Exception as e:
            logger.error(f"NIM LLM error: {e}")
            return self._mock_translate(text, source_lang, target_lang)

    async def _check_nim(self) -> bool:
        """Check if NIM endpoint is reachable."""
        try:
            r = await self._client.get("/v1/models", timeout=2.0)
            return r.status_code == 200
        except Exception:
            return False

    def _mock_translate(self, text: str, source_lang: str, target_lang: str) -> dict:
        """Generate a mock translation for demo mode."""
        # Check if we have a specific mock for this language
        if source_lang in MOCK_TRANSLATIONS:
            mock = MOCK_TRANSLATIONS[source_lang]["default"]
            return {
                "translation": mock["translation"],
                "medical_terms": mock["medical_terms"],
                "flags": mock["flags"],
                "urgency": mock["urgency"],
            }

        # Cycle through pool
        mock = MOCK_RESPONSES_POOL[self._mock_index % len(MOCK_RESPONSES_POOL)]
        self._mock_index += 1
        return {
            "translation": mock["translation"],
            "medical_terms": mock["medical_terms"],
            "flags": mock["flags"],
            "urgency": mock["urgency"],
        }

    async def close(self):
        await self._client.aclose()
