import { ScenarioResult, ScenarioRanking } from '@/types/uc2Types';

interface Props {
  scenarioResults: ScenarioResult[];
  rankings: ScenarioRanking[];
  bestId: string;
}

const colHeaderBg = (id: string) => {
  if (id === 'A') return 'bg-scenario-a/10 text-scenario-a';
  if (id === 'B') return 'bg-scenario-b/10 text-scenario-b';
  return 'bg-scenario-c/10 text-scenario-c';
};

export default function MetricsComparisonTable({ scenarioResults, rankings, bestId }: Props) {
  const scenarios = scenarioResults.sort((a, b) => a.spec.scenario_id.localeCompare(b.spec.scenario_id));

  const metrics = [
    {
      label: 'Overall Score',
      values: scenarios.map(s => {
        const r = rankings.find(rk => rk.scenario_id === s.spec.scenario_id)!;
        return { val: r.overall_score, display: `${r.overall_score.toFixed(1)}${s.spec.scenario_id === bestId ? ' ★' : ''}` };
      }),
      higherBetter: true,
    },
    {
      label: 'Risk Severity',
      values: scenarios.map(s => ({
        val: s.maa_output.severity_score,
        display: `${s.maa_output.severity_score.toFixed(1)} ${s.maa_output.risk_classification.toUpperCase()}`,
      })),
      higherBetter: false,
    },
    {
      label: 'Workforce Pressure',
      values: scenarios.map(s => ({
        val: s.wia_output.workforce_pressure_index,
        display: `${(s.wia_output.workforce_pressure_index * 100).toFixed(1)}%`,
      })),
      higherBetter: false,
    },
    {
      label: 'Budget Stress',
      values: scenarios.map(s => ({
        val: s.wia_output.budget_stress_ratio,
        display: `${s.wia_output.budget_stress_ratio > 1 ? '⚠ ' : ''}${(s.wia_output.budget_stress_ratio * 100).toFixed(1)}%`,
      })),
      higherBetter: false,
    },
    {
      label: 'Training Gap',
      values: scenarios.map(s => ({
        val: s.wia_output.training_capacity_ratio,
        display: `${s.wia_output.training_capacity_ratio.toFixed(1)}x`,
      })),
      higherBetter: false,
    },
    {
      label: 'Saudization Risk',
      values: scenarios.map(s => ({
        val: s.wia_output.saudization_risk ? 1 : 0,
        display: s.wia_output.saudization_risk ? 'YES ⚠' : 'NO',
      })),
      higherBetter: false,
    },
    {
      label: 'Time Horizon',
      values: scenarios.map(s => ({
        val: 0,
        display: s.spec.time_horizon.toUpperCase(),
      })),
      higherBetter: false,
      noTint: true,
    },
    {
      label: 'Budget Limit',
      values: scenarios.map(s => ({
        val: s.spec.budget_limit,
        display: `${(s.spec.budget_limit * 100).toFixed(0)}%`,
      })),
      higherBetter: false,
      noTint: true,
    },
    {
      label: 'Training Investment',
      values: scenarios.map(s => ({
        val: s.spec.training_investment ? 1 : 0,
        display: s.spec.training_investment ? 'YES ✓' : 'NO',
      })),
      higherBetter: true,
      noTint: true,
    },
    {
      label: 'Recommendation',
      values: scenarios.map(s => {
        const r = rankings.find(rk => rk.scenario_id === s.spec.scenario_id)!;
        return { val: 0, display: r.recommendation.toUpperCase() };
      }),
      higherBetter: true,
      noTint: true,
    },
  ];

  return (
    <div className="bg-surface border border-border-subtle overflow-x-auto">
      <table className="w-full font-mono text-xs">
        <thead>
          <tr className="border-b border-border-subtle">
            <th className="text-left px-4 py-2.5 text-text-muted tracking-wider text-[10px]">METRIC</th>
            {scenarios.map(s => (
              <th key={s.spec.scenario_id} className={`px-4 py-2.5 text-center tracking-wider text-[10px] font-semibold ${colHeaderBg(s.spec.scenario_id)}`}>
                SCENARIO {s.spec.scenario_id}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, i) => {
            const vals = m.values.map(v => v.val);
            const best = m.higherBetter ? Math.max(...vals) : Math.min(...vals);
            const worst = m.higherBetter ? Math.min(...vals) : Math.max(...vals);

            return (
              <tr key={i} className="border-b border-border-subtle/50 last:border-b-0">
                <td className="px-4 py-2 text-text-muted">{m.label}</td>
                {m.values.map((v, j) => {
                  let cellTint = '';
                  if (!m.noTint && vals.filter(x => x !== 0).length > 0) {
                    if (v.val === best && vals.filter(x => x === best).length < vals.length) cellTint = 'bg-accent-green/5';
                    else if (v.val === worst && vals.filter(x => x === worst).length < vals.length) cellTint = 'bg-accent-red/5';
                  }
                  const isStress = m.label === 'Budget Stress' && v.val > 1;
                  const isSaudi = m.label === 'Saudization Risk' && v.val === 1;
                  const textColor = isStress ? 'text-accent-red' : isSaudi ? 'text-accent-amber' : 'text-text-secondary';
                  const isBestCol = scenarios[j].spec.scenario_id === bestId;

                  return (
                    <td key={j} className={`px-4 py-2 text-center ${cellTint} ${textColor} ${isBestCol ? 'bg-scenario-a/5' : ''}`}>
                      {v.display}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
