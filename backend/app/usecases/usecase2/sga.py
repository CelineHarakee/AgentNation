# usecases/usecase2/sga.py

import os
import re
import json
import logging
import google.generativeai as genai
from usecases.usecase2.schemas import PolicyIntent, ScenarioSpec, OptimizationPriority
from rag.retriever import retrieve, format_context, is_available

logger = logging.getLogger("agentnation.sga")

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
_model = genai.GenerativeModel("gemini-2.5-flash")


def _extract_json_list(text: str) -> list:
    """
    Robustly extract a JSON array from LLM output.
    Tries three strategies in order.
    """
    text = text.strip()

    # Case 1: already clean array
    if text.startswith("["):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

    # Case 2: fenced code block
    fenced = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, re.DOTALL)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except json.JSONDecodeError:
            pass

    # Case 3: first [ ... ] anywhere in text
    bracket_match = re.search(r"\[.*\]", text, re.DOTALL)
    if bracket_match:
        try:
            return json.loads(bracket_match.group())
        except json.JSONDecodeError:
            pass

    logger.error(f"[SGA] Could not extract JSON array. Raw (first 500 chars):\n{text[:500]}")
    return []


def _priority_guidance(priority: OptimizationPriority) -> str:
    guidance = {
        OptimizationPriority.MINIMIZE_RISK: (
            "The policymaker's top priority is minimizing workforce and implementation risk. "
            "Generate scenarios that vary in how conservatively risk is managed — "
            "one aggressive, one balanced, one highly cautious."
        ),
        OptimizationPriority.MINIMIZE_COST: (
            "The policymaker's top priority is minimizing budget expenditure. "
            "Generate scenarios that vary in cost approach — "
            "one lean low-budget approach, one moderate, one higher investment with better outcomes."
        ),
        OptimizationPriority.MINIMIZE_TIME: (
            "The policymaker's top priority is achieving results as quickly as possible. "
            "Generate scenarios that vary in implementation speed — "
            "one aggressive short timeline, one medium, one slow but sustainable."
        ),
        OptimizationPriority.BALANCED: (
            "The policymaker wants the best overall tradeoff across risk, cost, and time. "
            "Generate three meaningfully distinct strategic approaches — "
            "they should differ in philosophy, not just parameters."
        ),
    }
    return guidance[priority]


def _build_rag_query(intent: PolicyIntent) -> str:
    """Build a targeted retrieval query for SGA."""
    return (
        f"{intent.sector} sector workforce expansion strategy Saudi Arabia "
        f"implementation approaches phased recruitment training {intent.policy_goal}"
    )


