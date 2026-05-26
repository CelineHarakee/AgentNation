import { UC2ORAOutput } from '@/types/uc2Types';
import { motion } from 'framer-motion';
import { Clock, Wallet, GraduationCap } from 'lucide-react';

interface Props {
  oraOutput: UC2ORAOutput;
}

const sevColor = (level: string) => {
  if (level === 'Low') return 'text-accent-green';
  if (level === 'Moderate') return 'text-accent-amber';
  if (level === 'High') return 'text-accent-red';
  return 'text-accent-critical';
};

const scenarioChipColor = (id: string) => {
  if (id === 'A') return 'border-scenario-a text-scenario-a bg-scenario-a/10';
  if (id === 'B') return 'border-scenario-b text-scenario-b bg-scenario-b/10';
  if (id === 'C') return 'border-scenario-c text-scenario-c bg-scenario-c/10';
  return 'border-scenario-hybrid text-scenario-hybrid bg-scenario-hybrid/10';
};

export default function HybridResultPanel({ oraOutput }: Props) {
  const h = oraOutput.hybrid_scenario;

  return (
    <motion.div
      className="bg-surface border border-border-subtle border-t-2 border-t-scenario-hybrid"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
        <div>
          <span className="font-mono text-xs tracking-[0.2em] text-text-primary font-semibold">ORA — HYBRID SCENARIO</span>
          <h3 className="font-mono text-sm text-text-primary mt-1 font-semibold">{h.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-[10px] text-text-muted">Synthesized from:</span>
            {h.derived_from.map(d => (
              <span key={d} className={`font-mono text-[10px] px-1.5 py-0.5 border ${scenarioChipColor(d)}`}>{d}</span>
            ))}
          </div>
        </div>
        <span className="font-mono text-[10px] px-2 py-0.5 border border-scenario-hybrid text-scenario-hybrid">
          ✦ HYBRID
        </span>
      </div>

      {/* Description */}
      <div className="px-5 py-3 border-b border-border-subtle">
        <span className="font-mono text-[10px] tracking-widest text-text-muted">DESCRIPTION</span>
        <p className="text-sm text-text-secondary mt-1 leading-relaxed">{h.description}</p>
      </div>

      {/* Parameters */}
      <div className="px-5 py-3 border-b border-border-subtle font-mono text-xs flex flex-wrap gap-4">
        <span className="flex items-center gap-1.5">
          <Clock size={11} className="text-accent-blue" />
          <span className="text-text-secondary">{h.time_horizon.toUpperCase()} timeline</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Wallet size={11} className="text-text-muted" />
          <span className="text-text-secondary">{(h.budget_limit * 100).toFixed(0)}% budget</span>
        </span>
        <span className="flex items-center gap-1.5">
          <GraduationCap size={11} className={h.training_investment ? 'text-accent-green' : 'text-text-muted'} />
          <span className={h.training_investment ? 'text-accent-green' : 'text-text-muted'}>
            Training: {h.training_investment ? 'YES' : 'NO'}
          </span>
        </span>
        <span className={`${sevColor(h.expected_risk_level)}`}>
          Expected risk: {h.expected_risk_level.toUpperCase()} (~{h.expected_severity_estimate.toFixed(0)}/100)
        </span>
      </div>

      {/* Advantages + Steps */}
      <div className="px-5 py-3 border-b border-border-subtle grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <span className="font-mono text-[10px] tracking-widest text-text-muted">KEY ADVANTAGES</span>
          <ul className="mt-1.5 space-y-1">
            {h.key_advantages.map((a, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5">
                <span className="text-accent-green mt-0.5">•</span>
                <span className="text-text-secondary">{a}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <span className="font-mono text-[10px] tracking-widest text-text-muted">IMPLEMENTATION STEPS</span>
          <ol className="mt-1.5 space-y-1">
            {h.implementation_steps.map((s, i) => (
              <li key={i} className="text-xs flex items-start gap-2">
                <span className="font-mono text-text-muted w-4 shrink-0">{i + 1}.</span>
                <span className="text-text-secondary">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* ORA note */}
      <div className="px-5 py-3">
        <span className="font-mono text-[10px] tracking-widest text-text-muted">ORA NOTE</span>
        <blockquote className="mt-2 border-l-2 border-scenario-hybrid/40 pl-3 text-sm text-text-secondary italic leading-relaxed">
          {oraOutput.explanation}
        </blockquote>
      </div>
    </motion.div>
  );
}
