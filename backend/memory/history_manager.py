# memory/history_manager.py
#
# Persistent simulation log for AgentNation.
# Saves UC1, UC2, and UC3 simulation results to disk.
# UC3 reads this to detect cross-policy conflicts and overlaps.
# Dashboard reads this for stats and graphs.

import json
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger("agentnation.memory")

LOG_PATH = Path(__file__).parent / "simulation_log.json"


# ── Internal helpers ──────────────────────────────────────────────────────────

def _load_log() -> list:
    """Read the full log from disk. Returns empty list if file missing or corrupt."""
    try:
        with open(LOG_PATH, "r") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _save_log(log: list) -> None:
    """Write the full log back to disk. Creates file if missing."""
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_PATH, "w") as f:
        json.dump(log, f, indent=2, default=str)


def _make_id(prefix: str) -> str:
    return f"{prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6].upper()}"


# ── UC1 Save ──────────────────────────────────────────────────────────────────

def save_uc1_simulation(result) -> str:
    """
    Save a completed UC1 FinalResponse to the history log.

    Captures everything UC3 needs for cross-policy conflict detection:
    - sector, risk flags, WIA metrics, severity score, objectives, domains

    Returns the generated simulation ID.
    """
    sim_id = _make_id("UC1")

    entry = {
        # ── Identity ──────────────────────────────────────────────────────────
        "id":                       sim_id,
        "timestamp":                datetime.now().isoformat(),
        "usecase":                  "UC1",

        # ── Policy identity (used by UC3 input resolver) ──────────────────────
        "policy_title":             result.paa_output.policy_objectives[0]
                                    if result.paa_output.policy_objectives
                                    else "Unknown Policy",
        "sector":                   result.paa_output.sector,
        "complexity_level":         result.paa_output.complexity_level,
        "time_horizon":             None,   # UC1 doesn't expose time_horizon on output,
                                            # but UC3 can still use sector + flags
        "policy_objectives":        result.paa_output.policy_objectives,
        "affected_domains":         result.paa_output.affected_domains,
        "assumptions":              result.paa_output.assumptions,

        # ── Decision path ─────────────────────────────────────────────────────
        "decision_path":            result.recommendation.decision_path,
        "agents_activated":         result.agents_activated,
        "monitoring_required":      result.recommendation.monitoring_required,
        "mitigation_required":      result.recommendation.mitigation_required,
        "ora_escalated":            result.recommendation.escalate_to_ora,

        # ── Risk profile (UC3 uses these for conflict detection) ───────────────
        "severity_score":           result.maa_output.severity_score,
        "risk_level":               result.maa_output.risk_classification.value,
        "risk_flags":               result.wia_output.risk_flags,
        "key_risk_indicators":      result.maa_output.key_risk_indicators,

        # ── WIA metrics (UC3 aggregates these across policies) ─────────────────
        "workforce_pressure_index": result.wia_output.workforce_pressure_index,
        "budget_stress_ratio":      result.wia_output.budget_stress_ratio,
        "training_capacity_ratio":  result.wia_output.training_capacity_ratio,
        "saudization_risk":         result.wia_output.saudization_risk,

        # ── ORA output ────────────────────────────────────────────────────────
        "alternatives_generated":   len(result.ora_output.alternative_policies)
                                    if result.ora_output else 0,
        "alternatives":             [
            {
                "title":                alt.title,
                "addresses_risk":       alt.addresses_risk,
                "risk_reduction_level": alt.risk_reduction_level,
                "description":          alt.description,
                "expected_impact":      alt.expected_impact,
            }
            for alt in result.ora_output.alternative_policies
        ] if result.ora_output else [],

        # ── Summary ───────────────────────────────────────────────────────────
        "executive_summary":        result.executive_summary,
    }

    log = _load_log()
    log.append(entry)
    _save_log(log)

    logger.info(f"[Memory] UC1 saved: {sim_id} | sector={entry['sector']} | path={entry['decision_path']}")
    return sim_id


# ── UC2 Save ──────────────────────────────────────────────────────────────────

