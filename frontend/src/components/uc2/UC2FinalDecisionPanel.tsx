import { UC2FinalResponse } from '@/types/uc2Types';
import { motion } from 'framer-motion';

interface Props {
  response: UC2FinalResponse;
}

const scenarioBorderColor = (id: string) => {
  if (id === 'A') return 'border-t-scenario-a';
  if (id === 'B') return 'border-t-scenario-b';
  if (id === 'C') return 'border-t-scenario-c';
  return 'border-t-scenario-hybrid';
};

const scenarioBadge = (id: string) => {
  if (id === 'A') return 'border-scenario-a text-scenario-a';
  if (id === 'B') return 'border-scenario-b text-scenario-b';
  if (id === 'C') return 'border-scenario-c text-scenario-c';
  return 'border-scenario-hybrid text-scenario-hybrid';
};

export default function UC2FinalDecisionPanel({ response }: Props) {
  const bestId = response.recommended_scenario_id;
  const bestResult = response.scenario_results.find(s => s.spec.scenario_id === bestId);
  const bestRanking = response.caa_output.rankings.find(r => r.scenario_id === bestId);

  const sevColor = bestResult && bestResult.maa_output.severity_score <= 40 ? 'text-accent-green'
    : bestResult && bestResult.maa_output.severity_score <= 60 ? 'text-accent-amber'
    : 'text-accent-red';

  return (
    <motion.div
      className={`bg-surface border border-border-subtle border-t-2 ${scenarioBorderColor(bestId)}`}
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
        <span className="font-mono text-xs tracking-[0.2em] text-text-primary font-semibold">SCENARIO COMPARISON COMPLETE</span>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className={`px-2 py-0.5 border ${scenarioBadge(bestId)}`}>{bestId} RECOMMENDED</span>
          <span className="text-text-primary">{bestRanking?.overall_score.toFixed(1)}</span>
          {bestResult && (
            <span className={sevColor}>{bestResult.maa_output.risk_classification.toUpperCase()}</span>
          )}
        </div>
      </div>

      {/* Executive summary */}
      <div className="px-5 py-3 border-b border-border-subtle">
        <span className="font-mono text-[10px] tracking-widest text-text-muted">EXECUTIVE SUMMARY</span>
        <p className="text-sm text-text-secondary mt-1 leading-relaxed">{response.executive_summary}</p>
      </div>

      {/* Best scenario detail */}
      {bestResult && (
        <div className="px-5 py-3 border-b border-border-subtle">
          <span className="font-mono text-[10px] tracking-widest text-text-muted">
            BEST SCENARIO: {bestId} — {bestResult.spec.name}
          </span>
          <p className="text-sm text-text-secondary mt-1"><span className="text-text-muted">Rationale:</span> {bestResult.spec.rationale}</p>
          <p className="text-sm text-text-secondary mt-0.5"><span className="text-text-muted">Key tradeoff:</span> {bestResult.spec.key_tradeoff}</p>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 flex flex-wrap items-center gap-4 font-mono text-[10px] text-text-muted">
        <span>COMPLETED IN {response.elapsed_seconds.toFixed(1)}s</span>
        <span>SIM-{response.simulation_id.slice(0, 8).toUpperCase()}</span>
        <span>PRIORITY: {response.priority.toUpperCase()}</span>
      </div>
    </motion.div>
  );
}
