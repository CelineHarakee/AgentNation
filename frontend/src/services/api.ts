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
