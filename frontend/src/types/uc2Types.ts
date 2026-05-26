export interface PolicyIntent {
  sector: string;
  policy_goal: string;
  target_growth_pct: number;
  priority: 'minimize_risk' | 'minimize_cost' | 'minimize_time' | 'balanced';
}

export interface ScenarioSpec {
  scenario_id: string;
  name: string;
  rationale: string;
  time_horizon: string;
  budget_limit: number;
  workforce_capacity: number;
  training_investment: boolean;
  key_tradeoff: string;
}

export interface ScenarioPAAOutput {
  scenario_id: string;
  policy_objectives: string[];
  affected_domains: string[];
  complexity_level: string;
  explanation: string;
}

export interface WIAOutput {
  workforce_pressure_index: number;
  budget_stress_ratio: number;
  training_capacity_ratio: number;
  saudization_risk: boolean;
  risk_flags: string[];
  explanation: string;
}

export interface MAAOutput {
  severity_score: number;
  risk_classification: 'Low' | 'Moderate' | 'High' | 'Critical';
  confidence_level: 'High' | 'Medium' | 'Low';
  key_risk_indicators: string[];
  recommendation_trigger: 'no_action' | 'monitor' | 'mitigation' | 'escalate';
  explanation: string;
}

export interface ScenarioResult {
  spec: ScenarioSpec;
  paa_output: ScenarioPAAOutput;
  wia_output: WIAOutput;
  maa_output: MAAOutput;
}

export interface ScenarioRanking {
  scenario_id: string;
  rank: number;
  overall_score: number;
  recommendation: string;
  strengths: string[];
  weaknesses: string[];
}

export interface CAAOutput {
  rankings: ScenarioRanking[];
  best_scenario_id: string;
  comparison_narrative: string;
  conditions_statement: string;
  hybrid_recommended: boolean;
  explanation: string;
}

export interface HybridScenario {
  name: string;
  description: string;
  derived_from: string[];
  time_horizon: string;
  budget_limit: number;
  workforce_capacity: number;
  training_investment: boolean;
  expected_risk_level: string;
  expected_severity_estimate: number;
  key_advantages: string[];
  implementation_steps: string[];
}

export interface UC2ORAOutput {
  hybrid_scenario: HybridScenario;
  explanation: string;
}

export interface UC2FinalResponse {
  use_case: string;
  sector: string;
  policy_goal: string;
  priority: string;
  scenario_results: ScenarioResult[];
  caa_output: CAAOutput;
  ora_output: UC2ORAOutput | null;
  recommended_scenario_id: string;
  executive_summary: string;
  agents_activated: string[];
  simulation_id: string;
  elapsed_seconds: number;
}

export interface HybridRequest {
  scenario_results: ScenarioResult[];
  caa_output: CAAOutput;
  sector: string;
  policy_goal: string;
}

export type UC2SimulationStatus = 'idle' | 'running' | 'completed' | 'error';
export type UC2AgentStatus = 'idle' | 'running' | 'completed' | 'skipped' | 'error';
export type UC2AgentName = 'sga' | 'paa' | 'wia' | 'maa' | 'caa';

export interface UC2AgentState {
  sga: UC2AgentStatus;
  paa: UC2AgentStatus;
  wia: UC2AgentStatus;
  maa: UC2AgentStatus;
  caa: UC2AgentStatus;
}

export const SCENARIO_COLORS: Record<string, string> = {
  A: 'scenario-a',
  B: 'scenario-b',
  C: 'scenario-c',
  HYBRID: 'scenario-hybrid',
};
