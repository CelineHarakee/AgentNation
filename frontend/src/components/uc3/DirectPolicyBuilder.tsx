import { DirectPolicySpec, SECTORS } from '@/types/uc3Types';
import { Slider } from '@/components/ui/slider';

interface Props {
  policies: DirectPolicySpec[];
  onChange: (policies: DirectPolicySpec[]) => void;
}

const TIME_HORIZONS: Array<DirectPolicySpec['time_horizon']> = ['short', 'medium', 'long'];

const sectorLabel = (s: string) => s.replace(/_and_/g, ' & ').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function blankPolicy(idx: number): DirectPolicySpec {
  return {
    policy_id: `direct_${Date.now()}_${idx}`,
    sector: 'healthcare',
    target_growth_pct: 20,
    time_horizon: 'medium',
    budget_limit: 0.15,
    display_name: '',
  };
}

export default function DirectPolicyBuilder({ policies, onChange }: Props) {
  const update = (i: number, patch: Partial<DirectPolicySpec>) => {
    onChange(policies.map((p, idx) => idx === i ? { ...p, ...patch } : p));
  };

  const remove = (i: number) => onChange(policies.filter((_, idx) => idx !== i));
  const add = () => {
    if (policies.length >= 10) return;
    onChange([...policies, blankPolicy(policies.length)]);
  };

  return (
    <div className="space-y-3">
      {policies.map((p, i) => (
        <div key={p.policy_id} className="border border-border-subtle bg-surface p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-text-muted tracking-[0.15em]">POLICY {i + 1}</span>
            {policies.length > 1 && (
              <button
                onClick={() => remove(i)}
                className="font-mono text-[10px] text-text-muted hover:text-accent-red transition-colors"
              >
                ✕ REMOVE
              </button>
            )}
          </div>

          <div>
            <label className="font-mono text-[9px] text-text-muted tracking-wider block mb-1">NAME (OPTIONAL)</label>
            <input
              type="text"
              value={p.display_name || ''}
              onChange={(e) => update(i, { display_name: e.target.value })}
              placeholder="e.g. Healthcare Expansion 2026"
              className="terminal-input w-full text-xs"
            />
          </div>

          <div>
            <label className="font-mono text-[9px] text-text-muted tracking-wider block mb-1">SECTOR</label>
            <select
              value={p.sector}
              onChange={(e) => update(i, { sector: e.target.value })}
              className="terminal-input w-full text-xs"
            >
              {SECTORS.map(s => <option key={s} value={s}>{sectorLabel(s)}</option>)}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-mono text-[9px] text-text-muted tracking-wider">TARGET GROWTH</label>
              <span className="font-mono text-xs text-accent-blue tabular-nums">{p.target_growth_pct}%</span>
            </div>
            <Slider
              min={1} max={100} step={1}
              value={[p.target_growth_pct]}
              onValueChange={([v]) => update(i, { target_growth_pct: v })}
            />
          </div>

          <div>
            <label className="font-mono text-[9px] text-text-muted tracking-wider block mb-1">TIME HORIZON</label>
            <div className="grid grid-cols-3 gap-1">
              {TIME_HORIZONS.map(t => (
                <button
                  key={t}
                  onClick={() => update(i, { time_horizon: t })}
                  className={`font-mono text-[10px] py-1.5 border tracking-wider transition-colors ${
                    p.time_horizon === t
                      ? 'border-accent-blue text-accent-blue bg-accent-blue/10'
                      : 'border-border-subtle text-text-muted hover:border-border-active'
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-mono text-[9px] text-text-muted tracking-wider">BUDGET LIMIT</label>
              <span className="font-mono text-xs text-accent-blue tabular-nums">{(p.budget_limit * 100).toFixed(0)}%</span>
            </div>
            <Slider
              min={1} max={50} step={1}
              value={[p.budget_limit * 100]}
              onValueChange={([v]) => update(i, { budget_limit: v / 100 })}
            />
          </div>
        </div>
      ))}

      <button
        onClick={add}
        disabled={policies.length >= 10}
        className="w-full border border-dashed border-border-active text-text-secondary hover:text-accent-blue hover:border-accent-blue py-2.5 font-mono text-xs tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        + ADD POLICY
      </button>
    </div>
  );
}
