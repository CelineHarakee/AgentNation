import { PolicyIntent, UC2FinalResponse, HybridRequest, UC2ORAOutput } from '@/types/uc2Types';

const API_BASE = 'http://localhost:8000';

export async function runUC2Simulation(data: PolicyIntent): Promise<UC2FinalResponse> {
  const res = await fetch(`${API_BASE}/usecase2/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status}: ${err}`);
  }

  return res.json();
}

export async function generateHybrid(data: HybridRequest): Promise<UC2ORAOutput> {
  const res = await fetch(`${API_BASE}/usecase2/hybrid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status}: ${err}`);
  }

  return res.json();
}
