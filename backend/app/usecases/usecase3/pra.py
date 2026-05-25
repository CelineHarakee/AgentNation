# usecases/usecase3/pra.py

import logging
from typing import List, Dict, Optional
from collections import defaultdict

import networkx as nx

from usecases.usecase3.schemas import (
    PolicyEvaluation,
    PRAOutput,
    RiskCluster,
    SectorPressure,
    PolicyContribution,
    ConflictType,
)
from rag.knowledge_graph import (
    build_portfolio_graph,
    detect_shared_workforce_pools,
    detect_shared_training_institutions,
)

logger = logging.getLogger("agentnation.uc3.pra")

# ── Conflict thresholds (consistent with UC1 MAA thresholds) ─────────────────
WORKFORCE_OVERLAP_MODERATE  = 0.40
WORKFORCE_OVERLAP_HIGH      = 0.70
TRAINING_BOTTLENECK_RATIO   = 5.0    # combined training_capacity_ratio
BUDGET_CONCENTRATION_PCT    = 40.0   # one policy > 40% of total budget stress
CAPACITY_OVERLOAD_MODERATE  = 0.40
CAPACITY_OVERLOAD_HIGH      = 0.70


def _severity_label(value: float, moderate: float, high: float) -> str:
    if value >= high:
        return "High"
    if value >= moderate:
        return "Moderate"
    return "Low"


def _classify_portfolio_score(score: float) -> str:
    if score <= 25:
        return "Low"
    if score <= 50:
        return "Moderate"
    if score <= 75:
        return "High"
    return "Critical"


# ── Conflict detection ────────────────────────────────────────────────────────

def _detect_workforce_overlap(
    evaluations: List[PolicyEvaluation],
    G: nx.DiGraph,
) -> List[RiskCluster]:
    """
    Use the KG to find workforce types demanded by multiple policies.
    Compare combined pressure against thresholds.
    """
    clusters = []
    overlaps = detect_shared_workforce_pools(G)

    for overlap in overlaps:
        policies = overlap["policies"]
        if len(policies) < 2:
            continue

        # Sum workforce pressure for involved policies
        involved_evals = [e for e in evaluations if e.policy_id in policies]
        combined_pressure = sum(e.wia_output.workforce_pressure_index for e in involved_evals)

        severity = _severity_label(
            combined_pressure,
            WORKFORCE_OVERLAP_MODERATE,
            WORKFORCE_OVERLAP_HIGH,
        )
        if severity == "Low":
            continue    # below threshold — not a reportable conflict

        # Find affected sectors
        sectors = list(set(e.sector for e in involved_evals))
        primary_sector = sectors[0] if len(sectors) == 1 else "Multiple"

        wf_type_display = overlap["workforce_type"].replace("_", " ").title()
        cap = overlap["total_capacity"]
        ann = overlap["annual_training_output"]

        clusters.append(RiskCluster(
            sector           = primary_sector,
            risk_type        = ConflictType.WORKFORCE_OVERLAP,
            policies_involved= policies,
            severity         = severity,
            description      = (
                f"Policies {', '.join(policies)} compete for the same {wf_type_display} workforce pool "
                f"(total capacity: {cap:,}, annual graduates: {ann:,}). "
                f"Combined workforce pressure: {combined_pressure:.1%}."
            ),
        ))

    return clusters


