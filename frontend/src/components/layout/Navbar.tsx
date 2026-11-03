import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Sun, Moon, Plus, Server, Check } from 'lucide-react';
import { api } from '../../services/api';
import { Environment } from '../../types';

interface NavbarProps {
  onToggleSidebar: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, theme, onToggleTheme }) => {
  const navigate = useNavigate();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnv, setActiveEnv] = useState<Environment | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fetchEnvironments = async () => {
    try {
      const data = await api.getEnvironments();
      setEnvironments(data);
      const active = data.find((e) => e.is_active);
      setActiveEnv(active || null);
    } catch (err) {
      console.error('Failed to load environments:', err);
    }
  };

  useEffect(() => {
    fetchEnvironments();
    // Listen to custom window event if environment changes elsewhere
    const handleEnvChange = () => fetchEnvironments();
    window.addEventListener('environmentChanged', handleEnvChange);
    return () => window.removeEventListener('environmentChanged', handleEnvChange);
  }, []);

  const handleSelectEnv = async (envId: number) => {
    try {
      const updated = await api.activateEnvironment(envId);
      setActiveEnv(updated);
      setDropdownOpen(false);
      window.dispatchEvent(new Event('environmentChanged'));
    } catch (err) {
      console.error('Failed to activate environment:', err);
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 z-30 sticky top-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Environment Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors shadow-sm"
          >
            <Server className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden sm:inline text-slate-500 dark:text-slate-400">Environment:</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
              {activeEnv ? activeEnv.name : 'No Environment (Raw URLs)'}
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Target</span>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/environments');
                  }}
                  className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Manage
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto py-1">
                {environments.map((env) => {
                  const isActive = activeEnv?.id === env.id;
                  return (
                    <button
                      key={env.id}
                      onClick={() => handleSelectEnv(env.id)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                        isActive
                          ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate">{env.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{env.base_url || 'No Base URL'}</div>
                      </div>
                      {isActive && <Check className="w-4 h-4 text-sky-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* New Request Button */}
        <button
          onClick={() => navigate('/request-builder')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm shadow-sky-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Request</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
