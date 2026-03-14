import { ORAOutput } from '@/types/agentTypes';
import { motion } from 'framer-motion';

interface Props { data: ORAOutput }

const reductionColor: Record<string, string> = {
  high: 'border-accent-green text-accent-green',
  medium: 'border-accent-amber text-accent-amber',
  low: 'border-border-subtle text-text-muted',
};

export default function ORAOutputPanel({ data }: Props) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.4 }} className="overflow-hidden">
      <div className="pt-3 space-y-4">
        {/* Summary */}
        <div>
          <span className="font-mono text-[10px] tracking-widest text-accent-blue">ORA ANALYSIS NOTE</span>
          <blockquote className="mt-2 border-l-2 border-accent-blue pl-4 italic text-text-secondary text-sm leading-relaxed">
            {data.explanation}
          </blockquote>
        </div>

        {/* Alternatives */}
        <div className="space-y-3">
          {data.alternative_policies.map((alt, i) => {
            const rc = reductionColor[alt.risk_reduction_level] || reductionColor.low;
            const borderColor = alt.risk_reduction_level === 'high' ? 'border-l-accent-green' : alt.risk_reduction_level === 'medium' ? 'border-l-accent-amber' : 'border-l-border-subtle';
            return (
              <motion.div
                key={i}
                className={`bg-background border border-border-subtle border-l-2 ${borderColor} p-3`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs text-text-muted">[{i + 1}]</span>
                    <span className="font-mono font-bold text-sm text-text-primary ml-2">{alt.title}</span>
                  </div>
                  <span className={`font-mono text-[10px] px-2 py-0.5 border ${rc} shrink-0`}>
                    {alt.risk_reduction_level.toUpperCase()} ▲
                  </span>
                </div>
                <div className="mt-1">
                  <span className="font-mono text-[10px] px-2 py-0.5 border border-accent-amber text-accent-amber">
                    {alt.addresses_risk}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-text-secondary"><span className="text-text-muted font-mono text-[10px]">WHAT: </span>{alt.description}</p>
                  <p className="text-text-secondary"><span className="text-text-muted font-mono text-[10px]">IMPACT: </span>{alt.expected_impact}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
