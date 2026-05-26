export interface Constraints {
  budget_limit: number;
  workforce_capacity: number;
}

export interface PAAOutput {
  policy_objectives: string[];
  affected_domains: string[];
  sector: string;
  constraints: Constraints;
  assumptions: string[];
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

export interface PolicyAlternative {
  title: string;
  description: string;
  expected_impact: string;
  risk_reduction_level: string;
  addresses_risk: string;
}

export interface ORAOutput {
  alternative_policies: PolicyAlternative[];
  explanation: string;
}

export interface Recommendation {
  decision_path: string;
  monitoring_required: boolean;
  mitigation_required: boolean;
  escalate_to_ora: boolean;
  confidence_level: 'High' | 'Medium' | 'Low';
  decision_rationale: string;
}

export interface FinalResponse {
  use_case: string;
  scenario: string;
  executive_summary: string;
  agents_activated: string[];
  paa_output: PAAOutput;
  wia_output: WIAOutput;
  maa_output: MAAOutput;
  ora_output: ORAOutput | null;
  recommendation: Recommendation;
  simulation_id: string;
  elapsed_seconds: number;
}

export type SimulationStatus = 'idle' | 'running' | 'completed' | 'error';
export type AgentStatus = 'idle' | 'running' | 'completed' | 'skipped' | 'error';

export interface AgentState {
  paa: AgentStatus;
  wia: AgentStatus;
  maa: AgentStatus;
  coa: AgentStatus;
  ora: AgentStatus;
}

export type AgentName = 'paa' | 'wia' | 'maa' | 'coa' | 'ora';

export interface PolicyFormData {
  policy_title: string;
  policy_description: string;
  sector: string;
  time_horizon: string;
  budget_limit: number;
  workforce_capacity: number;
}