def _detect_capacity_overload(
    evaluations: List[PolicyEvaluation],
) -> List[RiskCluster]:
    """
    Group policies by sector and check combined workforce pressure
    without needing the KG — pure math on WIA outputs.
    """
    clusters = []
    by_sector: Dict[str, List[PolicyEvaluation]] = defaultdict(list)
    for e in evaluations:
        by_sector[e.sector].append(e)

    for sector, evals in by_sector.items():
        if len(evals) < 2:
            continue   # only one policy in this sector — no overload possible

        combined = sum(e.wia_output.workforce_pressure_index for e in evals)
        severity = _severity_label(combined, CAPACITY_OVERLOAD_MODERATE, CAPACITY_OVERLOAD_HIGH)

        if severity == "Low":
            continue

        policy_ids = [e.policy_id for e in evals]
        clusters.append(RiskCluster(
            sector           = sector,
            risk_type        = ConflictType.CAPACITY_OVERLOAD,
            policies_involved= policy_ids,
            severity         = severity,
            description      = (
                f"Combined workforce pressure in {sector.replace('_', ' ').title()} "
                f"across {len(evals)} policies is {combined:.1%}, "
                f"exceeding the system capacity threshold."
            ),
        ))

    return clusters


def _detect_training_bottleneck(
    evaluations: List[PolicyEvaluation],
    G: nx.DiGraph,
) -> List[RiskCluster]:
    """
    Use the KG to find training institutions shared by competing policies.
    Also checks combined training_capacity_ratio across portfolio.
    """
    clusters = []
    bottlenecks = detect_shared_training_institutions(G)

    for b in bottlenecks:
        competing = b["competing_policies"]
        if len(competing) < 2:
            continue

        involved_evals = [e for e in evaluations if e.policy_id in competing]
        combined_ratio = sum(e.wia_output.training_capacity_ratio for e in involved_evals)

        if combined_ratio < TRAINING_BOTTLENECK_RATIO:
            continue   # below threshold

        institution_display = b["institution"].replace("_", " ").title()
        sectors = list(set(e.sector for e in involved_evals))
        primary_sector = sectors[0] if len(sectors) == 1 else "Multiple"

        clusters.append(RiskCluster(
            sector           = primary_sector,
            risk_type        = ConflictType.TRAINING_BOTTLENECK,
            policies_involved= list(competing),
            severity         = "High" if combined_ratio > 10 else "Moderate",
            description      = (
                f"{institution_display} cannot support combined training demand from "
                f"policies {', '.join(competing)} "
                f"(combined training gap: {combined_ratio:.1f}x annual output, "
                f"annual capacity: {b['annual_output']:,} graduates)."
            ),
        ))

    return clusters


def _detect_budget_concentration(
    evaluations: List[PolicyEvaluation],
) -> List[RiskCluster]:
    """
    Flag any single policy that dominates more than 40% of
    the portfolio's total budget stress.
    """
    clusters = []
    total_budget_stress = sum(e.wia_output.budget_stress_ratio for e in evaluations)

    if total_budget_stress <= 0:
        return clusters

    for e in evaluations:
        share = (e.wia_output.budget_stress_ratio / total_budget_stress) * 100
        if share > BUDGET_CONCENTRATION_PCT:
            clusters.append(RiskCluster(
                sector           = e.sector,
                risk_type        = ConflictType.BUDGET_CONCENTRATION,
                policies_involved= [e.policy_id],
                severity         = "High" if share > 60 else "Moderate",
                description      = (
                    f"Policy '{e.display_name}' accounts for {share:.0f}% of the "
                    f"portfolio's total budget stress, creating a concentration risk "
                    f"that may crowd out resources from other active policies."
                ),
            ))

    return clusters


# ── Portfolio scoring ─────────────────────────────────────────────────────────

def _compute_portfolio_score(
    evaluations: List[PolicyEvaluation],
    clusters: List[RiskCluster],
) -> float:
    """
    Portfolio score = average MAA severity + conflict penalties.
    - Each Moderate cluster adds 3 points
    - Each High cluster adds 7 points
    - Each Critical cluster adds 12 points
    Capped at 100.
    """
    if not evaluations:
        return 0.0

    avg_severity = sum(e.maa_output.severity_score for e in evaluations) / len(evaluations)

    penalty_map = {"Low": 0, "Moderate": 3, "High": 7, "Critical": 12}
    conflict_penalty = sum(penalty_map.get(c.severity, 0) for c in clusters)

    return round(min(100.0, avg_severity + conflict_penalty), 2)


