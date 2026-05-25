# usecases/usecase2/schemas.py

from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum

# Import shared enums and agent output types from UC1
from usecases.usecase1.schemas import (
    RiskClassification,
    RecommendationTrigger,
    ConfidenceLevel,
    WIAOutput,
    MAAOutput,
)


# ============================================================
# USER INPUT — Policy Intent
# ============================================================

class OptimizationPriority(str, Enum):
    MINIMIZE_RISK = "minimize_risk"
    MINIMIZE_COST = "minimize_cost"
    MINIMIZE_TIME = "minimize_time"
    BALANCED      = "balanced"


class PolicyIntent(BaseModel):
    sector: str
    policy_goal: str
    target_growth_pct: float = Field(..., ge=1, le=100)
    priority: OptimizationPriority = OptimizationPriority.BALANCED


# ============================================================
# SGA OUTPUT — One generated scenario
# ============================================================

class ScenarioSpec(BaseModel):
    scenario_id: str
    name: str
    rationale: str
    time_horizon: str                          # "short" | "medium" | "long"
    budget_limit: float = Field(..., ge=0, le=1)
    workforce_capacity: float = Field(..., ge=0, le=1)
    training_investment: bool
    key_tradeoff: str


# ============================================================
# PIPELINE RESULT — Full output for one scenario
# ============================================================

class ScenarioPAAOutput(BaseModel):
    scenario_id: str
    policy_objectives: List[str]
    affected_domains: List[str]
    complexity_level: str
    explanation: str


class ScenarioResult(BaseModel):
    spec: ScenarioSpec
    paa_output: ScenarioPAAOutput
    wia_output: WIAOutput
    maa_output: MAAOutput


# ============================================================
# CAA OUTPUT — Comparative Assessment
# ============================================================

class ScenarioRanking(BaseModel):
    scenario_id: str
    rank: int
    overall_score: float = Field(..., ge=0, le=100)
    recommendation: str                        # "Recommended" | "Acceptable" | "Not Recommended"
    strengths: List[str]
    weaknesses: List[str]


class CAAOutput(BaseModel):
    rankings: List[ScenarioRanking]
    best_scenario_id: str
    comparison_narrative: str
    conditions_statement: str
    hybrid_recommended: bool
    explanation: str


# ============================================================
# ORA OUTPUT — Hybrid Synthesis (on-demand)
# ============================================================

class HybridScenario(BaseModel):
    name: str
    description: str
    derived_from: List[str]
    time_horizon: str
    budget_limit: float
    workforce_capacity: float
    training_investment: bool
    expected_risk_level: str
    expected_severity_estimate: float
    key_advantages: List[str]
    implementation_steps: List[str]


class UC2ORAOutput(BaseModel):
    hybrid_scenario: HybridScenario
    explanation: str


# ============================================================
# ON-DEMAND HYBRID REQUEST
# The frontend sends this when the user clicks
# "Generate Hybrid Recommendation" after reviewing results.
# ============================================================

class HybridRequest(BaseModel):
    scenario_results: List[ScenarioResult]
    caa_output: CAAOutput
    sector: str
    policy_goal: str


# ============================================================
# UC2 FINAL RESPONSE
# ora_output is now Optional — only present if user requested it
# ============================================================

class UC2FinalResponse(BaseModel):
    use_case: str
    sector: str
    policy_goal: str
    priority: str

    scenario_results: List[ScenarioResult]
    caa_output: CAAOutput

    # None until user explicitly requests hybrid generation
    ora_output: Optional[UC2ORAOutput] = None

    recommended_scenario_id: str
    executive_summary: str

    # "ORA" only appears here after user requests hybrid
    agents_activated: List[str]

    simulation_id: str
    elapsed_seconds: float