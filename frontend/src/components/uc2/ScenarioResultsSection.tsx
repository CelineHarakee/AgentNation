import { UC2FinalResponse } from '@/types/uc2Types';
import ScenarioCards from './ScenarioCards';
import MetricsComparisonTable from './MetricsComparisonTable';
import MetricGaugeBars from './MetricGaugeBars';
import CAAAnalysisPanel from './CAAAnalysisPanel';
import { motion } from 'framer-motion';

interface Props {
  response: UC2FinalResponse;
}

export default function ScenarioResultsSection({ response }: Props) {
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Section header */}
      <div className="border-b border-border-subtle pb-3">
        <h2 className="font-mono text-sm tracking-[0.2em] text-text-primary font-semibold">SCENARIO COMPARISON RESULTS</h2>
        <div className="font-mono text-[10px] text-text-muted mt-1 flex flex-wrap gap-3">
          <span>Sector: <span className="text-text-secondary">{response.sector}</span></span>
          <span>Target Growth: <span className="text-text-secondary">{response.policy_goal}</span></span>
          <span>Priority: <span className="text-text-secondary">{response.priority}</span></span>
          <span>{response.scenario_results.length} scenarios evaluated</span>
          <span>SIM-{response.simulation_id.slice(0, 8).toUpperCase()}</span>
          <span>{response.elapsed_seconds.toFixed(1)}s</span>
        </div>
      </div>

      <ScenarioCards scenarioResults={response.scenario_results} rankings={response.caa_output.rankings} bestId={response.caa_output.best_scenario_id} />
      <MetricsComparisonTable scenarioResults={response.scenario_results} rankings={response.caa_output.rankings} bestId={response.caa_output.best_scenario_id} />
      <MetricGaugeBars scenarioResults={response.scenario_results} rankings={response.caa_output.rankings} />
      <CAAAnalysisPanel caaOutput={response.caa_output} />
    </motion.div>
  );
}
