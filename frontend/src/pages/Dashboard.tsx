// src/pages/Dashboard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle-aware Home Dashboard.
//
// System Overview bar (always visible) — UC1/UC2/UC3 run counts + stage switcher
//
// Stage 1 — Policy Feasibility Assessment (UC1)
//   Stats: total runs · avg severity · ORA activations · Path A count
//   Charts: decision path bar · risk level pie
//   Panel: Risk & Alert Summary (UC1-specific risks only)
//   Table: recent UC1 simulations
//
// Stage 2 — Scenario Comparison & Strategy (UC2)
//   Stats: total runs · avg best score · hybrid recommended · hybrid built
//   Charts: best scenario risk pie · sector bar
//   Panel: Strategy Insights
//   Table: recent UC2 simulations
//
// Stage 3 — Portfolio Risk Monitor (UC3)
//   Stats: portfolio analyses · conflict clusters · avg portfolio risk · sectors
//   Charts: conflicts by sector bar · portfolio risk over time line
//   Panel: Conflict Alerts (severity-ranked)
//   Table: recent UC3 simulations
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import {
  Activity, AlertTriangle, AlertCircle, CheckCircle2,
  Clock, RefreshCw, TrendingUp, TrendingDown,
  ClipboardCheck, GitCompare, BarChart3,
  Shield, Zap, Target, Layers, Info,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { getDashboardStats, DashboardStats } from '@/services/api';
import { getSettings } from '@/lib/settings';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FullSim {
  id: string;
  usecase: 'UC1' | 'UC2' | 'UC3';
  timestamp: string;
  sector?: string;
  // UC1
  policy_title?: string;
  decision_path?: string;
  severity_score?: number;
  risk_level?: string;
  agents_activated?: string[];
  alternatives_generated?: number;
  ora_escalated?: boolean;
  risk_flags?: string[];
  // UC2
  policy_goal?: string;
  priority?: string;
  best_scenario_id?: string;
  hybrid_recommended?: boolean;
  hybrid_generated?: boolean;
  scenarios?: {
    scenario_id: string; name: string;
    overall_score: number; risk_level: string; severity_score: number;
  }[];
  // UC3
  portfolio_risk_score?: number;
  risk_classification?: string;
  risk_clusters?: { sector: string; risk_type: string; severity: number; description: string }[];
  sectors_covered?: string[];
}

type Stage = 'UC1' | 'UC2' | 'UC3';

// ── Constants ─────────────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  Low:      'hsl(var(--accent-green))',
  Moderate: 'hsl(var(--accent-yellow))',
  High:     'hsl(var(--accent-orange))',
  Critical: 'hsl(var(--accent-critical))',
  'Critical (ORA)': 'hsl(var(--accent-critical))',
};

const RISK_BADGE: Record<string, string> = {
  Low:      'bg-accent-green/20 text-accent-green',
  Moderate: 'bg-accent-yellow/20 text-accent-yellow',
  High:     'bg-accent-orange/20 text-accent-orange',
  Critical: 'bg-accent-critical/20 text-accent-critical',
  'Critical (ORA)': 'bg-accent-critical/20 text-accent-critical',
};

const STAGE_META = [
  {
    id: 'UC1' as Stage,
    label: 'Stage 1',
    title: 'Policy Feasibility',
    icon: ClipboardCheck,
    dot:          'bg-accent-blue',
    activeBorder: 'border-accent-blue/40',
    activeBg:     'bg-accent-blue/5',
    text:         'text-accent-blue',
    badge:        'bg-accent-blue/10 text-accent-blue',
    chartFill:    'hsl(var(--accent-blue))',
  },
  {
    id: 'UC2' as Stage,
    label: 'Stage 2',
    title: 'Scenario Strategy',
    icon: GitCompare,
    dot:          'bg-accent-green',
    activeBorder: 'border-accent-green/40',
    activeBg:     'bg-accent-green/5',
    text:         'text-accent-green',
    badge:        'bg-accent-green/10 text-accent-green',
    chartFill:    'hsl(var(--accent-green))',
  },
  {
    id: 'UC3' as Stage,
    label: 'Stage 3',
    title: 'Portfolio Monitor',
    icon: BarChart3,
    dot:          'bg-accent-amber',
    activeBorder: 'border-accent-amber/40',
    activeBg:     'bg-accent-amber/5',
    text:         'text-accent-amber',
    badge:        'bg-accent-amber/10 text-accent-amber',
    chartFill:    'hsl(var(--accent-amber))',
  },
] as const;

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--bg-elevated))',
  border: '1px solid hsl(var(--border-subtle))',
  borderRadius: '8px',
  fontSize: '12px',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);
