# usecases/usecase1/maa.py

# usecases/usecase1/maa.py

from typing import List
from usecases.usecase1.schemas import (
    WIAOutput,
    MAAOutput,
    RiskClassification,
    RecommendationTrigger,
    ConfidenceLevel,
)
from usecases.usecase1.llm import generate_text


def _generate_maa_explanation(
    severity_score: float,
    risk_classification: str,
    workforce_component: float,
    budget_component: float,
    training_risk_component: float,
    saudization_component: float,
    key_risk_indicators: List[str],
    recommendation_trigger: str,
) -> str:
    """Call Gemini to explain MAA's risk scoring decision in plain English."""

    indicators_text = ", ".join(key_risk_indicators) if key_risk_indicators else "none"

    prompt = f"""
You are a risk assessment analyst writing a concise briefing note for a policy committee.

The Monitoring & Assessment Agent has completed its evaluation and produced these results:
- Overall severity score: {severity_score:.1f} / 100 ({risk_classification} risk)
- Workforce pressure component: {workforce_component:.3f} (0–1 scale)
- Budget stress component: {budget_component:.3f} (0–1 scale)
- Training capacity risk component: {training_risk_component:.3f} (0–1 scale)
- Saudization risk component: {saudization_component:.1f} (binary)
- Key risk indicators triggered: {indicators_text}
- Recommended action: {recommendation_trigger}

Write 3 sentences in plain English explaining:
1. What the severity score means in practical terms
2. Which risk dimension is driving the score most
3. What the recommendation trigger means for next steps

Be analytical and direct. Do not use bullet points.
""".strip()

    try:
        text = generate_text(prompt)
        if text:
            return text
        raise RuntimeError("No LLM explanation returned")
    except Exception:
        return (
            f"Risk severity score: {severity_score:.1f}/100 ({risk_classification}). "
            f"Key risk indicators: {indicators_text}. "
            f"Recommended action: {recommendation_trigger}."
        )


def run_maa(wia_output: WIAOutput) -> MAAOutput:
    """
    Monitoring & Assessment Agent (MAA)
    Evaluates WIA output, assigns risk classification, and generates LLM explanation.
    """

    # ── Weights (must sum to 1.0) ─────────────────────────────────────────────
    W_WORKFORCE    = 0.25
    W_BUDGET       = 0.25
    W_TRAINING     = 0.35
    W_SAUDIZATION  = 0.10
    W_FLAGS        = 0.05
    MAX_FLAG_IMPACT = 5

    # ── Normalize components ──────────────────────────────────────────────────

    workforce_component = min(wia_output.workforce_pressure_index, 1.0)
    budget_component    = min(wia_output.budget_stress_ratio, 1.0)

    ratio = wia_output.training_capacity_ratio
    if ratio <= 0.5:
        training_risk_component = ratio * 0.3
    elif ratio <= 1.0:
        training_risk_component = 0.15 + (ratio - 0.5) * 0.5
    elif ratio <= 2.0:
        training_risk_component = 0.4 + (ratio - 1.0) * 0.3
    elif ratio <= 5.0:
        training_risk_component = 0.7 + (ratio - 2.0) * 0.1
    else:
        training_risk_component = 1.0

    saudization_component = 1.0 if wia_output.saudization_risk else 0.0
    flag_ratio = min(len(wia_output.risk_flags), MAX_FLAG_IMPACT) / MAX_FLAG_IMPACT

    # ── Weighted severity score ───────────────────────────────────────────────

    severity_raw = (
        workforce_component    * W_WORKFORCE   +
        budget_component       * W_BUDGET      +
        training_risk_component * W_TRAINING   +
        saudization_component  * W_SAUDIZATION +
        flag_ratio             * W_FLAGS
    )
    severity_score = round(severity_raw * 100, 2)

    # ── Override rules ────────────────────────────────────────────────────────
    if wia_output.budget_stress_ratio > 1.0 and severity_score < 60:
        severity_score = 60.0
    if wia_output.training_capacity_ratio > 10.0 and severity_score < 75:
        severity_score = 75.0
    if wia_output.training_capacity_ratio > 20.0:
        severity_score = max(severity_score, 85.0)
    if wia_output.budget_stress_ratio > 2.0:
        severity_score = max(severity_score, 90.0)

    # ── Classification ────────────────────────────────────────────────────────
    if severity_score <= 25:
        classification = RiskClassification.LOW
        trigger = RecommendationTrigger.NO_ACTION
    elif severity_score <= 50:
        classification = RiskClassification.MODERATE
        trigger = RecommendationTrigger.MONITOR
    elif severity_score <= 75:
        classification = RiskClassification.HIGH
        trigger = RecommendationTrigger.MITIGATION
    else:
        classification = RiskClassification.CRITICAL
        trigger = RecommendationTrigger.ESCALATE

    # ── Key risk indicators ───────────────────────────────────────────────────
    indicators: List[str] = []
    if workforce_component > 0.20:
        indicators.append("High Workforce Pressure")
    if budget_component > 0.70:
        indicators.append("Severe Budget Stress")
    if wia_output.budget_stress_ratio > 1.0:
        indicators.append("Budget Allocation Exceeded")
    if training_risk_component > 0.60:
        indicators.append("Training Capacity Deficit")
    if wia_output.training_capacity_ratio > 10.0:
        indicators.append("Critical Training Infrastructure Gap")
    if saudization_component == 1:
        indicators.append("Saudization Compliance Risk")
    if flag_ratio > 0.6:
        indicators.append("Multiple Risk Flags Triggered")

    # ── LLM Explanation ───────────────────────────────────────────────────────
    explanation = _generate_maa_explanation(
        severity_score=severity_score,
        risk_classification=classification.value,
        workforce_component=workforce_component,
        budget_component=budget_component,
        training_risk_component=training_risk_component,
        saudization_component=saudization_component,
        key_risk_indicators=indicators,
        recommendation_trigger=trigger.value,
    )

    return MAAOutput(
        severity_score=severity_score,
        risk_classification=classification,
        confidence_level=ConfidenceLevel.HIGH,
        key_risk_indicators=indicators,
        recommendation_trigger=trigger,
        explanation=explanation,
    )


def _build_clean_maa_stub() -> MAAOutput:
    """
    Returns a placeholder MAAOutput used when COA takes the Path A early exit
    and MAA is never actually run. Makes it explicit in the UI that MAA was skipped.
    """
    return MAAOutput(
        severity_score=0.0,
        risk_classification=RiskClassification.LOW,
        confidence_level=ConfidenceLevel.HIGH,
        key_risk_indicators=[],
        recommendation_trigger=RecommendationTrigger.NO_ACTION,
        explanation=(
            "The Monitoring & Assessment Agent was not activated for this simulation. "
            "All Workforce Intelligence Agent metrics were below risk thresholds, "
            "so no further assessment was required. "
            "This is by design — the system does not escalate analysis without cause."
        ),
    )
