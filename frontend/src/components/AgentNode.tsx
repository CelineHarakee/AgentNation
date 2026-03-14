import { useState } from 'react';
import { AgentStatus, AgentName, FinalResponse } from '@/types/agentTypes';
import { motion, AnimatePresence } from 'framer-motion';
import PAAOutputPanel from './AgentOutputs/PAAOutputPanel';
import WIAOutputPanel from './AgentOutputs/WIAOutputPanel';
import MAAOutputPanel from './AgentOutputs/MAAOutputPanel';
import COAOutputPanel from './AgentOutputs/COAOutputPanel';
import ORAOutputPanel from './AgentOutputs/ORAOutputPanel';

interface AgentNodeProps {
  name: AgentName;
  status: AgentStatus;
  response: FinalResponse | null;
  showOutput: boolean;
}

const agentMeta: Record<AgentName, { displayName: string; role: string; description: string; runningMsg: string; skipMsg: string }> = {
  paa: {
    displayName: 'PAA',
    role: 'Policy Analysis Agent',
    description: 'Extracts policy objectives, affected domains, and implementation assumptions.',
    runningMsg: 'Analyzing policy structure and objectives...',
    skipMsg: '',
  },
  wia: {
    displayName: 'WIA',
    role: 'Workforce Intelligence Agent',
    description: 'Evaluates workforce capacity, budget constraints, and training pipeline.',
    runningMsg: 'Evaluating workforce capacity and budget constraints...',
    skipMsg: '',
  },
  maa: {
    displayName: 'MAA',
    role: 'Monitoring & Assessment Agent',
    description: 'Computes risk severity score and classifies threat level.',
    runningMsg: 'Computing risk severity score...',
    skipMsg: 'WIA metrics below all risk thresholds — escalation not warranted',
  },
  coa: {
    displayName: 'COA',
    role: 'Coordination & Oversight Agent',
    description: 'Routes decision path based on severity thresholds.',
    runningMsg: 'Determining decision path...',
    skipMsg: '',
  },
  ora: {
    displayName: 'ORA',
    role: 'Option Recommendation Agent',
    description: 'Generates alternative policy designs for risk mitigation.',
    runningMsg: 'Generating policy alternatives...',
    skipMsg: 'Risk severity below 60.0 threshold — human authority preserved, no automated alternatives generated',
  },
};

const statusDot: Record<AgentStatus, string> = {
  idle: 'bg-agent-idle',
  running: 'bg-accent-blue animate-pulse',
  completed: 'bg-accent-green',
  skipped: 'bg-agent-skipped',
  error: 'bg-accent-red',
};

const statusBadge: Record<AgentStatus, { text: string; cls: string }> = {
  idle: { text: 'IDLE', cls: 'text-text-muted border-border-subtle' },
  running: { text: 'PROCESSING', cls: 'text-accent-blue border-accent-blue' },
  completed: { text: 'COMPLETED', cls: 'text-accent-green border-accent-green' },
  skipped: { text: 'SKIPPED', cls: 'text-text-muted border-border-subtle' },
  error: { text: 'ERROR', cls: 'text-accent-red border-accent-red' },
};

export default function AgentNode({ name, status, response, showOutput }: AgentNodeProps) {
  const [showRaw, setShowRaw] = useState(false);
  const meta = agentMeta[name];
  const badge = statusBadge[status];

  const borderClass = status === 'running'
    ? 'border-accent-blue/60 pulse-border-blue'
    : status === 'completed'
    ? 'border-agent-complete'
    : status === 'error'
    ? 'border-agent-error'
    : status === 'skipped'
    ? 'border-border-subtle/40'
    : 'border-border-subtle';

  const bgClass = status === 'skipped' ? 'bg-background/50' : status === 'running' ? 'bg-elevated/80' : 'bg-surface';
  const accentBar = status === 'running' ? 'bg-accent-blue animate-pulse' : status === 'completed' ? 'bg-accent-green' : status === 'error' ? 'bg-accent-red' : 'bg-transparent';

  const getOutputData = () => {
    if (!response || !showOutput) return null;
    switch (name) {
      case 'paa': return <PAAOutputPanel data={response.paa_output} />;
      case 'wia': return <WIAOutputPanel data={response.wia_output} />;
      case 'maa': return <MAAOutputPanel data={response.maa_output} />;
      case 'coa': return <COAOutputPanel data={response.recommendation} scenario={response.scenario} />;
      case 'ora': return response.ora_output ? <ORAOutputPanel data={response.ora_output} /> : null;
    }
  };

  const getRawJson = () => {
    if (!response) return null;
    switch (name) {
      case 'paa': return response.paa_output;
      case 'wia': return response.wia_output;
      case 'maa': return response.maa_output;
      case 'coa': return response.recommendation;
      case 'ora': return response.ora_output;
    }
  };

  return (
    <div className={`border ${borderClass} ${bgClass} transition-all duration-500 relative overflow-hidden`}>
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${accentBar} transition-colors duration-500`} />

      <div className="p-4 pl-5">
        {/* Header */}
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

        {/* Running message */}
        {status === 'running' && (
          <div className="mt-3 ml-4 font-mono text-xs text-accent-blue cursor-blink">
            {meta.runningMsg}
          </div>
        )}

        {/* Skipped message */}
        {status === 'skipped' && meta.skipMsg && (
          <div className="mt-3 ml-4 font-mono text-xs text-text-muted italic">
            {meta.skipMsg}
          </div>
        )}

        {/* Output */}
        <AnimatePresence>
          {status === 'completed' && showOutput && (
            <div className="ml-4 mt-2">
              {getOutputData()}

              {/* Raw JSON toggle */}
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="font-mono text-[10px] text-text-muted hover:text-text-secondary mt-3 tracking-wider"
              >
                {showRaw ? '▾ HIDE RAW JSON' : '▸ RAW JSON'}
              </button>
              {showRaw && (
                <pre className="mt-1 bg-background border border-border-subtle p-3 text-[10px] text-text-muted overflow-x-auto max-h-60 overflow-y-auto font-mono">
                  {JSON.stringify(getRawJson(), null, 2)}
                </pre>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
