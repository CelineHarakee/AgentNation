# main.py — AgentNation pipeline test runner
from dotenv import load_dotenv
load_dotenv()

import sys
import os

# Add the backend directory to sys.path so it can find the 'app' module
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.append(backend_dir)
if current_dir not in sys.path:
    sys.path.append(current_dir)

from usecases.usecase1.coa import run_coa
from usecases.usecase1.schemas import UseCase1Input, Constraints


def divider(char="=", width=70):
    print(char * width)


def test_scenario(name: str, input_data: UseCase1Input):
    divider()
    print(f"  SCENARIO: {name}")
    divider()

    result = run_coa(input_data)

    # ── Pipeline Overview ──────────────────────────────────────────────────
    print(f"\n🔗 Agents Activated:  {' → '.join(result.agents_activated)}")
    print(f"🎯 Decision Path:     {result.recommendation.decision_path}")
    print(f"📊 MAA Severity:      {result.maa_output.severity_score}/100")
    print(f"🚦 Risk Level:        {result.maa_output.risk_classification.value}")

    # ── PAA Output ─────────────────────────────────────────────────────────
    print(f"\n{'─'*70}")
    print("  PAA — Policy Analysis Agent")
    print(f"{'─'*70}")
    print(f"  Complexity:    {result.paa_output.complexity_level}")
    print(f"  Objectives:    {', '.join(result.paa_output.policy_objectives)}")
    print(f"  Domains:       {', '.join(result.paa_output.affected_domains)}")
    print(f"  Assumptions:   {', '.join(result.paa_output.assumptions)}")
    print(f"\n  💬 PAA Explanation:")
    print(f"  {result.paa_output.explanation}")

    # ── WIA Output ─────────────────────────────────────────────────────────
    print(f"\n{'─'*70}")
    print("  WIA — Workforce Intelligence Agent")
    print(f"{'─'*70}")
    print(f"  Workforce Pressure:   {result.wia_output.workforce_pressure_index:.3f}")
    print(f"  Budget Stress:        {result.wia_output.budget_stress_ratio:.3f}")
    print(f"  Training Capacity:    {result.wia_output.training_capacity_ratio:.3f}x")
    print(f"  Saudization Risk:     {result.wia_output.saudization_risk}")
    if result.wia_output.risk_flags:
        print(f"  Risk Flags:           {', '.join(result.wia_output.risk_flags)}")
    else:
        print(f"  Risk Flags:           None")
    print(f"\n  💬 WIA Explanation:")
    print(f"  {result.wia_output.explanation}")

    # ── MAA Output ─────────────────────────────────────────────────────────
    print(f"\n{'─'*70}")
    print("  MAA — Monitoring & Assessment Agent")
    print(f"{'─'*70}")

    if "MAA" not in result.agents_activated:
        print("  ⏭  MAA was skipped — WIA metrics were all below risk thresholds.")
    else:
        print(f"  Severity Score:        {result.maa_output.severity_score}/100")
        print(f"  Classification:        {result.maa_output.risk_classification.value}")
        print(f"  Confidence:            {result.maa_output.confidence_level.value}")
        print(f"  Trigger:               {result.maa_output.recommendation_trigger.value}")
        if result.maa_output.key_risk_indicators:
            print(f"  Key Indicators:        {', '.join(result.maa_output.key_risk_indicators)}")

    print(f"\n  💬 MAA Explanation:")
    print(f"  {result.maa_output.explanation}")

    # ── ORA Output (Path C only) ───────────────────────────────────────────
    print(f"\n{'─'*70}")
    print("  ORA — Option Recommendation Agent")
    print(f"{'─'*70}")

    if not result.ora_output:
        print("  ⏭  ORA was not triggered — severity below mitigation threshold.")
    else:
        print(f"\n  💬 ORA Explanation:")
        print(f"  {result.ora_output.explanation}")
        print(f"\n  Generated {len(result.ora_output.alternative_policies)} alternative(s):\n")
        for i, alt in enumerate(result.ora_output.alternative_policies, 1):
            print(f"  [{i}] {alt.title}  (risk reduction: {alt.risk_reduction_level.upper()})")
            print(f"       Targets:  {alt.addresses_risk}")
            print(f"       What:     {alt.description}")
            print(f"       Impact:   {alt.expected_impact}")
            print()

    # ── Final Recommendation ───────────────────────────────────────────────
    print(f"{'─'*70}")
    print("  COA — Final Recommendation")
    print(f"{'─'*70}")
    print(f"  Decision Path:      {result.recommendation.decision_path}")
    print(f"  Monitoring:         {result.recommendation.monitoring_required}")
    print(f"  Mitigation:         {result.recommendation.mitigation_required}")
    print(f"  ORA Escalation:     {result.recommendation.escalate_to_ora}")
    print(f"  Confidence:         {result.recommendation.confidence_level.value}")
    print(f"\n  📌 Rationale: {result.recommendation.decision_rationale}")

    # ── Executive Summary ──────────────────────────────────────────────────
    print(f"\n{'─'*70}")
    print("  Executive Summary")
    print(f"{'─'*70}")
    print(f"  {result.executive_summary}")
    print()


# ==============================================================================
# TEST CASES
# ==============================================================================

print("\n🧪 AGENTNATION — FULL PIPELINE TEST\n")

# ── Path A: WIA completely clean → MAA skipped ────────────────────────────────
test_scenario(
    "Path A — Small Education Pilot (MAA Should Be Skipped)",
    UseCase1Input(
        policy_title="Teacher Digital Skills Pilot",
        policy_description="Small pilot to train 1% of education workforce in basic digital tools.",
        sector="education",
        time_horizon="short",
        constraints=Constraints(
            budget_limit=0.25,
            workforce_capacity=0.01,
        ),
    ),
)

# ── Path B: MAA runs, flags risk, ORA NOT triggered ───────────────────────────
test_scenario(
    "Path B — Healthcare Staffing Increase (ORA Should NOT Trigger)",
    UseCase1Input(
        policy_title="Healthcare Workforce Expansion",
        policy_description="Expand healthcare workforce by 8% to improve service coverage.",
        sector="healthcare",
        time_horizon="medium",
        constraints=Constraints(
            budget_limit=0.18,
            workforce_capacity=0.08,
        ),
    ),
)

# ── Path C: Full pipeline, ORA activated ─────────────────────────────────────
test_scenario(
    "Path C — Aggressive Healthcare Reform (ORA Should Activate)",
    UseCase1Input(
        policy_title="National Healthcare Workforce Overhaul",
        policy_description="Massive 40% expansion of healthcare staffing for Vision 2030.",
        sector="healthcare",
        time_horizon="medium",
        constraints=Constraints(
            budget_limit=0.15,
            workforce_capacity=0.40,
        ),
    ),
)

divider()
print("  ✅  FULL PIPELINE TEST COMPLETE")
divider()