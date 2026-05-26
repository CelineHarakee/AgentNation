export type InputMode = 'historical' | 'direct';

export interface DirectPolicySpec {
  policy_id: string;
  sector: string;
  target_growth_pct: number;
  time_horizon: 'short' | 'medium' | 'long';
  budget_limit: number;
  display_name?: string;
}

export interface UC3Input {
  input_mode: InputMode;
  selected_policy_ids: string[];
  policies: DirectPolicySpec[];
}

export interface SelectablePolicy {
  id: string;
  usecase: 'UC1' | 'UC2';
  display_name: string;
  sector: string;
  time_horizon: string | null;
  severity_score: number | null;
  risk_level: string | null;
  risk_flags: string[];
  workforce_pressure_index: number | null;
  budget_stress_ratio: number | null;
  training_capacity_ratio: number | null;
  saudization_risk: boolean | null;
  timestamp: string;
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
  recommendation_trigger: string;
  explanation: string;
}

export interface PolicyEvaluation {
  policy_id: string;
  display_name: string;
  sector: string;
  source: string;
  wia_output: WIAOutput;
  maa_output: MAAOutput;
}

export interface RiskCluster {
  sector: string;
  risk_type: string;
  policies_involved: string[];
  severity: 'Low' | 'Moderate' | 'High' | 'Critical';
  description: string;
}

export interface SectorPressure {
  sector: string;
  pressure: number;
}

export interface PolicyContribution {
  policy_id: string;
  display_name: string;
  risk_contribution: number;
}

export interface PortfolioRecommendation {
  recommendation_type: string;
  target_policies: string[];
  title: string;
  description: string;
  expected_impact: string;
  priority: 'high' | 'medium' | 'low';
}

export interface UC3ORAOutput {
  recommendations: PortfolioRecommendation[];
  explanation: string;
}

export interface UC3FinalResponse {
  use_case: string;
  input_mode: string;
  policy_ids_analyzed: string[];
  sectors_covered: string[];
  agents_activated: string[];
  policy_evaluations: PolicyEvaluation[];
  portfolio_risk_score: number;
  risk_classification: string;
  risk_clusters: RiskCluster[];
  sector_pressure_map: SectorPressure[];
  policy_contributions: PolicyContribution[];
  ora_output: UC3ORAOutput;
  portfolio_briefing: string;
  executive_summary: string;
  simulation_id: string;
  elapsed_seconds: number;
}

export type UC3SimulationStatus = 'idle' | 'running' | 'completed' | 'error';
export type UC3AgentStatus = 'idle' | 'running' | 'completed' | 'error';
export type UC3AgentName = 'resolver' | 'wia' | 'maa' | 'pra' | 'ora';

export interface UC3AgentState {
  resolver: UC3AgentStatus;
  wia: UC3AgentStatus;
  maa: UC3AgentStatus;
  pra: UC3AgentStatus;
  ora: UC3AgentStatus;
}

export const SECTORS = [
  'healthcare',
  'education',
  'information_technology',
  'energy_and_utilities',
  'construction_and_infrastructure',
  'finance_and_banking',
  'tourism_and_hospitality',
  'manufacturing_and_industry',
  'government_and_public_administration',
  'agriculture_and_water'
];
