# usecases/usecase1/paa.py

import os
import re
import json
import logging
import google.generativeai as genai
from usecases.usecase1.schemas import UseCase1Input, PAAOutput

logger = logging.getLogger("agentnation.paa")

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
_model = genai.GenerativeModel("gemini-2.5-flash")


def _extract_json(text: str) -> dict:
    """
    Robustly extract a JSON object from LLM output.
    Handles three cases Gemini commonly produces:
      1. Pure JSON (ideal)
      2. ```json ... ``` fenced block
      3. JSON buried inside prose text
    """
    text = text.strip()

    # Case 1: already clean JSON
    if text.startswith("{"):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

    # Case 2: fenced code block  ```json ... ``` or ``` ... ```
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except json.JSONDecodeError:
            pass

    # Case 3: find the first { ... } block anywhere in the text
    brace_match = re.search(r"\{.*\}", text, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group())
        except json.JSONDecodeError:
            pass

    # All attempts failed — log the raw response so we can debug
    logger.error(f"[PAA] Could not extract JSON from response. Raw text:\n{text[:500]}")
    return {}


def run_paa(input_data: UseCase1Input) -> PAAOutput:
    """
    Policy Analysis Agent (PAA) — Gemini LLM

    Two separate calls:
      1. Structured extraction -> JSON (objectives, domains, assumptions, complexity)
      2. Narrative explanation -> plain English briefing note
    """

    # ── 1. Structured extraction ──────────────────────────────────────────────
    extraction_prompt = f"""You are a policy analyst. Extract structured information from the policy below.

Return ONLY a valid JSON object — no markdown, no explanation, no text before or after the JSON.

The JSON must have exactly these four keys:
{{
  "policy_objectives": ["<objective 1>", "<objective 2>"],
  "affected_domains": ["<domain 1>", "<domain 2>"],
  "assumptions": ["<assumption 1>", "<assumption 2>"],
  "complexity_level": "<low | medium | high>"
}}

Policy Title: {input_data.policy_title}
Policy Description: {input_data.policy_description}
Sector: {input_data.sector}
Time Horizon: {input_data.time_horizon}"""

    try:
        raw = _model.generate_content(extraction_prompt)
        data = _extract_json(raw.text)
    except Exception as e:
        logger.error(f"[PAA] Extraction call failed: {e}")
        data = {}

    # Validate each field — fall back to safe defaults if missing or wrong type
    policy_objectives = data.get("policy_objectives", [])
    affected_domains  = data.get("affected_domains", [])
    assumptions       = data.get("assumptions", [])
    complexity_level  = data.get("complexity_level", "medium")

    if not isinstance(policy_objectives, list) or len(policy_objectives) == 0:
        policy_objectives = ["Could not extract — please add a policy description"]
    if not isinstance(affected_domains, list) or len(affected_domains) == 0:
        affected_domains = [input_data.sector]
    if not isinstance(assumptions, list) or len(assumptions) == 0:
        assumptions = ["Could not extract — please add a policy description"]
    if complexity_level not in ("low", "medium", "high"):
        complexity_level = "medium"

    # ── 2. Narrative explanation ──────────────────────────────────────────────
    objectives_text = "; ".join(policy_objectives)

    explanation_prompt = f"""You are a senior policy advisor. Write a concise 3-sentence briefing note for a government official.

Sentence 1: What this policy is trying to accomplish.
Sentence 2: Why it matters for the {input_data.sector} sector.
Sentence 3: What the main implementation challenge is likely to be.

Policy Title: {input_data.policy_title}
Policy Description: {input_data.policy_description}
Sector: {input_data.sector}
Time Horizon: {input_data.time_horizon}
Identified Objectives: {objectives_text}

Write only the 3-sentence briefing note. No headers, no bullets, no JSON."""

    try:
        exp_raw = _model.generate_content(explanation_prompt)
        explanation = exp_raw.text.strip()
        if explanation.startswith("{") or explanation.startswith("```"):
            raise ValueError("LLM returned structured data instead of prose")
    except Exception as e:
        logger.error(f"[PAA] Explanation call failed: {e}")
        explanation = (
            f"Policy '{input_data.policy_title}' targets the {input_data.sector} sector "
            f"over a {input_data.time_horizon} time horizon. "
            f"Objectives: {objectives_text}."
        )

    logger.info(
        f"[PAA] Extraction complete — "
        f"{len(policy_objectives)} objectives, "
        f"{len(affected_domains)} domains, "
        f"complexity={complexity_level}"
    )

    return PAAOutput(
        policy_objectives=policy_objectives,
        affected_domains=affected_domains,
        sector=input_data.sector.lower(),
        constraints=input_data.constraints.model_dump(),
        assumptions=assumptions,
        complexity_level=complexity_level,
        explanation=explanation,
    )