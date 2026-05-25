# usecases/usecase3/ora.py

import os
import re
import json
import logging
from typing import List
import google.generativeai as genai

from usecases.usecase3.schemas import (
    PRAOutput,
    PolicyEvaluation,
    PortfolioRecommendation,
    UC3ORAOutput,
    RecommendationType,
    ConflictType,
)

logger = logging.getLogger("agentnation.uc3.ora")

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
    logger.error(f"[ORA-UC3] Could not extract JSON. Raw:\n{text[:500]}")
    return {}


# ── Rule-based recommendation generation ─────────────────────────────────────

def _build_recommendations(
    pra: PRAOutput,
    evaluations: List[PolicyEvaluation],
) -> List[PortfolioRecommendation]:
    """
    Generate portfolio-level recommendations based on detected conflict types.
    Rules mirror the four conflict types from PRA.
    """
    recommendations: List[PortfolioRecommendation] = []
    cluster_types = {c.risk_type for c in pra.risk_clusters}

    # ── 1. Policy Scheduling — for Workforce Overlap or Capacity Overload ─────
    overlap_or_overload = [
        c for c in pra.risk_clusters
        if c.risk_type in (ConflictType.WORKFORCE_OVERLAP, ConflictType.CAPACITY_OVERLOAD)
    ]
    if overlap_or_overload:
        # Find the highest-contributing policy to recommend delaying it
        top_contributor = pra.policy_contributions[0] if pra.policy_contributions else None
        target_policies = list({
            pid
            for c in overlap_or_overload
            for pid in c.policies_involved
        })
        recommendations.append(PortfolioRecommendation(
            recommendation_type = RecommendationType.POLICY_SCHEDULING,
            target_policies     = target_policies,
            title               = "Phase Policy Implementation",
            description         = (
                f"Stagger the implementation timelines of conflicting policies to prevent "
                f"simultaneous workforce demand spikes. "
                + (f"Priority candidate for delay: '{top_contributor.display_name}'."
                   if top_contributor else "")
            ),
            expected_impact     = (
                "Reduces peak workforce pressure by distributing demand over time, "
                "allowing the training pipeline to absorb requirements progressively."
            ),
            priority = "high" if any(c.severity == "High" for c in overlap_or_overload) else "medium",
        ))

    # ── 2. Workforce Expansion — for Training Bottleneck ─────────────────────
    if ConflictType.TRAINING_BOTTLENECK in cluster_types:
        bottleneck_clusters = [c for c in pra.risk_clusters
                               if c.risk_type == ConflictType.TRAINING_BOTTLENECK]
        all_policies = list({pid for c in bottleneck_clusters for pid in c.policies_involved})
        recommendations.append(PortfolioRecommendation(
            recommendation_type = RecommendationType.WORKFORCE_EXPANSION,
            target_policies     = all_policies,
            title               = "Expand Training Pipeline Capacity",
            description         = (
                "Invest in expanding training institution capacity before full policy rollout. "
                "Partner with private sector providers and international institutions "
                "to increase annual graduate output for bottlenecked workforce types."
            ),
            expected_impact     = (
                "Increases annual training output, reducing the training gap ratio "
                "and enabling sustainable workforce growth across all competing policies."
            ),
            priority = "high",
        ))

    # ── 3. Policy Adjustment — for Budget Concentration ───────────────────────
    if ConflictType.BUDGET_CONCENTRATION in cluster_types:
        budget_clusters = [c for c in pra.risk_clusters
                           if c.risk_type == ConflictType.BUDGET_CONCENTRATION]
        dominant_policies = [pid for c in budget_clusters for pid in c.policies_involved]
        recommendations.append(PortfolioRecommendation(
            recommendation_type = RecommendationType.POLICY_ADJUSTMENT,
            target_policies     = dominant_policies,
            title               = "Reduce Dominant Policy Scope",
            description         = (
                "Reduce the workforce expansion targets of the dominant policy "
                "to rebalance budget allocation across the portfolio. "
                "Consider splitting into smaller, sequenced phases."
            ),
            expected_impact     = (
                "Reduces budget concentration risk and frees up fiscal capacity "
                "for other active policies in the portfolio."
            ),
            priority = "medium",
        ))

    # ── 4. External Workforce Strategy — for Saudization risk on 2+ policies ──
    saudization_policies = [e for e in evaluations if e.wia_output.saudization_risk]
    if len(saudization_policies) >= 2:
        recommendations.append(PortfolioRecommendation(
            recommendation_type = RecommendationType.EXTERNAL_WORKFORCE,
            target_policies     = [e.policy_id for e in saudization_policies],
            title               = "Controlled Temporary Foreign Hiring",
            description         = (
                "Introduce a controlled temporary foreign hiring program to bridge "
                "the gap while domestic Saudization capacity is developed. "
                "Apply strict time limits and mandatory knowledge-transfer requirements."
            ),
            expected_impact     = (
                "Reduces immediate Saudization compliance risk while the training "
                "pipeline catches up to localization targets across multiple sectors."
            ),
            priority = "medium",
        ))

    # ── 5. Sector Rebalancing — if 3+ clusters in same sector ─────────────────
    from collections import Counter
    sector_cluster_counts = Counter(c.sector for c in pra.risk_clusters)
    for sector, count in sector_cluster_counts.items():
        if count >= 3:
            sector_policies = [e.policy_id for e in evaluations if e.sector == sector]
            recommendations.append(PortfolioRecommendation(
                recommendation_type = RecommendationType.SECTOR_REBALANCING,
                target_policies     = sector_policies,
                title               = f"Rebalance {sector.replace('_',' ').title()} Sector Portfolio",
                description         = (
                    f"The {sector.replace('_',' ').title()} sector has {count} active conflict clusters. "
                    f"Consider redistributing some policy investments to less-stressed sectors "
                    f"or consolidating overlapping initiatives into a single coordinated program."
                ),
                expected_impact     = (
                    "Reduces systemic concentration risk and allows the sector's "
                    "workforce and training infrastructure to recover before absorbing new demand."
                ),
                priority = "high",
            ))

    # ── 6. Monitoring — fallback if no major conflicts ────────────────────────
    if not recommendations:
        recommendations.append(PortfolioRecommendation(
            recommendation_type = RecommendationType.MONITORING,
            target_policies     = [e.policy_id for e in evaluations],
            title               = "Establish Portfolio Monitoring Framework",
            description         = (
                "No critical conflicts detected. Implement a quarterly cross-policy "
                "monitoring review to track combined workforce pressure as policies progress."
            ),
            expected_impact     = (
                "Provides early warning if portfolio risk escalates as policies move "
                "from planning to implementation phase."
            ),
            priority = "low",
        ))

    return recommendations


