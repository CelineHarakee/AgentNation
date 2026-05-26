// src/pages/Reports.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Reports & Briefings — Policy Making Lifecycle
//
// Three lifecycle stages:
//   Stage 1 — Policy Feasibility Assessment  (UC1)
//   Stage 2 — Scenario Comparison & Strategy (UC2)
//   Stage 3 — Portfolio Risk Monitor         (UC3)
//
// Each stage shows all simulations as report cards.
// Each report card has:
//   - Key metrics
//   - Executive summary
//   - Agent chain
//   - Export PDF button
//   - Copy summary button
//   - Send to Next Stage button (routes to the next lifecycle stage)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck, GitCompare, BarChart3,
  ChevronRight, Download, Copy, ArrowRight,
  RefreshCw, AlertCircle, CheckCircle2, AlertTriangle,
  Activity, Users, Shield, Layers, Clock,
  FileText,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getSettings } from '@/lib/settings';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SimEntry {
  id: string;
  usecase: 'UC1' | 'UC2' | 'UC3';
  timestamp: string;
  sector: string;
  // UC1 fields
  policy_title?: string;
  decision_path?: string;
  severity_score?: number;
  risk_level?: string;
  agents_activated?: string[];
  executive_summary?: string;
  risk_flags?: string[];
  workforce_pressure_index?: number;
  budget_stress_ratio?: number;
  training_capacity_ratio?: number;
  alternatives_generated?: number;
  // UC2 fields
  policy_goal?: string;
  priority?: string;
  best_scenario_id?: string;
  hybrid_recommended?: boolean;
  hybrid_generated?: boolean;
  comparison_narrative?: string;
  scenarios?: {
    scenario_id: string; name: string; time_horizon: string;
    severity_score: number; risk_level: string; overall_score: number;
    recommendation: string;
  }[];
  // UC3 fields
  portfolio_risk_score?: number;
  risk_classification?: string;
  risk_clusters?: { sector: string; risk_type: string; severity: number; description: string }[];
  sectors_covered?: string[];
  portfolio_briefing?: string;
  conflicts_detected?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGES = [
  {
    id: 'UC1',
    label: 'Stage 1',
    title: 'Policy Feasibility Assessment',
    description: 'Was this policy safe to implement? Risk scoring, agent chain, and alternatives.',
    icon: ClipboardCheck,
    color: 'blue',
    nextStage: { label: 'Scenario Comparison', path: '/workforce' },
  },
  {
    id: 'UC2',
    label: 'Stage 2',
    title: 'Scenario Comparison & Strategy',
    description: 'Which implementation strategy won? CAA rankings and hybrid recommendations.',
    icon: GitCompare,
    color: 'green',
    nextStage: { label: 'Portfolio Monitor', path: '/scenarios' },
  },
  {
    id: 'UC3',
    label: 'Stage 3',
    title: 'Portfolio Risk Monitor',
    description: 'Cross-policy conflict detection and portfolio-level risk analysis.',
    icon: BarChart3,
    color: 'amber',
    nextStage: null,
  },
] as const;

const RISK_BADGE: Record<string, string> = {
  Low:      'bg-accent-green/20 text-accent-green border-accent-green/30',
  Moderate: 'bg-accent-yellow/20 text-accent-yellow border-accent-yellow/30',
  High:     'bg-accent-orange/20 text-accent-orange border-accent-orange/30',
  Critical: 'bg-accent-critical/20 text-accent-critical border-accent-critical/30',
};

const COLOR_MAP = {
  blue:  { bg: 'bg-accent-blue/10', text: 'text-accent-blue', border: 'border-accent-blue/20', dot: 'bg-accent-blue' },
  green: { bg: 'bg-accent-green/10', text: 'text-accent-green', border: 'border-accent-green/20', dot: 'bg-accent-green' },
  amber: { bg: 'bg-accent-amber/10', text: 'text-accent-amber', border: 'border-accent-amber/20', dot: 'bg-accent-amber' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function cap(s = '') { return s.charAt(0).toUpperCase() + s.slice(1); }

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Reports() {
  const [simulations, setSimulations] = useState<SimEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<'UC1' | 'UC2' | 'UC3'>('UC1');
  const [copied, setCopied]           = useState<string | null>(null);
  const [showAll, setShowAll]         = useState(false);
  const navigate                      = useNavigate();
  const settings                      = getSettings();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${settings.system.api_base_url}/api/history/all`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data: SimEntry[] = await res.json();
      setSimulations(data.reverse()); // newest first
    } catch {
      setError('Could not load reports. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [settings.system.api_base_url]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const stageSims   = simulations.filter((s) => s.usecase === activeStage);
  const visibleSims = showAll ? stageSims : stageSims.slice(0, 3);
  const hasMore     = stageSims.length > 3;
  const stage = STAGES.find((s) => s.id === activeStage)!;
  const colors = COLOR_MAP[stage.color];

  // ── Copy summary ──────────────────────────────────────────────────────────
  function handleCopy(sim: SimEntry) {
    const text = buildSummaryText(sim);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(sim.id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  // ── Export PDF (browser print) ────────────────────────────────────────────
  function handleExportPDF(sim: SimEntry) {
    const html = buildPrintHTML(sim);
    const win  = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }

  // ── Send to next stage ────────────────────────────────────────────────────
  function handleNextStage(sim: SimEntry) {
    const s = STAGES.find((st) => st.id === sim.usecase);
    if (s?.nextStage) navigate(s.nextStage.path);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="text-text-muted text-sm flex items-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading reports…
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg text-accent-red text-sm flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1">Reports & Briefings</h1>
          <p className="text-text-secondary text-sm">
            Policy making lifecycle — select a stage to view its simulation reports.
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-text-secondary hover:text-text-primary text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ── Lifecycle Stage Selector ── */}
      <div className="grid grid-cols-3 gap-4">
        {STAGES.map((s, i) => {
          const Icon    = s.icon;
          const c       = COLOR_MAP[s.color];
          const count   = simulations.filter((sim) => sim.usecase === s.id).length;
          const isActive = activeStage === s.id;
          return (
            <button
              key={s.id}
      onClick={() => { setActiveStage(s.id as typeof activeStage); setShowAll(false); }}
              className={`relative text-left p-5 rounded-xl border-2 transition-all duration-200 group ${
                isActive
                  ? `${c.border} bg-bg-surface shadow-sm`
                  : 'border-border-subtle bg-bg-surface hover:border-border-active'
              }`}
            >
              {/* Stage number connector */}
              {i < STAGES.length - 1 && (
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${c.bg}`}>
                  <Icon className={`w-5 h-5 ${c.text}`} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full border ${
                    isActive ? `${c.bg} ${c.text} ${c.border}` : 'bg-bg-elevated text-text-muted border-border-subtle'
                  }`}>
                    {count} report{count !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div>
                <p className={`text-xs font-medium mb-1 ${isActive ? c.text : 'text-text-muted'}`}>{s.label}</p>
                <p className="text-sm font-semibold text-text-primary mb-1">{s.title}</p>
                <p className="text-xs text-text-muted leading-relaxed">{s.description}</p>
              </div>

              {isActive && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl ${c.dot}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Stage header ── */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colors.border} ${colors.bg}`}>
        <stage.icon className={`w-4 h-4 ${colors.text}`} />
        <div>
          <span className={`text-xs font-medium ${colors.text}`}>{stage.label} — </span>
          <span className="text-sm font-semibold text-text-primary">{stage.title}</span>
        </div>
        <span className="ml-auto text-xs text-text-muted">{stageSims.length} simulation{stageSims.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Report cards ── */}
      {stageSims.length === 0 ? (
        <Card className="p-12 bg-bg-surface border-border-subtle text-center">
          <FileText className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-primary font-medium mb-1">No reports yet for this stage</p>
          <p className="text-text-muted text-sm">
            {activeStage === 'UC1' && 'Run a Stage 1 Policy Feasibility Assessment to generate a report.'}
            {activeStage === 'UC2' && 'Run a Stage 2 Scenario Comparison to generate a strategy report.'}
            {activeStage === 'UC3' && 'Run a Stage 3 Portfolio Risk Monitor to generate a conflict detection report.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {visibleSims.map((sim) => (
            <ReportCard
              key={sim.id}
              sim={sim}
              stage={stage}
              colors={colors}
              isCopied={copied === sim.id}
              onCopy={() => handleCopy(sim)}
              onExport={() => handleExportPDF(sim)}
              onNextStage={stage.nextStage ? () => handleNextStage(sim) : undefined}
              nextStageLabel={stage.nextStage?.label}
            />
          ))}

          {/* View More / View Less */}
          {hasMore && (
            <button
              onClick={() => setShowAll((prev) => !prev)}
              className="w-full py-3 rounded-xl border border-dashed border-border-subtle text-text-muted text-sm hover:text-text-primary hover:border-border-active transition-colors flex items-center justify-center gap-2"
            >
              {showAll ? (
                <>Show Less</>
              ) : (
                <>View {stageSims.length - 3} More Report{stageSims.length - 3 !== 1 ? 's' : ''} <ChevronRight className="w-4 h-4 rotate-90" /></>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Report Card ───────────────────────────────────────────────────────────────

function ReportCard({
  sim, stage, colors, isCopied, onCopy, onExport, onNextStage, nextStageLabel,
}: {
  sim: SimEntry;
  stage: typeof STAGES[number];
  colors: typeof COLOR_MAP['blue'];
  isCopied: boolean;
  onCopy: () => void;
  onExport: () => void;
  onNextStage?: () => void;
  nextStageLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const title = sim.policy_title || sim.policy_goal || sim.id;

  return (
    <Card className="bg-bg-surface border-border-subtle overflow-hidden">

      {/* ── Card header ── */}
      <div
        className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-bg-elevated/40 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-1 h-10 rounded-full ${colors.dot} shrink-0`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold text-text-primary truncate">{title}</span>
              {sim.risk_level && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${RISK_BADGE[sim.risk_level] ?? 'bg-bg-elevated text-text-muted border-border-subtle'}`}>
                  {sim.risk_level}
                </span>
              )}
              {sim.risk_classification && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${RISK_BADGE[sim.risk_classification] ?? 'bg-bg-elevated text-text-muted border-border-subtle'}`}>
                  {sim.risk_classification}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmt(sim.timestamp)}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{cap(sim.sector)}</span>
              {sim.severity_score != null && <><span>·</span><span className="font-mono">Severity: {sim.severity_score.toFixed(1)}/100</span></>}
              {sim.portfolio_risk_score != null && <><span>·</span><span className="font-mono">Portfolio: {sim.portfolio_risk_score.toFixed(1)}/100</span></>}
            </div>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div className="border-t border-border-subtle">

          {/* Metrics row */}
          <div className="px-6 py-4 grid grid-cols-4 gap-4 border-b border-border-subtle bg-bg-elevated/20">
            {sim.usecase === 'UC1' && <>
              <Metric icon={Activity} label="Decision Path"   value={sim.decision_path ?? '—'} />
              <Metric icon={Shield}   label="Workforce Pressure" value={sim.workforce_pressure_index != null ? `${(sim.workforce_pressure_index * 100).toFixed(1)}%` : '—'} />
              <Metric icon={Activity} label="Budget Stress"   value={sim.budget_stress_ratio != null ? `${(sim.budget_stress_ratio * 100).toFixed(1)}%` : '—'} />
              <Metric icon={Users}    label="Alternatives"    value={String(sim.alternatives_generated ?? 0)} />
            </>}
            {sim.usecase === 'UC2' && <>
              <Metric icon={CheckCircle2} label="Best Scenario"  value={`Scenario ${sim.best_scenario_id ?? '—'}`} />
              <Metric icon={Shield}       label="Priority"       value={cap(sim.priority ?? '—')} />
              <Metric icon={Activity}     label="Hybrid Needed"  value={sim.hybrid_recommended ? 'Yes' : 'No'} />
              <Metric icon={Users}        label="Hybrid Built"   value={sim.hybrid_generated ? 'Yes' : 'No'} />
            </>}
            {sim.usecase === 'UC3' && <>
              <Metric icon={BarChart3}    label="Portfolio Score"   value={sim.portfolio_risk_score != null ? `${sim.portfolio_risk_score.toFixed(1)}/100` : '—'} />
              <Metric icon={AlertTriangle} label="Conflict Clusters" value={String(sim.risk_clusters?.length ?? 0)} />
              <Metric icon={Layers}       label="Sectors Covered"   value={String(sim.sectors_covered?.length ?? 0)} />
              <Metric icon={Shield}       label="Classification"    value={sim.risk_classification ?? '—'} />
            </>}
          </div>

          {/* Agent chain */}
          {sim.agents_activated && sim.agents_activated.length > 0 && (
            <div className="px-6 py-3 border-b border-border-subtle">
              <p className="text-xs text-text-muted mb-2 font-medium">Agent Chain</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {sim.agents_activated.map((agent, i) => (
                  <div key={agent} className="flex items-center gap-1.5">
                    <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                      {agent}
                    </span>
                    {i < sim.agents_activated!.length - 1 && (
                      <ChevronRight className="w-3 h-3 text-text-muted" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UC2 scenario table */}
          {sim.usecase === 'UC2' && sim.scenarios && sim.scenarios.length > 0 && (
            <div className="px-6 py-4 border-b border-border-subtle">
              <p className="text-xs text-text-muted mb-3 font-medium">Scenario Rankings</p>
              <div className="space-y-2">
                {sim.scenarios
                  .slice()
                  .sort((a, b) => b.overall_score - a.overall_score)
                  .map((sc, i) => (
                  <div key={sc.scenario_id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${i === 0 ? `${colors.bg} border ${colors.border}` : 'bg-bg-elevated'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono font-semibold w-5 ${i === 0 ? colors.text : 'text-text-muted'}`}>#{i + 1}</span>
                      <span className="text-sm text-text-primary">{sc.name}</span>
                      <span className="text-xs text-text-muted">{cap(sc.time_horizon)} horizon</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-text-secondary">{sc.overall_score.toFixed(1)}/100</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded border ${RISK_BADGE[sc.risk_level] ?? 'bg-bg-elevated text-text-muted border-border-subtle'}`}>
                        {sc.risk_level}
                      </span>
                      {i === 0 && <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>Recommended</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UC3 conflict clusters */}
          {sim.usecase === 'UC3' && sim.risk_clusters && sim.risk_clusters.length > 0 && (
            <div className="px-6 py-4 border-b border-border-subtle">
              <p className="text-xs text-text-muted mb-3 font-medium">Conflict Clusters Detected</p>
              <div className="space-y-2">
                {sim.risk_clusters.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2 bg-bg-elevated rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 text-accent-amber shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-text-primary">{cap(c.sector)} — {c.risk_type}</p>
                      <p className="text-xs text-text-muted mt-0.5">{c.description}</p>
                    </div>
                    <span className="ml-auto text-xs font-mono text-text-muted shrink-0">{c.severity.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk flags */}
          {sim.risk_flags && sim.risk_flags.length > 0 && (
            <div className="px-6 py-3 border-b border-border-subtle">
              <p className="text-xs text-text-muted mb-2 font-medium">Risk Flags</p>
              <div className="flex flex-wrap gap-1.5">
                {sim.risk_flags.map((flag) => (
                  <span key={flag} className="text-xs px-2 py-0.5 rounded bg-accent-red/10 text-accent-red border border-accent-red/20">
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Executive summary */}
          {(sim.executive_summary || sim.comparison_narrative || sim.portfolio_briefing) && (
            <div className="px-6 py-4 border-b border-border-subtle">
              <p className="text-xs text-text-muted mb-2 font-medium">Executive Summary</p>
              <p className="text-sm text-text-secondary leading-relaxed">
                {sim.executive_summary || sim.comparison_narrative || sim.portfolio_briefing}
              </p>
            </div>
          )}

          {/* ── Action buttons ── */}
          <div className="px-6 py-4 flex items-center justify-between bg-bg-elevated/20">
            <div className="flex items-center gap-2">

              {/* Export PDF */}
              <button
                onClick={onExport}
                className="flex items-center gap-2 px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-text-secondary hover:text-text-primary text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export PDF
              </button>

              {/* Copy summary */}
              <button
                onClick={onCopy}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                  isCopied
                    ? 'bg-accent-green/10 border-accent-green/20 text-accent-green'
                    : 'bg-bg-elevated border-border-subtle text-text-secondary hover:text-text-primary'
                }`}
              >
                {isCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {isCopied ? 'Copied!' : 'Copy Summary'}
              </button>
            </div>

            {/* Send to next stage */}
            {onNextStage && nextStageLabel && (
              <button
                onClick={onNextStage}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${colors.bg} ${colors.text} border ${colors.border} hover:opacity-80`}
              >
                Send to {nextStageLabel}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Metric chip ───────────────────────────────────────────────────────────────

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm font-medium text-text-primary">{value}</p>
      </div>
    </div>
  );
}

// ── Build printable PDF HTML ──────────────────────────────────────────────────

function buildPrintHTML(sim: SimEntry): string {
  const title  = sim.policy_title || sim.policy_goal || sim.id;
  const stage  = STAGES.find((s) => s.id === sim.usecase)!;
  const summary = sim.executive_summary || sim.comparison_narrative || sim.portfolio_briefing || 'No summary available.';
  const agents  = (sim.agents_activated ?? []).join(' → ');
  const flags   = (sim.risk_flags ?? []).join(', ') || 'None';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>AgentNation Report — ${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', serif; color: #1a1a2e; background: #fff; padding: 48px; max-width: 800px; margin: 0 auto; }
  .header { border-bottom: 3px solid #1a1a2e; padding-bottom: 20px; margin-bottom: 28px; }
  .org { font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #666; margin-bottom: 6px; }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
  .stage { font-size: 12px; color: #3b82f6; font-weight: 600; letter-spacing: 0.05em; }
  .meta { display: flex; gap: 24px; margin-top: 10px; font-size: 12px; color: #666; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #666; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; }
  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .metric { padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; }
  .metric-label { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 0.08em; }
  .metric-value { font-size: 15px; font-weight: 700; color: #1a1a2e; margin-top: 3px; }
  .risk-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
  .summary { font-size: 13px; line-height: 1.8; color: #374151; }
  .agents { font-size: 12px; font-family: monospace; background: #f9fafb; padding: 10px 14px; border-radius: 6px; border: 1px solid #e5e7eb; }
  .flags { font-size: 12px; color: #dc2626; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #999; display: flex; justify-content: space-between; }
  @media print { body { padding: 24px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="org">AgentNation · Policy Intelligence System</div>
    <h1>${title}</h1>
    <div class="stage">${stage.label} — ${stage.title}</div>
    <div class="meta">
      <span>Generated: ${fmt(sim.timestamp)}</span>
      <span>Sector: ${cap(sim.sector)}</span>
      <span>ID: ${sim.id}</span>
      ${sim.risk_level ? `<span>Risk: <span class="risk-badge">${sim.risk_level}</span></span>` : ''}
      ${sim.risk_classification ? `<span>Risk: <span class="risk-badge">${sim.risk_classification}</span></span>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Key Metrics</div>
    <div class="metrics">
      ${sim.usecase === 'UC1' ? `
        <div class="metric"><div class="metric-label">Decision Path</div><div class="metric-value">${sim.decision_path ?? '—'}</div></div>
        <div class="metric"><div class="metric-label">Severity Score</div><div class="metric-value">${sim.severity_score?.toFixed(1) ?? '—'}/100</div></div>
        <div class="metric"><div class="metric-label">Budget Stress</div><div class="metric-value">${sim.budget_stress_ratio != null ? (sim.budget_stress_ratio * 100).toFixed(1) + '%' : '—'}</div></div>
        <div class="metric"><div class="metric-label">Alternatives</div><div class="metric-value">${sim.alternatives_generated ?? 0}</div></div>
      ` : ''}
      ${sim.usecase === 'UC2' ? `
        <div class="metric"><div class="metric-label">Best Scenario</div><div class="metric-value">Scenario ${sim.best_scenario_id ?? '—'}</div></div>
        <div class="metric"><div class="metric-label">Priority</div><div class="metric-value">${cap(sim.priority ?? '—')}</div></div>
        <div class="metric"><div class="metric-label">Hybrid Needed</div><div class="metric-value">${sim.hybrid_recommended ? 'Yes' : 'No'}</div></div>
        <div class="metric"><div class="metric-label">Hybrid Built</div><div class="metric-value">${sim.hybrid_generated ? 'Yes' : 'No'}</div></div>
      ` : ''}
      ${sim.usecase === 'UC3' ? `
        <div class="metric"><div class="metric-label">Portfolio Risk</div><div class="metric-value">${sim.portfolio_risk_score?.toFixed(1) ?? '—'}/100</div></div>
        <div class="metric"><div class="metric-label">Conflict Clusters</div><div class="metric-value">${sim.risk_clusters?.length ?? 0}</div></div>
        <div class="metric"><div class="metric-label">Sectors</div><div class="metric-value">${sim.sectors_covered?.length ?? 0}</div></div>
        <div class="metric"><div class="metric-label">Classification</div><div class="metric-value">${sim.risk_classification ?? '—'}</div></div>
      ` : ''}
    </div>
  </div>

  ${agents ? `
  <div class="section">
    <div class="section-title">Agent Chain</div>
    <div class="agents">${agents}</div>
  </div>` : ''}

  ${sim.risk_flags && sim.risk_flags.length > 0 ? `
  <div class="section">
    <div class="section-title">Risk Flags</div>
    <div class="flags">${flags}</div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Executive Summary</div>
    <div class="summary">${summary}</div>
  </div>

  <div class="footer">
    <span>AgentNation AI Policy Intelligence System · Confidential</span>
    <span>Human review required before policy adoption</span>
  </div>
</body>
</html>`;
}

// ── Build clipboard text ──────────────────────────────────────────────────────

function buildSummaryText(sim: SimEntry): string {
  const title   = sim.policy_title || sim.policy_goal || sim.id;
  const stage   = STAGES.find((s) => s.id === sim.usecase)!;
  const summary = sim.executive_summary || sim.comparison_narrative || sim.portfolio_briefing || '';
  const lines   = [
    `AGENNATION REPORT — ${stage.title.toUpperCase()}`,
    `${'─'.repeat(60)}`,
    `Policy:   ${title}`,
    `Sector:   ${cap(sim.sector)}`,
    `Date:     ${fmt(sim.timestamp)}`,
    `ID:       ${sim.id}`,
    sim.risk_level       ? `Risk:     ${sim.risk_level}` : '',
    sim.severity_score != null ? `Severity: ${sim.severity_score.toFixed(1)}/100` : '',
    sim.decision_path    ? `Path:     ${sim.decision_path}` : '',
    sim.best_scenario_id ? `Best Scenario: ${sim.best_scenario_id}` : '',
    sim.portfolio_risk_score != null ? `Portfolio Risk: ${sim.portfolio_risk_score.toFixed(1)}/100` : '',
    `${'─'.repeat(60)}`,
    'EXECUTIVE SUMMARY',
    summary,
    `${'─'.repeat(60)}`,
    'AI outputs are non-binding. Human review required before policy adoption.',
  ].filter(Boolean);
  return lines.join('\n');
}