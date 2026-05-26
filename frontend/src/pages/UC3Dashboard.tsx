import { useCallback, useState } from 'react';
import {
  UC3SimulationStatus, UC3AgentState, UC3AgentName, UC3FinalResponse, UC3Input,
} from '@/types/uc3Types';
import { runUC3Simulation } from '@/services/uc3api';
import PortfolioInputPanel from '@/components/uc3/PortfolioInputPanel';
import UC3PipelineFlow from '@/components/uc3/UC3PipelineFlow';
import PortfolioResultsSection from '@/components/uc3/PortfolioResultsSection';
import UC3FinalDecisionPanel from '@/components/uc3/UC3FinalDecisionPanel';

const INITIAL_AGENT_STATE: UC3AgentState = {
  resolver: 'idle', wia: 'idle', maa: 'idle', pra: 'idle', ora: 'idle',
};
const AGENT_ORDER: UC3AgentName[] = ['resolver', 'wia', 'maa', 'pra', 'ora'];
const AGENT_TIMINGS = [1200, 2500, 2000, 2000, 1500];

export default function UC3Dashboard() {
  const [simStatus, setSimStatus] = useState<UC3SimulationStatus>('idle');
  const [agentStates, setAgentStates] = useState<UC3AgentState>(INITIAL_AGENT_STATE);
  const [response, setResponse] = useState<UC3FinalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOutputs, setShowOutputs] = useState<Record<UC3AgentName, boolean>>({
    resolver: false, wia: false, maa: false, pra: false, ora: false,
  });
  const [elapsedDisplay, setElapsedDisplay] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showFinalPanel, setShowFinalPanel] = useState(false);
  const [policyCount, setPolicyCount] = useState(0);

  const setAgentStatus = useCallback((agent: UC3AgentName, status: UC3AgentState[UC3AgentName]) => {
    setAgentStates(prev => ({ ...prev, [agent]: status }));
  }, []);

  const getAgentOutputData = useCallback((): Record<UC3AgentName, any> => {
    const r = response;
    if (!r) return { resolver: null, wia: null, maa: null, pra: null, ora: null };
    return {
      resolver: r.policy_evaluations,
      wia: r.policy_evaluations,
      maa: r.policy_evaluations,
      pra: r.risk_clusters,
      ora: r.ora_output.recommendations,
    };
  }, [response]);

  const runAnimationSequence = useCallback((apiResponse: UC3FinalResponse) => {
    let cumulative = 0;
    AGENT_ORDER.forEach((agent, i) => {
      const delay = cumulative;
      const duration = AGENT_TIMINGS[i];
      setTimeout(() => setAgentStatus(agent, 'running'), delay);
      setTimeout(() => {
        setAgentStatus(agent, 'completed');
        setShowOutputs(prev => ({ ...prev, [agent]: true }));
      }, delay + duration);
      cumulative += duration;
    });

    setTimeout(() => {
      setResponse(apiResponse);
      setElapsedDisplay(apiResponse.elapsed_seconds);
      setShowResults(true);
    }, cumulative + 500);

    setTimeout(() => {
      setSimStatus('completed');
      setShowFinalPanel(true);
    }, cumulative + 1000);
  }, [setAgentStatus]);

  const handleSubmit = useCallback(async (input: UC3Input) => {
    const count = input.input_mode === 'historical' ? input.selected_policy_ids.length : input.policies.length;
    setPolicyCount(count);
    setSimStatus('running');
    setError(null);
    setResponse(null);
    setAgentStates(INITIAL_AGENT_STATE);
    setShowOutputs({ resolver: false, wia: false, maa: false, pra: false, ora: false });
    setElapsedDisplay(null);
    setShowResults(false);
    setShowFinalPanel(false);

    try {
      const res = await runUC3Simulation(input);
      runAnimationSequence(res);
    } catch (err) {
      setSimStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [runAnimationSequence]);

  const handleReset = useCallback(() => {
    setSimStatus('idle');
    setAgentStates(INITIAL_AGENT_STATE);
    setResponse(null);
    setError(null);
    setShowOutputs({ resolver: false, wia: false, maa: false, pra: false, ora: false });
    setElapsedDisplay(null);
    setShowResults(false);
    setShowFinalPanel(false);
    setPolicyCount(0);
  }, []);

  const result = response ? {
    score: response.portfolio_risk_score,
    classification: response.risk_classification,
    conflicts: response.risk_clusters.length,
  } : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="w-[28%] min-w-[320px] border-r border-border-subtle p-5 flex flex-col overflow-hidden">
          <PortfolioInputPanel
            status={simStatus}
            onSubmit={handleSubmit}
            onReset={handleReset}
            result={result}
          />
        </div>

        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-6 pb-48">
          <div className="mb-4 font-mono text-[10px] tracking-[0.2em] text-text-muted">
            USE CASE 3: WORKFORCE PORTFOLIO RISK MONITOR
          </div>

          {error && (
            <div className="mb-4 bg-agent-error/20 border border-accent-red p-3 font-mono text-sm text-accent-red">
              ⚠ {error}
            </div>
          )}

          <UC3PipelineFlow
            agentStates={agentStates}
            showOutputs={showOutputs}
            agentOutputData={getAgentOutputData()}
            policyCount={policyCount}
          />

          {showResults && response && (
            <div className="mt-6">
              <PortfolioResultsSection response={response} />
            </div>
          )}

          {showFinalPanel && response && (
            <div className="mt-6">
              <UC3FinalDecisionPanel response={response} />
            </div>
          )}
        </div>
    </div>
  );
}
