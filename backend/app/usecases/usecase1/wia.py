# usecases/usecase1/wia.py

import json
from pathlib import Path
from usecases.usecase1.schemas import PAAOutput, WIAOutput
from usecases.usecase1.llm import generate_text

# ── DB ────────────────────────────────────────────────────────────────────────
DB_PATH = Path(__file__).parent / "workforce_db.json"
with open(DB_PATH, "r") as f:
    DB = json.load(f)

def _generate_wia_explanation(
    sector: str,
    policy_required_workers: int,
    total_current: int,
    workforce_pressure_index: float,
    structural_budget_ratio: float,
    constraint_stress_ratio: float,
    annual_training_output: int,
    training_capacity_ratio: float,
    saudization_risk: bool,
    risk_flags: list,
) -> str:
    """Call Gemini to turn WIA numbers into a clear, human-readable narrative."""

    flags_text = ", ".join(risk_flags) if risk_flags else "none"

    prompt = f"""
You are a workforce policy analyst writing a concise briefing note.

Given these workforce intelligence findings for the {sector} sector, 
write 3–4 sentences in plain English that explain what the numbers mean 
for a government decision-maker. Do not repeat the raw numbers mechanically — 
interpret what they imply about policy feasibility.

Key findings:
- The policy requires approximately {int(policy_required_workers):,} additional workers 
  on a current base of {int(total_current):,} ({workforce_pressure_index:.1%} pressure index).
- Estimated policy cost represents {structural_budget_ratio:.1%} of the total sector budget, 
  and {constraint_stress_ratio:.1%} of the allocated policy budget limit.
- Annual training pipeline output is {int(annual_training_output):,} graduates; 
  the policy requires {training_capacity_ratio:.1f}x that output.
- Saudization risk detected: {saudization_risk}.
- Risk flags triggered: {flags_text}.

Write the briefing note now. Be direct, analytical, and no longer than 4 sentences.
""".strip()

    try:
        text = generate_text(prompt)
        if text:
            return text
        raise RuntimeError("No LLM explanation returned")
    except Exception:
        # Graceful fallback to structured summary if LLM fails
        return (
            f"The policy requires {int(policy_required_workers):,} additional workers "
            f"in the {sector} sector (pressure index: {workforce_pressure_index:.3f}). "
            f"Budget constraint stress ratio is {constraint_stress_ratio:.3f} and "
            f"training capacity ratio is {training_capacity_ratio:.3f}. "
            f"Saudization risk: {saudization_risk}. "
            f"Detected flags: {flags_text}."
        )


def run_wia(paa_output: PAAOutput) -> WIAOutput:
    """
    Workforce Intelligence Agent (WIA)

    Performs:
    1. Workforce structural pressure analysis
    2. Budget structural and constraint stress analysis
    3. Training pipeline feasibility assessment
    4. Saudization feasibility risk detection
    5. LLM-generated narrative explanation
    """

    sector_key = paa_output.sector.lower()
    sector_data = DB["sectors"].get(sector_key)

    if not sector_data:
        raise ValueError(f"Sector '{sector_key}' not found in database.")

    constraints = paa_output.constraints
    risk_flags = []

    # ── 1. Workforce Pressure ─────────────────────────────────────────────────

    occupations = sector_data["occupational_breakdown"]

    total_existing_gap = sum(
        occ.get("demand_gap", 0) for occ in occupations.values()
    )
    total_current = sum(
        occ.get("total", 0) for occ in occupations.values()
    )

    policy_required_workers = total_current * constraints.workforce_capacity

    workforce_pressure_index = (
        total_existing_gap + policy_required_workers
    ) / max(total_current, 1)

    if workforce_pressure_index > 0.20:
        risk_flags.append("High workforce structural pressure")

    # ── 2. Budget Analysis ────────────────────────────────────────────────────

    total_budget = sector_data["total_budget_SAR"]
    salary_budget = sector_data["budget_breakdown"]["salaries_and_benefits"]

    avg_salary = salary_budget / max(total_current, 1)
    estimated_policy_cost = policy_required_workers * avg_salary

    structural_budget_ratio = estimated_policy_cost / max(total_budget, 1)
    allocated_budget = total_budget * constraints.budget_limit
    constraint_stress_ratio = estimated_policy_cost / max(allocated_budget, 1)
    budget_stress_ratio = constraint_stress_ratio

    if structural_budget_ratio > 0.30:
        risk_flags.append("Severe structural budget strain")
    if constraint_stress_ratio > 1:
        risk_flags.append("Budget allocation insufficient")

    # ── 3. Training Capacity ──────────────────────────────────────────────────

    annual_training_output = sum(
        program["annual_graduates"]
        for program in sector_data["training_pipeline"]["training_programs"]
    )

    training_capacity_ratio = policy_required_workers / max(annual_training_output, 1)

    if training_capacity_ratio > 1:
        risk_flags.append("Training pipeline insufficient")

    # ── 4. Saudization Risk ───────────────────────────────────────────────────

    target_saudization = sector_data["workforce"]["saudization_target_2030"]
    current_saudization = sector_data["workforce"]["saudization_rate"]

    saudization_risk = (
        target_saudization > current_saudization
        and training_capacity_ratio > 0.5
    )
    if saudization_risk:
        risk_flags.append("Saudization feasibility risk")

    # ── 5. LLM Explanation ────────────────────────────────────────────────────

    explanation = _generate_wia_explanation(
        sector=sector_key,
        policy_required_workers=policy_required_workers,
        total_current=total_current,
        workforce_pressure_index=workforce_pressure_index,
        structural_budget_ratio=structural_budget_ratio,
        constraint_stress_ratio=constraint_stress_ratio,
        annual_training_output=annual_training_output,
        training_capacity_ratio=training_capacity_ratio,
        saudization_risk=saudization_risk,
        risk_flags=risk_flags,
    )

    return WIAOutput(
        workforce_pressure_index=round(workforce_pressure_index, 3),
        budget_stress_ratio=round(budget_stress_ratio, 3),
        training_capacity_ratio=round(training_capacity_ratio, 3),
        saudization_risk=saudization_risk,
        risk_flags=risk_flags,
        explanation=explanation,
    )
