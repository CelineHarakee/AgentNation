import { ScenarioResult, ScenarioRanking } from '@/types/uc2Types';
import { motion } from 'framer-motion';
import { Clock, GraduationCap, Wallet } from 'lucide-react';

interface Props {
  scenarioResults: ScenarioResult[];
  rankings: ScenarioRanking[];
  bestId: string;
}

const scenarioBorderColor = (id: string) => {
  if (id === 'A') return 'border-t-scenario-a';
  if (id === 'B') return 'border-t-scenario-b';
  return 'border-t-scenario-c';
};

const scenarioBgTint = (id: string, isBest: boolean) => {
  if (!isBest) return '';
  if (id === 'A') return 'bg-scenario-a/5';
  if (id === 'B') return 'bg-scenario-b/5';
  return 'bg-scenario-c/5';
};

const sevColor = (s: number) => s <= 40 ? 'text-accent-green' : s <= 60 ? 'text-accent-amber' : s <= 75 ? 'text-accent-red' : 'text-accent-critical';
const recColor = (r: string) => r === 'Recommended' ? 'text-accent-green' : r === 'Acceptable' ? 'text-accent-amber' : 'text-text-muted';
const horizonColor = (h: string) => h === 'short' ? 'text-accent-amber' : h === 'medium' ? 'text-accent-blue' : 'text-accent-green';

export default function ScenarioCards({ scenarioResults, rankings, bestId }: Props) {
  const sorted = [...scenarioResults].sort((a, b) => {
    const ra = rankings.find(r => r.scenario_id === a.spec.scenario_id);
    const rb = rankings.find(r => r.scenario_id === b.spec.scenario_id);
    return (ra?.rank ?? 99) - (rb?.rank ?? 99);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {sorted.map((sr, i) => {
        const ranking = rankings.find(r => r.scenario_id === sr.spec.scenario_id)!;
        const isBest = sr.spec.scenario_id === bestId;

        return (
          <motion.div
            key={sr.spec.scenario_id}
            className={`bg-surface border border-border-subtle border-t-2 ${scenarioBorderColor(sr.spec.scenario_id)} ${scenarioBgTint(sr.spec.scenario_id, isBest)} flex flex-col`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15, duration: 0.5, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-xs font-bold ${scenarioTextColor(sr.spec.scenario_id)}`}>[{sr.spec.scenario_id}]</span>
                  <span className="font-mono text-[10px] text-text-muted">RANK {ranking.rank}</span>
                  {isBest && <span className="text-accent-amber text-xs">★</span>}
                </div>
                <span className={`font-mono text-[10px] tracking-wider ${recColor(ranking.recommendation)}`}>
                  {ranking.recommendation.toUpperCase()}
                </span>
              </div>
              <h3 className="font-mono text-sm text-text-primary mt-1 font-semibold leading-tight">{sr.spec.name}</h3>
            </div>

            {/* Scores */}
            <div className="px-4 py-3 border-b border-border-subtle">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="font-mono text-[10px] text-text-muted">SCORE</span>
                  <div className="font-mono text-2xl font-bold text-text-primary">{ranking.overall_score.toFixed(1)}</div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[10px] text-text-muted">SEVERITY</span>
                  <div className={`font-mono text-lg font-bold ${sevColor(sr.maa_output.severity_score)}`}>
                    {sr.maa_output.severity_score.toFixed(1)}
                  </div>
                  <span className={`font-mono text-[10px] ${sevColor(sr.maa_output.severity_score)}`}>
                    {sr.maa_output.risk_classification.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Params */}
            <div className="px-4 py-2.5 border-b border-border-subtle font-mono text-xs space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Clock size={11} className={horizonColor(sr.spec.time_horizon)} />
                <span className={horizonColor(sr.spec.time_horizon)}>{sr.spec.time_horizon.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wallet size={11} className="text-text-muted" />
                <span className="text-text-secondary">{(sr.spec.budget_limit * 100).toFixed(0)}% budget</span>
              </div>
              <div className="flex items-center gap-1.5">
                <GraduationCap size={11} className={sr.spec.training_investment ? 'text-accent-green' : 'text-text-muted'} />
                <span className={sr.spec.training_investment ? 'text-accent-green' : 'text-text-muted'}>
                  {sr.spec.training_investment ? 'YES ✓' : 'NO'}
                </span>
              </div>
            </div>

            {/* Strengths */}
            <div className="px-4 py-2.5 border-b border-border-subtle">
              <span className="font-mono text-[10px] tracking-widest text-text-muted">STRENGTHS</span>
              <ul className="mt-1 space-y-0.5">
                {ranking.strengths.map((s, j) => (
                  <li key={j} className="text-xs text-accent-green flex items-start gap-1.5">
                    <span className="mt-0.5">•</span><span className="text-text-secondary">{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="px-4 py-2.5">
              <span className="font-mono text-[10px] tracking-widest text-text-muted">WEAKNESSES</span>
              <ul className="mt-1 space-y-0.5">
                {ranking.weaknesses.map((w, j) => (
                  <li key={j} className="text-xs text-accent-red flex items-start gap-1.5">
                    <span className="mt-0.5">•</span><span className="text-text-secondary">{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function scenarioTextColor(id: string) {
  if (id === 'A') return 'text-scenario-a';
  if (id === 'B') return 'text-scenario-b';
  return 'text-scenario-c';
}
