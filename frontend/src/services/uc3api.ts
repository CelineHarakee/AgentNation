import { UC3Input, UC3FinalResponse, SelectablePolicy } from '@/types/uc3Types';

const API_BASE = 'http://localhost:8000';

export async function runUC3Simulation(data: UC3Input): Promise<UC3FinalResponse> {
  const res = await fetch(`${API_BASE}/usecase3/run`, {
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

export async function fetchSelectablePolicies(): Promise<SelectablePolicy[]> {
  const res = await fetch(`${API_BASE}/api/history/selectable`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status}: ${err}`);
  }
  return res.json();
}
