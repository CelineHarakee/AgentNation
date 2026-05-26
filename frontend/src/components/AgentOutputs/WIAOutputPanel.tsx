import { WIAOutput } from '@/types/agentTypes';
import { motion } from 'framer-motion';

interface Props { data: WIAOutput }

function MetricGauge({ label, value, displayValue, max, thresholds }: {
  label: string; value: number; displayValue: string; max: number;
  thresholds: { amber: number; red: number };
}) {
  const pct = Math.min((value / max) * 100, 100);
  const color = value >= thresholds.red ? 'bg-accent-red' : value >= thresholds.amber ? 'bg-accent-amber' : 'bg-accent-green';
  const textColor = value >= thresholds.red ? 'text-accent-red' : value >= thresholds.amber ? 'text-accent-amber' : 'text-accent-green';

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="font-mono text-[10px] tracking-widest text-text-muted">{label}</span>
        <span className={`font-mono text-lg font-semibold ${textColor}`}>{displayValue}</span>
      </div>
      <div className="h-1.5 bg-elevated rounded-sm overflow-hidden">
        <motion.div
          className={`h-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export default function WIAOutputPanel({ data }: Props) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.4 }} className="overflow-hidden">
      <div className="pt-3 space-y-4">
        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <MetricGauge
            label="WORKFORCE PRESSURE"
            value={data.workforce_pressure_index}
            displayValue={`${(data.workforce_pressure_index * 100).toFixed(1)}%`}
            max={1}
            thresholds={{ amber: 0.3, red: 0.6 }}
          />
          <MetricGauge
            label="BUDGET STRESS"
            value={data.budget_stress_ratio}
            displayValue={`${(data.budget_stress_ratio * 100).toFixed(1)}%`}
            max={2}
            thresholds={{ amber: 0.8, red: 1.0 }}
          />
          <MetricGauge
            label="TRAINING CAPACITY"
            value={data.training_capacity_ratio}
            displayValue={`${data.training_capacity_ratio.toFixed(1)}x`}
            max={20}
            thresholds={{ amber: 2, red: 5 }}
          />
        </div>

        {/* Flags row */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-widest text-text-muted">SAUDIZATION RISK</span>
            <span className={`font-mono text-[11px] px-2 py-0.5 border ${data.saudization_risk ? 'border-accent-red text-accent-red' : 'border-accent-green text-accent-green'}`}>
              {data.saudization_risk ? 'YES' : 'NO'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] tracking-widest text-text-muted">RISK FLAGS</span>
            {data.risk_flags.length > 0
              ? data.risk_flags.map((f, i) => (
                  <span key={i} className="font-mono text-[10px] px-2 py-0.5 border border-accent-amber text-accent-amber">{f}</span>
                ))
              : <span className="font-mono text-[10px] px-2 py-0.5 border border-accent-green text-accent-green">NO FLAGS DETECTED</span>}
          </div>
        </div>

        {/* Briefing note */}
        <div>
          <span className="font-mono text-[10px] tracking-widest text-accent-blue">WIA BRIEFING NOTE</span>
          <blockquote className="mt-2 border-l-2 border-accent-blue pl-4 italic text-text-secondary text-sm leading-relaxed">
            {data.explanation}
          </blockquote>
        </div>
      </div>
    </motion.div>
  );
}
