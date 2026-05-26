import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getSettings } from '@/lib/settings';
import { 
  Home, 
  Activity, 
  Users, 
  TrendingUp, 
  Shield, 
  FileText, 
  Settings,
  Bell,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'Home Dashboard', icon: Home, path: '/' },
  { label: 'Policy Impact Simulations', icon: Activity, path: '/simulation' },
  { label: 'Policy Scenario Comparison', icon: Users, path: '/workforce' },
  // { label: 'Scenario Analysis', icon: TrendingUp, path: '/scenarios' },
  { label: 'Workforce Portfolio Risk Monitor', icon: Shield, path: '/risk' },
  { label: 'Reports & Briefings', icon: FileText, path: '/reports' },
  { label: 'Settings / Governance', icon: Settings, path: '/settings' },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const [settings, setSettings] = useState(getSettings());

  useEffect(() => {
    const handler = () => setSettings(getSettings());
    window.addEventListener('agentnation-settings-updated', handler);
    return () => window.removeEventListener('agentnation-settings-updated', handler);
  }, []);

  return (
    <div className="min-h-screen bg-background grid-bg flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-border-subtle bg-bg-surface flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-[80px] h-[80px] flex-shrink-0 flex items-center justify-center overflow-hidden rounded-lg">
              <img src="/logo.png" alt="AgentNation Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-primary font-mono tracking-tight">AgentNation</h1>
              <p className="text-[10px] leading-tight text-text-muted mt-1">AI-Assisted Policy &</p>
              <p className="text-[10px] leading-tight text-text-muted">Workforce Intelligence</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "text-sm font-medium",
                  isActive 
                    ? "bg-accent-blue/10 text-accent-blue border border-accent-blue/20" 
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle">
          <div className="text-xs text-text-muted font-mono">
            <div>Government-Grade System</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              v2.4.1 • Secure Mode
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-14 border-b border-border-subtle bg-bg-surface flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="text-sm text-text-muted font-mono">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-bg-elevated rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-text-secondary" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-accent-amber rounded-full" />
            </button>
            
            <button className="p-2 hover:bg-bg-elevated rounded-lg transition-colors">
              <HelpCircle className="w-5 h-5 text-text-secondary" />
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-border-subtle">
              <div className="text-right">
                <div className="text-sm font-medium text-text-primary">{settings.profile.name || 'Set your name'}</div>
                <div className="text-xs text-text-muted">{settings.profile.role || 'Settings'}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-accent-blue flex items-center justify-center text-white font-semibold flex-shrink-0">
                {settings.profile.initials || '??'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}