def save_uc2_simulation(result) -> str:
    """
    Save a completed UC2 UC2FinalResponse to the history log.

    Each UC2 simulation contains 3 scenario results. UC3 can treat the
    best scenario as the "active policy" when checking for conflicts.

    Returns the generated simulation ID.
    """
    sim_id = _make_id("UC2")

    # Snapshot each scenario with the metrics UC3 needs
    scenarios_snapshot = []
    for sr in result.scenario_results:
        ranking = next(
            (rk for rk in result.caa_output.rankings
             if rk.scenario_id == sr.spec.scenario_id),
            None
        )
        scenarios_snapshot.append({
            "scenario_id":              sr.spec.scenario_id,
            "name":                     sr.spec.name,
            "time_horizon":             sr.spec.time_horizon,
            "budget_limit":             sr.spec.budget_limit,
            "workforce_capacity":       sr.spec.workforce_capacity,
            "training_investment":      sr.spec.training_investment,
            "rationale":                sr.spec.rationale,
            "key_tradeoff":             sr.spec.key_tradeoff,
            # Risk
            "severity_score":           sr.maa_output.severity_score,
            "risk_level":               sr.maa_output.risk_classification.value,
            "key_risk_indicators":      sr.maa_output.key_risk_indicators,
            # WIA metrics — UC3 aggregates these
            "workforce_pressure_index": sr.wia_output.workforce_pressure_index,
            "budget_stress_ratio":      sr.wia_output.budget_stress_ratio,
            "training_capacity_ratio":  sr.wia_output.training_capacity_ratio,
            "saudization_risk":         sr.wia_output.saudization_risk,
            "risk_flags":               sr.wia_output.risk_flags,
            # CAA scoring
            "overall_score":            ranking.overall_score if ranking else None,
            "recommendation":           ranking.recommendation if ranking else None,
            "strengths":                ranking.strengths if ranking else [],
            "weaknesses":               ranking.weaknesses if ranking else [],
        })

    # Best scenario metrics — used as the "effective policy" by UC3
    best_scenario = next(
        (sr for sr in result.scenario_results
         if sr.spec.scenario_id == result.recommended_scenario_id),
        result.scenario_results[0] if result.scenario_results else None
    )

    entry = {
        # ── Identity ──────────────────────────────────────────────────────────
        "id":                       sim_id,
        "timestamp":                datetime.now().isoformat(),
        "usecase":                  "UC2",

        # ── Policy identity ───────────────────────────────────────────────────
        "policy_title":             result.policy_goal,   # UC3 uses this as display name
        "policy_goal":              result.policy_goal,
        "sector":                   result.sector,
        "priority":                 result.priority,
        "agents_activated":         result.agents_activated,

        # ── Best scenario — UC3 uses this as the "effective" policy risk ───────
        "best_scenario_id":         result.recommended_scenario_id,
        "severity_score":           best_scenario.maa_output.severity_score
                                    if best_scenario else None,
        "risk_level":               best_scenario.maa_output.risk_classification.value
                                    if best_scenario else None,
        "risk_flags":               best_scenario.wia_output.risk_flags
                                    if best_scenario else [],
        "workforce_pressure_index": best_scenario.wia_output.workforce_pressure_index
                                    if best_scenario else None,
        "budget_stress_ratio":      best_scenario.wia_output.budget_stress_ratio
                                    if best_scenario else None,
        "training_capacity_ratio":  best_scenario.wia_output.training_capacity_ratio
                                    if best_scenario else None,
        "saudization_risk":         best_scenario.wia_output.saudization_risk
                                    if best_scenario else None,
        "time_horizon":             best_scenario.spec.time_horizon
                                    if best_scenario else None,

        # ── All scenarios (for dashboard and detailed UC3 analysis) ────────────
        "scenarios":                scenarios_snapshot,

        # ── CAA output ────────────────────────────────────────────────────────
        "comparison_narrative":     result.caa_output.comparison_narrative,
        "conditions_statement":     result.caa_output.conditions_statement,
        "hybrid_recommended":       result.caa_output.hybrid_recommended,

        # ── Hybrid (only if user explicitly requested it) ─────────────────────
        "hybrid_generated":         result.ora_output is not None,
        "hybrid_scenario":          {
            "name":                       result.ora_output.hybrid_scenario.name,
            "description":                result.ora_output.hybrid_scenario.description,
            "time_horizon":               result.ora_output.hybrid_scenario.time_horizon,
            "expected_risk_level":        result.ora_output.hybrid_scenario.expected_risk_level,
            "expected_severity_estimate": result.ora_output.hybrid_scenario.expected_severity_estimate,
            "key_advantages":             result.ora_output.hybrid_scenario.key_advantages,
            "implementation_steps":       result.ora_output.hybrid_scenario.implementation_steps,
        } if result.ora_output else None,

        # ── Summary ───────────────────────────────────────────────────────────
        "executive_summary":        result.executive_summary,
        "elapsed_seconds":          result.elapsed_seconds,
    }

    log = _load_log()
    log.append(entry)
    _save_log(log)

    logger.info(
        f"[Memory] UC2 saved: {sim_id} | sector={entry['sector']} | "
        f"best=Scenario {entry['best_scenario_id']}"
    )
    return sim_id


# ── UC3 Save ──────────────────────────────────────────────────────────────────

