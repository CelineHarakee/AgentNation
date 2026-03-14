import { AgentStatus } from '@/types/agentTypes';
import { motion } from 'framer-motion';

interface ConnectorLineProps {
  fromStatus: AgentStatus;
  toStatus: AgentStatus;
}

export default function ConnectorLine({ fromStatus, toStatus }: ConnectorLineProps) {
  const isActive = toStatus === 'running';
  const isComplete = fromStatus === 'completed' && (toStatus === 'completed' || toStatus === 'skipped');

  return (
    <div className="flex justify-center py-0">
      <div className="relative w-px h-8">
        {/* Line */}
        <div
          className={`absolute inset-0 transition-colors duration-500 ${
            isComplete
              ? 'bg-accent-green'
              : isActive
              ? 'bg-accent-blue'
              : 'border-l border-dashed border-border-subtle ml-px'
          }`}
          style={!isComplete && !isActive ? { background: 'none' } : {}}
        />

        {/* Traveling dot */}
        {isActive && (
          <motion.div
            className="absolute w-2 h-2 -left-[3px] rounded-full bg-accent-blue"
            style={{ boxShadow: 'var(--glow-blue)' }}
            animate={{ top: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>
    </div>
  );
}
