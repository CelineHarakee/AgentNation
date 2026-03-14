import { SimulationStatus } from '@/types/agentTypes';
import { motion } from 'framer-motion';

interface TopBarProps {
  status: SimulationStatus;
  simulationId: string | null;
  elapsedSeconds: number | null;
}

const statusConfig: Record<SimulationStatus, { label: string; dotClass: string; pillClass: string }> = {
  idle: { label: 'IDLE', dotClass: 'bg-text-muted', pillClass: 'border-border-subtle text-text-muted' },
  running: { label: 'RUNNING', dotClass: 'bg-accent-blue animate-pulse', pillClass: 'border-accent-blue text-accent-blue' },
  completed: { label: 'COMPLETED', dotClass: 'bg-accent-green', pillClass: 'border-accent-green text-accent-green' },
  error: { label: 'ERROR', dotClass: 'bg-accent-red', pillClass: 'border-accent-red text-accent-red' },
};

export default function TopBar({ status, simulationId, elapsedSeconds }: TopBarProps) {
  const cfg = statusConfig[status];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-border-subtle">
      <div className="flex items-center justify-between px-6 h-12">
        {/* Left: Logo */}
        <div className="flex items-center gap-2 font-mono font-semibold text-text-primary text-sm tracking-wider">
          <span className="text-accent-blue">◈</span>
          <span>AGENTNATION</span>
        </div>

        {/* Center: Use case label */}
        <div className="hidden md:block font-mono text-[10px] tracking-[0.2em] text-text-muted uppercase">
          Simulation Console — Use Case 1: Workforce Policy Risk Assessment
        </div>

        {/* Right: Status */}
        <div className="flex items-center gap-4 font-mono text-xs">
          {simulationId && (
            <span className="text-text-secondary">SIM-ID: <span className="text-text-primary">{simulationId}</span></span>
          )}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 border rounded-sm ${cfg.pillClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
            {cfg.label}
          </div>
          <span className="text-text-secondary tabular-nums">
            {elapsedSeconds !== null ? `${elapsedSeconds.toFixed(1)}s` : '0.0s'}
          </span>
        </div>
      </div>

      {/* Scan line */}
      {status === 'running' && (
        <div className="relative overflow-hidden h-px">
          <motion.div
            className="absolute inset-0 scanline"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          />
        </div>
      )}
    </header>
  );
}
