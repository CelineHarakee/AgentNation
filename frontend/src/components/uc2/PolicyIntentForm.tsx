import { useState } from 'react';
import { PolicyIntent } from '@/types/uc2Types';
import { UC2SimulationStatus } from '@/types/uc2Types';
import { Shield, DollarSign, Clock, Scale } from 'lucide-react';

interface Props {
  onSubmit: (data: PolicyIntent) => void;
  status: UC2SimulationStatus;
  result?: { scenarioId: string; score: number; riskClass: string } | null;
  onReset: () => void;
}

const SECTORS = [
  { value: 'healthcare', label: 'HEALTHCARE' },
  { value: 'education', label: 'EDUCATION' },
  { value: 'information_technology', label: 'IT' },
  { value: 'energy_and_utilities', label: 'ENERGY & UTILITIES' },
  { value: 'construction_and_infrastructure', label: 'CONSTRUCTION' },
  { value: 'finance_and_banking', label: 'FINANCE & BANKING' },
  { value: 'tourism_and_hospitality', label: 'TOURISM' },
  { value: 'manufacturing_and_industry', label: 'MANUFACTURING' },
  { value: 'government_and_public_administration', label: 'GOVERNMENT' },
  { value: 'agriculture_and_water', label: 'AGRICULTURE' }
];

const PRIORITIES = [
  { value: 'minimize_risk' as const, label: 'MIN RISK', icon: Shield },
  { value: 'minimize_cost' as const, label: 'MIN COST', icon: DollarSign },
  { value: 'minimize_time' as const, label: 'MIN TIME', icon: Clock },
  { value: 'balanced' as const, label: 'BALANCED', icon: Scale },
];

const scenarioBadgeColor = (id: string) => {
  if (id === 'A') return 'border-scenario-a text-scenario-a bg-scenario-a/10';
  if (id === 'B') return 'border-scenario-b text-scenario-b bg-scenario-b/10';
  if (id === 'C') return 'border-scenario-c text-scenario-c bg-scenario-c/10';
  return 'border-scenario-hybrid text-scenario-hybrid bg-scenario-hybrid/10';
};

const riskColor = (r: string) => {
  if (r === 'Low') return 'text-accent-green';
  if (r === 'Moderate') return 'text-accent-amber';
  if (r === 'High') return 'text-accent-red';
  return 'text-accent-critical';
};

export default function PolicyIntentForm({ onSubmit, status, result, onReset }: Props) {
  const [form, setForm] = useState<PolicyIntent>({
    policy_goal: '',
    sector: 'healthcare',
    target_growth_pct: 20,
    priority: 'balanced',
  });

  const isLocked = status === 'running' || status === 'completed';

  const handleSubmit = () => {
    if (status !== 'idle') return;
    onSubmit(form);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-t-2 border-accent-blue pt-3 pb-4">
        <h2 className="font-mono text-[11px] tracking-[0.2em] text-text-secondary uppercase">Policy Intent</h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {/* Policy Goal */}
        <div>
          <label className="font-mono text-[10px] tracking-widest text-text-muted uppercase block mb-1">Policy Goal</label>
          <textarea
            className="terminal-input w-full resize-none"
            rows={3}
            value={form.policy_goal}
            onChange={e => setForm(f => ({ ...f, policy_goal: e.target.value }))}
            placeholder="Expand healthcare workforce to meet Vision 2030 targets..."
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

        {/* Target Growth */}
        <div>
          <label className="font-mono text-[10px] tracking-widest text-text-muted uppercase block mb-1">Target Growth</label>
          <div className="flex items-center gap-4 mt-2">
            <input
              type="range"
              min={1} max={100} step={1}
              value={form.target_growth_pct}
              onChange={e => setForm(f => ({ ...f, target_growth_pct: Number(e.target.value) }))}
              className="flex-1 accent-accent-blue"
              disabled={isLocked}
            />
            <span className="font-mono text-2xl font-bold text-accent-blue tabular-nums w-16 text-right">
              {form.target_growth_pct}%
            </span>
          </div>
        </div>

        {/* Optimization Priority */}
        <div>
          <label className="font-mono text-[10px] tracking-widest text-text-muted uppercase block mb-1.5">Optimization Priority</label>
          <div className="grid grid-cols-2 gap-1">
            {PRIORITIES.map(p => {
              const Icon = p.icon;
              const active = form.priority === p.value;
              return (
                <button
                  key={p.value}
                  className={`flex items-center gap-1.5 justify-center font-mono text-[10px] py-2 border transition-colors ${
                    active
                      ? 'bg-accent-blue/20 text-accent-blue border-accent-blue'
                      : 'text-text-muted border-border-subtle hover:text-text-secondary hover:border-border-active'
                  }`}
                  onClick={() => !isLocked && setForm(f => ({ ...f, priority: p.value }))}
                  disabled={isLocked}
                >
                  <Icon size={12} />
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Submit / Status */}
      <div className="pt-4 space-y-3">
        {/* Constraint Summary */}
        <div className="bg-surface border border-border-subtle p-3 font-mono text-[11px] space-y-1">
          <div className="flex justify-between"><span className="text-text-muted">SECTOR</span><span className="text-text-secondary">{form.sector}</span></div>
          <div className="flex justify-between"><span className="text-text-muted">GROWTH TARGET</span><span className="text-accent-blue">{form.target_growth_pct}%</span></div>
          <div className="flex justify-between"><span className="text-text-muted">PRIORITY</span><span className="text-text-secondary">{form.priority.replace('_', ' ')}</span></div>
        </div>

        {status === 'idle' && (
          <button
            onClick={handleSubmit}
            className="w-full bg-accent-blue/90 hover:bg-accent-blue text-primary-foreground font-mono text-sm py-2.5 tracking-wider flex items-center justify-center gap-2 transition-colors"
          >
            GENERATE SCENARIOS <span className="text-lg">›</span>
          </button>
        )}

        {status === 'running' && (
          <div className="w-full bg-accent-blue/20 border border-accent-blue/50 text-accent-blue font-mono text-sm py-2.5 text-center tracking-wider pulse-glow-blue">
            RUNNING...
          </div>
        )}

        {status === 'completed' && result && (
          <div className="space-y-2">
            <div className={`border p-3 flex items-center justify-between font-mono text-sm ${scenarioBadgeColor(result.scenarioId)}`}>
              <span className="flex items-center gap-2">
                <span className="font-bold">★ SCENARIO {result.scenarioId}</span>
                <span className={`text-xs ${riskColor(result.riskClass)}`}>{result.riskClass.toUpperCase()}</span>
              </span>
              <span>{result.score.toFixed(1)} / 100</span>
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
