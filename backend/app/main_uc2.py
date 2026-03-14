# app/main_uc2.py — Use Case 2 test runner
import sys
import os

# Add the backend directory to sys.path so it can find the 'app' module
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.append(backend_dir)
if current_dir not in sys.path:
    sys.path.append(current_dir)

from dotenv import load_dotenv
load_dotenv()

from usecases.usecase2.coa import run_uc2
from usecases.usecase2.schemas import PolicyIntent, OptimizationPriority


def divider(char="=", width=70):
    print(char * width)


def test_uc2(name: str, intent: PolicyIntent):
    divider()
    print(f"  TEST: {name}")
    divider()

    result = run_uc2(intent)

    # ── Overview ──────────────────────────────────────────────────────────────
    print(f"\n🔗 Agents Activated:  {' → '.join(result.agents_activated)}")
    print(f"🏆 Best Scenario:     {result.recommended_scenario_id}")
    print(f"⏱  Elapsed:           {result.elapsed_seconds}s")
    print(f"🆔 Simulation ID:     {result.simulation_id}")

    # ── SGA Scenarios ─────────────────────────────────────────────────────────
    print(f"\n{'─'*70}")
    print("  SGA — Generated Scenarios")
    print(f"{'─'*70}")
    for r in result.scenario_results:
        s = r.spec
        print(f"\n  [{s.scenario_id}] {s.name}")
        print(f"       Rationale:          {s.rationale}")
        print(f"       Time horizon:       {s.time_horizon}")
        print(f"       Budget limit:       {s.budget_limit*100:.0f}%")
        print(f"       Training invest:    {s.training_investment}")
        print(f"       Key tradeoff:       {s.key_tradeoff}")

    # ── Pipeline Results per Scenario ─────────────────────────────────────────
    print(f"\n{'─'*70}")
    print("  WIA + MAA — Per-Scenario Results")
    print(f"{'─'*70}")
    print(f"\n  {'Scenario':<12} {'Workforce':>12} {'Budget':>10} {'Training':>12} {'Severity':>10} {'Risk':>10}")
    print(f"  {'─'*70}")
    for r in result.scenario_results:
        print(
            f"  [{r.spec.scenario_id}] {r.spec.name:<10} "
            f"{r.wia_output.workforce_pressure_index*100:>10.1f}%  "
            f"{r.wia_output.budget_stress_ratio*100:>8.1f}%  "
            f"{r.wia_output.training_capacity_ratio:>10.1f}x  "
            f"{r.maa_output.severity_score:>8.1f}  "
            f"{r.maa_output.risk_classification.value:>10}"
        )

    # ── CAA Rankings ─────────────────────────────────────────────────────────
    print(f"\n{'─'*70}")
    print("  CAA — Comparative Assessment")
    print(f"{'─'*70}")
    for rk in result.caa_output.rankings:
        marker = " ← BEST" if rk.rank == 1 else ""
        print(f"\n  Rank {rk.rank}: Scenario {rk.scenario_id}  "
              f"Score: {rk.overall_score:.1f}/100  [{rk.recommendation}]{marker}")
        print(f"    Strengths: {', '.join(rk.strengths)}")
        print(f"    Weaknesses: {', '.join(rk.weaknesses)}")

    print(f"\n  💬 Comparison Analysis:")
    print(f"  {result.caa_output.comparison_narrative}")
    print(f"\n  📌 Conditions: {result.caa_output.conditions_statement}")

    # ── ORA Hybrid ────────────────────────────────────────────────────────────
    print(f"\n{'─'*70}")
    print("  ORA — Hybrid Scenario Synthesis")
    print(f"{'─'*70}")
    h = result.ora_output.hybrid_scenario
    print(f"\n  🔀 {h.name}")
    print(f"     Derived from:     Scenarios {' + '.join(h.derived_from)}")
    print(f"     Description:      {h.description}")
    print(f"     Time horizon:     {h.time_horizon}")
    print(f"     Budget limit:     {h.budget_limit*100:.0f}%")
    print(f"     Training invest:  {h.training_investment}")
    print(f"     Expected risk:    {h.expected_risk_level} (~{h.expected_severity_estimate:.0f}/100)")
    print(f"\n     Key advantages:")
    for adv in h.key_advantages:
        print(f"       • {adv}")
    print(f"\n     Implementation steps:")
    for i, step in enumerate(h.implementation_steps, 1):
        print(f"       {i}. {step}")

    print(f"\n  💬 ORA Note: {result.ora_output.explanation}")

    # ── Executive Summary ─────────────────────────────────────────────────────
    print(f"\n{'─'*70}")
    print("  Executive Summary")
    print(f"{'─'*70}")
    print(f"  {result.executive_summary}")
    print()


# ============================================================
# TEST CASES
# ============================================================

print("\n🧪 AGENTNATION — USE CASE 2 PIPELINE TEST\n")

# Test 1: Healthcare, balanced priority
test_uc2(
    "Healthcare Workforce Expansion — Balanced Priority",
    PolicyIntent(
        sector="healthcare",
        policy_goal="Expand healthcare workforce to meet Vision 2030 service targets",
        target_growth_pct=20,
        priority=OptimizationPriority.BALANCED,
    )
)


divider()
print("  ✅  USE CASE 2 TEST COMPLETE")
divider()