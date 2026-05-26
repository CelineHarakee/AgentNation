import { Recommendation } from '@/types/agentTypes';
import { motion } from 'framer-motion';

interface Props { data: Recommendation; scenario: string }

const paths = [
  { 
    key: 'Path A', label: 'PATH A', desc: 'No Risk Detected',
    activeClass: 'border-accent-green bg-accent-green/10 text-accent-green',
  },
  { 
    key: 'Path B', label: 'PATH B', desc: 'Risk Detected, Monitor Only',
    activeClass: 'border-accent-amber bg-accent-amber/10 text-accent-amber',
  },
  { 
    key: 'Path C', label: 'PATH C', desc: 'Mitigation Required, ORA Activated',
    activeClass: 'border-accent-red bg-accent-red/10 text-accent-red',
  },
];

export default function COAOutputPanel({ data, scenario }: Props) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.4 }} className="overflow-hidden">
      <div className="pt-3 space-y-4">
        {/* Branch visualization */}
        <div className="space-y-1">
          {paths.map(p => {
            const isActive = data.decision_path.includes(p.key.split(' ')[1]);
            return (
              <motion.div
                key={p.key}
                className={`flex items-center gap-3 px-3 py-2 border-l-2 font-mono text-xs transition-all ${
                  isActive ? p.activeClass : 'border-border-subtle text-text-muted opacity-40'
                }`}
                animate={isActive ? { opacity: 1 } : { opacity: 0.4 }}
              >
                <span className="font-semibold tracking-wider">{p.label}</span>
                <span className="flex-1 border-b border-dashed border-current opacity-30" />
                <span>{p.desc}</span>
                {isActive && <span className="text-lg">◄</span>}
              </motion.div>
            );
          })}
        </div>

        {/* Decision details */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'MONITORING REQUIRED', value: data.monitoring_required },
            { label: 'MITIGATION REQUIRED', value: data.mitigation_required },
            { label: 'ORA ESCALATION', value: data.escalate_to_ora },
            { label: 'CONFIDENCE', value: data.confidence_level, isBool: false },
          ].map((item, i) => (
            <div key={i} className="bg-background border border-border-subtle p-2 font-mono text-xs">
              <span className="text-[10px] tracking-widest text-text-muted block">{item.label}</span>
              {'isBool' in item && item.isBool === false
                ? <span className="text-text-primary">{item.value as string}</span>
                : <span className={item.value ? 'text-accent-green' : 'text-accent-red'}>{item.value ? '✓ YES' : '✗ NO'}</span>
              }
            </div>
          ))}
        </div>

        {/* Scenario */}
        <div>
          <span className="font-mono text-[10px] tracking-widest text-text-muted">SCENARIO</span>
          <p className="text-sm text-text-secondary mt-0.5">{scenario}</p>
        </div>

        {/* Decision rationale */}
        <div className="bg-accent-blue/5 border border-accent-blue/30 p-3">
          <span className="font-mono text-[10px] tracking-widest text-accent-blue">DECISION RATIONALE</span>
          <p className="text-sm text-text-primary mt-1 leading-relaxed">{data.decision_rationale}</p>
        </div>
      </div>
    </motion.div>
  );
}
