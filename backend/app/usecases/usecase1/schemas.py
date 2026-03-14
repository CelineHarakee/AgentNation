from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum


# ============================================================
# ENUMS
# ============================================================

class RiskClassification(str, Enum):
    LOW = "Low"
    MODERATE = "Moderate"
    HIGH = "High"
    CRITICAL = "Critical"


class RecommendationTrigger(str, Enum):
    NO_ACTION = "no_action"
    MONITOR = "monitor"
    MITIGATION = "mitigation"
    ESCALATE = "escalate"


class ConfidenceLevel(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


# ============================================================
# USER INPUT SCHEMA
# ============================================================

class Constraints(BaseModel):
    # Max % of sector budget allowed for policy (e.g. 0.15 = 15%)
    budget_limit: float = Field(..., ge=0, le=1)

    # Max % workforce expansion allowed (e.g. 0.10 = 10%)
    workforce_capacity: float = Field(..., ge=0, le=1)


class UseCase1Input(BaseModel):
    policy_title: str
    policy_description: str
    sector: str
    time_horizon: str  # short | medium | long
    constraints: Constraints


# ============================================================
# AGENT OUTPUT SCHEMAS
# ============================================================

class PAAOutput(BaseModel):
    policy_objectives: List[str]
    affected_domains: List[str]
    sector: str
    constraints: Constraints
    assumptions: List[str]
    complexity_level: str
    explanation: str  # LLM-generated narrative summary of what this policy entails


class WIAOutput(BaseModel):
    workforce_pressure_index: float = Field(..., ge=0)
    budget_stress_ratio: float = Field(..., ge=0)
    training_capacity_ratio: float = Field(..., ge=0)
    saudization_risk: bool
    risk_flags: List[str]
    explanation: str  # LLM-generated narrative explanation of workforce findings


class MAAOutput(BaseModel):
    severity_score: float = Field(..., ge=0, le=100)
    risk_classification: RiskClassification
    confidence_level: ConfidenceLevel
    key_risk_indicators: List[str]
    recommendation_trigger: RecommendationTrigger
    explanation: str  # LLM-generated narrative of risk assessment reasoning


# ============================================================
# ORA SCHEMAS
# ============================================================

class PolicyAlternative(BaseModel):
    title: str            # Short card header, e.g. "Phased Rollout"
    description: str
    expected_impact: str
    risk_reduction_level: str  # low | medium | high
    addresses_risk: str   # Which specific risk flag this targets


class ORAOutput(BaseModel):
    alternative_policies: List[PolicyAlternative]
    explanation: str  # LLM-generated narrative summarising why these alternatives were chosen


# ============================================================
# RECOMMENDATION & FINAL RESPONSE
# ============================================================

class Recommendation(BaseModel):
    decision_path: str         # "Path A" | "Path B" | "Path C"
    monitoring_required: bool
    mitigation_required: bool
    escalate_to_ora: bool
    confidence_level: ConfidenceLevel
    decision_rationale: str    # One-sentence plain-English reason for this path


class FinalResponse(BaseModel):
    use_case: str
    scenario: str
    executive_summary: str

    # Which agents were meaningfully activated (drives frontend node animation)
    # Path A → ["PAA", "WIA", "MAA", "COA"]
    # Path B → ["PAA", "WIA", "MAA", "COA"]
    # Path C → ["PAA", "WIA", "MAA", "COA", "ORA"]
    agents_activated: List[str]

    paa_output: PAAOutput
    wia_output: WIAOutput
    maa_output: MAAOutput
    ora_output: Optional[ORAOutput] = None

    recommendation: Recommendation