const avg = (arr: number[]) =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

// ── Main Component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [stats,   setStats]   = useState<DashboardStats | null>(null);
  const [allSims, setAllSims] = useState<FullSim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [stage,   setStage]   = useState<Stage>('UC1');
  const settings = getSettings();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, historyRes] = await Promise.all([
        getDashboardStats(),
        fetch(`${settings.system.api_base_url}/api/history/all`).then(r => {
          if (!r.ok) throw new Error(`${r.status}`);
          return r.json();
        }),
      ]);
      setStats(statsRes);
      setAllSims((historyRes as FullSim[]).reverse()); // newest first
    } catch {
      setError('Could not load dashboard. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [settings.system.api_base_url]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="text-text-muted text-sm flex items-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading dashboard…
      </div>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !stats) return (
    <div className="p-6">
      <div className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg text-accent-red text-sm flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
      </div>
    </div>
  );

  const stageMeta = STAGE_META.find(s => s.id === stage)!;
  const stageSims = allSims.filter(s => s.usecase === stage);

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1">Home Dashboard</h1>
          <p className="text-text-secondary text-sm">
            Policy making lifecycle — select a stage to explore its intelligence.
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-text-secondary hover:text-text-primary text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ── Lifecycle stage switcher ── */}
      <div className="grid grid-cols-3 gap-3">
        {STAGE_META.map(s => {
          const Icon     = s.icon;
          const count    = stats.by_usecase[s.id];
          const isActive = stage === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setStage(s.id)}
              className={`relative flex items-center gap-4 px-5 py-4 rounded-xl border-2 text-left transition-all duration-200
                ${isActive
                  ? `${s.activeBorder} ${s.activeBg} shadow-sm`
                  : 'border-border-subtle bg-bg-surface hover:border-border-active'}`}
            >
              <div className={`p-2.5 rounded-lg ${isActive ? s.badge : 'bg-bg-elevated'}`}>
                <Icon className={`w-5 h-5 ${isActive ? s.text : 'text-text-muted'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium mb-0.5 ${isActive ? s.text : 'text-text-muted'}`}>
                  {s.label}
                </p>
                <p className="text-sm font-semibold text-text-primary">{s.title}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-text-primary">{count}</p>
                <p className="text-xs text-text-muted">run{count !== 1 ? 's' : ''}</p>
              </div>
              {isActive && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl ${s.dot}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Stage label bar ── */}
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${stageMeta.activeBorder} ${stageMeta.activeBg}`}>
        <stageMeta.icon className={`w-4 h-4 ${stageMeta.text}`} />
        <span className={`text-xs font-semibold ${stageMeta.text}`}>{stageMeta.label}</span>
        <span className="text-xs text-text-muted">—</span>
        <span className="text-sm font-medium text-text-primary">{stageMeta.title}</span>
        <span className="ml-auto text-xs text-text-muted">
          {stageSims.length} simulation{stageSims.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Stage-specific content ── */}
      {stage === 'UC1' && (
        <UC1View sims={stageSims} stats={stats} meta={stageMeta} />
      )}
      {stage === 'UC2' && (
        <UC2View sims={stageSims} meta={stageMeta} />
      )}
      {stage === 'UC3' && (
        <UC3View sims={stageSims} meta={stageMeta} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 1 — Policy Feasibility Assessment
// ─────────────────────────────────────────────────────────────────────────────

function UC1View({
  sims, stats, meta,
}: {
  sims: FullSim[];
  stats: DashboardStats;
  meta: typeof STAGE_META[number];
}) {
  const severities  = sims.map(s => s.severity_score).filter((v): v is number => v != null);
  const avgSeverity = avg(severities);
  const oraCount    = sims.filter(s => s.ora_escalated).length;
  const totalFlags  = (stats.by_risk_level.High ?? 0) + (stats.by_risk_level.Critical ?? 0);

  const pathData = Object.entries(stats.path_distribution).map(([path, count]) => ({ path, count }));

  const riskCounts: Record<string, number> = {};
  sims.forEach(s => {
    if (s.risk_level) {
      let key = s.risk_level;
      if (key === 'Critical' && s.ora_escalated) {
        key = 'Critical (ORA)';
      }
      riskCounts[key] = (riskCounts[key] ?? 0) + 1;
    }
  });

  const riskPieData = Object.entries(riskCounts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  // UC1-specific alerts
  const alerts = buildUC1Alerts(sims, oraCount);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Activity} label="Total Assessments"
          value={String(sims.length)} subtext="Stage 1 assessments run"
          trend="up" badge="Stage 1" badgeColor={meta.badge}
        />
        <StatCard
          icon={Shield} label="Avg Risk Severity"
          value={sims.length ? `${avgSeverity.toFixed(1)}/100` : '—'}
          subtext={`${totalFlags} high/critical flag${totalFlags !== 1 ? 's' : ''}`}
          trend={avgSeverity > 60 ? 'down' : 'up'}
          badge="Severity"
          badgeColor={avgSeverity > 60
            ? 'bg-accent-red/20 text-accent-red'
            : 'bg-accent-green/20 text-accent-green'}
        />
        <StatCard
          icon={Zap} label="ORA Activations"
          value={String(oraCount)} subtext="Policies requiring alternatives"
          trend={oraCount > 0 ? 'down' : 'up'} badge="Path C"
          badgeColor={oraCount > 0
            ? 'bg-accent-amber/20 text-accent-amber'
            : 'bg-bg-elevated text-text-muted'}
        />
        <StatCard
          icon={Target} label="Path A (Clean Pass)"
          value={String(stats.path_distribution['Path A'])}
          subtext="No risk — MAA skipped"
          trend="up" badge="Path A"
          badgeColor="bg-accent-green/20 text-accent-green"
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Card className="p-5 bg-bg-surface border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Decision Path Distribution</h3>
          <p className="text-xs text-text-muted mb-4">How Stage 1 policies were routed by COA</p>
          {pathData.every(d => d.count === 0)
            ? <EmptyChart message="No Stage 1 data yet" />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pathData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                  <XAxis dataKey="path" stroke="hsl(var(--text-muted))" style={{ fontSize: '11px' }} />
                  <YAxis stroke="hsl(var(--text-muted))" style={{ fontSize: '11px' }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="hsl(var(--accent-blue))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </Card>

        <Card className="p-5 bg-bg-surface border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Risk Level Distribution</h3>
          <p className="text-xs text-text-muted mb-4">Across all Stage 1 assessments</p>
          {riskPieData.length === 0
            ? <EmptyChart message="No Stage 1 data yet" />
            : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={180}>
                  <PieChart>
                    <Pie
                      data={riskPieData} cx="50%" cy="50%"
                      innerRadius={45} outerRadius={70}
                      dataKey="value" paddingAngle={3}
                    >
                      {riskPieData.map(e => (
                        <Cell key={e.name} fill={RISK_COLORS[e.name] || '#888'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2.5">
                  {riskPieData.map(e => (
                    <div key={e.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: RISK_COLORS[e.name] }} />
                      <span className="text-xs text-text-secondary">{e.name}</span>
                      <span className="text-xs font-mono font-medium text-text-primary ml-auto pl-3">
                        {e.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <Card className="col-span-2 p-5 bg-bg-surface border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Recent Feasibility Assessments</h3>
          {sims.length === 0
            ? <Empty message="No Stage 1 assessments yet. Run a Policy Simulation to start." />
            : <div className="space-y-2">{sims.slice(0, 5).map(s => <SimRow key={s.id} sim={s} />)}</div>
          }
        </Card>
        <Card className="col-span-1 p-5 bg-bg-surface border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Risk & Alert Summary</h3>
          <div className="space-y-2">
            {alerts.map((a, i) => <AlertRow key={i} {...a} />)}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 2 — Scenario Comparison & Strategy
// ─────────────────────────────────────────────────────────────────────────────

function UC2View({
  sims, meta,
}: {
  sims: FullSim[];
  meta: typeof STAGE_META[number];
}) {
  const bestScores   = sims.flatMap(s =>
    s.scenarios?.map(sc => sc.overall_score) ?? []
  );
  const avgBestScore = avg(bestScores);
  const hybridNeeded = sims.filter(s => s.hybrid_recommended).length;
  const hybridBuilt  = sims.filter(s => s.hybrid_generated).length;

  // Risk distribution of best (highest-scored) scenario per run
  const riskCounts: Record<string, number> = {};
  sims.forEach(s => {
    const best = s.scenarios
      ?.slice()
      .sort((a, b) => b.overall_score - a.overall_score)[0];
    if (best?.risk_level) {
      riskCounts[best.risk_level] = (riskCounts[best.risk_level] ?? 0) + 1;
    }
  });
  const riskData = Object.entries(riskCounts).map(([name, value]) => ({ name, value }));

  // Sector bar
  const sectorCounts: Record<string, number> = {};
  sims.forEach(s => {
    if (s.sector) sectorCounts[cap(s.sector)] = (sectorCounts[cap(s.sector)] ?? 0) + 1;
  });
  const sectorData = Object.entries(sectorCounts).map(([sector, count]) => ({ sector, count }));

  const insights = buildUC2Insights(sims, avgBestScore, hybridNeeded, hybridBuilt);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={GitCompare} label="Scenario Comparisons"
          value={String(sims.length)} subtext="Stage 2 simulations run"
          trend="up" badge="Stage 2" badgeColor={meta.badge}
        />
        <StatCard
          icon={Target} label="Avg Best Score"
          value={sims.length ? `${avgBestScore.toFixed(1)}/100` : '—'}
          subtext="Highest-ranked scenario per run"
          trend={avgBestScore > 60 ? 'up' : 'down'} badge="CAA"
          badgeColor={avgBestScore > 60
            ? 'bg-accent-green/20 text-accent-green'
            : 'bg-accent-amber/20 text-accent-amber'}
        />
        <StatCard
          icon={AlertTriangle} label="Hybrid Recommended"
          value={String(hybridNeeded)} subtext="Runs with no clear winner"
          trend={hybridNeeded > 0 ? 'down' : 'up'} badge="ORA"
          badgeColor={hybridNeeded > 0
            ? 'bg-accent-amber/20 text-accent-amber'
            : 'bg-bg-elevated text-text-muted'}
        />
        <StatCard
          icon={CheckCircle2} label="Hybrids Built"
          value={String(hybridBuilt)} subtext="ORA hybrid scenarios generated"
          trend="up" badge="Hybrid"
          badgeColor="bg-accent-green/20 text-accent-green"
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Card className="p-5 bg-bg-surface border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Best Scenario Risk Levels</h3>
          <p className="text-xs text-text-muted mb-4">Risk classification of the winning scenario per run</p>
          {riskData.length === 0
            ? <EmptyChart message="No Stage 2 data yet" />
            : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={180}>
                  <PieChart>
                    <Pie
                      data={riskData} cx="50%" cy="50%"
                      innerRadius={45} outerRadius={70}
                      dataKey="value" paddingAngle={3}
                    >
                      {riskData.map(e => (
                        <Cell key={e.name} fill={RISK_COLORS[e.name] || '#888'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2.5">
                  {riskData.map(e => (
                    <div key={e.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: RISK_COLORS[e.name] }} />
                      <span className="text-xs text-text-secondary">{e.name}</span>
                      <span className="text-xs font-mono font-medium text-text-primary ml-auto pl-3">
                        {e.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </Card>

        <Card className="p-5 bg-bg-surface border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Simulations by Sector</h3>
          <p className="text-xs text-text-muted mb-4">Which sectors have been compared most</p>
          {sectorData.length === 0
            ? <EmptyChart message="No Stage 2 data yet" />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sectorData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                  <XAxis dataKey="sector" stroke="hsl(var(--text-muted))" style={{ fontSize: '11px' }} />
                  <YAxis stroke="hsl(var(--text-muted))" style={{ fontSize: '11px' }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="hsl(var(--accent-green))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <Card className="col-span-2 p-5 bg-bg-surface border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Recent Scenario Comparisons</h3>
          {sims.length === 0
            ? <Empty message="No Stage 2 simulations yet. Run a Workforce Intelligence simulation to start." />
            : <div className="space-y-2">{sims.slice(0, 5).map(s => <SimRow key={s.id} sim={s} />)}</div>
          }
        </Card>
        <Card className="col-span-1 p-5 bg-bg-surface border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Strategy Insights</h3>
          <div className="space-y-2">
            {insights.map((a, i) => <AlertRow key={i} {...a} />)}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 3 — Portfolio Risk Monitor
// ─────────────────────────────────────────────────────────────────────────────

function UC3View({
  sims, meta,
}: {
  sims: FullSim[];
  meta: typeof STAGE_META[number];
}) {
  const portfolioScores = sims
    .map(s => s.portfolio_risk_score)
    .filter((v): v is number => v != null);
  const avgPortfolio = avg(portfolioScores);
  const allClusters  = sims.flatMap(s => s.risk_clusters ?? []);
  const allSectors   = [...new Set(sims.flatMap(s => s.sectors_covered ?? []))];

  // Conflict clusters by sector
  const clusterBySector: Record<string, number> = {};
  allClusters.forEach(c => {
    clusterBySector[cap(c.sector)] = (clusterBySector[cap(c.sector)] ?? 0) + 1;
  });
  const clusterData = Object.entries(clusterBySector)
    .map(([sector, count]) => ({ sector, count }));

  // Portfolio risk over time (line chart)
  const scoreHistory = sims
    .filter(s => s.portfolio_risk_score != null)
    .slice(0, 10)
    .reverse()
    .map((s, i) => ({ run: `Run ${i + 1}`, score: s.portfolio_risk_score! }));

  const conflictAlerts = buildUC3Alerts(sims, allClusters);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={BarChart3} label="Portfolio Analyses"
          value={String(sims.length)} subtext="Stage 3 analyses run"
          trend="up" badge="Stage 3" badgeColor={meta.badge}
        />
        <StatCard
          icon={AlertTriangle} label="Conflict Clusters"
          value={String(allClusters.length)}
          subtext={`Across ${allSectors.length} sector${allSectors.length !== 1 ? 's' : ''}`}
          trend={allClusters.length > 0 ? 'down' : 'up'} badge="Conflicts"
          badgeColor={allClusters.length > 0
            ? 'bg-accent-red/20 text-accent-red'
            : 'bg-accent-green/20 text-accent-green'}
        />
        <StatCard
          icon={Shield} label="Avg Portfolio Risk"
          value={sims.length ? `${avgPortfolio.toFixed(1)}/100` : '—'}
          subtext="Across all portfolio analyses"
          trend={avgPortfolio > 60 ? 'down' : 'up'} badge="Risk"
          badgeColor={avgPortfolio > 60
            ? 'bg-accent-red/20 text-accent-red'
            : 'bg-accent-green/20 text-accent-green'}
        />
        <StatCard
          icon={Layers} label="Sectors Monitored"
          value={String(allSectors.length)}
          subtext={allSectors.slice(0, 2).map(cap).join(', ') || 'None yet'}
          trend="up" badge="Coverage"
          badgeColor="bg-accent-amber/20 text-accent-amber"
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Card className="p-5 bg-bg-surface border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Conflict Clusters by Sector</h3>
          <p className="text-xs text-text-muted mb-4">Where cross-policy conflicts are concentrated</p>
          {clusterData.length === 0
            ? <EmptyChart message="No conflict clusters detected yet" />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={clusterData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                  <XAxis dataKey="sector" stroke="hsl(var(--text-muted))" style={{ fontSize: '11px' }} />
                  <YAxis stroke="hsl(var(--text-muted))" style={{ fontSize: '11px' }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="hsl(var(--accent-amber))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </Card>

        <Card className="p-5 bg-bg-surface border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Portfolio Risk Over Time</h3>
          <p className="text-xs text-text-muted mb-4">Score trend across sequential analyses</p>
          {scoreHistory.length < 2
            ? <EmptyChart message="Run 2+ portfolio analyses to see trend" />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={scoreHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                  <XAxis dataKey="run" stroke="hsl(var(--text-muted))" style={{ fontSize: '11px' }} />
                  <YAxis domain={[0, 100]} stroke="hsl(var(--text-muted))" style={{ fontSize: '11px' }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line
                    type="monotone" dataKey="score"
                    stroke="hsl(var(--accent-amber))" strokeWidth={2.5}
                    dot={{ fill: 'hsl(var(--accent-amber))', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <Card className="col-span-2 p-5 bg-bg-surface border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Recent Portfolio Analyses</h3>
          {sims.length === 0
            ? <Empty message="No Stage 3 analyses yet. Run a Portfolio Risk Monitor to start." />
            : <div className="space-y-2">{sims.slice(0, 5).map(s => <SimRow key={s.id} sim={s} />)}</div>
          }
        </Card>
        <Card className="col-span-1 p-5 bg-bg-surface border-border-subtle">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Conflict Alerts</h3>
          <div className="space-y-2">
            {conflictAlerts.map((a, i) => <AlertRow key={i} {...a} />)}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Alert builders ────────────────────────────────────────────────────────────

type AlertItem = { type: 'high' | 'medium' | 'positive' | 'review'; title: string; body: string };

function buildUC1Alerts(sims: FullSim[], oraCount: number): AlertItem[] {
  const alerts: AlertItem[] = [];
  const critSims = sims.filter(s => s.risk_level === 'Critical');
  const highSims = sims.filter(s => s.risk_level === 'High');
  const lowSims  = sims.filter(s => s.risk_level === 'Low' || s.risk_level === 'Moderate');

  if (critSims.length > 0) alerts.push({
    type: 'high', title: 'Critical Risk Detected',
    body: `${critSims.length} simulation${critSims.length > 1 ? 's' : ''} flagged Critical — alternatives generated. Immediate human review required.`,
  });
  if (highSims.length > 0) alerts.push({
    type: 'medium', title: 'High Risk — Monitor',
    body: `${highSims.length} simulation${highSims.length > 1 ? 's' : ''} flagged High risk. Monitoring activated, ORA not triggered.`,
  });
  if (oraCount > 0) alerts.push({
    type: 'review', title: 'ORA Escalations',
    body: `${oraCount} simulation${oraCount > 1 ? 's' : ''} escalated to ORA — policy alternatives generated for human review.`,
  });
  if (lowSims.length > 0) alerts.push({
    type: 'positive', title: 'Within Safe Thresholds',
    body: `${lowSims.length} simulation${lowSims.length > 1 ? 's' : ''} assessed as Low or Moderate risk — no action required.`,
  });
  if (alerts.length === 0) alerts.push({
    type: 'positive', title: 'No Stage 1 Assessments Yet',
    body: 'Run a Policy Simulation to see feasibility assessments here.',
  });
  return alerts;
}

function buildUC2Insights(
  sims: FullSim[], avgBestScore: number, hybridNeeded: number, hybridBuilt: number,
): AlertItem[] {
  const alerts: AlertItem[] = [];
  if (hybridNeeded > 0) alerts.push({
    type: 'review', title: 'Hybrid Recommended',
    body: `${hybridNeeded} simulation${hybridNeeded > 1 ? 's' : ''} had no clear winning scenario — hybrid synthesis was recommended.`,
  });
  if (hybridBuilt > 0) alerts.push({
    type: 'positive', title: 'Hybrids Built',
    body: `${hybridBuilt} hybrid scenario${hybridBuilt > 1 ? 's' : ''} generated by ORA combining best elements of top-ranked strategies.`,
  });
  if (sims.length > 0 && avgBestScore > 70) alerts.push({
    type: 'positive', title: 'Strong Strategy Quality',
    body: `Average best scenario score is ${avgBestScore.toFixed(1)}/100 — strategies are generally feasible.`,
  });
  if (sims.length > 0 && avgBestScore <= 50) alerts.push({
    type: 'high', title: 'Low Strategy Scores',
    body: `Average best scenario score is ${avgBestScore.toFixed(1)}/100 — consider revising growth targets or budget constraints.`,
  });
  if (alerts.length === 0) alerts.push({
    type: 'positive', title: 'No Stage 2 Simulations Yet',
    body: 'Run a Workforce Intelligence simulation to see strategy insights here.',
  });
  return alerts;
}

function buildUC3Alerts(
  sims: FullSim[],
  allClusters: { sector: string; risk_type: string; severity: number; description: string }[],
): AlertItem[] {
  const alerts: AlertItem[] = [];
  const critical = allClusters.filter(c => c.severity >= 70);
  const moderate = allClusters.filter(c => c.severity >= 40 && c.severity < 70);
  const minor    = allClusters.filter(c => c.severity < 40);

  if (critical.length > 0) alerts.push({
    type: 'high',
    title: `${critical.length} Critical Conflict${critical.length > 1 ? 's' : ''}`,
    body: critical.slice(0, 2).map(c => `${cap(c.sector)}: ${c.risk_type}`).join(' · '),
  });
  if (moderate.length > 0) alerts.push({
    type: 'medium',
    title: `${moderate.length} Moderate Conflict${moderate.length > 1 ? 's' : ''}`,
    body: moderate.slice(0, 2).map(c => `${cap(c.sector)}: ${c.risk_type}`).join(' · '),
  });
  if (minor.length > 0) alerts.push({
    type: 'review',
    title: `${minor.length} Minor Overlap${minor.length > 1 ? 's' : ''}`,
    body: 'Low-severity cross-policy overlaps — monitor but no immediate action required.',
  });
  if (allClusters.length === 0 && sims.length > 0) alerts.push({
    type: 'positive', title: 'No Conflicts Detected',
    body: 'Portfolio analyses found no cross-policy conflicts across active sectors.',
  });
  if (sims.length === 0) alerts.push({
    type: 'positive', title: 'No Stage 3 Analyses Yet',
    body: 'Run a Portfolio analysis to detect cross-policy conflicts here.',
  });
  return alerts;
}

// ── Shared UI components ──────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, subtext, trend, badge, badgeColor,
}: {
  icon: React.ElementType; label: string; value: string; subtext: string;
  trend: 'up' | 'down' | 'neutral'; badge: string; badgeColor: string;
}) {
  return (
    <Card className="p-5 bg-bg-surface border-border-subtle hover:border-border-active transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${
          trend === 'up' ? 'bg-accent-green/10' :
          trend === 'down' ? 'bg-accent-red/10' : 'bg-bg-elevated'
        }`}>
          <Icon className={`w-5 h-5 ${
            trend === 'up' ? 'text-accent-green' :
            trend === 'down' ? 'text-accent-red' : 'text-text-secondary'
          }`} />
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded ${badgeColor}`}>{badge}</span>
      </div>
      <p className="text-sm text-text-muted mb-1">{label}</p>
      <p className="text-3xl font-bold text-text-primary mb-1">{value}</p>
      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        {trend === 'up'   && <TrendingUp   className="w-3 h-3 text-accent-green" />}
        {trend === 'down' && <TrendingDown className="w-3 h-3 text-accent-red" />}
        <span>{subtext}</span>
      </div>
    </Card>
  );
}

function SimRow({ sim }: { sim: FullSim }) {
  const title  = sim.policy_title || sim.policy_goal || sim.id;
  const risk   = sim.risk_level || sim.risk_classification;
  const score  = sim.severity_score ?? sim.portfolio_risk_score;
  const agents = sim.agents_activated?.length ?? 0;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-bg-elevated rounded-lg hover:bg-bg-elevated/80 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate mb-0.5">{title}</p>
        <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
          {agents > 0 && <span>{agents} agents</span>}
          {sim.decision_path    && <><span>·</span><span>{sim.decision_path}</span></>}
          {sim.sector           && <><span>·</span><span>{cap(sim.sector)}</span></>}
          {sim.best_scenario_id && <><span>·</span><span>Best: Scenario {sim.best_scenario_id}</span></>}
          {sim.risk_clusters    && <><span>·</span><span>{sim.risk_clusters.length} conflict{sim.risk_clusters.length !== 1 ? 's' : ''}</span></>}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />{fmt(sim.timestamp)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4 shrink-0">
        {score != null && (
          <span className="text-xs font-mono text-text-secondary">{score.toFixed(1)}/100</span>
        )}
        {risk ? (
          <span className={`text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1 ${RISK_BADGE[risk] ?? 'bg-bg-elevated text-text-muted'}`}>
            {risk === 'Low' || risk === 'Moderate'
              ? <CheckCircle2 className="w-3 h-3" />
              : <AlertCircle  className="w-3 h-3" />}
            {risk}
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded bg-accent-blue/10 text-accent-blue flex items-center gap-1">
            <Clock className="w-3 h-3" /> Completed
          </span>
        )}
      </div>
    </div>
  );
}

function AlertRow({
  type, title, body,
}: {
  type: 'high' | 'medium' | 'positive' | 'review';
  title: string;
  body: string;
}) {
  const s = {
    high:     { bg: 'bg-accent-red/10 border-accent-red/20',     icon: <AlertCircle   className="w-4 h-4 text-accent-red shrink-0 mt-0.5" />,    text: 'text-accent-red' },
    medium:   { bg: 'bg-accent-amber/10 border-accent-amber/20', icon: <AlertTriangle className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />,  text: 'text-accent-amber' },
    positive: { bg: 'bg-accent-green/10 border-accent-green/20', icon: <CheckCircle2  className="w-4 h-4 text-accent-green shrink-0 mt-0.5" />, text: 'text-accent-green' },
    review:   { bg: 'bg-accent-blue/10 border-accent-blue/20',   icon: <Info          className="w-4 h-4 text-accent-blue shrink-0 mt-0.5" />,   text: 'text-accent-blue' },
  }[type];
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-lg border ${s.bg}`}>
      {s.icon}
      <div>
        <p className={`text-xs font-semibold mb-0.5 ${s.text}`}>{title}</p>
        <p className="text-xs text-text-secondary leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-48 flex items-center justify-center text-text-muted text-sm">
      {message}
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="text-text-muted text-sm text-center py-8">{message}</div>
  );
}
