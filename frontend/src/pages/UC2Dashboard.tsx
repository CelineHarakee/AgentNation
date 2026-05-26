import { useState, useCallback, useRef } from 'react';
import {
  UC2SimulationStatus, UC2AgentState, UC2AgentName,
  UC2FinalResponse, UC2ORAOutput, PolicyIntent,
} from '@/types/uc2Types';
import { runUC2Simulation, generateHybrid } from '@/services/uc2api';
import PolicyIntentForm from '@/components/uc2/PolicyIntentForm';
import UC2PipelineFlow from '@/components/uc2/UC2PipelineFlow';
import ScenarioResultsSection from '@/components/uc2/ScenarioResultsSection';
import HybridCTA from '@/components/uc2/HybridCTA';
import HybridResultPanel from '@/components/uc2/HybridResultPanel';
import UC2FinalDecisionPanel from '@/components/uc2/UC2FinalDecisionPanel';

const INITIAL_AGENT_STATE: UC2AgentState = { sga: 'idle', paa: 'idle', wia: 'idle', maa: 'idle', caa: 'idle' };
const AGENT_ORDER: UC2AgentName[] = ['sga', 'paa', 'wia', 'maa', 'caa'];
const AGENT_TIMINGS = [2000, 1500, 2500, 2500, 2000]; // ms per agent

export default function UC2Dashboard() {
  const [simStatus, setSimStatus] = useState<UC2SimulationStatus>('idle');
  const [agentStates, setAgentStates] = useState<UC2AgentState>(INITIAL_AGENT_STATE);
  const [response, setResponse] = useState<UC2FinalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOutputs, setShowOutputs] = useState<Record<UC2AgentName, boolean>>({ sga: false, paa: false, wia: false, maa: false, caa: false });
  const [elapsedDisplay, setElapsedDisplay] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showFinalPanel, setShowFinalPanel] = useState(false);

  // Hybrid state
  const [hybridOutput, setHybridOutput] = useState<UC2ORAOutput | null>(null);
  const [hybridStatus, setHybridStatus] = useState<'idle' | 'loading' | 'completed' | 'error'>('idle');

  const responseRef = useRef<UC2FinalResponse | null>(null);

  const setAgentStatus = useCallback((agent: UC2AgentName, status: UC2AgentState[UC2AgentName]) => {
    setAgentStates(prev => ({ ...prev, [agent]: status }));
  }, []);

  // Build agent output data from response
  const getAgentOutputData = useCallback((): Record<UC2AgentName, any> => {
    const r = response;
    if (!r) return { sga: null, paa: null, wia: null, maa: null, caa: null };
    return {
      sga: r.scenario_results.map(s => s.spec),
      paa: r.scenario_results.map(s => s.paa_output),
      wia: r.scenario_results.map(s => s.wia_output),
      maa: r.scenario_results.map(s => s.maa_output),
      caa: r.caa_output,
    };
  }, [response]);

  const runAnimationSequence = useCallback((apiResponse: UC2FinalResponse) => {
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

    // Results reveal
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

  const handleSubmit = useCallback(async (formData: PolicyIntent) => {
    setSimStatus('running');
    setError(null);
    setResponse(null);
    setAgentStates(INITIAL_AGENT_STATE);
    setShowOutputs({ sga: false, paa: false, wia: false, maa: false, caa: false });
    setElapsedDisplay(null);
    setShowResults(false);
    setShowFinalPanel(false);
    setHybridOutput(null);
    setHybridStatus('idle');

    try {
      const res = await runUC2Simulation(formData);
      responseRef.current = res;
      runAnimationSequence(res);
    } catch (err) {
      setSimStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [runAnimationSequence]);

  const handleGenerateHybrid = useCallback(async () => {
    if (!response) return;
    setHybridStatus('loading');

    try {
      const result = await generateHybrid({
        scenario_results: response.scenario_results,
        caa_output: response.caa_output,
        sector: response.sector,
        policy_goal: response.policy_goal,
      });
      setHybridOutput(result);
      setHybridStatus('completed');
    } catch (err) {
      setHybridStatus('error');
      setError(err instanceof Error ? err.message : 'Hybrid generation failed');
    }
  }, [response]);

  const handleReset = useCallback(() => {
    setSimStatus('idle');
    setAgentStates(INITIAL_AGENT_STATE);
    setResponse(null);
    setError(null);
    setShowOutputs({ sga: false, paa: false, wia: false, maa: false, caa: false });
    setElapsedDisplay(null);
    setShowResults(false);
    setShowFinalPanel(false);
    setHybridOutput(null);
    setHybridStatus('idle');
    responseRef.current = null;
  }, []);

  const bestResult = response ? (() => {
    const bestId = response.recommended_scenario_id;
    const sr = response.scenario_results.find(s => s.spec.scenario_id === bestId);
    const rk = response.caa_output.rankings.find(r => r.scenario_id === bestId);
    return sr && rk ? { scenarioId: bestId, score: rk.overall_score, riskClass: sr.maa_output.risk_classification } : null;
  })() : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left panel */}
      <div className="w-[28%] min-w-[300px] border-r border-border-subtle p-5 flex flex-col overflow-hidden">
          <PolicyIntentForm
            onSubmit={handleSubmit}
            status={simStatus}
            result={bestResult}
            onReset={handleReset}
          />
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto p-6 pb-48">
          {/* Use case label */}
          <div className="mb-4 font-mono text-[10px] tracking-[0.2em] text-text-muted">
            USE CASE 2: POLICY SCENARIO COMPARISON
          </div>

          {error && (
            <div className="mb-4 bg-agent-error/20 border border-accent-red p-3 font-mono text-sm text-accent-red">
              ⚠ {error}
            </div>
          )}

          {/* Agent Pipeline */}
          <UC2PipelineFlow
            agentStates={agentStates}
            showOutputs={showOutputs}
            agentOutputData={getAgentOutputData()}
          />

          {/* Scenario Results */}
          {showResults && response && (
            <div className="mt-6 space-y-6">
              <ScenarioResultsSection response={response} />

              {/* Hybrid CTA */}
              {hybridStatus === 'idle' && (
                <HybridCTA onGenerate={handleGenerateHybrid} loading={false} />
              )}
              {hybridStatus === 'loading' && (
                <HybridCTA onGenerate={handleGenerateHybrid} loading={true} />
              )}

              {/* Hybrid Result */}
              {hybridStatus === 'completed' && hybridOutput && (
                <HybridResultPanel oraOutput={hybridOutput} />
              )}
            </div>
          )}

          {/* Final Decision Panel */}
          {showFinalPanel && response && (
            <div className="mt-6">
              <UC2FinalDecisionPanel response={response} />
            </div>
          )}
        </div>
    </div>
  );
}
