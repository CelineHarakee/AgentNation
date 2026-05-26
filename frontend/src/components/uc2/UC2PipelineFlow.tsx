import { UC2AgentState, UC2AgentName, UC2AgentStatus } from '@/types/uc2Types';
import ConnectorLine from '@/components/ConnectorLine';
import UC2AgentNode from './UC2AgentNode';

interface Props {
  agentStates: UC2AgentState;
  showOutputs: Record<UC2AgentName, boolean>;
  agentOutputData: Record<UC2AgentName, any>;
}

const AGENT_ORDER: UC2AgentName[] = ['sga', 'paa', 'wia', 'maa', 'caa'];

export default function UC2PipelineFlow({ agentStates, showOutputs, agentOutputData }: Props) {
  return (
    <div className="space-y-0">
      {AGENT_ORDER.map((agent, i) => (
        <div key={agent}>
          <UC2AgentNode
            name={agent}
            status={agentStates[agent]}
            showOutput={showOutputs[agent]}
            outputData={agentOutputData[agent]}
          />
          {i < AGENT_ORDER.length - 1 && (
            <ConnectorLine
              fromStatus={agentStates[AGENT_ORDER[i]]}
              toStatus={agentStates[AGENT_ORDER[i + 1]]}
            />
          )}
        </div>
      ))}
    </div>
  );
}