def _compute_sector_pressures(
    evaluations: List[PolicyEvaluation],
) -> List[SectorPressure]:
    by_sector: Dict[str, float] = defaultdict(float)
    for e in evaluations:
        by_sector[e.sector] += e.wia_output.workforce_pressure_index

    return [
        SectorPressure(sector=s, pressure=round(p, 3))
        for s, p in sorted(by_sector.items(), key=lambda x: x[1], reverse=True)
    ]


def _compute_policy_contributions(
    evaluations: List[PolicyEvaluation],
) -> List[PolicyContribution]:
    total = sum(e.maa_output.severity_score for e in evaluations)
    if total == 0:
        return [
            PolicyContribution(
                policy_id=e.policy_id,
                display_name=e.display_name,
                risk_contribution=round(100 / len(evaluations), 1),
            )
            for e in evaluations
        ]

    return sorted(
        [
            PolicyContribution(
                policy_id        = e.policy_id,
                display_name     = e.display_name,
                risk_contribution= round((e.maa_output.severity_score / total) * 100, 1),
            )
            for e in evaluations
        ],
        key=lambda x: x.risk_contribution,
        reverse=True,
    )


# ── Main PRA function ─────────────────────────────────────────────────────────

def run_pra(evaluations: List[PolicyEvaluation]) -> PRAOutput:
    """
    Portfolio Risk Agent (PRA)

    Aggregates all WIA + MAA outputs, uses the Knowledge Graph to detect
    cross-policy conflicts, and computes the portfolio-level risk profile.
    """
    if not evaluations:
        return PRAOutput(
            portfolio_risk_score  = 0.0,
            risk_classification   = "Low",
            risk_clusters         = [],
            sector_pressure_map   = [],
            policy_contributions  = [],
            conflict_count        = 0,
            most_stressed_sector  = None,
        )

    # Build portfolio KG from the resolved policies
    kg_policies = [
        {
            "policy_id":        e.policy_id,
            "sector":           e.sector,
            "target_growth_pct": round(e.wia_output.workforce_pressure_index * 100, 1),
            "time_horizon":     "medium",
        }
        for e in evaluations
    ]
    G = build_portfolio_graph(kg_policies)

    logger.info(f"[PRA] Analyzing {len(evaluations)} policies across "
                f"{len(set(e.sector for e in evaluations))} sectors.")

    # ── Detect all conflict types ─────────────────────────────────────────────
    overlap_clusters    = _detect_workforce_overlap(evaluations, G)
    overload_clusters   = _detect_capacity_overload(evaluations)
    bottleneck_clusters = _detect_training_bottleneck(evaluations, G)
    budget_clusters     = _detect_budget_concentration(evaluations)

    all_clusters = overlap_clusters + overload_clusters + bottleneck_clusters + budget_clusters

    logger.info(
        f"[PRA] Conflicts detected — "
        f"overlap: {len(overlap_clusters)}, "
        f"overload: {len(overload_clusters)}, "
        f"bottleneck: {len(bottleneck_clusters)}, "
        f"budget: {len(budget_clusters)}"
    )

    # ── Compute portfolio metrics ─────────────────────────────────────────────
    portfolio_score  = _compute_portfolio_score(evaluations, all_clusters)
    classification   = _classify_portfolio_score(portfolio_score)
    sector_pressures = _compute_sector_pressures(evaluations)
    contributions    = _compute_policy_contributions(evaluations)

    most_stressed = sector_pressures[0].sector if sector_pressures else None

    return PRAOutput(
        portfolio_risk_score  = portfolio_score,
        risk_classification   = classification,
        risk_clusters         = all_clusters,
        sector_pressure_map   = sector_pressures,
        policy_contributions  = contributions,
        conflict_count        = len(all_clusters),
        most_stressed_sector  = most_stressed,
    )