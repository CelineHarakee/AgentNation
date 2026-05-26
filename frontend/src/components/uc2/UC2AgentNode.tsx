import { useState } from 'react';
import { UC2AgentName, UC2AgentStatus } from '@/types/uc2Types';
import { AnimatePresence } from 'framer-motion';

interface Props {
  name: UC2AgentName;
  status: UC2AgentStatus;
  showOutput: boolean;
  outputData: any;
}

const agentMeta: Record<UC2AgentName, { displayName: string; role: string; description: string; runningMsg: string }> = {
  sga: {
    displayName: 'SGA',
    role: 'Scenario Generation Agent',
    description: 'Generates three distinct implementation strategies from policy intent.',
    runningMsg: 'Generating implementation scenarios...',
  },
  paa: {
    displayName: 'PAA',
    role: 'Policy Analysis Agent',
    description: 'Structures scenario parameters and policy objectives.',
    runningMsg: 'Structuring scenario parameters...',
  },
  wia: {
    displayName: 'WIA',
    role: 'Workforce Intelligence Agent',
    description: 'Evaluates workforce capacity, budget constraints, and training pipeline.',
    runningMsg: 'Evaluating workforce impact across all scenarios...',
  },
  maa: {
    displayName: 'MAA',
    role: 'Monitoring & Assessment Agent',
    description: 'Computes risk severity score and classifies threat level.',
    runningMsg: 'Computing risk severity for each scenario...',
  },
  caa: {
    displayName: 'CAA',
    role: 'Comparative Assessment Agent',
    description: 'Ranks scenarios and produces final recommendation.',
    runningMsg: 'Comparing and ranking scenarios...',
  },
};

const statusDot: Record<UC2AgentStatus, string> = {
  idle: 'bg-agent-idle',
  running: 'bg-accent-blue animate-pulse',
  completed: 'bg-accent-green',
  skipped: 'bg-agent-skipped',
  error: 'bg-accent-red',
};

const statusBadge: Record<UC2AgentStatus, { text: string; cls: string }> = {
  idle: { text: 'IDLE', cls: 'text-text-muted border-border-subtle' },
  running: { text: 'PROCESSING', cls: 'text-accent-blue border-accent-blue' },
  completed: { text: 'COMPLETED', cls: 'text-accent-green border-accent-green' },
  skipped: { text: 'SKIPPED', cls: 'text-text-muted border-border-subtle' },
  error: { text: 'ERROR', cls: 'text-accent-red border-accent-red' },
};

