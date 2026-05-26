interface Props {
  onGenerate: () => void;
  loading: boolean;
}

export default function HybridCTA({ onGenerate, loading }: Props) {
  return (
    <div className="bg-surface border border-border-subtle border-l-2 border-l-scenario-hybrid p-5">
      <div className="flex items-start gap-3">
        <span className="text-scenario-hybrid text-lg mt-0.5">◈</span>
        <div className="flex-1">
          <h3 className="font-mono text-sm text-text-primary font-semibold tracking-wide">
            NONE OF THESE SCENARIOS FULLY OPTIMAL?
          </h3>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            The Option Recommendation Agent can synthesize a hybrid scenario combining the best elements of the top two ranked options.
          </p>

          <button
            onClick={onGenerate}
            disabled={loading}
            className={`mt-4 px-6 py-2.5 font-mono text-sm tracking-wider transition-colors ${
              loading
                ? 'bg-accent-blue/20 border border-accent-blue/50 text-accent-blue cursor-wait'
                : 'bg-accent-blue/90 hover:bg-accent-blue text-primary-foreground'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                GENERATING...
              </span>
            ) : (
              'GENERATE HYBRID RECOMMENDATION'
            )}
          </button>

          <p className="mt-3 font-mono text-[10px] text-text-muted">
            Note: This activates the ORA agent and makes one additional AI call. Human review of the result is required.
          </p>
        </div>
      </div>
    </div>
  );
}