def run_sga(intent: PolicyIntent) -> list[ScenarioSpec]:
    """
    Scenario Generator Agent (SGA) — Gemini LLM + RAG

    Takes a policy intent and generates 3 strategically distinct
    implementation scenarios. RAG context provides Saudi-specific
    precedents and sector constraints to make scenarios realistic.
    """

    # ── RAG retrieval ─────────────────────────────────────────────────────────
    rag_context = ""
    if is_available():
        query  = _build_rag_query(intent)
        chunks = retrieve(query, agent="SGA", n_results=4, sector=intent.sector)
        rag_context = format_context(chunks, max_chars=2500)
        if rag_context:
            logger.info(f"[SGA] RAG retrieved {len(chunks)} chunks for '{intent.policy_goal}'")
        else:
            logger.info("[SGA] RAG returned no relevant chunks — proceeding without context.")
    else:
        logger.info("[SGA] RAG not available — proceeding without context.")

    context_section = ""
    if rag_context:
        context_section = f"""
RETRIEVED CONTEXT (Saudi Arabia workforce policy documents — use to inform realistic scenario design):
{rag_context}

---
"""

    priority_text    = _priority_guidance(intent.priority)
    workforce_fraction = intent.target_growth_pct / 100

    prompt = f"""You are a policy strategy advisor for Saudi Arabia's government workforce planning.
{context_section}
A policymaker wants to achieve the following:
- Sector: {intent.sector}
- Goal: {intent.policy_goal}
- Target workforce growth: {intent.target_growth_pct}%
- Priority: {intent.priority.value}

{priority_text}

Use the retrieved context above to design scenarios that are grounded in Saudi Arabia's actual
sector constraints, Saudization requirements, and Vision 2030 commitments. Reference real
implementation patterns where possible.

Generate exactly 3 implementation scenarios. Each must be a genuinely different strategic
approach — not just the same idea with a different number. Vary the philosophy, not just parameters.

The workforce_capacity for ALL scenarios must be exactly {workforce_fraction:.2f}
(representing the {intent.target_growth_pct}% growth target).
Only time_horizon, budget_limit, and training_investment should vary.

Return ONLY a valid JSON array with exactly 3 objects. No markdown, no explanation.

Each object must have exactly these keys:
{{
  "scenario_id": "A" | "B" | "C",
  "name": "<short strategic name, 2-4 words>",
  "rationale": "<one sentence explaining the strategic logic, Saudi-specific>",
  "time_horizon": "short" | "medium" | "long",
  "budget_limit": <float between 0.05 and 0.40>,
  "workforce_capacity": {workforce_fraction:.2f},
  "training_investment": true | false,
  "key_tradeoff": "<one sentence describing the main tradeoff>"
}}

Rules:
- scenario_id must be "A", "B", "C" in order
- time_horizon values must differ across scenarios
- budget_limit must vary meaningfully (at least 0.05 difference between scenarios)
- At least one scenario must have training_investment: true
- name must reflect strategic philosophy, not just timeline
- rationale and key_tradeoff must be specific to this sector and Saudi context""".strip()

    try:
        raw            = _model.generate_content(prompt)
        scenarios_data = _extract_json_list(raw.text)
    except Exception as e:
        logger.error(f"[SGA] Gemini call failed: {e}")
        scenarios_data = []

    if len(scenarios_data) != 3:
        logger.warning(
            f"[SGA] Expected 3 scenarios, got {len(scenarios_data)}. "
            f"Using fallback scenarios."
        )
        scenarios_data = _fallback_scenarios(intent)

    results = []
    for item in scenarios_data:
        try:
            spec = ScenarioSpec(
                scenario_id       = item.get("scenario_id", "?"),
                name              = item.get("name", "Unnamed Scenario"),
                rationale         = item.get("rationale", "No rationale provided."),
                time_horizon      = item.get("time_horizon", "medium"),
                budget_limit      = float(item.get("budget_limit", 0.15)),
                workforce_capacity= float(item.get("workforce_capacity", workforce_fraction)),
                training_investment= bool(item.get("training_investment", False)),
                key_tradeoff      = item.get("key_tradeoff", "Not specified."),
            )
            results.append(spec)
        except Exception as e:
            logger.error(f"[SGA] Failed to parse scenario: {item} — {e}")

    logger.info(
        f"[SGA] Generated {len(results)} scenarios for '{intent.policy_goal}' "
        f"in {intent.sector} | rag={'yes' if rag_context else 'no'}"
    )
    return results


def _fallback_scenarios(intent: PolicyIntent) -> list:
    """Hard-coded fallback if Gemini fails or returns malformed output."""
    wc = intent.target_growth_pct / 100
    return [
        {
            "scenario_id":        "A",
            "name":               "Accelerated Expansion",
            "rationale":          (
                f"Achieve the {intent.target_growth_pct}% growth target quickly "
                f"through aggressive external recruitment in the {intent.sector} sector."
            ),
            "time_horizon":       "short",
            "budget_limit":       0.25,
            "workforce_capacity": wc,
            "training_investment": False,
            "key_tradeoff":       "Speed vs. workforce pipeline readiness",
        },
        {
            "scenario_id":        "B",
            "name":               "Phased Growth",
            "rationale":          (
                f"Grow the {intent.sector} workforce gradually to reduce strain "
                f"on training capacity and Saudization compliance."
            ),
            "time_horizon":       "medium",
            "budget_limit":       0.15,
            "workforce_capacity": wc,
            "training_investment": False,
            "key_tradeoff":       "Moderate pace vs. sustained feasibility",
        },
        {
            "scenario_id":        "C",
            "name":               "Capability-First",
            "rationale":          (
                f"Invest in {intent.sector} training infrastructure first, "
                f"then expand sustainably to meet Saudization targets."
            ),
            "time_horizon":       "long",
            "budget_limit":       0.20,
            "workforce_capacity": wc,
            "training_investment": True,
            "key_tradeoff":       "Higher upfront cost vs. long-term sustainability",
        },
    ]

