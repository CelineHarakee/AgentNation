# usecases/usecase2/ora.py

import os
import re
import json
import logging
import google.generativeai as genai
from typing import List
from usecases.usecase2.schemas import (
    ScenarioResult,
    CAAOutput,
    HybridScenario,
    UC2ORAOutput,
)

logger = logging.getLogger("agentnation.uc2.ora")

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
_model = genai.GenerativeModel("gemini-2.5-flash")


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("{"):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except json.JSONDecodeError:
            pass
    brace = re.search(r"\{.*\}", text, re.DOTALL)
    if brace:
        try:
            return json.loads(brace.group())
        except json.JSONDecodeError:
            pass
    logger.error(f"[ORA-UC2] Could not extract JSON. Raw:\n{text[:500]}")
    return {}


def generate_hybrid(
    scenario_results: List[ScenarioResult],
    caa_output: CAAOutput,
    sector: str,
    policy_goal: str,
) -> UC2ORAOutput:
    """
    Option Recommendation Agent — UC2 Hybrid Synthesis Mode

    Takes the top two ranked scenarios and synthesizes a new hybrid policy
    that combines their best elements. Unlike UC1's ORA which generates
    mitigation alternatives, this ORA designs an entirely new scenario.
    """

    # Get top 2 scenarios by ranking
    top_rankings = sorted(caa_output.rankings, key=lambda r: r.rank)[:2]
    top_ids = [r.scenario_id for r in top_rankings]

    top_results = [r for r in scenario_results if r.spec.scenario_id in top_ids]
    top_results.sort(key=lambda r: top_ids.index(r.spec.scenario_id))

    if len(top_results) < 2:
        top_results = scenario_results[:2]

    r1, r2 = top_results[0], top_results[1]

    scenarios_detail = "\n".join([
        f"Scenario {r.spec.scenario_id} — {r.spec.name}:\n"
        f"  Rationale: {r.spec.rationale}\n"
        f"  Time horizon: {r.spec.time_horizon} | Budget limit: {r.spec.budget_limit*100:.0f}%\n"
        f"  Training investment: {r.spec.training_investment}\n"
        f"  Key tradeoff: {r.spec.key_tradeoff}\n"
        f"  Risk severity: {r.maa_output.severity_score:.1f}/100\n"
        f"  Workforce pressure: {r.wia_output.workforce_pressure_index*100:.1f}%\n"
        f"  Training capacity gap: {r.wia_output.training_capacity_ratio:.1f}x\n"
        f"  Strengths: {', '.join(next(rk.strengths for rk in caa_output.rankings if rk.scenario_id == r.spec.scenario_id))}\n"
        f"  Weaknesses: {', '.join(next(rk.weaknesses for rk in caa_output.rankings if rk.scenario_id == r.spec.scenario_id))}"
        for r in top_results
    ])

    prompt = f"""You are a senior policy design advisor synthesizing a hybrid implementation strategy.

Policy goal: {policy_goal}
Sector: {sector}

The two highest-ranked scenarios are:
{scenarios_detail}

Design a hybrid scenario that:
1. Takes the best strategic elements from each scenario
2. Mitigates the main weaknesses of both
3. Is realistic and implementable — not just an average of the two

Return ONLY a valid JSON object with exactly these keys:
{{
  "name": "<hybrid scenario name, 3-5 words>",
  "description": "<2-3 sentences describing what this hybrid does differently>",
  "derived_from": {json.dumps(top_ids)},
  "time_horizon": "short" | "medium" | "long",
  "budget_limit": <float, the optimal budget allocation 0.05-0.40>,
  "workforce_capacity": {r1.spec.workforce_capacity:.2f},
  "training_investment": true | false,
  "expected_risk_level": "Low" | "Moderate" | "High",
  "expected_severity_estimate": <float 0-100, estimated risk score>,
  "key_advantages": ["<advantage 1>", "<advantage 2>", "<advantage 3>"],
  "implementation_steps": ["<step 1>", "<step 2>", "<step 3>", "<step 4>"]
}}

Rules:
- workforce_capacity must stay at {r1.spec.workforce_capacity:.2f} (the original growth target)
- The hybrid should have lower expected_severity_estimate than Scenario {r1.spec.scenario_id} ({r1.maa_output.severity_score:.1f})
- implementation_steps should be concrete and sector-specific
- key_advantages should explain why this is better than either parent scenario"""

    try:
        raw = _model.generate_content(prompt)
        hybrid_data = _extract_json(raw.text)
    except Exception as e:
        logger.error(f"[ORA-UC2] Gemini call failed: {e}")
        hybrid_data = {}

    # Build hybrid from LLM output with safe fallbacks
    best_result = top_results[0]
    hybrid = HybridScenario(
        name=hybrid_data.get("name", "Optimized Hybrid Approach"),
        description=hybrid_data.get(
            "description",
            f"A synthesized scenario combining the strategic strengths of Scenarios {' and '.join(top_ids)} "
            f"for sustainable {policy_goal} in the {sector} sector."
        ),
        derived_from=hybrid_data.get("derived_from", top_ids),
        time_horizon=hybrid_data.get("time_horizon", "medium"),
        budget_limit=float(hybrid_data.get("budget_limit", (r1.spec.budget_limit + r2.spec.budget_limit) / 2)),
        workforce_capacity=best_result.spec.workforce_capacity,
        training_investment=hybrid_data.get("training_investment", True),
        expected_risk_level=hybrid_data.get("expected_risk_level", "Moderate"),
        expected_severity_estimate=float(hybrid_data.get("expected_severity_estimate",
            max(0, best_result.maa_output.severity_score - 10))),
        key_advantages=hybrid_data.get("key_advantages", [
            f"Combines timeline flexibility of Scenario {top_ids[0]} with investment strategy of Scenario {top_ids[1]}",
            "Reduces risk below best individual scenario",
            "Maintains original growth target with improved feasibility",
        ]),
        implementation_steps=hybrid_data.get("implementation_steps", [
            "Conduct detailed workforce needs assessment",
            "Invest in training infrastructure in parallel with early hiring",
            "Phase expansion to match training pipeline output",
            "Monitor Saudization compliance at quarterly milestones",
        ]),
    )

    explanation = (
        f"The hybrid scenario synthesizes the strongest elements of Scenarios {' and '.join(top_ids)}. "
        f"It is designed to achieve the original growth target with an estimated risk level of "
        f"{hybrid.expected_risk_level} ({hybrid.expected_severity_estimate:.0f}/100), "
        f"lower than the best individual scenario (Scenario {best_result.spec.scenario_id}: "
        f"{best_result.maa_output.severity_score:.1f}/100). "
        f"Human review and validation of this synthesis is required before adoption."
    )

    logger.info(f"[ORA-UC2] Hybrid generated: '{hybrid.name}' from scenarios {top_ids}")

    return UC2ORAOutput(
        hybrid_scenario=hybrid,
        explanation=explanation,
    )