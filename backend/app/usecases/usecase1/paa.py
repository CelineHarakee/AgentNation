# usecases/usecase1/paa.py

import os
import re
import json
import logging
import google.generativeai as genai
from usecases.usecase1.schemas import UseCase1Input, PAAOutput
from rag.retriever import retrieve, format_context, is_available

logger = logging.getLogger("agentnation.paa")

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
_model = genai.GenerativeModel("gemini-2.5-flash")


def _extract_json(text: str) -> dict:
    """
    Robustly extract a JSON object from LLM output.
    Tries three strategies in order:
      1. Text starts with { — direct parse
      2. Fenced ```json ... ``` block
      3. First { ... } block found anywhere via regex
    """
    text = text.strip()

    # Case 1: already clean JSON
    if text.startswith("{"):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

    # Case 2: fenced code block
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except json.JSONDecodeError:
            pass

    # Case 3: bare { ... } anywhere in text
    brace_match = re.search(r"\{.*\}", text, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group())
        except json.JSONDecodeError:
            pass

    logger.error(f"[PAA] Could not extract JSON. Raw response (first 500 chars):\n{text[:500]}")
    return {}


def _build_rag_query(input_data: UseCase1Input) -> str:
    """Build a targeted retrieval query from the policy input."""
    return (
        f"{input_data.sector} sector workforce policy "
        f"{input_data.policy_title} "
        f"Saudi Arabia Vision 2030 objectives regulations targets"
    )


def run_paa(input_data: UseCase1Input) -> PAAOutput:
    """
    Policy Analysis Agent (PAA) — Gemini LLM + RAG

    Two Gemini calls:
      1. Structured extraction → JSON (objectives, domains, assumptions, complexity)
      2. Narrative explanation → plain English briefing note

    Both calls are enriched with RAG context retrieved from your document corpus,
    giving Gemini access to sector-specific regulations, Vision 2030 targets,
    and Saudization requirements before it reasons about the policy.
    """

    # ── RAG retrieval ─────────────────────────────────────────────────────────
    rag_context = ""
    if is_available():
        query  = _build_rag_query(input_data)
        chunks = retrieve(query, agent="PAA", n_results=4, sector=input_data.sector)
        rag_context = format_context(chunks, max_chars=3000)
        if rag_context:
            logger.info(f"[PAA] RAG retrieved {len(chunks)} chunks for '{input_data.policy_title}'")
        else:
            logger.info("[PAA] RAG returned no relevant chunks — proceeding without context.")
    else:
        logger.info("[PAA] RAG not available — proceeding without context.")

    # ── Build context section for prompts ─────────────────────────────────────
    context_section = ""
    if rag_context:
        context_section = f"""
RETRIEVED POLICY CONTEXT (Saudi Arabia documents — use this to ground your analysis):
{rag_context}

---
"""

    # ── 1. Structured extraction ──────────────────────────────────────────────
    extraction_prompt = f"""You are a policy analyst specializing in Saudi Arabia workforce policy.
{context_section}
Extract structured information from the policy below.
Use the retrieved context above to inform realistic, Saudi-specific assumptions and affected domains.

Return ONLY a valid JSON object — no markdown, no explanation, no text before or after the JSON.

The JSON must have exactly these four keys:
{{
  "policy_objectives": ["<objective 1>", "<objective 2>"],
  "affected_domains": ["<domain 1>", "<domain 2>"],
  "assumptions": ["<assumption 1>", "<assumption 2>"],
  "complexity_level": "<low | medium | high>"
}}

Rules:
- policy_objectives: what the policy concretely aims to achieve (be specific)
- affected_domains: which areas are impacted (workforce, budget, training, Saudization, etc.)
- assumptions: implicit conditions the policy relies on — use the retrieved context to identify realistic ones
  specific to the Saudi {input_data.sector} sector (e.g., actual Saudization targets, budget constraints)
- complexity_level: based on scale, timeline, and cross-sector dependencies

Policy Title: {input_data.policy_title}
Policy Description: {input_data.policy_description}
Sector: {input_data.sector}
Time Horizon: {input_data.time_horizon}""".strip()

    try:
        raw  = _model.generate_content(extraction_prompt)
        data = _extract_json(raw.text)
    except Exception as e:
        logger.error(f"[PAA] Extraction call failed: {e}")
        data = {}

    # Validate and apply safe defaults
    policy_objectives = data.get("policy_objectives", [])
    affected_domains  = data.get("affected_domains", [])
    assumptions       = data.get("assumptions", [])
    complexity_level  = data.get("complexity_level", "medium")

    if not isinstance(policy_objectives, list) or len(policy_objectives) == 0:
        policy_objectives = ["Could not extract — please add a detailed policy description"]
    if not isinstance(affected_domains, list) or len(affected_domains) == 0:
        affected_domains = [input_data.sector.replace("_", " ").title()]
    if not isinstance(assumptions, list) or len(assumptions) == 0:
        assumptions = ["Could not extract — please add a detailed policy description"]
    if complexity_level not in ("low", "medium", "high"):
        complexity_level = "medium"

    # ── 2. Narrative explanation ──────────────────────────────────────────────
    objectives_text = "; ".join(policy_objectives)

    explanation_prompt = f"""You are a senior policy advisor to the Saudi government.
{context_section}
Write a concise 3-sentence briefing note for a government official about this policy.
Use the retrieved context to make your briefing note specific and grounded in Saudi Arabia's actual context.

Sentence 1: What this policy is concretely trying to accomplish.
Sentence 2: Why it matters for the {input_data.sector} sector given Saudi Arabia's Vision 2030 goals.
Sentence 3: What the main implementation challenge is, specific to the Saudi context.

Policy Title: {input_data.policy_title}
Policy Description: {input_data.policy_description}
Sector: {input_data.sector}
Time Horizon: {input_data.time_horizon}
Identified Objectives: {objectives_text}

Write only the 3-sentence briefing note. No headers, no bullets, no JSON.""".strip()

    try:
        exp_raw     = _model.generate_content(explanation_prompt)
        explanation = exp_raw.text.strip()
        # Sanity check — if Gemini returned structured data instead of prose, use fallback
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
        f"[PAA] Complete — {len(policy_objectives)} objectives, "
        f"{len(affected_domains)} domains, complexity={complexity_level}, "
        f"rag={'yes' if rag_context else 'no'}"
    )

    return PAAOutput(
        policy_objectives=policy_objectives,
        affected_domains=affected_domains,
        sector=input_data.sector.lower(),
        constraints=input_data.constraints,
        assumptions=assumptions,
        complexity_level=complexity_level,
        explanation=explanation,
    )

