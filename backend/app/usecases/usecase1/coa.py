# usecases/usecase1/coa.py

from typing import Optional, List
from usecases.usecase1.schemas import (
    UseCase1Input,
    PAAOutput,
    WIAOutput,
    MAAOutput,
    ORAOutput,
    Recommendation,
    FinalResponse,
)
from usecases.usecase1.paa import run_paa
from usecases.usecase1.wia import run_wia
from usecases.usecase1.maa import run_maa
from usecases.usecase1.ora import generate_alternatives


# ── Thresholds ────────────────────────────────────────────────────────────────

# WIA threshold: if ALL of these are clear, skip MAA entirely (Path A early exit)
WIA_PRESSURE_CLEAN     = 0.10   # workforce pressure index below this → no strain
WIA_BUDGET_CLEAN       = 0.40   # budget stress ratio below this → comfortable
WIA_TRAINING_CLEAN     = 0.75   # training capacity ratio below this → pipeline adequate

# MAA thresholds for Path B vs Path C
THRESHOLD_LOW          = 30.0
THRESHOLD_MODERATE     = 60.0


def _wia_is_clean(wia: WIAOutput) -> bool:
    """
    Returns True if WIA metrics are all well below risk thresholds,
    meaning MAA escalation is not warranted (Scenario 1 / Path A early exit).
    """
    return (
        wia.workforce_pressure_index < WIA_PRESSURE_CLEAN
        and wia.budget_stress_ratio   < WIA_BUDGET_CLEAN
        and wia.training_capacity_ratio < WIA_TRAINING_CLEAN
        and not wia.saudization_risk
        and len(wia.risk_flags) == 0
    )


def run_coa(user_input: UseCase1Input) -> FinalResponse:
    """
    Coordination & Oversight Agent (COA)

    Orchestrates the pipeline with true scenario branching:

      Scenario 1 (Path A — early exit):
        PAA → WIA → COA
        WIA is completely clean → skip MAA entirely.
        This demonstrates system restraint: no AI overreaction.

      Scenario 2 (Path B — monitor):
        PAA → WIA → MAA → COA
        MAA flags risk but severity < 60 → ORA NOT triggered.
        Human authority preserved: system identifies but does not act.

      Scenario 3 (Path C — mitigation):
        PAA → WIA → MAA → COA → ORA
        MAA severity ≥ 60 → ORA generates alternative policies.
        Full decision-support output produced.
    """

    # ── Step 1: Always run PAA + WIA ─────────────────────────────────────────
    paa_output: PAAOutput = run_paa(user_input)
    wia_output: WIAOutput = run_wia(paa_output)

    # ── Step 2: Option B — skip MAA if WIA is completely clean ───────────────
    if _wia_is_clean(wia_output):
        return _build_path_a_early(user_input, paa_output, wia_output)

    # ── Step 3: Run MAA (Scenarios 2 & 3) ────────────────────────────────────
    maa_output: MAAOutput = run_maa(wia_output)
    severity = maa_output.severity_score

    if severity < THRESHOLD_MODERATE:
        return _build_path_b(user_input, paa_output, wia_output, maa_output)
    else:
        return _build_path_c(user_input, paa_output, wia_output, maa_output)


# ── Path builders ─────────────────────────────────────────────────────────────

def _build_path_a_early(
    user_input: UseCase1Input,
    paa_output: PAAOutput,
    wia_output: WIAOutput,
) -> FinalResponse:
    """
    Scenario 1 — No Risk Detected (MAA skipped entirely).
    Demonstrates system restraint.
    """
    from usecases.usecase1.maa import _build_clean_maa_stub

    # We still need a MAAOutput object for the response schema.
    # We use a stub that clearly communicates MAA was not fully engaged.
    maa_stub = _build_clean_maa_stub()

    summary = (
        f"Policy assessment complete. "
        f"The Workforce Intelligence Agent found no significant implementation risks. "
        f"Workforce pressure index is {wia_output.workforce_pressure_index:.1%}, "
        f"budget stress is {wia_output.budget_stress_ratio:.1%} of the allocated limit, "
        f"and the training pipeline has sufficient capacity "
        f"({wia_output.training_capacity_ratio:.2f}x annual output required). "
        f"The Monitoring & Assessment Agent was not activated — "
        f"no risk threshold was reached. "
        f"Policy may proceed as designed with standard monitoring."
    )

    return FinalResponse(
        use_case="Workforce Policy Risk Assessment",
        scenario="Path A — No Risk Detected (MAA Skipped)",
        executive_summary=summary,
        agents_activated=["PAA", "WIA", "COA"],
        paa_output=paa_output,
        wia_output=wia_output,
        maa_output=maa_stub,
        ora_output=None,
        recommendation=Recommendation(
            decision_path="Path A",
            monitoring_required=False,
            mitigation_required=False,
            escalate_to_ora=False,
            confidence_level=maa_stub.confidence_level,
            decision_rationale=(
                "All WIA metrics are below risk thresholds. "
                "No further analysis or intervention is required."
            ),
        ),
    )