# # usecases/usecase2/sga.py

# import os
# import re
# import json
# import logging
# import google.generativeai as genai
# from usecases.usecase2.schemas import PolicyIntent, ScenarioSpec, OptimizationPriority

# logger = logging.getLogger("agentnation.sga")

# genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
# _model = genai.GenerativeModel("gemini-2.5-flash")


# def _extract_json_list(text: str) -> list:
#     """
#     Robustly extract a JSON array from LLM output.
#     Tries fenced block first, then bare array, then any [...] in the text.
#     """
#     text = text.strip()

#     # Case 1: already clean array
#     if text.startswith("["):
#         try:
#             return json.loads(text)
#         except json.JSONDecodeError:
#             pass

#     # Case 2: fenced code block
#     fenced = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, re.DOTALL)
#     if fenced:
#         try:
#             return json.loads(fenced.group(1))
#         except json.JSONDecodeError:
#             pass

#     # Case 3: find first [...] anywhere in text
#     bracket_match = re.search(r"\[.*\]", text, re.DOTALL)
#     if bracket_match:
#         try:
#             return json.loads(bracket_match.group())
#         except json.JSONDecodeError:
#             pass

#     logger.error(f"[SGA] Could not extract JSON array. Raw:\n{text[:500]}")
#     return []


# def _priority_guidance(priority: OptimizationPriority) -> str:
#     guidance = {
#         OptimizationPriority.MINIMIZE_RISK: (
#             "The policymaker's top priority is minimizing workforce and implementation risk. "
#             "Generate scenarios that vary in how conservatively risk is managed — "
#             "one aggressive, one balanced, one highly cautious."
#         ),
#         OptimizationPriority.MINIMIZE_COST: (
#             "The policymaker's top priority is minimizing budget expenditure. "
#             "Generate scenarios that vary in cost approach — "
#             "one low-budget lean approach, one moderate, one with higher investment but better outcomes."
#         ),
#         OptimizationPriority.MINIMIZE_TIME: (
#             "The policymaker's top priority is achieving results as quickly as possible. "
#             "Generate scenarios that vary in implementation speed — "
#             "one aggressive short timeline, one medium, one slow but sustainable."
#         ),
#         OptimizationPriority.BALANCED: (
#             "The policymaker wants the best overall tradeoff across risk, cost, and time. "
#             "Generate three meaningfully distinct strategic approaches — "
#             "they should differ in philosophy, not just parameters."
#         ),
#     }
#     return guidance[priority]


# def run_sga(intent: PolicyIntent) -> list[ScenarioSpec]:
#     """
#     Scenario Generator Agent (SGA)

#     Takes a policy intent and generates 3 strategically distinct
#     implementation scenarios, each with its own name, rationale,
#     constraint set, and key tradeoff.
#     """

#     priority_text = _priority_guidance(intent.priority)

#     # Convert target growth % to workforce_capacity float (e.g. 20% → 0.20)
#     workforce_fraction = intent.target_growth_pct / 100

#     prompt = f"""You are a policy strategy advisor for a government workforce planning system.

# A policymaker wants to achieve the following goal:
# - Sector: {intent.sector}
# - Goal: {intent.policy_goal}
# - Target workforce growth: {intent.target_growth_pct}%
# - Priority: {intent.priority.value}

# {priority_text}

# Generate exactly 3 implementation scenarios. Each scenario must be a genuinely different strategic approach — not just the same idea with a different number.

