import { PAAOutput } from '@/types/agentTypes';
import { motion } from 'framer-motion';

interface Props { data: PAAOutput }

const complexityColor: Record<string, string> = {
  low: 'text-accent-green border-accent-green',
  medium: 'text-accent-amber border-accent-amber',
  high: 'text-accent-red border-accent-red',
};

export default function PAAOutputPanel({ data }: Props) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.4 }} className="overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
        {/* Left column */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] tracking-widest text-text-muted">COMPLEXITY</span>
            <span className={`font-mono text-xs px-2 py-0.5 border ${complexityColor[data.complexity_level] || 'text-text-secondary border-border-subtle'}`}>
              {data.complexity_level.toUpperCase()}
            </span>
          </div>
          <div>
            <span className="font-mono text-[10px] tracking-widest text-text-muted">SECTOR</span>
            <p className="text-sm text-text-primary mt-0.5">{data.sector}</p>
          </div>
          <div>
            <span className="font-mono text-[10px] tracking-widest text-text-muted">OBJECTIVES</span>
            {data.policy_objectives.length > 0 ? (
              <ul className="mt-1 space-y-1">
                {data.policy_objectives.map((o, i) => (
                  <li key={i} className="text-sm text-text-secondary flex gap-2"><span className="text-accent-blue">•</span>{o}</li>
                ))}
              </ul>
            ) : <p className="text-sm text-text-muted italic mt-1">Extraction pending — see briefing note</p>}
          </div>
          <div>
            <span className="font-mono text-[10px] tracking-widest text-text-muted">AFFECTED DOMAINS</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {data.affected_domains.length > 0
                ? data.affected_domains.map((d, i) => (
                    <span key={i} className="font-mono text-[10px] px-2 py-0.5 bg-elevated border border-border-subtle text-text-secondary">{d}</span>
                  ))
                : <span className="text-sm text-text-muted italic">Extraction pending</span>}
            </div>
          </div>
          <div>
            <span className="font-mono text-[10px] tracking-widest text-text-muted">ASSUMPTIONS</span>
            {data.assumptions.length > 0 ? (
              <ol className="mt-1 space-y-1 list-decimal list-inside">
                {data.assumptions.map((a, i) => (
                  <li key={i} className="text-sm text-text-muted">{a}</li>
                ))}
              </ol>
            ) : <p className="text-sm text-text-muted italic mt-1">Extraction pending — see briefing note</p>}
          </div>
        </div>

        {/* Right column: Briefing note */}
        <div>
          <span className="font-mono text-[10px] tracking-widest text-accent-blue">PAA BRIEFING NOTE</span>
          <blockquote className="mt-2 border-l-2 border-accent-blue pl-4 italic text-text-secondary text-sm leading-relaxed">
            {data.explanation}
          </blockquote>
        </div>
      </div>
    </motion.div>
  );
}
