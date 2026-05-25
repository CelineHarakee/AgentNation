# usecases/usecase1/ora.py

import os
import re
import json
import logging
import google.generativeai as genai
from typing import List
from usecases.usecase1.schemas import (
    UseCase1Input,
    PAAOutput,
    WIAOutput,
    MAAOutput,
    PolicyAlternative,
    ORAOutput,
)
from rag.retriever import retrieve, format_context, is_available

logger = logging.getLogger("agentnation.ora")

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
_model = genai.GenerativeModel("gemini-2.5-flash")


def _build_rag_query(wia_output: WIAOutput, sector: str) -> str:
    """Build a targeted retrieval query based on detected risk flags."""
    flags_text = " ".join(wia_output.risk_flags) if wia_output.risk_flags else "workforce risk"
    return (
        f"{sector} sector {flags_text} policy alternatives mitigation strategies "
        f"training infrastructure phased implementation localization"
    )


def _generate_ora_explanation(
    alternatives: List[PolicyAlternative],
    severity_score: float,
    risk_flags: List[str],
    rag_context: str,
) -> str:
    """Call Gemini to explain why these alternatives were chosen, grounded in retrieved evidence."""

    alt_titles   = ", ".join(a.title for a in alternatives)
    flags_text   = ", ".join(risk_flags) if risk_flags else "none"
    context_section = ""
    if rag_context:
        context_section = f"""
RETRIEVED CONTEXT (use to ground your explanation in real-world evidence):
{rag_context}

---
"""

    prompt = f"""You are a policy reform advisor writing a brief note for a government committee.
{context_section}
The risk assessment returned severity score: {severity_score:.1f}/100.
Active risk flags: {flags_text}.
Generated alternatives: {alt_titles}.

Write 2-3 sentences explaining why these specific alternatives were selected given the risk profile.
Reference real-world precedents from the retrieved context where relevant.
Be direct and analytical. No bullet points.""".strip()

    try:
        response    = _model.generate_content(prompt)
        explanation = response.text.strip()
        if explanation.startswith("{") or explanation.startswith("```"):
            raise ValueError("LLM returned structured data")
        return explanation
    except Exception as e:
        logger.error(f"[ORA] Explanation call failed: {e}")
        return (
            f"These {len(alternatives)} alternatives address the detected risk flags "
            f"({flags_text}) at severity {severity_score:.1f}/100. "
            f"Each alternative targets a specific constraint identified by the Workforce "
            f"Intelligence Agent. Human review is required before adoption."
        )


