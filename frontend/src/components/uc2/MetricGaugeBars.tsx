import { ScenarioResult, ScenarioRanking } from '@/types/uc2Types';
import { motion } from 'framer-motion';

interface Props {
  scenarioResults: ScenarioResult[];
  rankings: ScenarioRanking[];
}

const barColor = (id: string) => {
  if (id === 'A') return 'bg-scenario-a';
  if (id === 'B') return 'bg-scenario-b';
  return 'bg-scenario-c';
};

const barTrack = 'bg-border-subtle/30';

export default function MetricGaugeBars({ scenarioResults, rankings }: Props) {
  const sorted = [...scenarioResults].sort((a, b) => a.spec.scenario_id.localeCompare(b.spec.scenario_id));
  const bestId = rankings.reduce((a, b) => a.rank < b.rank ? a : b).scenario_id;

  const gauges = [
    {
      label: 'RISK SEVERITY',
      max: 100,
      higherBetter: false,
      items: sorted.map(s => ({
        id: s.spec.scenario_id,
        value: s.maa_output.severity_score,
        display: `${s.maa_output.severity_score.toFixed(1)}  ${s.maa_output.risk_classification.toUpperCase()}`,
      })),
    },
    {
      label: 'BUDGET STRESS',
      max: 100,
      higherBetter: false,
      items: sorted.map(s => ({
        id: s.spec.scenario_id,
        value: Math.min(s.wia_output.budget_stress_ratio * 100, 100),
        display: `${(s.wia_output.budget_stress_ratio * 100).toFixed(1)}%`,
      })),
    },
    {
      label: 'OVERALL SCORE (HIGHER = BETTER)',
      max: 100,
      higherBetter: true,
      items: sorted.map(s => {
        const r = rankings.find(rk => rk.scenario_id === s.spec.scenario_id)!;
        return {
          id: s.spec.scenario_id,
          value: r.overall_score,
          display: `${r.overall_score.toFixed(1)}${s.spec.scenario_id === bestId ? '  ← BEST' : ''}`,
        };
      }),
    },
  ];

  return (
    <div className="bg-surface border border-border-subtle p-5 space-y-6">
      {gauges.map((g, gi) => (
        <div key={gi}>
          <span className="font-mono text-[10px] tracking-[0.2em] text-text-muted">{g.label}</span>
          <div className="mt-2 space-y-2">
            {g.items.map((item, ii) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className={`font-mono text-[10px] w-20 ${scenarioTextColor(item.id)}`}>Scenario {item.id}</span>
                <div className={`flex-1 h-3 ${barTrack} relative overflow-hidden`}>
                  <motion.div
                    className={`absolute left-0 top-0 bottom-0 ${barColor(item.id)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.value / g.max) * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: gi * 0.2 + ii * 0.1 }}
                  />
                </div>
                <span className="font-mono text-[10px] text-text-secondary w-32 text-right">{item.display}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function scenarioTextColor(id: string) {
  if (id === 'A') return 'text-scenario-a';
  if (id === 'B') return 'text-scenario-b';
  return 'text-scenario-c';
}
