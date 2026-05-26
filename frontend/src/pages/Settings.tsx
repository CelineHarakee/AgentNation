// src/pages/Settings.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Settings / Governance page for AgentNation.
// Sections:
//   1. User Profile
//   2. Simulation Defaults
//   3. System Configuration  (API URL + Risk Threshold)
//   4. Display Preferences
//   5. Data & History        (Export JSON, Export CSV, Clear Log)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useRef } from 'react';
import {
  User, Sliders, Server, Monitor, Database,
  Save, RotateCcw, Download, Trash2, CheckCircle2,
  AlertTriangle, ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  AppSettings,
  getSettings,
  saveSettings,
  resetSettings,
  deriveInitials,
  DEFAULT_SETTINGS,
} from '@/lib/settings';

// ── Types ─────────────────────────────────────────────────────────────────────

type ToastKind = 'success' | 'error' | 'warning';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SECTORS = [
  'healthcare',
  'education',
  'information_technology',
  'energy_and_utilities',
  'construction_and_infrastructure',
  'finance_and_banking',
  'tourism_and_hospitality',
  'manufacturing_and_industry',
  'government_and_public_administration',
  'agriculture_and_water'
];

const TIME_HORIZONS = [
  { value: 'short',  label: 'Short  (0–1 year)' },
  { value: 'medium', label: 'Medium (1–3 years)' },
  { value: 'long',   label: 'Long   (3+ years)' },
];

const UC2_PRIORITIES = [
  { value: 'balanced',       label: 'Balanced' },
  { value: 'minimize_risk',  label: 'Minimize Risk' },
  { value: 'minimize_cost',  label: 'Minimize Cost' },
  { value: 'minimize_time',  label: 'Minimize Time' },
];