def generate_alternatives(
    user_input: UseCase1Input,
    paa_output: PAAOutput,
    wia_output: WIAOutput,
    maa_output: MAAOutput,
) -> ORAOutput:
    """
    Option Recommendation Agent (ORA) — UC1 mode + RAG

    Generates mitigation-focused alternatives based on detected risk flags.
    RAG retrieves real-world policy precedents (Singapore, Germany, ILO, OECD)
    to make each alternative evidence-backed rather than generic.
    """

    # ── RAG retrieval ─────────────────────────────────────────────────────────
    rag_context = ""
    if is_available():
        query  = _build_rag_query(wia_output, paa_output.sector)
        chunks = retrieve(query, agent="ORA", n_results=5, sector=paa_output.sector)
        rag_context = format_context(chunks, max_chars=3000)
        if rag_context:
            logger.info(f"[ORA] RAG retrieved {len(chunks)} chunks")
        else:
            logger.info("[ORA] RAG returned no relevant chunks.")
    else:
        logger.info("[ORA] RAG not available.")

    alternatives: List[PolicyAlternative] = []

    # ── 1. Workforce Pressure Mitigation ─────────────────────────────────────
    if wia_output.workforce_pressure_index > 0.30:
        alternatives.append(PolicyAlternative(
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
        ))

    # ── 2. Budget Stress Mitigation ───────────────────────────────────────────
    if wia_output.budget_stress_ratio > 1.0:
        alternatives.append(PolicyAlternative(
            title="Pilot Program First",
            description=(
                "Reduce initial policy scope or introduce a pilot program "
                "before full-scale rollout to validate assumptions."
            ),
            expected_impact=(
                "Controls fiscal exposure and limits budget overruns "
                "during early stages while gathering evidence."
            ),
            risk_reduction_level="high",
            addresses_risk="Budget allocation insufficient",
        ))

    # ── 3. Training Capacity Deficit ──────────────────────────────────────────
    if wia_output.training_capacity_ratio > 2.0:
        alternatives.append(PolicyAlternative(
            title="Expand Training Infrastructure",
            description=(
                "Partner with external training providers or introduce "
                "accelerated workforce upskilling programs aligned to the "
                "training pipeline output timeline."
            ),
            expected_impact=(
                "Improves workforce readiness and reduces capability gaps "
                "by expanding training infrastructure ahead of full deployment."
            ),
            risk_reduction_level="high",
            addresses_risk="Training pipeline insufficient",
        ))

    # ── 4. Saudization Risk ───────────────────────────────────────────────────
    if wia_output.saudization_risk:
        alternatives.append(PolicyAlternative(
            title="Adjust Localization Targets",
            description=(
                "Temporarily adjust workforce localization targets while "
                "investing in long-term national workforce development programs."
            ),
            expected_impact=(
                "Balances Saudization compliance risk while maintaining "
                "operational continuity and building sustainable local capacity."
            ),
            risk_reduction_level="medium",
            addresses_risk="Saudization feasibility risk",
        ))

    # ── 5. Strategic Redesign (Critical risk) ────────────────────────────────
    if maa_output.severity_score >= 75:
        alternatives.append(PolicyAlternative(
            title="Strategic Policy Redesign",
            description=(
                "Redesign policy objectives to reduce structural dependency "
                "on constrained workforce or budget resources. Consider "
                "reducing expansion targets or extending the implementation timeline."
            ),
            expected_impact=(
                "Substantially lowers systemic exposure and improves long-term "
                "sustainability by right-sizing the policy to available capacity."
            ),
            risk_reduction_level="high",
            addresses_risk="Multiple critical risk flags",
        ))

    # ── 6. Fallback ───────────────────────────────────────────────────────────
    if not alternatives:
        alternatives.append(PolicyAlternative(
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
        ))

    # ── LLM explanation (RAG-enriched) ───────────────────────────────────────
    explanation = _generate_ora_explanation(
        alternatives=alternatives,
        severity_score=maa_output.severity_score,
        risk_flags=wia_output.risk_flags,
        rag_context=rag_context,
    )

    logger.info(
        f"[ORA] Generated {len(alternatives)} alternatives | "
        f"rag={'yes' if rag_context else 'no'}"
    )

    return ORAOutput(
        alternative_policies=alternatives,
        explanation=explanation,
    )

# # usecases/usecase1/ora.py

# from typing import List
# from usecases.usecase1.schemas import (
#     UseCase1Input,
#     PAAOutput,
#     WIAOutput,
#     MAAOutput,
#     PolicyAlternative,
#     ORAOutput,
# )
# from usecases.usecase1.llm import generate_text


# def _generate_ora_explanation(
#     alternatives: List[PolicyAlternative],
#     severity_score: float,
#     risk_flags: List[str],
# ) -> str:
#     """Call Gemini to explain why these specific alternatives were chosen."""

#     alt_titles = ", ".join(a.title for a in alternatives)
#     flags_text = ", ".join(risk_flags) if risk_flags else "none"

#     prompt = f"""
# You are a policy reform advisor writing a concise note for a government committee.

# The risk assessment returned a severity score of {severity_score:.1f}/100 with these active risk flags: {flags_text}.

# The Option Recommendation Agent has generated the following alternatives: {alt_titles}.

# Write 2–3 sentences explaining:
# - Why these specific alternatives were selected given the risk profile
# - What the committee should consider when reviewing them

# Be direct and analytical. No bullet points.
# """.strip()

#     try:
#         text = generate_text(prompt)
#         if text:
#             return text
#         raise RuntimeError("No LLM explanation returned")
#     except Exception:
#         return (
#             f"These {len(alternatives)} alternatives were generated in response to "
#             f"a severity score of {severity_score:.1f}/100. "
#             f"Each alternative targets one or more of the following risk flags: {flags_text}. "
#             f"The committee should evaluate trade-offs between implementation speed and risk reduction."
#         )


# def generate_alternatives(
#     user_input: UseCase1Input,
#     paa_output: PAAOutput,
#     wia_output: WIAOutput,
#     maa_output: MAAOutput,
# ) -> ORAOutput:
#     """
#     Option Recommendation Agent (ORA)
#     Generates mitigation-focused alternative policy designs.
#     Each alternative has a short title and explicitly states which risk it addresses.
#     """

