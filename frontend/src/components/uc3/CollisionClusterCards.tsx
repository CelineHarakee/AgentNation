// components/uc3/CollisionClusterCards.tsx
// Replaces RiskClusterCards.tsx — makes CONFLICTS the hero with inline policy comparison
import { motion } from 'framer-motion';
import { RiskCluster, PolicyEvaluation } from '@/types/uc3Types';

interface Props {
  clusters: RiskCluster[];
  evaluations: PolicyEvaluation[];
}

const CONFLICT_CONFIG: Record<string, {
  icon: string;
  accentCls: string;
  borderCls: string;
  bgCls: string;
  label: string;
  explain: string;
}> = {
  'Workforce Overlap': {
    icon: '⟁',
    accentCls: 'text-conflict-overlap',
    borderCls: 'border-conflict-overlap',
    bgCls: 'bg-conflict-overlap/5',
    label: 'WORKFORCE OVERLAP',
    explain: 'These policies compete for the same worker pool simultaneously.',
  },
  'Capacity Overload': {
    icon: '⚡',
    accentCls: 'text-conflict-overload',
    borderCls: 'border-conflict-overload',
    bgCls: 'bg-conflict-overload/5',
    label: 'CAPACITY OVERLOAD',
    explain: 'Combined sector demand exceeds available workforce capacity.',
  },
  'Training Bottleneck': {
    icon: '⧖',
    accentCls: 'text-conflict-bottleneck',
    borderCls: 'border-conflict-bottleneck',
    bgCls: 'bg-conflict-bottleneck/5',
    label: 'TRAINING BOTTLENECK',
    explain: 'Both policies draw from the same constrained training pipeline.',
  },
  'Budget Concentration': {
    icon: '◈',
    accentCls: 'text-conflict-budget',
    borderCls: 'border-conflict-budget',
    bgCls: 'bg-conflict-budget/5',
    label: 'BUDGET CONCENTRATION',
    explain: 'One policy is consuming a dominant share of portfolio budget.',
  },
};

const SEVERITY_CLS: Record<string, string> = {
  Low:      'text-risk-low border-risk-low',
  Moderate: 'text-risk-moderate border-risk-moderate',
  High:     'text-risk-high border-risk-high',
  Critical: 'text-risk-critical border-risk-critical',
};

function MetricBar({ label, value, max = 100, warn }: { label: string; value: number; max?: number; warn?: boolean }) {
  const pct = Math.min(100, (value / max) * 100);
  const barCls = warn ? 'bg-accent-red' : pct > 60 ? 'bg-accent-amber' : 'bg-accent-blue';
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between font-mono text-[9px]">
        <span className="text-text-muted">{label}</span>
        <span className={warn ? 'text-accent-red' : 'text-text-secondary'}>{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-background border border-border-subtle overflow-hidden">
        <div className={`h-full ${barCls} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PolicyCompareCard({ evaluation, color }: { evaluation: PolicyEvaluation; color: string }) {
  const w = evaluation.wia_output;
  const m = evaluation.maa_output;
  return (
    <div className="border border-border-subtle bg-background p-3 space-y-2.5 flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-2 h-2 flex-shrink-0" style={{ background: color }} />
        <span className="font-mono text-[10px] text-text-primary truncate font-semibold">
          {evaluation.display_name}
        </span>
      </div>
      <div className="font-mono text-[9px] text-text-muted mb-2">{evaluation.sector}</div>
      <MetricBar label="WORKFORCE PRESS." value={w.workforce_pressure_index * 100} warn={w.workforce_pressure_index > 0.7} />
      <MetricBar label="BUDGET STRESS" value={w.budget_stress_ratio * 100} warn={w.budget_stress_ratio > 1.0} />
      <MetricBar label="TRAINING GAP" value={Math.min(w.training_capacity_ratio * 10, 100)} warn={w.training_capacity_ratio > 5} />
      <div className="flex items-center justify-between pt-1 border-t border-border-subtle font-mono text-[9px]">
        <span className="text-text-muted">SEVERITY</span>
        <span className={`px-1.5 py-0.5 border ${SEVERITY_CLS[m.risk_classification] || 'text-text-muted border-border-subtle'}`}>
          {m.severity_score.toFixed(1)} {m.risk_classification.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

const CARD_COLORS = [
  'hsl(var(--accent-red))',
  'hsl(var(--accent-blue))',
  'hsl(var(--scenario-b))',
  'hsl(var(--accent-amber))',
  'hsl(var(--accent-green))',
];

export default function CollisionClusterCards({ clusters, evaluations }: Props) {
  const evalMap = Object.fromEntries(evaluations.map(e => [e.policy_id, e]));
  const policyColorMap: Record<string, string> = {};
  evaluations.forEach((e, i) => { policyColorMap[e.policy_id] = CARD_COLORS[i % CARD_COLORS.length]; });

  if (clusters.length === 0) {
    return (
      <div className="border border-risk-low bg-risk-low/5 p-5 font-mono text-sm text-risk-low flex items-center gap-3">
        <span className="text-xl">✅</span>
        <span>No cross-policy conflicts detected. Portfolio is operating within safe parameters.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="font-mono text-[10px] text-text-muted tracking-[0.2em]">
        COLLISION ANALYSIS — {clusters.length} CONFLICT{clusters.length === 1 ? '' : 'S'} DETECTED
      </div>

      {clusters.map((cluster, i) => {
        const cfg = CONFLICT_CONFIG[cluster.risk_type] ?? {
          icon: '⬡', accentCls: 'text-text-secondary', borderCls: 'border-border-active',
          bgCls: '', label: cluster.risk_type.toUpperCase(), explain: '',
        };
        const involvedEvals = cluster.policies_involved
          .map(id => evalMap[id])
          .filter(Boolean);

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.35 }}
            className={`border border-border-subtle border-l-4 ${cfg.borderCls} ${cfg.bgCls}`}
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className={`text-2xl ${cfg.accentCls} leading-none`}>{cfg.icon}</span>
                <div>
                  <div className={`font-mono font-bold text-xs tracking-[0.15em] ${cfg.accentCls}`}>
                    {cfg.label}
                  </div>
                  <div className="font-mono text-[9px] text-text-muted mt-0.5">
                    {cfg.explain}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono text-[9px] text-text-muted">Sector: {cluster.sector}</span>
                <span className={`font-mono text-[10px] tracking-wider px-2 py-0.5 border ${SEVERITY_CLS[cluster.severity] || ''}`}>
                  {cluster.severity.toUpperCase()} ▲
                </span>
              </div>
            </div>

            {/* Colliding policies — side by side comparison */}
            {involvedEvals.length > 0 && (
              <div className="px-4 pb-3">
                <div className="font-mono text-[9px] text-text-muted mb-2 tracking-wider">
                  COLLIDING POLICIES — HEAD TO HEAD
                </div>
                <div className="flex gap-2 flex-wrap md:flex-nowrap">
                  {involvedEvals.map((e, j) => (
                    <div key={e.policy_id} className="contents">
                      <PolicyCompareCard evaluation={e} color={policyColorMap[e.policy_id]} />
                      {j < involvedEvals.length - 1 && (
                        <div className="flex items-center justify-center flex-shrink-0 w-8">
                          <div className="font-mono text-lg text-text-muted">⟺</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="px-4 pb-4 border-t border-border-subtle pt-3">
              <p className="text-text-secondary text-xs leading-relaxed">{cluster.description}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