const SEVERITY_DISPLAYS = [
  { value: 'number', label: 'Number only  (e.g. 87.8)' },
  { value: 'label',  label: 'Label only   (e.g. Critical)' },
  { value: 'both',   label: 'Both         (e.g. 87.8 · Critical)' },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  const [saved,    setSaved]    = useState(false);
  const [toasts,   setToasts]   = useState<Toast[]>([]);
  const [clearing, setClearing] = useState(false);
  const toastId = useRef(0);

  // Sync initials whenever name changes
  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        initials: deriveInitials(prev.profile.name) || prev.profile.initials,
      },
    }));
  }, [settings.profile.name]);

  // ── Toast helpers ──────────────────────────────────────────────────────────

  function addToast(kind: ToastKind, message: string) {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  // ── Setters ────────────────────────────────────────────────────────────────

  function set<K extends keyof AppSettings>(
    section: K,
    key: keyof AppSettings[K],
    value: unknown,
  ) {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
    setSaved(false);
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  function handleSave() {
    saveSettings(settings);
    setSaved(true);
    addToast('success', 'Settings saved successfully.');
    setTimeout(() => setSaved(false), 2500);
  }

  function handleReset() {
    const defaults = resetSettings();
    setSettings(defaults);
    addToast('warning', 'Settings reset to defaults.');
  }

  async function handleExportJSON() {
    try {
      const res = await fetch(`${settings.system.api_base_url}/api/history/all`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      download(blob, 'agn_simulation_log.json');
      addToast('success', `Exported ${data.length} simulation${data.length !== 1 ? 's' : ''} as JSON.`);
    } catch (e) {
      addToast('error', 'Export failed — make sure the backend is running.');
    }
  }

  async function handleExportCSV() {
    try {
      const res = await fetch(`${settings.system.api_base_url}/api/history/all`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data: Record<string, unknown>[] = await res.json();
      if (data.length === 0) { addToast('warning', 'No simulations to export.'); return; }

      const cols = ['id', 'timestamp', 'usecase', 'sector', 'risk_level',
                    'severity_score', 'decision_path', 'policy_title', 'policy_goal'];
      const rows = [
        cols.join(','),
        ...data.map((row) =>
          cols.map((c) => {
            const v = row[c] ?? '';
            const s = String(v).replace(/"/g, '""');
            return s.includes(',') || s.includes('"') ? `"${s}"` : s;
          }).join(','),
        ),
      ];
      const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
      download(blob, 'agn_simulation_log.csv');
      addToast('success', `Exported ${data.length} row${data.length !== 1 ? 's' : ''} as CSV.`);
    } catch {
      addToast('error', 'Export failed — make sure the backend is running.');
    }
  }

  async function handleClearLog() {
    if (!window.confirm(
      'This will permanently delete all simulation history.\nThis cannot be undone. Continue?'
    )) return;

    setClearing(true);
    try {
      const res = await fetch(
        `${settings.system.api_base_url}/api/history/clear`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error(`${res.status}`);
      addToast('success', 'Simulation log cleared.');
    } catch {
      addToast('error', 'Clear failed — make sure the backend is running.');
    } finally {
      setClearing(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-5xl mx-auto p-6 pb-24 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1">Settings / Governance</h1>
          <p className="text-text-secondary text-sm">
            Configure your profile, simulation defaults, system parameters, and data management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-text-secondary hover:text-text-primary text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              saved
                ? 'bg-accent-green/20 text-accent-green border border-accent-green/30'
                : 'bg-accent-blue text-white hover:bg-accent-blue/90'
            }`}
          >
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── 1. User Profile ── */}
      <SectionCard icon={User} title="User Profile" subtitle="Your identity shown across the dashboard">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name">
            <Input
              value={settings.profile.name}
              onChange={(v) => set('profile', 'name', v)}
              placeholder="Dr. Sarah Mitchell"
            />
          </Field>
          <Field label="Role / Title">
            <Input
              value={settings.profile.role}
              onChange={(v) => set('profile', 'role', v)}
              placeholder="Senior Policy Analyst"
            />
          </Field>
          <Field label="Organization">
            <Input
              value={settings.profile.organization}
              onChange={(v) => set('profile', 'organization', v)}
              placeholder="AgentNation"
            />
          </Field>
          <Field label="Initials (shown in top-bar avatar)">
            <div className="flex items-center gap-3">
              <Input
                value={settings.profile.initials}
                onChange={(v) => set('profile', 'initials', v.toUpperCase().slice(0, 2))}
                placeholder="SM"
                className="w-20"
              />
              <div className="w-10 h-10 rounded-full bg-accent-blue flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {settings.profile.initials || '??'}
              </div>
            </div>
          </Field>
        </div>
      </SectionCard>

      {/* ── 2. Simulation Defaults ── */}
      <SectionCard icon={Sliders} title="Simulation Defaults" subtitle="Pre-fill values on Stage 1 and Stage 2 input forms">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Default Sector">
            <Select
              value={settings.simulation_defaults.sector}
              onChange={(v) => set('simulation_defaults', 'sector', v)}
              options={SECTORS.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
            />
          </Field>
          <Field label="Default Time Horizon">
            <Select
              value={settings.simulation_defaults.time_horizon}
              onChange={(v) => set('simulation_defaults', 'time_horizon', v as never)}
              options={TIME_HORIZONS}
            />
          </Field>
          <Field label="Default UC2 Priority">
            <Select
              value={settings.simulation_defaults.uc2_priority}
              onChange={(v) => set('simulation_defaults', 'uc2_priority', v as never)}
              options={UC2_PRIORITIES}
            />
          </Field>
        </div>
        <Note>
          These values will be used to pre-fill the Policy Simulation and Workforce Intelligence forms when you open them.
        </Note>
      </SectionCard>

      {/* ── 3. System Configuration ── */}
      <SectionCard icon={Server} title="System Configuration" subtitle="Backend connection and core pipeline parameters">
        <div className="grid grid-cols-2 gap-4">
          <Field label="API Base URL" description="Backend server address — change if deploying remotely">
            <Input
              value={settings.system.api_base_url}
              onChange={(v) => set('system', 'api_base_url', v)}
              placeholder="http://localhost:8000"
              mono
            />
          </Field>
          <Field
            label={`ORA Escalation Threshold — ${settings.system.risk_threshold}`}
            description="Severity score at which ORA activates and generates alternatives (Stage 1 Path C)"
          >
            <div className="space-y-2">
              <input
                type="range"
                min={30}
                max={90}
                step={5}
                value={settings.system.risk_threshold}
                onChange={(e) => set('system', 'risk_threshold', Number(e.target.value))}
                className="w-full accent-accent-blue"
              />
              <div className="flex justify-between text-xs text-text-muted">
                <span>30 — more sensitive</span>
                <span className="font-mono font-medium text-accent-blue">
                  {settings.system.risk_threshold}
                </span>
                <span>90 — less sensitive</span>
              </div>
            </div>
          </Field>
        </div>
        <Note kind="warning">
          Changing the ORA threshold only affects the frontend display logic. To change backend routing, update the threshold in <code className="font-mono text-xs bg-bg-elevated px-1 rounded">usecases/usecase1/coa.py</code> as well.
        </Note>
      </SectionCard>

      {/* ── 4. Display Preferences ── */}
      <SectionCard icon={Monitor} title="Display Preferences" subtitle="How risk and severity data is shown throughout the app">
        <Field label="Severity Score Display">
          <div className="flex flex-col gap-2">
            {SEVERITY_DISPLAYS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => set('display', 'severity_display', opt.value)}
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    settings.display.severity_display === opt.value
                      ? 'border-accent-blue bg-accent-blue'
                      : 'border-border-subtle group-hover:border-accent-blue/50'
                  }`}
                >
                  {settings.display.severity_display === opt.value && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </Field>

        {/* Live preview */}
        <div className="mt-4 p-3 bg-bg-elevated rounded-lg border border-border-subtle">
          <p className="text-xs text-text-muted mb-2 font-medium">Preview</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Severity will appear as:</span>
            <SeverityPreview mode={settings.display.severity_display} />
          </div>
        </div>
      </SectionCard>

      {/* ── 5. Data & History ── */}
      <SectionCard icon={Database} title="Data & History" subtitle="Export or clear your simulation log">
        <div className="grid grid-cols-3 gap-3">
          <ActionButton
            icon={Download}
            label="Export as JSON"
            description="Full simulation log with all fields"
            color="blue"
            onClick={handleExportJSON}
          />
          <ActionButton
            icon={Download}
            label="Export as CSV"
            description="Flat summary table, opens in Excel"
            color="green"
            onClick={handleExportCSV}
          />
          <ActionButton
            icon={Trash2}
            label={clearing ? 'Clearing…' : 'Clear Simulation Log'}
            description="Permanently deletes all history"
            color="red"
            onClick={handleClearLog}
            disabled={clearing}
          />
        </div>
        <Note kind="warning">
          Clearing the log is permanent and cannot be undone. UC3 historical mode relies on this log — clearing it will remove all selectable policies.
        </Note>
      </SectionCard>

      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} {...t} />
        ))}
      </div>
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon, title, subtitle, children,
}: {
  icon: React.ElementType; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <Card className="bg-bg-surface border-border-subtle overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border-subtle bg-bg-elevated/40">
        <div className="p-2 rounded-lg bg-accent-blue/10">
          <Icon className="w-4 h-4 text-accent-blue" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          <p className="text-xs text-text-muted">{subtitle}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted ml-auto" />
      </div>
      {/* Section body */}
      <div className="p-6 space-y-4">{children}</div>
    </Card>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label, description, children, className = '',
}: {
  label: string; description?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-medium text-text-primary">{label}</label>
      {description && <p className="text-xs text-text-muted leading-relaxed">{description}</p>}
      {children}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

function Input({
  value, onChange, placeholder, mono = false, className = '',
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; mono?: boolean; className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-sm text-text-secondary font-medium
        placeholder:text-white/30 focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/20
        transition-colors ${mono ? 'font-mono' : ''} ${className}`}
    />
  );
}

// ── Select ────────────────────────────────────────────────────────────────────

function Select({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border-subtle text-sm text-text-secondary font-medium
        focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/20 transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Note banner ───────────────────────────────────────────────────────────────

function Note({ children, kind = 'info' }: { children: React.ReactNode; kind?: 'info' | 'warning' }) {
  const styles = kind === 'warning'
    ? 'bg-accent-amber/5 border-accent-amber/20 text-accent-amber'
    : 'bg-accent-blue/5 border-accent-blue/20 text-accent-blue';
  return (
    <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border text-xs leading-relaxed ${styles}`}>
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span className="text-text-secondary">{children}</span>
    </div>
  );
}

// ── Action Button (for Data section) ─────────────────────────────────────────

function ActionButton({
  icon: Icon, label, description, color, onClick, disabled = false,
}: {
  icon: React.ElementType; label: string; description: string;
  color: 'blue' | 'green' | 'red'; onClick: () => void; disabled?: boolean;
}) {
  const colorMap = {
    blue:  'bg-accent-blue/10 border-accent-blue/20 hover:bg-accent-blue/20 text-accent-blue',
    green: 'bg-accent-green/10 border-accent-green/20 hover:bg-accent-green/20 text-accent-green',
    red:   'bg-accent-red/10 border-accent-red/20 hover:bg-accent-red/20 text-accent-red',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-start gap-2 p-4 rounded-lg border text-left transition-colors w-full
        disabled:opacity-50 disabled:cursor-not-allowed ${colorMap[color]}`}
    >
      <Icon className="w-4 h-4" />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
    </button>
  );
}

// ── Severity Preview ──────────────────────────────────────────────────────────

function SeverityPreview({ mode }: { mode: string }) {
  if (mode === 'number') return (
    <span className="text-xs font-mono font-medium text-accent-amber px-2 py-0.5 rounded bg-accent-amber/10">87.8</span>
  );
  if (mode === 'label') return (
    <span className="text-xs font-medium text-accent-red px-2 py-0.5 rounded bg-accent-red/10">Critical</span>
  );
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-mono text-text-secondary">87.8</span>
      <span className="text-xs text-text-muted">·</span>
      <span className="text-xs font-medium text-accent-red px-2 py-0.5 rounded bg-accent-red/10">Critical</span>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function ToastItem({ kind, message }: Toast) {
  const styles = {
    success: 'bg-accent-green/20 border-accent-green/30 text-accent-green',
    error:   'bg-accent-red/20 border-accent-red/30 text-accent-red',
    warning: 'bg-accent-amber/20 border-accent-amber/30 text-accent-amber',
  }[kind];
  const Icon = kind === 'success' ? CheckCircle2 : AlertTriangle;
  return (
    <div className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 ${styles}`}>
      <Icon className="w-4 h-4 shrink-0" />
      {message}
    </div>
  );
}

// helper
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}