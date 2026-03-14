import { FinalResponse } from '@/types/agentTypes';
import { motion } from 'framer-motion';

interface Props {
  response: FinalResponse;
}

export default function FinalDecisionPanel({ response }: Props) {
  const rec = response.recommendation;
  const pathLetter = rec.decision_path;
  const isA = pathLetter.includes('A');
  const isB = pathLetter.includes('B');

  const topBorder = isA ? 'border-t-accent-green' : isB ? 'border-t-accent-amber' : 'border-t-accent-red';
  const pathBadgeColor = isA ? 'text-accent-green border-accent-green' : isB ? 'text-accent-amber border-accent-amber' : 'text-accent-red border-accent-red';

  const sevColor = response.maa_output.severity_score <= 25 ? 'text-accent-green'
    : response.maa_output.severity_score <= 50 ? 'text-accent-amber'
    : response.maa_output.severity_score <= 75 ? 'text-accent-amber'
    : 'text-accent-red';

  return (
    <motion.div
      className={`bg-surface border border-border-subtle border-t-2 ${topBorder}`}
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
        <span className="font-mono text-xs tracking-[0.2em] text-text-primary font-semibold">FINAL ASSESSMENT</span>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className={`px-2 py-0.5 border ${pathBadgeColor}`}>{rec.decision_path}</span>
          <span className={sevColor}>{response.maa_output.severity_score.toFixed(1)}/100</span>
          <span className={`px-2 py-0.5 border ${
            response.maa_output.risk_classification === 'Critical' ? 'border-accent-critical text-accent-critical' :
            response.maa_output.risk_classification === 'High' ? 'border-accent-red text-accent-red' :
            response.maa_output.risk_classification === 'Moderate' ? 'border-accent-amber text-accent-amber' :
            'border-accent-green text-accent-green'
          }`}>{response.maa_output.risk_classification.toUpperCase()}</span>
        </div>
      </div>

      {/* Executive summary */}
      <div className="px-5 py-3 border-b border-border-subtle">
        <span className="font-mono text-[10px] tracking-widest text-text-muted">EXECUTIVE SUMMARY</span>
        <p className="text-sm text-text-secondary mt-1 leading-relaxed">{response.executive_summary}</p>
      </div>

      {/* Flags row */}
      <div className="px-5 py-3 border-b border-border-subtle flex flex-wrap items-center gap-4 font-mono text-xs">
        {[
          { label: 'MONITORING', value: rec.monitoring_required },
          { label: 'MITIGATION', value: rec.mitigation_required },
          { label: 'ORA ESCALATION', value: rec.escalate_to_ora },
        ].map(f => (
          <span key={f.label} className="flex items-center gap-1">
            <span className={f.value ? 'text-accent-green' : 'text-accent-red'}>{f.value ? '✓' : '✗'}</span>
            <span className="text-text-muted">{f.label}</span>
          </span>
        ))}
        <span className="text-text-muted">CONFIDENCE: <span className="text-text-primary">{rec.confidence_level}</span></span>
      </div>

      {/* Rationale + elapsed */}
      <div className="px-5 py-3 flex justify-between items-start gap-4">
        <div className="flex-1">
          <span className="font-mono text-[10px] tracking-widest text-text-muted">RATIONALE</span>
          <p className="text-sm text-text-secondary mt-1">{rec.decision_rationale}</p>
        </div>
        <div className="font-mono text-[10px] text-text-muted shrink-0 pt-4">
          COMPLETED IN {response.elapsed_seconds.toFixed(1)}s
        </div>
      </div>
    </motion.div>
  );
}
