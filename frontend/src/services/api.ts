import { FinalResponse, PolicyFormData } from '@/types/agentTypes';

const API_BASE = 'http://localhost:8000';

export async function runSimulation(data: PolicyFormData): Promise<FinalResponse> {
  const body = {
    policy_title: data.policy_title,
    policy_description: data.policy_description,
    sector: data.sector,
    time_horizon: data.time_horizon,
    constraints: {
      budget_limit: data.budget_limit,
      workforce_capacity: data.workforce_capacity,
    },
  };

  const res = await fetch(`${API_BASE}/usecase1/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status}: ${err}`);
  }

  return res.json();
}

// ── Dashboard Stats ────────────────────────────────────────────────────────

export interface RecentSim {
  id: string;
  usecase: string;
  timestamp: string;
  sector: string;
  risk_level: string;
  severity_score: number;
  policy_title?: string;
  policy_goal?: string;
  decision_path?: string;
  agents_activated?: string[];
}

export interface DashboardStats {
  total_simulations: number;
  by_usecase: { UC1: number; UC2: number; UC3: number };
  by_sector: Record<string, number>;
  by_risk_level: { Low: number; Moderate: number; High: number; Critical: number };
  average_severity: number;
  path_distribution: { 'Path A': number; 'Path B': number; 'Path C': number };
  portfolio_analyses: number;
  conflicts_detected: number;
  recent: RecentSim[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // server.py registers this under /api/dashboard/stats
  const res = await fetch(`${API_BASE}/api/dashboard/stats`);
  if (!res.ok) throw new Error(`API Error ${res.status}`);
  return res.json();
}