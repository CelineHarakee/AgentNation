# usecases/usecase3/schemas.py

from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from enum import Enum

from usecases.usecase1.schemas import WIAOutput, MAAOutput, RiskClassification


# ============================================================
# ENUMS
# ============================================================

class InputMode(str, Enum):
    HISTORICAL = "historical"   # Option A — select from simulation history
    DIRECT     = "direct"       # Option B — submit specs directly


class ConflictType(str, Enum):
    WORKFORCE_OVERLAP    = "Workforce Overlap"
    CAPACITY_OVERLOAD    = "Capacity Overload"
    TRAINING_BOTTLENECK  = "Training Bottleneck"
    BUDGET_CONCENTRATION = "Budget Concentration"


class RecommendationType(str, Enum):
    POLICY_SCHEDULING          = "Policy Scheduling"
    WORKFORCE_EXPANSION        = "Workforce Expansion"
    POLICY_ADJUSTMENT          = "Policy Adjustment"
    EXTERNAL_WORKFORCE         = "External Workforce Strategy"
    SECTOR_REBALANCING         = "Sector Rebalancing"
    MONITORING                 = "Enhanced Monitoring"


# ============================================================
# INPUT SCHEMAS
# ============================================================

class DirectPolicySpec(BaseModel):
    """
    A simplified policy spec for UC3 Option B (direct input).
    Enough for WIA to compute workforce metrics without running PAA.
    """
    policy_id:          str
    sector:             str                         # e.g. "healthcare"
    target_growth_pct:  float = Field(..., ge=1, le=100)  # e.g. 20 → 20%
    time_horizon:       str = "medium"              # short | medium | long
    budget_limit:       float = Field(0.15, ge=0.01, le=0.50)
    display_name:       Optional[str] = None        # optional label for frontend


class PolicyReference(BaseModel):
    """
    A reference to a previously executed simulation (UC1 or UC2).
    Used for UC3 Option A (historical input).
    """
    simulation_id:  str     # e.g. "UC1_20260410_182056_01471B"
    scenario_id:    Optional[str] = None  # UC2 only — "A", "B", or "C"


class UC3Input(BaseModel):
    """
    Full user submission for UC3.
    Supports both input modes — the frontend decides which to use.
    3–10 policies recommended for a meaningful portfolio analysis.
    """
    input_mode:             InputMode
    selected_policy_ids:    List[str] = []          # Option A — simulation IDs
    policies:               List[DirectPolicySpec] = []  # Option B — direct specs


# ============================================================
# INTERNAL PROCESSING SCHEMAS
# ============================================================

class ResolvedPolicy(BaseModel):
    """
    Internal representation after input resolution.
    Always has enough data for WIA to run, regardless of input mode.
    """
    policy_id:          str
    display_name:       str
    sector:             str
    workforce_capacity: float       # = target_growth_pct / 100
    budget_limit:       float
    time_horizon:       str
    source:             str         # "historical_uc1" | "historical_uc2" | "direct"
    original_sim_id:    Optional[str] = None  # for historical mode


class PolicyEvaluation(BaseModel):
    """
    Full WIA + MAA evaluation result for one policy in the portfolio.
    Stored in the final response so the frontend can show per-policy details.
    """
    policy_id:      str
    display_name:   str
    sector:         str
    source:         str
    wia_output:     WIAOutput
    maa_output:     MAAOutput


# ============================================================
# PRA OUTPUT SCHEMAS
# ============================================================

class RiskCluster(BaseModel):
    """
    A detected conflict between two or more policies.
    Matches exactly what history_manager.save_uc3_simulation() expects.
    """
    sector:             str
    risk_type:          str             # ConflictType value
    policies_involved:  List[str]       # policy_ids
    severity:           str             # "Low" | "Moderate" | "High" | "Critical"
    description:        str             # human-readable explanation


class SectorPressure(BaseModel):
    sector:     str
    pressure:   float = Field(..., ge=0)   # combined workforce_pressure_index


class PolicyContribution(BaseModel):
    policy_id:          str
    display_name:       str
    risk_contribution:  float   # percentage of total portfolio risk (0–100)


class PRAOutput(BaseModel):
    """Full output from the Portfolio Risk Agent."""
    portfolio_risk_score:   float = Field(..., ge=0, le=100)
    risk_classification:    str                     # Low/Moderate/High/Critical
    risk_clusters:          List[RiskCluster]
    sector_pressure_map:    List[SectorPressure]
    policy_contributions:   List[PolicyContribution]
    conflict_count:         int
    most_stressed_sector:   Optional[str] = None


# ============================================================
# ORA OUTPUT SCHEMAS
# ============================================================

class PortfolioRecommendation(BaseModel):
    """
    One portfolio-level intervention recommendation.
    Matches what history_manager.save_uc3_simulation() reads via r.recommendation_type etc.
    """
    recommendation_type:    str             # RecommendationType value
    target_policies:        List[str]       # which policy_ids this addresses
    title:                  str             # short label
    description:            str
    expected_impact:        str
    priority:               str             # "high" | "medium" | "low"


class UC3ORAOutput(BaseModel):
    recommendations:    List[PortfolioRecommendation]
    explanation:        str     # LLM-generated narrative


# ============================================================
# FINAL RESPONSE
# ============================================================

class UC3FinalResponse(BaseModel):
    use_case:               str = "Workforce Portfolio Risk Monitor"

    # Input metadata
    input_mode:             str
    policy_ids_analyzed:    List[str]
    sectors_covered:        List[str]
    agents_activated:       List[str]

    # Per-policy evaluations
    policy_evaluations:     List[PolicyEvaluation]

    # Portfolio-level analysis (from PRA)
    portfolio_risk_score:   float
    risk_classification:    str
    risk_clusters:          List[RiskCluster]
    sector_pressure_map:    List[SectorPressure]
    policy_contributions:   List[PolicyContribution]

    # Recommendations (from ORA — always present)
    ora_output:             UC3ORAOutput

    # Narratives
    portfolio_briefing:     str     # LLM paragraph about the portfolio situation
    executive_summary:      str     # shorter summary for the final panel

    # Metadata
    simulation_id:          str
    elapsed_seconds:        float