export default function UC2AgentNode({ name, status, showOutput, outputData }: Props) {
  const [showRaw, setShowRaw] = useState(false);
  const meta = agentMeta[name];
  const badge = statusBadge[status];

  const borderClass = status === 'running'
    ? 'border-accent-blue/60 pulse-border-blue'
    : status === 'completed' ? 'border-agent-complete'
    : status === 'error' ? 'border-agent-error'
    : 'border-border-subtle';

  const bgClass = status === 'running' ? 'bg-elevated/80' : 'bg-surface';
  const accentBar = status === 'running' ? 'bg-accent-blue animate-pulse' : status === 'completed' ? 'bg-accent-green' : status === 'error' ? 'bg-accent-red' : 'bg-transparent';

  const showMultiLabel = (name === 'wia' || name === 'maa') && status === 'running';

  return (
    <div className={`border ${borderClass} ${bgClass} transition-all duration-500 relative overflow-hidden`}>
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${accentBar} transition-colors duration-500`} />
      <div className="p-4 pl-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusDot[status]}`} />
            <span className="font-mono font-bold text-sm tracking-[0.15em] text-text-primary">{meta.displayName}</span>
            <span className="text-text-muted text-xs hidden sm:inline">—</span>
            <span className="text-text-secondary text-xs hidden sm:inline">{meta.role}</span>
          </div>
          <span className={`font-mono text-[10px] tracking-wider px-2 py-0.5 border ${badge.cls}`}>
            {status === 'running' && <span className="inline-block w-2 h-2 border border-accent-blue border-t-transparent rounded-full animate-spin mr-1.5 align-middle" />}
            {badge.text}
          </span>
        </div>

        <p className="text-text-muted text-xs mt-1 ml-4">{meta.description}</p>

        {status === 'running' && (
          <div className="mt-3 ml-4">
            <div className="font-mono text-xs text-accent-blue cursor-blink">{meta.runningMsg}</div>
            {showMultiLabel && (
              <div className="font-mono text-[10px] text-text-muted mt-1">Running × 3 scenarios</div>
            )}
          </div>
        )}

        <AnimatePresence>
          {status === 'completed' && showOutput && outputData && (
            <div className="ml-4 mt-2">
              {renderOutput(name, outputData)}
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="font-mono text-[10px] text-text-muted hover:text-text-secondary mt-3 tracking-wider"
              >
                {showRaw ? '▾ HIDE RAW JSON' : '▸ RAW JSON'}
              </button>
              {showRaw && (
                <pre className="mt-1 bg-background border border-border-subtle p-3 text-[10px] text-text-muted overflow-x-auto max-h-60 overflow-y-auto font-mono">
                  {JSON.stringify(outputData, null, 2)}
                </pre>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function renderOutput(name: UC2AgentName, data: any) {
  switch (name) {
    case 'sga':
      return (
        <div className="flex flex-wrap gap-2">
          {(data as any[]).map((s: any) => (
            <span key={s.scenario_id} className={`font-mono text-[10px] px-2 py-1 border ${scenarioChipColor(s.scenario_id)}`}>
              [{s.scenario_id}] {s.name} — {s.time_horizon} — {(s.budget_limit * 100).toFixed(0)}% budget
            </span>
          ))}
        </div>
      );
    case 'paa':
      return (
        <div className="flex flex-wrap gap-2">
          {(data as any[]).map((p: any) => (
            <span key={p.scenario_id} className="font-mono text-[10px] px-2 py-1 border border-border-subtle text-text-secondary">
              [{p.scenario_id}] {p.complexity_level.toUpperCase()} complexity
            </span>
          ))}
        </div>
      );
    case 'wia':
      return (
        <div className="font-mono text-[10px] text-text-secondary space-y-0.5">
          {(data as any[]).map((w: any, i: number) => (
            <div key={i}>
              Scenario {String.fromCharCode(65 + i)}: WPI {(w.workforce_pressure_index * 100).toFixed(1)}% | Budget {(w.budget_stress_ratio * 100).toFixed(1)}% | Training {w.training_capacity_ratio.toFixed(1)}x
            </div>
          ))}
        </div>
      );
    case 'maa':
      return (
        <div className="flex flex-wrap gap-2">
          {(data as any[]).map((m: any, i: number) => {
            const sId = String.fromCharCode(65 + i);
            const color = m.severity_score <= 40 ? 'text-accent-green' : m.severity_score <= 60 ? 'text-accent-amber' : 'text-accent-red';
            return (
              <span key={i} className={`font-mono text-[10px] px-2 py-1 border border-border-subtle ${color}`}>
                [{sId}] {m.severity_score.toFixed(1)} — {m.risk_classification}
              </span>
            );
          })}
        </div>
      );
    case 'caa':
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {(data.rankings as any[])
              .sort((a: any, b: any) => a.rank - b.rank)
              .map((r: any) => (
                <span key={r.scenario_id} className={`font-mono text-[10px] px-2 py-1 border ${scenarioChipColor(r.scenario_id)}`}>
                  #{r.rank} Scenario {r.scenario_id} ({r.overall_score.toFixed(1)})
                </span>
              ))}
          </div>
          <blockquote className="border-l-2 border-accent-blue/40 pl-3 text-xs text-text-secondary italic leading-relaxed">
            {data.comparison_narrative}
          </blockquote>
        </div>
      );
    default:
      return null;
  }
}

function scenarioChipColor(id: string) {
  if (id === 'A') return 'border-scenario-a text-scenario-a';
  if (id === 'B') return 'border-scenario-b text-scenario-b';
  if (id === 'C') return 'border-scenario-c text-scenario-c';
  return 'border-scenario-hybrid text-scenario-hybrid';
}
