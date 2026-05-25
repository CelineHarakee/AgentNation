# app/main_uc3.py — Use Case 3 test runner

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv()

from usecases.usecase3.coa import run_uc3
from usecases.usecase3.schemas import UC3Input, DirectPolicySpec, InputMode


def divider(char="=", width=70):
    print(char * width)


def test_uc3(name: str, uc3_input: UC3Input):
    divider()
    print(f"  TEST: {name}")
    divider()

    result = run_uc3(uc3_input)

    # ── Overview ──────────────────────────────────────────────────────────────
    print(f"\n🔗 Agents: {' → '.join(result.agents_activated)}")
    print(f"📊 Portfolio Risk Score: {result.portfolio_risk_score:.1f}/100")
    print(f"🚦 Classification:       {result.risk_classification}")
    print(f"⚠  Conflicts detected:   {len(result.risk_clusters)}")
    print(f"⏱  Elapsed:              {result.elapsed_seconds}s")
    print(f"🆔 Simulation ID:        {result.simulation_id}")

    # ── Per-policy results ────────────────────────────────────────────────────
    print(f"\n{'─'*70}")
    print("  Per-Policy Evaluation (WIA + MAA)")
    print(f"{'─'*70}")
    print(f"\n  {'Policy':<30} {'Sector':<20} {'Severity':>10} {'Risk':>12}")
    print(f"  {'─'*68}")
    for e in result.policy_evaluations:
        print(
            f"  {e.display_name[:28]:<30} "
            f"{e.sector[:18]:<20} "
            f"{e.maa_output.severity_score:>8.1f}  "
            f"{e.maa_output.risk_classification.value:>12}"
        )

    # ── Sector pressure map ───────────────────────────────────────────────────
    print(f"\n{'─'*70}")
    print("  Sector Pressure Map")
    print(f"{'─'*70}")
    for sp in result.sector_pressure_map:
        bar_len = int(sp.pressure * 30)
        bar = "█" * min(bar_len, 30)
        overflow = " ⚠ OVERLOAD" if sp.pressure > 0.70 else ""
        print(f"  {sp.sector:<30} {bar:<32} {sp.pressure:.3f}{overflow}")

    # ── Policy contributions ──────────────────────────────────────────────────
    print(f"\n{'─'*70}")
    print("  Policy Risk Contributions")
    print(f"{'─'*70}")
    for pc in result.policy_contributions:
        print(f"  {pc.display_name[:40]:<40} {pc.risk_contribution:>6.1f}%")

    # ── Risk clusters ─────────────────────────────────────────────────────────
    print(f"\n{'─'*70}")
    print("  Risk Clusters (Conflicts Detected)")
    print(f"{'─'*70}")
    if not result.risk_clusters:
        print("  ✅ No conflicts detected.")
    for i, c in enumerate(result.risk_clusters, 1):
        print(f"\n  [{i}] {c.risk_type} — {c.severity.upper()}")
        print(f"       Sector:   {c.sector}")
        print(f"       Policies: {', '.join(c.policies_involved)}")
        print(f"       Detail:   {c.description[:120]}...")

    # ── ORA Recommendations ───────────────────────────────────────────────────
    print(f"\n{'─'*70}")
    print("  ORA — Portfolio Recommendations")
    print(f"{'─'*70}")
    print(f"\n  💬 {result.ora_output.explanation}\n")
    for i, r in enumerate(result.ora_output.recommendations, 1):
        print(f"  [{i}] {r.title}  [{r.priority.upper()} priority]")
        print(f"       Type:    {r.recommendation_type}")
        print(f"       Targets: {', '.join(r.target_policies)}")
        print(f"       What:    {r.description[:120]}...")
        print(f"       Impact:  {r.expected_impact[:100]}...")
        print()

    # ── Executive Summary ─────────────────────────────────────────────────────
    print(f"{'─'*70}")
    print("  Executive Summary")
    print(f"{'─'*70}")
    print(f"  {result.executive_summary}")
    print()


# ============================================================
# TEST CASES
# ============================================================

print("\n🧪 AGENTNATION — USE CASE 3 PIPELINE TEST\n")

# ── Test 1: Option B — Direct input, two healthcare + one education ───────────
# Expect: Workforce Overlap and Capacity Overload in healthcare
test_uc3(
    "Option B — Two Healthcare + One Education (Direct Input)",
    UC3Input(
        input_mode = InputMode.DIRECT,
        policies   = [
            DirectPolicySpec(
                policy_id        = "P1",
                sector           = "healthcare",
                target_growth_pct= 40,
                time_horizon     = "medium",
                budget_limit     = 0.15,
                display_name     = "Healthcare Staffing Overhaul (40%)",
            ),
            DirectPolicySpec(
                policy_id        = "P2",
                sector           = "healthcare",
                target_growth_pct= 20,
                time_horizon     = "short",
                budget_limit     = 0.18,
                display_name     = "Healthcare Workforce Expansion (20%)",
            ),
            DirectPolicySpec(
                policy_id        = "P3",
                sector           = "education",
                target_growth_pct= 10,
                time_horizon     = "long",
                budget_limit     = 0.10,
                display_name     = "Teacher Recruitment Initiative (10%)",
            ),
        ]
    )
)

# # ── Test 2: Option A — Historical input from existing simulation log ──────────
# # Uses the real IDs from simulation_log.json
# test_uc3(
#     "Option A — Historical Simulations (from simulation_log.json)",
#     UC3Input(
#         input_mode           = InputMode.HISTORICAL,
#         selected_policy_ids  = [
#             "UC1_20260410_182056_01471B",   # healthcare 40% — Critical
#             "UC2_20260410_183610_D98994",   # healthcare 20% UC2 — best scenario A
#             "UC1_20260411_150611_E1DD6B",   # education pilot — Low
#         ]
#     )
# )

divider()
print("  ✅  USE CASE 3 TEST COMPLETE")
divider()