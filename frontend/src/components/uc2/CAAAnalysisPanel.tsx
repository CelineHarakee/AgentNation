import { CAAOutput } from '@/types/uc2Types';

interface Props {
  caaOutput: CAAOutput;
}

export default function CAAAnalysisPanel({ caaOutput }: Props) {
  return (
    <div className="bg-surface border border-border-subtle">
      <div className="px-5 py-3 border-b border-border-subtle">
        <span className="font-mono text-xs tracking-[0.2em] text-text-primary font-semibold">CAA — COMPARATIVE ASSESSMENT</span>
      </div>

      <div className="px-5 py-4 border-b border-border-subtle">
        <span className="font-mono text-[10px] tracking-widest text-text-muted">ANALYSIS</span>
        <blockquote className="mt-2 border-l-2 border-accent-blue/40 pl-3 text-sm text-text-secondary italic leading-relaxed">
          {caaOutput.comparison_narrative}
        </blockquote>
      </div>

      <div className="px-5 py-4">
        <span className="font-mono text-[10px] tracking-widest text-text-muted">CONDITIONS</span>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">{caaOutput.conditions_statement}</p>
      </div>
    </div>
  );
}