def save_uc3_simulation(result) -> str:
    """
    Save a completed UC3 portfolio analysis to the history log.

    UC3 results are stored differently — they represent a cross-policy
    system-level analysis, not a single policy evaluation.

    Returns the generated simulation ID.
    """
    sim_id = _make_id("UC3")

    entry = {
        # ── Identity ──────────────────────────────────────────────────────────
        "id":                       sim_id,
        "timestamp":                datetime.now().isoformat(),
        "usecase":                  "UC3",

        # ── Portfolio identity ────────────────────────────────────────────────
        "policy_ids_analyzed":      result.policy_ids_analyzed,
        "sectors_covered":          result.sectors_covered,
        "agents_activated":         result.agents_activated,
        "input_mode":               result.input_mode,   # "historical" or "direct"

        # ── Portfolio risk ────────────────────────────────────────────────────
        "portfolio_risk_score":     result.portfolio_risk_score,
        "risk_classification":      result.risk_classification,

        # ── Conflict clusters ─────────────────────────────────────────────────
        "risk_clusters":            [
            {
                "sector":           c.sector,
                "risk_type":        c.risk_type,
                "policies_involved":c.policies_involved,
                "severity":         c.severity,
                "description":      c.description,
            }
            for c in result.risk_clusters
        ],

        # ── Sector pressure map ───────────────────────────────────────────────
        "sector_pressure_map":      result.sector_pressure_map,
        # e.g. [{"sector": "Healthcare", "pressure": 1.2}, ...]

        # ── Per-policy contribution ───────────────────────────────────────────
        "policy_contributions":     result.policy_contributions,
        # e.g. [{"policy_id": "P1", "risk_contribution": 35}, ...]

        # ── ORA recommendations (always generated in UC3) ─────────────────────
        "recommendations":          [
            {
                "type":             r.recommendation_type,
                "target_policies":  r.target_policies,
                "title":            r.title,
                "description":      r.description,
                "expected_impact":  r.expected_impact,
                "priority":         r.priority,
            }
            for r in result.ora_output.recommendations
        ] if result.ora_output else [],

        # ── Summary ───────────────────────────────────────────────────────────
        "portfolio_briefing":       result.portfolio_briefing,
        "executive_summary":        result.executive_summary,
        "elapsed_seconds":          getattr(result, "elapsed_seconds", None),
    }

    log = _load_log()
    log.append(entry)
    _save_log(log)

    logger.info(
        f"[Memory] UC3 saved: {sim_id} | "
        f"portfolio_risk={entry['portfolio_risk_score']} | "
        f"clusters={len(entry['risk_clusters'])}"
    )
    return sim_id


# ── Query functions — used by dashboard + UC3 ────────────────────────────────

def load_all_simulations() -> list:
    """Return the full log. Used by dashboard and UC3 input resolver."""
    return _load_log()


def load_by_usecase(usecase: str) -> list:
    """Filter log by 'UC1', 'UC2', or 'UC3'."""
    return [s for s in _load_log() if s.get("usecase") == usecase]


def load_by_sector(sector: str) -> list:
    """
    Return all simulations touching a given sector.
    For UC2, matches on the sector field.
    For UC3, matches if sector is in sectors_covered.
    """
    sector_lower = sector.lower()
    results = []
    for sim in _load_log():
        if sim.get("usecase") in ("UC1", "UC2"):
            if sim.get("sector", "").lower() == sector_lower:
                results.append(sim)
        elif sim.get("usecase") == "UC3":
            covered = [s.lower() for s in sim.get("sectors_covered", [])]
            if sector_lower in covered:
                results.append(sim)
    return results


def load_selectable_policies() -> list:
    """
    UC3 Option A input: returns all UC1 and UC2 simulations
    formatted as selectable policy references.

    Each item has enough info for UC3's input resolver to
    reconstruct WIA inputs without re-running PAA.
    """
    selectable = []
    for sim in _load_log():
        uc = sim.get("usecase")

        if uc == "UC1":
            selectable.append({
                "id":                       sim["id"],
                "usecase":                  "UC1",
                "display_name":             sim.get("policy_title", sim["id"]),
                "sector":                   sim.get("sector"),
                "time_horizon":             sim.get("time_horizon"),
                "severity_score":           sim.get("severity_score"),
                "risk_level":               sim.get("risk_level"),
                "risk_flags":               sim.get("risk_flags", []),
                "workforce_pressure_index": sim.get("workforce_pressure_index"),
                "budget_stress_ratio":      sim.get("budget_stress_ratio"),
                "training_capacity_ratio":  sim.get("training_capacity_ratio"),
                "saudization_risk":         sim.get("saudization_risk"),
                "timestamp":                sim.get("timestamp"),
            })

        elif uc == "UC2":
            # Expose each scenario as a separately selectable policy
            for sc in sim.get("scenarios", []):
                selectable.append({
                    "id":                       f"{sim['id']}_SC{sc['scenario_id']}",
                    "usecase":                  "UC2",
                    "display_name":             f"{sim.get('policy_goal', sim['id'])} — {sc['name']}",
                    "sector":                   sim.get("sector"),
                    "time_horizon":             sc.get("time_horizon"),
                    "severity_score":           sc.get("severity_score"),
                    "risk_level":               sc.get("risk_level"),
                    "risk_flags":               sc.get("risk_flags", []),
                    "workforce_pressure_index": sc.get("workforce_pressure_index"),
                    "budget_stress_ratio":      sc.get("budget_stress_ratio"),
                    "training_capacity_ratio":  sc.get("training_capacity_ratio"),
                    "saudization_risk":         sc.get("saudization_risk"),
                    "timestamp":                sim.get("timestamp"),
                })

    return selectable