# The workforce_capacity for ALL scenarios must be exactly {workforce_fraction:.2f} (representing the {intent.target_growth_pct}% growth target). Only time_horizon, budget_limit, and training_investment should vary.

# Return ONLY a valid JSON array with exactly 3 objects. No markdown, no explanation, no text outside the array.

# Each object must have exactly these keys:
# {{
#   "scenario_id": "A" | "B" | "C",
#   "name": "<short strategic name, 2-4 words>",
#   "rationale": "<one sentence explaining the strategic logic>",
#   "time_horizon": "short" | "medium" | "long",
#   "budget_limit": <float between 0.05 and 0.40>,
#   "workforce_capacity": {workforce_fraction:.2f},
#   "training_investment": true | false,
#   "key_tradeoff": "<one sentence describing the main tradeoff>"
# }}

# Rules:
# - scenario_id must be "A", "B", "C" in order
# - time_horizon values must differ across scenarios (use all three if possible)
# - budget_limit must vary meaningfully — at least 0.05 difference between scenarios
# - At least one scenario must have training_investment: true
# - name must reflect the strategic philosophy, not just the timeline
# - rationale and key_tradeoff must be specific to this sector and goal"""

#     try:
#         raw = _model.generate_content(prompt)
#         scenarios_data = _extract_json_list(raw.text)
#     except Exception as e:
#         logger.error(f"[SGA] Gemini call failed: {e}")
#         scenarios_data = []

#     if len(scenarios_data) != 3:
#         logger.warning(f"[SGA] Expected 3 scenarios, got {len(scenarios_data)}. Using fallback.")
#         scenarios_data = _fallback_scenarios(intent)

#     results = []
#     for item in scenarios_data:
#         try:
#             spec = ScenarioSpec(
#                 scenario_id=item.get("scenario_id", "?"),
#                 name=item.get("name", "Unnamed Scenario"),
#                 rationale=item.get("rationale", "No rationale provided."),
#                 time_horizon=item.get("time_horizon", "medium"),
#                 budget_limit=float(item.get("budget_limit", 0.15)),
#                 workforce_capacity=float(item.get("workforce_capacity", workforce_fraction)),
#                 training_investment=bool(item.get("training_investment", False)),
#                 key_tradeoff=item.get("key_tradeoff", "Not specified."),
#             )
#             results.append(spec)
#         except Exception as e:
#             logger.error(f"[SGA] Failed to parse scenario item: {item} — {e}")

#     logger.info(f"[SGA] Generated {len(results)} scenarios for '{intent.policy_goal}' in {intent.sector}")
#     return results


# def _fallback_scenarios(intent: PolicyIntent) -> list:
#     """Hard-coded fallback if Gemini fails or returns malformed output."""
#     wc = intent.target_growth_pct / 100
#     return [
#         {
#             "scenario_id": "A",
#             "name": "Accelerated Expansion",
#             "rationale": f"Achieve the {intent.target_growth_pct}% growth target as quickly as possible with maximum budget.",
#             "time_horizon": "short",
#             "budget_limit": 0.25,
#             "workforce_capacity": wc,
#             "training_investment": False,
#             "key_tradeoff": "Speed vs. workforce pipeline readiness",
#         },
#         {
#             "scenario_id": "B",
#             "name": "Phased Growth",
#             "rationale": f"Grow the {intent.sector} workforce gradually to reduce strain on training and budget.",
#             "time_horizon": "medium",
#             "budget_limit": 0.15,
#             "workforce_capacity": wc,
#             "training_investment": False,
#             "key_tradeoff": "Moderate pace vs. sustained feasibility",
#         },
#         {
#             "scenario_id": "C",
#             "name": "Capability-First",
#             "rationale": f"Invest in training infrastructure first, then expand the {intent.sector} workforce sustainably.",
#             "time_horizon": "long",
#             "budget_limit": 0.20,
#             "workforce_capacity": wc,
#             "training_investment": True,
#             "key_tradeoff": "Higher upfront cost vs. long-term sustainability",
#         },
#     ]