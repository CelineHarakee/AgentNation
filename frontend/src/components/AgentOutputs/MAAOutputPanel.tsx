import { MAAOutput } from '@/types/agentTypes';
import { motion } from 'framer-motion';

interface Props { data: MAAOutput }

function getSeverityColor(score: number) {
  if (score <= 25) return { bar: 'bg-accent-green', text: 'text-accent-green', glow: '' };
  if (score <= 50) return { bar: 'bg-accent-amber', text: 'text-accent-amber', glow: '' };
  if (score <= 75) return { bar: 'bg-accent-amber', text: 'text-accent-amber', glow: '' };
  return { bar: 'bg-accent-red', text: 'text-accent-red', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.4)]' };
}

const riskBadgeColor: Record<string, string> = {
  Low: 'border-accent-green text-accent-green',
  Moderate: 'border-accent-amber text-accent-amber',
  High: 'border-accent-red text-accent-red',
  Critical: 'border-accent-critical text-accent-critical bg-accent-red/10',
};

const triggerLabel: Record<string, string> = {
  no_action: 'NO ACTION',
  monitor: 'MONITOR',
  mitigation: 'MITIGATION',
  escalate: 'ESCALATE',
};

export default function MAAOutputPanel({ data }: Props) {
  const sev = getSeverityColor(data.severity_score);

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.4 }} className="overflow-hidden">
      <div className="pt-3 space-y-4">
        {/* Severity score */}
        <div className="bg-background border border-border-subtle p-4">
          <span className="font-mono text-[10px] tracking-widest text-text-muted">SEVERITY SCORE</span>
          <div className={`font-mono text-4xl font-bold mt-1 ${sev.text}`}>
            {data.severity_score.toFixed(1)} <span className="text-lg text-text-muted">/ 100</span>
          </div>
          <div className={`h-3 bg-elevated mt-2 overflow-hidden ${sev.glow}`}>
            <motion.div
              className={`h-full ${sev.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${data.severity_score}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
          <div className="font-mono text-xs text-text-muted mt-1 text-right">
            {data.risk_classification.toUpperCase()}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-3">
          <div>
            <span className="font-mono text-[10px] tracking-widest text-text-muted block mb-1">RISK CLASSIFICATION</span>
            <span className={`font-mono text-sm px-3 py-1 border ${riskBadgeColor[data.risk_classification]}`}>
              {data.risk_classification.toUpperCase()}
            </span>
          </div>
          <div>
            <span className="font-mono text-[10px] tracking-widest text-text-muted block mb-1">CONFIDENCE</span>
            <span className="font-mono text-sm px-3 py-1 border border-border-subtle text-text-secondary">
              {data.confidence_level}
            </span>
          </div>
          <div>
            <span className="font-mono text-[10px] tracking-widest text-text-muted block mb-1">RECOMMENDATION</span>
            <span className="font-mono text-sm px-3 py-1 border border-accent-amber text-accent-amber">
              {triggerLabel[data.recommendation_trigger]}
            </span>
          </div>
        </div>

        <p className="font-mono text-[10px] text-text-muted italic">
          Note: COA makes final routing decision based on numeric threshold (60.0), not this signal.
        </p>

        {/* Key risk indicators */}
        <div>
          <span className="font-mono text-[10px] tracking-widest text-text-muted">KEY RISK INDICATORS</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {data.key_risk_indicators.map((k, i) => (
              <span key={i} className="font-mono text-[10px] px-2 py-0.5 border border-accent-red text-accent-red">{k}</span>
            ))}
          </div>
        </div>

        {/* Analysis note */}
        <div>
          <span className="font-mono text-[10px] tracking-widest text-accent-blue">MAA ANALYSIS NOTE</span>
          <blockquote className="mt-2 border-l-2 border-accent-blue pl-4 italic text-text-secondary text-sm leading-relaxed">
            {data.explanation}
          </blockquote>
        </div>
      </div>
    </motion.div>
  );
}
