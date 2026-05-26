import { AgentState, AgentName, FinalResponse } from '@/types/agentTypes';
import AgentNode from './AgentNode';
import ConnectorLine from './ConnectorLine';

interface PipelineFlowProps {
  agentStates: AgentState;
  response: FinalResponse | null;
  showOutputs: Record<AgentName, boolean>;
}

const agentOrder: AgentName[] = ['paa', 'wia', 'maa', 'coa', 'ora'];

export default function PipelineFlow({ agentStates, response, showOutputs }: PipelineFlowProps) {
  return (
    <div className="space-y-0">
      {agentOrder.map((agent, i) => (
        <div key={agent}>
          <AgentNode
            name={agent}
            status={agentStates[agent]}
            response={response}
            showOutput={showOutputs[agent]}
          />
          {i < agentOrder.length - 1 && (
            <ConnectorLine
              fromStatus={agentStates[agentOrder[i]]}
              toStatus={agentStates[agentOrder[i + 1]]}
            />
          )}
        </div>
      ))}
    </div>
  );
}