def find_overlapping_policies(sector: str, risk_flags: list) -> list:
    """
    UC3 conflict detection: find past simulations in the same sector
    that share risk flags with a new policy being analyzed.

    Returns results sorted by overlap count (most overlap first).
    """
    results = []
    for sim in _load_log():
        if sim.get("sector", "").lower() != sector.lower():
            continue
        sim_flags = sim.get("risk_flags", [])
        overlap = set(risk_flags) & set(sim_flags)
        if overlap:
            results.append({
                "simulation":    sim,
                "shared_flags":  list(overlap),
                "overlap_count": len(overlap),
            })
    return sorted(results, key=lambda x: x["overlap_count"], reverse=True)


def get_dashboard_stats() -> dict:
    """
    Pre-computed stats for the homepage dashboard.
    Covers UC1, UC2, and UC3.
    Called by the /api/dashboard/stats endpoint.
    """
    log = _load_log()
    if not log:
        return {
            "total_simulations":    0,
            "by_usecase":           {"UC1": 0, "UC2": 0, "UC3": 0},
            "by_sector":            {},
            "by_risk_level":        {"Low": 0, "Moderate": 0, "High": 0, "Critical": 0},
            "average_severity":     0.0,
            "path_distribution":    {"Path A": 0, "Path B": 0, "Path C": 0},
            "portfolio_analyses":   0,
            "conflicts_detected":   0,
            "recent":               [],
        }

    uc1 = [s for s in log if s["usecase"] == "UC1"]
    uc2 = [s for s in log if s["usecase"] == "UC2"]
    uc3 = [s for s in log if s["usecase"] == "UC3"]

    # Sector counts — UC3 contributes its sectors_covered list
    sector_counts: dict = {}
    for sim in uc1 + uc2:
        sec = sim.get("sector", "unknown")
        sector_counts[sec] = sector_counts.get(sec, 0) + 1
    for sim in uc3:
        for sec in sim.get("sectors_covered", []):
            sector_counts[sec] = sector_counts.get(sec, 0) + 1

    # Risk level counts and severity scores
    risk_counts = {"Low": 0, "Moderate": 0, "High": 0, "Critical": 0}
    severity_scores = []

    for sim in uc1:
        rl = sim.get("risk_level")
        if rl in risk_counts:
            risk_counts[rl] += 1
        sv = sim.get("severity_score")
        if sv is not None:
            severity_scores.append(sv)

    for sim in uc2:
        rl = sim.get("risk_level")   # risk_level of best scenario
        if rl in risk_counts:
            risk_counts[rl] += 1
        sv = sim.get("severity_score")
        if sv is not None:
            severity_scores.append(sv)

    for sim in uc3:
        score = sim.get("portfolio_risk_score")
        rc    = sim.get("risk_classification")
        if rc in risk_counts:
            risk_counts[rc] += 1
        if score is not None:
            severity_scores.append(score)

    # UC1 path distribution
    path_dist = {"Path A": 0, "Path B": 0, "Path C": 0}
    for sim in uc1:
        p = sim.get("decision_path")
        if p in path_dist:
            path_dist[p] += 1

    # UC3 stats
    total_clusters = sum(
        len(sim.get("risk_clusters", [])) for sim in uc3
    )

    return {
        "total_simulations":    len(log),
        "by_usecase":           {"UC1": len(uc1), "UC2": len(uc2), "UC3": len(uc3)},
        "by_sector":            sector_counts,
        "by_risk_level":        risk_counts,
        "average_severity":     round(sum(severity_scores) / len(severity_scores), 1)
                                if severity_scores else 0.0,
        "path_distribution":    path_dist,
        "portfolio_analyses":   len(uc3),
        "conflicts_detected":   total_clusters,
        # Last 5 runs across all UCs, newest first
        "recent":               sorted(log, key=lambda x: x["timestamp"], reverse=True)[:5],
    }