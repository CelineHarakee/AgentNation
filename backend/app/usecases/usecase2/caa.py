# usecases/usecase2/caa.py

import os
import re
import json
import logging
import google.generativeai as genai
from typing import List
from usecases.usecase2.schemas import (
    ScenarioResult,
    ScenarioRanking,
    CAAOutput,
    OptimizationPriority,
)

logger = logging.getLogger("agentnation.caa")

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
    logger.error(f"[CAA] Could not extract JSON. Raw:\n{text[:500]}")
    return {}


def _score_scenario(result: ScenarioResult, priority: OptimizationPriority) -> float:
    """
    Calculate a 0-100 score for a scenario.
    Higher = better (lower risk, lower cost, lower time, or balanced).
    Weights shift based on the policymaker's stated priority.
    """
    wia = result.wia_output
    maa = result.maa_output

    # Invert severity so lower risk = higher score
    risk_score    = 100 - maa.severity_score
    # Invert budget stress (capped at 100)
    cost_score    = max(0, 100 - (wia.budget_stress_ratio * 100))
    # Time score based on horizon (short=100, medium=60, long=30)
    time_map      = {"short": 100, "medium": 60, "long": 30}
    time_score    = time_map.get(result.spec.time_horizon, 60)
    # Training investment bonus (sustainable = better)
    training_bonus = 10 if result.spec.training_investment else 0

    weights = {
        OptimizationPriority.MINIMIZE_RISK: (0.60, 0.20, 0.10, 0.10),
        OptimizationPriority.MINIMIZE_COST: (0.20, 0.60, 0.10, 0.10),
        OptimizationPriority.MINIMIZE_TIME: (0.20, 0.10, 0.60, 0.10),
        OptimizationPriority.BALANCED:      (0.40, 0.25, 0.20, 0.15),
    }
    w_risk, w_cost, w_time, w_train = weights[priority]

    score = (
        risk_score    * w_risk  +
        cost_score    * w_cost  +
        time_score    * w_time  +
        training_bonus * w_train
    )
    return round(score, 1)


def _recommendation_label(rank: int, score: float) -> str:
    if rank == 1:
        return "Recommended"
    if score >= 50:
        return "Acceptable"
    return "Not Recommended"


def _build_strengths_weaknesses(result: ScenarioResult) -> tuple[list, list]:
    wia = result.wia_output
    maa = result.maa_output
    strengths, weaknesses = [], []

    if maa.severity_score < 40:
        strengths.append(f"Low risk severity ({maa.severity_score:.1f}/100)")
    if maa.severity_score >= 60:
        weaknesses.append(f"High risk severity ({maa.severity_score:.1f}/100)")

    if wia.budget_stress_ratio < 0.5:
        strengths.append(f"Budget well within limits ({wia.budget_stress_ratio*100:.0f}% stress)")
    if wia.budget_stress_ratio > 1.0:
        weaknesses.append(f"Budget exceeded ({wia.budget_stress_ratio*100:.0f}% of limit)")

    if wia.training_capacity_ratio < 1.0:
        strengths.append("Training pipeline sufficient")
    elif wia.training_capacity_ratio < 3.0:
        weaknesses.append(f"Training gap moderate ({wia.training_capacity_ratio:.1f}x annual output required)")
    else:
        weaknesses.append(f"Training pipeline critically insufficient ({wia.training_capacity_ratio:.1f}x required)")

    if result.spec.training_investment:
        strengths.append("Includes training infrastructure investment")

    if result.spec.time_horizon == "short":
        weaknesses.append("Short timeline increases implementation pressure")
    if result.spec.time_horizon == "long":
        strengths.append("Extended timeline reduces workforce strain")

    if wia.saudization_risk:
        weaknesses.append("Saudization compliance at risk")

    if not strengths:
        strengths.append("Moderate overall feasibility")
    if not weaknesses:
        weaknesses.append("No major weaknesses identified")

    return strengths, weaknesses


