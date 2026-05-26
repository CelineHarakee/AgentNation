import { useState, useCallback, useRef } from 'react';
import { AgentState, AgentName, FinalResponse, SimulationStatus, PolicyFormData } from '@/types/agentTypes';
import { runSimulation } from '@/services/api';
import PolicyForm from '@/components/PolicyForm';
import PipelineFlow from '@/components/PipelineFlow';
import FinalDecisionPanel from '@/components/FinalDecisionPanel';

const INITIAL_AGENT_STATE: AgentState = { paa: 'idle', wia: 'idle', maa: 'idle', coa: 'idle', ora: 'idle' };
const AGENT_ORDER: AgentName[] = ['paa', 'wia', 'maa', 'coa', 'ora'];
const AGENT_TIMINGS = [1800, 2000, 1500, 1200, 1000]; // ms per agent animation

export default function PolicySimulation() {  // ← Changed from Index to PolicySimulation
  const [simStatus, setSimStatus] = useState<SimulationStatus>('idle');
  const [agentStates, setAgentStates] = useState<AgentState>(INITIAL_AGENT_STATE);
  const [response, setResponse] = useState<FinalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOutputs, setShowOutputs] = useState<Record<AgentName, boolean>>({
    paa: false, wia: false, maa: false, coa: false, ora: false
  });
  const [elapsedDisplay, setElapsedDisplay] = useState<number | null>(null);
  const responseRef = useRef<FinalResponse | null>(null);

  const setAgentStatus = useCallback((agent: AgentName, status: AgentState[AgentName]) => {
    setAgentStates(prev => ({ ...prev, [agent]: status }));
  }, []);

  const runAnimationSequence = useCallback((apiResponse: FinalResponse) => {
    const activatedSet = new Set(apiResponse.agents_activated.map(a => a.toLowerCase()));
    let cumulative = 0;

    AGENT_ORDER.forEach((agent, i) => {
      const delay = cumulative;
      const duration = AGENT_TIMINGS[i];

      setTimeout(() => {
        setAgentStatus(agent, 'running');
      }, delay);

      setTimeout(() => {
        if (activatedSet.has(agent)) {
          setAgentStatus(agent, 'completed');
          setShowOutputs(prev => ({ ...prev, [agent]: true }));
        } else {
          setAgentStatus(agent, 'skipped');
        }
      }, delay + duration);

      cumulative += duration;
    });

    setTimeout(() => {
      setSimStatus('completed');
      setElapsedDisplay(apiResponse.elapsed_seconds);
      setResponse(apiResponse);
    }, cumulative + 300);
  }, [setAgentStatus]);

  const handleSubmit = useCallback(async (formData: PolicyFormData) => {
    setSimStatus('running');
    setError(null);
    setResponse(null);
    setAgentStates(INITIAL_AGENT_STATE);
    setShowOutputs({ paa: false, wia: false, maa: false, coa: false, ora: false });
    setElapsedDisplay(null);

    try {
      const res = await runSimulation(formData);
      responseRef.current = res;
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
    setShowOutputs({ paa: false, wia: false, maa: false, coa: false, ora: false });
    setElapsedDisplay(null);
    responseRef.current = null;
  }, []);

  const resultBadge = response ? {
    decisionPath: response.recommendation.decision_path,
    severityScore: response.maa_output.severity_score,
  } : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">  {/* ← Removed grid-bg, adjusted height for layout */}
      {/* Left panel */}
      <div className="w-[28%] min-w-[300px] border-r border-border-subtle p-5 flex flex-col overflow-hidden">
        <PolicyForm
          onSubmit={handleSubmit}
          status={simStatus}
          result={resultBadge}
          onReset={handleReset}
        />
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto p-6 pb-48">
        <div className="mb-4 font-mono text-[10px] tracking-[0.2em] text-text-muted">
          USE CASE 1: POLICY IMPACT SIMULATIONS
        </div>

        {error && (
          <div className="mb-4 bg-agent-error/20 border border-accent-red p-3 font-mono text-sm text-accent-red">
            ⚠ {error}
          </div>
        )}

        <PipelineFlow
          agentStates={agentStates}
          response={response}
          showOutputs={showOutputs}
        />

        {simStatus === 'completed' && response && (
          <div className="mt-6">
            <FinalDecisionPanel response={response} />
          </div>
        )}
      </div>
    </div>
  );
}