def _build_path_b(
    user_input: UseCase1Input,
    paa_output: PAAOutput,
    wia_output: WIAOutput,
    maa_output: MAAOutput,
) -> FinalResponse:
    """
    Scenario 2 — Risk Detected, No Action Taken.
    MAA ran and flagged risks, but severity is below the action threshold.
    ORA is NOT triggered — human authority preserved.
    """
    severity = maa_output.severity_score

    pressure_issues: List[str] = []
    if wia_output.workforce_pressure_index > 0.25:
        pressure_issues.append(
            f"elevated workforce pressure ({wia_output.workforce_pressure_index:.1%})"
        )
    if wia_output.budget_stress_ratio > 0.70:
        pressure_issues.append(
            f"budget stress approaching limit ({wia_output.budget_stress_ratio:.1%})"
        )
    if wia_output.training_capacity_ratio > 2.0:
        pressure_issues.append(
            f"training capacity constraint ({wia_output.training_capacity_ratio:.1f}x annual output required)"
        )
    if wia_output.saudization_risk:
        pressure_issues.append("Saudization compliance concerns")

    issues_text = ", ".join(pressure_issues) if pressure_issues else "moderate resource constraints"

    summary = (
        f"Policy assessment complete. Risk severity score: {severity:.1f}/100 "
        f"({maa_output.risk_classification.value}). "
        f"The Monitoring & Assessment Agent identified {issues_text}. "
        f"Risk severity ({severity:.1f}) is below the mitigation threshold (60.0). "
        f"The Option Recommendation Agent was NOT activated — "
        f"this system does not auto-generate policy changes below the action threshold. "
        f"Continuous monitoring is recommended, with periodic reassessment at key milestones."
    )

    return FinalResponse(
        use_case="Workforce Policy Risk Assessment",
        scenario="Path B — Risk Detected (ORA Not Triggered)",
        executive_summary=summary,
        agents_activated=["PAA", "WIA", "MAA", "COA"],
        paa_output=paa_output,
        wia_output=wia_output,
        maa_output=maa_output,
        ora_output=None,
        recommendation=Recommendation(
            decision_path="Path B",
            monitoring_required=True,
            mitigation_required=False,
            escalate_to_ora=False,
            confidence_level=maa_output.confidence_level,
            decision_rationale=(
                f"Severity score {severity:.1f} is below the 60.0 action threshold. "
                f"Risks are identified and flagged for monitoring, but no automated "
                f"mitigation is recommended at this stage."
            ),
        ),
    )


def _build_path_c(
    user_input: UseCase1Input,
    paa_output: PAAOutput,
    wia_output: WIAOutput,
    maa_output: MAAOutput,
) -> FinalResponse:
    """
    Scenario 3 — Mitigation Required.
    Full pipeline: MAA severity ≥ 60, ORA activated.
    """
    severity = maa_output.severity_score

    critical_issues: List[str] = []
    if wia_output.budget_stress_ratio > 1.0:
        critical_issues.append(
            f"budget allocation exceeded by {(wia_output.budget_stress_ratio - 1) * 100:.0f}%"
        )
    if wia_output.training_capacity_ratio > 5.0:
        critical_issues.append(
            f"training capacity critically insufficient "
            f"(requires {wia_output.training_capacity_ratio:.1f}x annual output)"
        )
    if wia_output.workforce_pressure_index > 0.40:
        critical_issues.append(
            f"severe workforce structural pressure ({wia_output.workforce_pressure_index:.1%})"
        )
    if wia_output.saudization_risk:
        critical_issues.append("Saudization targets at risk")

    issues_text = "; ".join(critical_issues) if critical_issues else "multiple high-severity constraints"

    ora_output: ORAOutput = generate_alternatives(
        user_input=user_input,
        paa_output=paa_output,
        wia_output=wia_output,
        maa_output=maa_output,
    )

    summary = (
        f"Policy assessment complete. Risk severity score: {severity:.1f}/100 "
        f"({maa_output.risk_classification.value}). "
        f"CRITICAL RISKS DETECTED: {issues_text}. "
        f"The policy as currently designed poses significant implementation risks "
        f"and may not be feasible without structural modifications. "
        f"The Option Recommendation Agent has generated "
        f"{len(ora_output.alternative_policies)} alternative policy designs for consideration. "
        f"Review of these alternatives is required before proceeding."
    )

    return FinalResponse(
        use_case="Workforce Policy Risk Assessment",
        scenario="Path C — Mitigation Required (ORA Activated)",
        executive_summary=summary,
        agents_activated=["PAA", "WIA", "MAA", "COA", "ORA"],
        paa_output=paa_output,
        wia_output=wia_output,
        maa_output=maa_output,
        ora_output=ora_output,
        recommendation=Recommendation(
            decision_path="Path C",
            monitoring_required=True,
            mitigation_required=True,
            escalate_to_ora=True,
            confidence_level=maa_output.confidence_level,
            decision_rationale=(
                f"Severity score {severity:.1f} exceeds the 60.0 mitigation threshold. "
                f"ORA has been activated to generate policy alternatives. "
                f"Human review of alternatives is required before any action is taken."
            ),
        ),
    )