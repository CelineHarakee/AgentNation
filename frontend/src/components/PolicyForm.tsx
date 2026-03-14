import { useState } from 'react';
import { PolicyFormData, SimulationStatus } from '@/types/agentTypes';

interface PolicyFormProps {
  onSubmit: (data: PolicyFormData) => void;
  status: SimulationStatus;
  result?: {
    decisionPath: string;
    severityScore: number;
  } | null;
  onReset: () => void;
}

const SECTORS = [
  { value: 'healthcare', label: 'HEALTHCARE' },
  { value: 'education', label: 'EDUCATION' },
  { value: 'energy_and_utilities', label: 'ENERGY & UTILITIES' },
  { value: 'construction_and_infrastructure', label: 'CONSTRUCTION & INFRASTRUCTURE' },
  { value: 'finance_and_banking', label: 'FINANCE & BANKING' },
  { value: 'information_technology', label: 'IT & DIGITAL SERVICES' },
  { value: 'tourism_and_hospitality', label: 'TOURISM & HOSPITALITY' }
];
const TIME_HORIZONS = ['short', 'medium', 'long'];

export default function PolicyForm({ onSubmit, status, result, onReset }: PolicyFormProps) {
  const [form, setForm] = useState<PolicyFormData>({
    policy_title: '',
    policy_description: '',
    sector: 'healthcare',
    time_horizon: 'medium',
    budget_limit: 0.25,
    workforce_capacity: 0.08,
  });

  const isLocked = status === 'running' || status === 'completed';

  const handleSubmit = () => {
    if (status !== 'idle') return;
    onSubmit(form);
  };

  const pathColor = (p: string) => {
    if (p.includes('A')) return 'border-accent-green text-accent-green';
    if (p.includes('B')) return 'border-accent-amber text-accent-amber';
    return 'border-accent-red text-accent-red';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-t-2 border-accent-blue pt-3 pb-4">
        <h2 className="font-mono text-[11px] tracking-[0.2em] text-text-secondary uppercase">Policy Input</h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {/* Title */}
        <div>
          <label className="font-mono text-[10px] tracking-widest text-text-muted uppercase block mb-1">Policy Title</label>
          <input
            className="terminal-input w-full"
            value={form.policy_title}
            onChange={e => setForm(f => ({ ...f, policy_title: e.target.value }))}
            placeholder="Enter policy title..."
            disabled={isLocked}
          />
        </div>

        {/* Description */}
        <div>
          <label className="font-mono text-[10px] tracking-widest text-text-muted uppercase block mb-1">Policy Description</label>
          <textarea
            className="terminal-input w-full resize-none"
            rows={4}
            value={form.policy_description}
            onChange={e => setForm(f => ({ ...f, policy_description: e.target.value }))}
            placeholder="Describe the policy..."
            disabled={isLocked}
          />
        </div>

        {/* Sector */}
        <div>
          <label className="font-mono text-[10px] tracking-widest text-text-muted uppercase block mb-1">Sector</label>
          <select
            className="terminal-input w-full"
            value={form.sector}
            onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
            disabled={isLocked}
          >
            {SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Time Horizon */}
        <div>
          <label className="font-mono text-[10px] tracking-widest text-text-muted uppercase block mb-1">Time Horizon</label>
          <div className="flex border border-border-subtle">
            {TIME_HORIZONS.map(t => (
              <button
                key={t}
                className={`flex-1 font-mono text-xs py-1.5 transition-colors ${
                  form.time_horizon === t
                    ? 'bg-accent-blue/20 text-accent-blue border-accent-blue'
                    : 'text-text-muted hover:text-text-secondary'
                } ${t !== 'short' ? 'border-l border-border-subtle' : ''}`}
                onClick={() => !isLocked && setForm(f => ({ ...f, time_horizon: t }))}
                disabled={isLocked}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Budget Limit Slider */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="font-mono text-[10px] tracking-widest text-text-muted uppercase">Budget Limit</label>
            <span className="font-mono text-xs text-accent-blue">{(form.budget_limit * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0} max={100} step={1}
            value={form.budget_limit * 100}
            onChange={e => setForm(f => ({ ...f, budget_limit: Number(e.target.value) / 100 }))}
            className="w-full accent-accent-blue"
            disabled={isLocked}
          />
        </div>

        {/* Workforce Capacity Slider */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="font-mono text-[10px] tracking-widest text-text-muted uppercase">Workforce Capacity Limit</label>
            <span className="font-mono text-xs text-accent-blue">{(form.workforce_capacity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0} max={100} step={1}
            value={form.workforce_capacity * 100}
            onChange={e => setForm(f => ({ ...f, workforce_capacity: Number(e.target.value) / 100 }))}
            className="w-full accent-accent-blue"
            disabled={isLocked}
          />
        </div>
      </div>

      {/* Submit / Status */}
      <div className="pt-4 space-y-3">
        {status === 'idle' && (
          <button
            onClick={handleSubmit}
            className="w-full bg-accent-blue/90 hover:bg-accent-blue text-primary-foreground font-mono text-sm py-2.5 tracking-wider flex items-center justify-center gap-2 transition-colors"
          >
            INITIATE SIMULATION <span className="text-lg">›</span>
          </button>
        )}

        {status === 'running' && (
          <div className="w-full bg-accent-blue/20 border border-accent-blue/50 text-accent-blue font-mono text-sm py-2.5 text-center tracking-wider pulse-glow-blue">
            RUNNING...
          </div>
        )}

        {/* Constraint Summary */}
        <div className="bg-surface border border-border-subtle p-3 font-mono text-[11px] space-y-1">
          <div className="flex justify-between"><span className="text-text-muted">BUDGET LIMIT</span><span className="text-text-secondary">{(form.budget_limit * 100).toFixed(0)}%</span></div>
          <div className="flex justify-between"><span className="text-text-muted">WORKFORCE CAP</span><span className="text-text-secondary">{(form.workforce_capacity * 100).toFixed(0)}%</span></div>
          <div className="flex justify-between"><span className="text-text-muted">SECTOR</span><span className="text-text-secondary">{SECTORS.find(s => s.value === form.sector)?.label || form.sector.toUpperCase()}</span></div>
          <div className="flex justify-between"><span className="text-text-muted">TIME HORIZON</span><span className="text-text-secondary">{form.time_horizon}</span></div>
        </div>

        {/* Result badge */}
        {status === 'completed' && result && (
          <div className="space-y-2">
            <div className={`border p-3 flex items-center justify-between font-mono text-sm ${pathColor(result.decisionPath)}`}>
              <span>{result.decisionPath}</span>
              <span>{result.severityScore.toFixed(1)} / 100</span>
            </div>
            <button
              onClick={onReset}
              className="w-full border border-border-subtle text-text-secondary font-mono text-xs py-2 hover:border-border-active hover:text-text-primary transition-colors"
            >
              RESET SIMULATION
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