#     alternatives: List[PolicyAlternative] = []

#     # ── 1. Workforce Pressure ─────────────────────────────────────────────────
#     if wia_output.workforce_pressure_index > 0.30:
#         alternatives.append(
#             PolicyAlternative(
#                 title="Phased Rollout",
#                 description=(
#                     "Phase the policy implementation over multiple stages "
#                     "to reduce immediate workforce strain."
#                 ),
#                 expected_impact=(
#                     "Reduces short-term hiring pressure and allows gradual "
#                     "capacity building across implementation cycles."
#                 ),
#                 risk_reduction_level="high",
#                 addresses_risk="High workforce structural pressure",
#             )
#         )

#     # ── 2. Budget Stress ──────────────────────────────────────────────────────
#     if wia_output.budget_stress_ratio > 1.0:
#         alternatives.append(
#             PolicyAlternative(
#                 title="Pilot Program First",
#                 description=(
#                     "Reduce initial policy scope or introduce a pilot program "
#                     "before full-scale rollout."
#                 ),
#                 expected_impact=(
#                     "Controls fiscal exposure and limits budget overruns "
#                     "during early stages while validating assumptions."
#                 ),
#                 risk_reduction_level="high",
#                 addresses_risk="Budget allocation insufficient",
#             )
#         )

#     # ── 3. Training Capacity ──────────────────────────────────────────────────
#     if wia_output.training_capacity_ratio > 2.0:
#         alternatives.append(
#             PolicyAlternative(
#                 title="Expand Training Infrastructure",
#                 description=(
#                     "Partner with external training providers or introduce "
#                     "accelerated workforce upskilling programs. Consider a phased "
#                     "implementation timeline aligned to training pipeline output."
#                 ),
#                 expected_impact=(
#                     "Improves workforce readiness and reduces capability gaps "
#                     "by expanding training infrastructure ahead of full deployment."
#                 ),
#                 risk_reduction_level="high",
#                 addresses_risk="Training pipeline insufficient",
#             )
#         )

#     # ── 4. Saudization Risk ───────────────────────────────────────────────────
#     if wia_output.saudization_risk:
#         alternatives.append(
#             PolicyAlternative(
#                 title="Adjust Localization Targets",
#                 description=(
#                     "Temporarily adjust workforce localization targets "
#                     "while investing in long-term national workforce development programs."
#                 ),
#                 expected_impact=(
#                     "Balances Saudization compliance risk while maintaining "
#                     "operational continuity and building sustainable local capacity."
#                 ),
#                 risk_reduction_level="medium",
#                 addresses_risk="Saudization feasibility risk",
#             )
#         )

#     # ── 5. Strategic Redesign (for CRITICAL risk) ─────────────────────────────
#     if maa_output.severity_score >= 75:
#         alternatives.append(
#             PolicyAlternative(
#                 title="Strategic Policy Redesign",
#                 description=(
#                     "Redesign policy objectives to reduce structural dependency "
#                     "on constrained workforce or budget resources. "
#                     "Consider reducing expansion targets or extending the implementation timeline."
#                 ),
#                 expected_impact=(
#                     "Substantially lowers systemic exposure and improves long-term "
#                     "sustainability by right-sizing the policy to available capacity."
#                 ),
#                 risk_reduction_level="high",
#                 addresses_risk="Multiple critical risk flags",
#             )
#         )

#     # ── 6. Fallback ───────────────────────────────────────────────────────────
#     if not alternatives:
#         alternatives.append(
#             PolicyAlternative(
#                 title="Enhanced Monitoring Framework",
#                 description=(
#                     "Implement an enhanced monitoring framework with predefined "
#                     "risk escalation checkpoints and review milestones."
#                 ),
#                 expected_impact=(
#                     "Improves early risk detection and prevents uncontrolled "
#                     "escalation through structured oversight."
#                 ),
#                 risk_reduction_level="medium",
#                 addresses_risk="General risk management",
#             )
#         )

#     # ── LLM explanation ───────────────────────────────────────────────────────
#     explanation = _generate_ora_explanation(
#         alternatives=alternatives,
#         severity_score=maa_output.severity_score,
#         risk_flags=wia_output.risk_flags,
#     )

#     return ORAOutput(
#         alternative_policies=alternatives,
#         explanation=explanation,
#     )
