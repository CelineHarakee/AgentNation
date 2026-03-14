# usecases/usecase1/ora.py

# usecases/usecase1/ora.py

from typing import List
from usecases.usecase1.schemas import (
    UseCase1Input,
    PAAOutput,
    WIAOutput,
    MAAOutput,
    PolicyAlternative,
    ORAOutput,
)
from usecases.usecase1.llm import generate_text


def _generate_ora_explanation(
    alternatives: List[PolicyAlternative],
    severity_score: float,
    risk_flags: List[str],
) -> str:
    """Call Gemini to explain why these specific alternatives were chosen."""

    alt_titles = ", ".join(a.title for a in alternatives)
    flags_text = ", ".join(risk_flags) if risk_flags else "none"

    prompt = f"""
You are a policy reform advisor writing a concise note for a government committee.

The risk assessment returned a severity score of {severity_score:.1f}/100 with these active risk flags: {flags_text}.

The Option Recommendation Agent has generated the following alternatives: {alt_titles}.

Write 2–3 sentences explaining:
- Why these specific alternatives were selected given the risk profile
- What the committee should consider when reviewing them

Be direct and analytical. No bullet points.
""".strip()

    try:
        text = generate_text(prompt)
        if text:
            return text
        raise RuntimeError("No LLM explanation returned")
    except Exception:
        return (
            f"These {len(alternatives)} alternatives were generated in response to "
            f"a severity score of {severity_score:.1f}/100. "
            f"Each alternative targets one or more of the following risk flags: {flags_text}. "
            f"The committee should evaluate trade-offs between implementation speed and risk reduction."
        )


def generate_alternatives(
    user_input: UseCase1Input,
    paa_output: PAAOutput,
    wia_output: WIAOutput,
    maa_output: MAAOutput,
) -> ORAOutput:
    """
    Option Recommendation Agent (ORA)
    Generates mitigation-focused alternative policy designs.
    Each alternative has a short title and explicitly states which risk it addresses.
    """

    alternatives: List[PolicyAlternative] = []

    # ── 1. Workforce Pressure ─────────────────────────────────────────────────
    if wia_output.workforce_pressure_index > 0.30:
        alternatives.append(
            PolicyAlternative(
                title="Phased Rollout",
                description=(
                    "Phase the policy implementation over multiple stages "
                    "to reduce immediate workforce strain."
                ),
                expected_impact=(
                    "Reduces short-term hiring pressure and allows gradual "
                    "capacity building across implementation cycles."
                ),
                risk_reduction_level="high",
                addresses_risk="High workforce structural pressure",
            )
        )

    # ── 2. Budget Stress ──────────────────────────────────────────────────────
    if wia_output.budget_stress_ratio > 1.0:
        alternatives.append(
            PolicyAlternative(
                title="Pilot Program First",
                description=(
                    "Reduce initial policy scope or introduce a pilot program "
                    "before full-scale rollout."
                ),
                expected_impact=(
                    "Controls fiscal exposure and limits budget overruns "
                    "during early stages while validating assumptions."
                ),
                risk_reduction_level="high",
                addresses_risk="Budget allocation insufficient",
            )
        )

    # ── 3. Training Capacity ──────────────────────────────────────────────────
    if wia_output.training_capacity_ratio > 2.0:
        alternatives.append(
            PolicyAlternative(
                title="Expand Training Infrastructure",
                description=(
                    "Partner with external training providers or introduce "
                    "accelerated workforce upskilling programs. Consider a phased "
                    "implementation timeline aligned to training pipeline output."
                ),
                expected_impact=(
                    "Improves workforce readiness and reduces capability gaps "
                    "by expanding training infrastructure ahead of full deployment."
                ),
                risk_reduction_level="high",
                addresses_risk="Training pipeline insufficient",
            )
        )

    # ── 4. Saudization Risk ───────────────────────────────────────────────────
    if wia_output.saudization_risk:
        alternatives.append(
            PolicyAlternative(
                title="Adjust Localization Targets",
                description=(
                    "Temporarily adjust workforce localization targets "
                    "while investing in long-term national workforce development programs."
                ),
                expected_impact=(
                    "Balances Saudization compliance risk while maintaining "
                    "operational continuity and building sustainable local capacity."
                ),
                risk_reduction_level="medium",
                addresses_risk="Saudization feasibility risk",
            )
        )

    # ── 5. Strategic Redesign (for CRITICAL risk) ─────────────────────────────
    if maa_output.severity_score >= 75:
        alternatives.append(
            PolicyAlternative(
                title="Strategic Policy Redesign",
                description=(
                    "Redesign policy objectives to reduce structural dependency "
                    "on constrained workforce or budget resources. "
                    "Consider reducing expansion targets or extending the implementation timeline."
                ),
                expected_impact=(
                    "Substantially lowers systemic exposure and improves long-term "
                    "sustainability by right-sizing the policy to available capacity."
                ),
                risk_reduction_level="high",
                addresses_risk="Multiple critical risk flags",
            )
        )

    # ── 6. Fallback ───────────────────────────────────────────────────────────
    if not alternatives:
        alternatives.append(
            PolicyAlternative(
                title="Enhanced Monitoring Framework",
                description=(
                    "Implement an enhanced monitoring framework with predefined "
                    "risk escalation checkpoints and review milestones."
                ),
                expected_impact=(
                    "Improves early risk detection and prevents uncontrolled "
                    "escalation through structured oversight."
                ),
                risk_reduction_level="medium",
                addresses_risk="General risk management",
            )
        )

    # ── LLM explanation ───────────────────────────────────────────────────────
    explanation = _generate_ora_explanation(
        alternatives=alternatives,
        severity_score=maa_output.severity_score,
        risk_flags=wia_output.risk_flags,
    )

    return ORAOutput(
        alternative_policies=alternatives,
        explanation=explanation,
    )