# ── LLM explanation ───────────────────────────────────────────────────────────

def _generate_portfolio_briefing(
    pra: PRAOutput,
    recommendations: List[PortfolioRecommendation],
    sectors_covered: List[str],
    n_policies: int,
) -> str:
    """Call Gemini to produce a natural language portfolio briefing."""

    cluster_summary = "\n".join([
        f"- {c.risk_type} in {c.sector}: {c.severity} ({', '.join(c.policies_involved)})"
        for c in pra.risk_clusters
    ]) or "No conflicts detected."

    rec_summary = "\n".join([
        f"- {r.title}: {r.description[:100]}..."
        for r in recommendations[:3]
    ])

    prompt = f"""You are a senior policy advisor writing a briefing note for a government committee.

A portfolio of {n_policies} active workforce policies across {', '.join(sectors_covered)} 
has been analyzed. Here are the key findings:

Portfolio Risk Score: {pra.portfolio_risk_score:.1f}/100 ({pra.risk_classification})
Conflicts detected:
{cluster_summary}

Most stressed sector: {pra.most_stressed_sector or 'None identified'}

Top recommendations:
{rec_summary}

Write a 3-4 sentence briefing note explaining:
1. The overall portfolio risk situation
2. The most critical conflict and why it matters
3. The most important action the committee should take

Be direct and specific. No headers, no bullets. Plain paragraph only.""".strip()

    try:
        response = _model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("{") or text.startswith("```"):
            raise ValueError("LLM returned structured data instead of prose")
        return text
    except Exception as e:
        logger.error(f"[ORA-UC3] Briefing LLM call failed: {e}")
        return (
            f"The portfolio of {n_policies} policies across "
            f"{', '.join(sectors_covered)} shows a risk score of "
            f"{pra.portfolio_risk_score:.1f}/100 ({pra.risk_classification}). "
            f"{len(pra.risk_clusters)} conflict(s) were detected requiring attention. "
            f"Human review of the recommendations is required before any policy action is taken."
        )


# ── Main ORA function ─────────────────────────────────────────────────────────

def run_uc3_ora(
    pra: PRAOutput,
    evaluations: List[PolicyEvaluation],
    sectors_covered: List[str],
) -> UC3ORAOutput:
    """
    Portfolio ORA — always runs in UC3.

    Generates portfolio-level interventions scaled to risk level:
    - Low risk → monitoring recommendations
    - Moderate → preventive adjustments
    - High/Critical → active intervention strategies
    """
    recommendations = _build_recommendations(pra, evaluations)

    briefing = _generate_portfolio_briefing(
        pra            = pra,
        recommendations= recommendations,
        sectors_covered= sectors_covered,
        n_policies     = len(evaluations),
    )

    logger.info(
        f"[ORA-UC3] Generated {len(recommendations)} recommendations | "
        f"portfolio_risk={pra.portfolio_risk_score:.1f}"
    )

    return UC3ORAOutput(
        recommendations = recommendations,
        explanation     = briefing,
    )