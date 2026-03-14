# usecases/usecase2/coa.py

import logging
from typing import List
from usecases.usecase2.schemas import (
    PolicyIntent,
    ScenarioSpec,
    ScenarioResult,
    ScenarioPAAOutput,
    UC2FinalResponse,
)
from usecases.usecase2.sga import run_sga
from usecases.usecase2.caa import run_caa
from usecases.usecase2.ora import generate_hybrid

# Reuse UC1 agents directly — no duplication
from usecases.usecase1.wia import run_wia
from usecases.usecase1.maa import run_maa
from usecases.usecase1.schemas import (
    PAAOutput as UC1PAAOutput,
    Constraints,
)

logger = logging.getLogger("agentnation.uc2.coa")


def _build_scenario_paa(spec: ScenarioSpec, intent: PolicyIntent) -> ScenarioPAAOutput:
    """
    Build a PAA output for a scenario without an LLM call.

    In UC2, PAA's job is done structurally by the SGA — it already
    extracted the strategic intent. We just format it for display.
    We save Gemini quota by not repeating PAA for each of the 3 scenarios.
    """
    time_labels = {"short": "aggressive", "medium": "phased", "long": "gradual"}
    time_label = time_labels.get(spec.time_horizon, "structured")

    objectives = [
        f"Achieve {intent.target_growth_pct}% workforce growth in the {intent.sector} sector",
        f"Implement via {time_label} expansion over a {spec.time_horizon} time horizon",
    ]
    if spec.training_investment:
        objectives.append("Invest in training infrastructure to build sustainable capacity")

    affected_domains = [
        intent.sector.replace("_", " ").title(),
        "Labor market and workforce planning",
        "Budget and fiscal policy",
        "Training and education infrastructure",
    ]

    complexity = "high" if spec.time_horizon == "short" else "medium" if spec.time_horizon == "medium" else "low"

    explanation = (
        f"Scenario {spec.scenario_id} ({spec.name}) pursues the {intent.target_growth_pct}% "
        f"growth target over a {spec.time_horizon} timeline with a {spec.budget_limit*100:.0f}% "
        f"budget allocation. {spec.rationale} "
        f"Key tradeoff: {spec.key_tradeoff}"
    )

    return ScenarioPAAOutput(
        scenario_id=spec.scenario_id,
        policy_objectives=objectives,
        affected_domains=affected_domains,
        complexity_level=complexity,
        explanation=explanation,
    )


def _build_wia_input(spec: ScenarioSpec, intent: PolicyIntent) -> UC1PAAOutput:
    """
    Build a UC1 PAAOutput-compatible object so we can pass a scenario
    directly into the existing run_wia() function without modification.
    """
    return UC1PAAOutput(
        policy_objectives=[f"Expand {intent.sector} workforce by {intent.target_growth_pct}%"],
        affected_domains=[intent.sector],
        sector=intent.sector.lower().replace(" ", "_"),
        constraints=Constraints(
            budget_limit=spec.budget_limit,
            workforce_capacity=spec.workforce_capacity,
        ),
        assumptions=[spec.rationale],
        complexity_level="medium",
        explanation=spec.rationale,
    )


def run_uc2(intent: PolicyIntent) -> UC2FinalResponse:
    """
    Use Case 2 — Policy Scenario Comparison coordinator.

    Full pipeline:
      SGA → [PAA + WIA + MAA] × 3 scenarios → CAA → ORA (hybrid) → Final Response
    """
    import uuid, time
    simulation_id = str(uuid.uuid4())[:8].upper()
    start = time.perf_counter()

    logger.info(f"[{simulation_id}] UC2 simulation started — goal='{intent.policy_goal}', sector={intent.sector}")

    # ── Step 1: SGA generates 3 scenarios ────────────────────────────────────
    logger.info(f"[{simulation_id}] SGA running...")
    specs: List[ScenarioSpec] = run_sga(intent)

    # ── Step 2: Run each scenario through PAA + WIA + MAA ────────────────────
    scenario_results: List[ScenarioResult] = []

    for spec in specs:
        logger.info(f"[{simulation_id}] Running pipeline for Scenario {spec.scenario_id}: {spec.name}")

        # PAA (structural, no LLM)
        paa_output = _build_scenario_paa(spec, intent)

        # WIA (fully reused from UC1)
        wia_input = _build_wia_input(spec, intent)
        wia_output = run_wia(wia_input)

        # MAA (fully reused from UC1)
        maa_output = run_maa(wia_output)

        scenario_results.append(ScenarioResult(
            spec=spec,
            paa_output=paa_output,
            wia_output=wia_output,
            maa_output=maa_output,
        ))

        logger.info(
            f"[{simulation_id}] Scenario {spec.scenario_id} complete — "
            f"severity={maa_output.severity_score:.1f}, "
            f"classification={maa_output.risk_classification.value}"
        )

    # ── Step 3: CAA compares all scenarios ───────────────────────────────────
    logger.info(f"[{simulation_id}] CAA running comparison...")
    caa_output = run_caa(
        scenario_results=scenario_results,
        priority=intent.priority,
        sector=intent.sector,
        policy_goal=intent.policy_goal,
    )

    # ── Step 4: ORA generates hybrid (always for UC2) ────────────────────────
    logger.info(f"[{simulation_id}] ORA generating hybrid scenario...")
    ora_output = generate_hybrid(
        scenario_results=scenario_results,
        caa_output=caa_output,
        sector=intent.sector,
        policy_goal=intent.policy_goal,
    )

    # ── Step 5: Build executive summary ──────────────────────────────────────
    best = next(r for r in scenario_results if r.spec.scenario_id == caa_output.best_scenario_id)
    best_ranking = next(rk for rk in caa_output.rankings if rk.scenario_id == caa_output.best_scenario_id)

    executive_summary = (
        f"Scenario comparison complete for '{intent.policy_goal}' in the {intent.sector} sector. "
        f"Three implementation strategies were evaluated under the '{intent.priority.value}' priority. "
        f"Scenario {caa_output.best_scenario_id} ({best.spec.name}) ranked first with an overall score of "
        f"{best_ranking.overall_score:.1f}/100 and a risk severity of {best.maa_output.severity_score:.1f}/100 "
        f"({best.maa_output.risk_classification.value}). "
        f"{caa_output.comparison_narrative} "
        f"A hybrid scenario '{ora_output.hybrid_scenario.name}' has been synthesized, "
        f"with an estimated risk level of {ora_output.hybrid_scenario.expected_risk_level}. "
        f"Human review of all options is required before policy adoption."
    )

    elapsed = round(time.perf_counter() - start, 2)
    logger.info(f"[{simulation_id}] UC2 simulation complete in {elapsed}s — best: Scenario {caa_output.best_scenario_id}")

    return UC2FinalResponse(
        use_case="Policy Scenario Comparison",
        sector=intent.sector,
        policy_goal=intent.policy_goal,
        priority=intent.priority.value,
        scenario_results=scenario_results,
        caa_output=caa_output,
        ora_output=ora_output,
        recommended_scenario_id=caa_output.best_scenario_id,
        executive_summary=executive_summary,
        agents_activated=["SGA", "PAA", "WIA", "MAA", "CAA", "ORA"],
        simulation_id=simulation_id,
        elapsed_seconds=elapsed,
    )