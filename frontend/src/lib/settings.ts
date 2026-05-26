export interface AppSettings {
  profile: {
    name: string;
    role: string;
    organization: string;
    initials: string;
  };
  simulation_defaults: {
    sector: string;
    time_horizon: string;
    uc2_priority: string;
  };
  system: {
    api_base_url: string;
    risk_threshold: number;
  };
  display: {
    severity_display: string;
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  profile: {
    name: '',
    role: '',
    organization: '',
    initials: '',
  },
  simulation_defaults: {
    sector: 'healthcare',
    time_horizon: 'medium',
    uc2_priority: 'balanced',
  },
  system: {
    api_base_url: 'http://localhost:8000',
    risk_threshold: 60,
  },
  display: {
    severity_display: 'both',
  },
};

const SETTINGS_KEY = 'agentnation_settings';

export function getSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    // Deep merge would be better here, but shallow merge is sufficient for this structure
    const parsed = JSON.parse(stored);
    return {
      profile: { ...DEFAULT_SETTINGS.profile, ...parsed.profile },
      simulation_defaults: { ...DEFAULT_SETTINGS.simulation_defaults, ...parsed.simulation_defaults },
      system: { ...DEFAULT_SETTINGS.system, ...parsed.system },
      display: { ...DEFAULT_SETTINGS.display, ...parsed.display },
    };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event('agentnation-settings-updated'));
}

export function resetSettings(): AppSettings {
  localStorage.removeItem(SETTINGS_KEY);
  window.dispatchEvent(new Event('agentnation-settings-updated'));
  return DEFAULT_SETTINGS;
}

export function deriveInitials(name: string): string {
  if (!name || !name.trim()) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}