def run_caa(
    scenario_results: List[ScenarioResult],
    priority: OptimizationPriority,
    sector: str,
    policy_goal: str,
) -> CAAOutput:
    """
    Comparative Assessment Agent (CAA)

    Scores all scenarios quantitatively, ranks them, then calls
    Gemini to produce a written comparative analysis and conditions statement.
    """

    # ── Quantitative scoring ──────────────────────────────────────────────────
    scored = []
    for result in scenario_results:
        score = _score_scenario(result, priority)
        scored.append((score, result))

    scored.sort(key=lambda x: x[0], reverse=True)  # highest score first

    rankings = []
    for rank, (score, result) in enumerate(scored, start=1):
        strengths, weaknesses = _build_strengths_weaknesses(result)
        rankings.append(ScenarioRanking(
            scenario_id=result.spec.scenario_id,
            rank=rank,
            overall_score=score,
            recommendation=_recommendation_label(rank, score),
            strengths=strengths,
            weaknesses=weaknesses,
        ))

    best_id = scored[0][1].spec.scenario_id
    best_score = scored[0][0]
    worst_score = scored[-1][0]
    hybrid_recommended = (best_score < 65) or (worst_score < 30)

    # ── LLM narrative ─────────────────────────────────────────────────────────
    scenarios_summary = "\n".join([
        f"Scenario {r.spec.scenario_id} — {r.spec.name}:\n"
        f"  Strategy: {r.spec.rationale}\n"
        f"  Time horizon: {r.spec.time_horizon} | Budget limit: {r.spec.budget_limit*100:.0f}% | "
        f"  Training investment: {r.spec.training_investment}\n"
        f"  Risk severity: {r.maa_output.severity_score:.1f}/100 ({r.maa_output.risk_classification.value})\n"
        f"  Workforce pressure: {r.wia_output.workforce_pressure_index*100:.1f}% | "
        f"  Budget stress: {r.wia_output.budget_stress_ratio*100:.1f}% | "
        f"  Training gap: {r.wia_output.training_capacity_ratio:.1f}x\n"
        f"  Score: {_score_scenario(r, priority):.1f}/100"
        for r in scenario_results
    ])

    ranking_summary = " > ".join([
        f"Scenario {r.scenario_id} ({r.overall_score:.1f})" for r in rankings
    ])

    prompt = f"""You are a policy comparison analyst writing a briefing note for a government committee.

Policy goal: {policy_goal}
Sector: {sector}
Optimization priority: {priority.value}

Scenario evaluation results:
{scenarios_summary}

Ranking: {ranking_summary}

Write the following — use plain paragraphs, no bullet points, no headers:

1. COMPARISON_NARRATIVE (3-4 sentences): Explain what differentiates the scenarios and why the ranking came out this way. Be specific about which metrics drive the differences.

2. CONDITIONS_STATEMENT (1-2 sentences): Describe what conditions would cause the ranking to change — e.g. if budget increased, or if a shorter timeline became mandatory.

Return ONLY a JSON object with exactly these two keys:
{{
  "comparison_narrative": "<3-4 sentence paragraph>",
  "conditions_statement": "<1-2 sentence statement>"
}}"""

    try:
        raw = _model.generate_content(prompt)
        llm_data = _extract_json(raw.text)
        comparison_narrative = llm_data.get("comparison_narrative", "")
        conditions_statement = llm_data.get("conditions_statement", "")
    except Exception as e:
        logger.error(f"[CAA] LLM call failed: {e}")
        comparison_narrative = (
            f"Scenario {best_id} scored highest ({best_score:.1f}/100) based on the '{priority.value}' priority. "
            f"The ranking reflects differences in risk severity, budget utilization, and training pipeline adequacy across the three implementation strategies."
        )
        conditions_statement = (
            "The ranking would shift if budget constraints were relaxed or if the implementation timeline became more flexible."
        )

    if not comparison_narrative:
        comparison_narrative = (
            f"Scenario {best_id} is the recommended approach given the stated priority of '{priority.value}'. "
            f"Scenarios were differentiated primarily by risk severity and training pipeline feasibility."
        )
    if not conditions_statement:
        conditions_statement = "Rankings may shift if budget or timeline constraints change significantly."

    explanation = (
        f"Three scenarios were evaluated for '{policy_goal}' in the {sector} sector. "
        f"Scenario {best_id} ranked first with a score of {best_score:.1f}/100 "
        f"under the '{priority.value}' optimization priority. "
        f"{'A hybrid scenario is recommended due to limitations across all options.' if hybrid_recommended else 'The recommended scenario is feasible as designed.'}"
    )

    logger.info(f"[CAA] Ranking complete — best: Scenario {best_id} ({best_score:.1f}), hybrid_needed: {hybrid_recommended}")

    return CAAOutput(
        rankings=rankings,
        best_scenario_id=best_id,
        comparison_narrative=comparison_narrative,
        conditions_statement=conditions_statement,
        hybrid_recommended=hybrid_recommended,
        explanation=explanation,
    )