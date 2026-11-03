import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  ShieldAlert,
  Server,
  Lock,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
      // Check health
      try {
        const res = await fetch('/health');
        const hJson = await res.json();
        setHealthStatus(hJson);
      } catch (e) {
        setHealthStatus({ status: 'offline' });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleTogglePrivateIps = async () => {
    setSaving(true);
    try {
      const updated = await api.updateSettings({
        allow_private_ips: !settings.allow_private_ips,
      });
      setSettings(updated);
    } catch (err) {
      console.error('Failed to update setting:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Platform Settings & Security</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Configure security protections, SSRF defenses, and global execution parameters.
        </p>
      </div>

      {/* System Health Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>FastAPI Testing Backend</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {healthStatus?.status || 'Active'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Service: {healthStatus?.service || 'API TestLab'} • Version: {settings.version || '1.0.0'}
            </p>
          </div>
        </div>

        <button
          onClick={loadSettings}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500"
          title="Refresh Health"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Security Architecture Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-600" />
            <span>Outbound Request Security & SSRF Protection</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Engineered to safeguard against Server-Side Request Forgery and unauthorized internal network probing.
          </p>
        </div>

        {/* Security Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white">Scheme Enforcement</span>
              <p className="text-slate-500 text-[11px] mt-0.5">Only http:// and https:// URLs are permitted. Dangerous schemes (file://, ftp://, gopher://) are blocked.</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white">Cloud Metadata Shield</span>
              <p className="text-slate-500 text-[11px] mt-0.5">Explicitly drops AWS/GCP/Azure link-local endpoints (169.254.169.254 and metadata.google.internal).</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white">DNS Rebinding Defense</span>
              <p className="text-slate-500 text-[11px] mt-0.5">Hostnames are pre-resolved via socket getaddrinfo to verify both IPv4 and IPv6 addresses.</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white">Credential Masking</span>
              <p className="text-slate-500 text-[11px] mt-0.5">Authorization tokens, API keys, and secret variables are masked in audit logs and API responses.</p>
            </div>
          </div>
        </div>

        {/* Local Private IP Toggle */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white">Allow Local / Private IP Targets</span>
              {settings.allow_private_ips ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Dev Mode Active
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Strict SSRF Enforced
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              When enabled, permits requests to localhost and 127.0.0.1 for testing local mock endpoints. Keep disabled in public production deployments.
            </p>
          </div>

          <button
            onClick={handleTogglePrivateIps}
            disabled={saving}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              settings.allow_private_ips
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
            }`}
          >
            {saving ? 'Updating...' : settings.allow_private_ips ? 'Disable Dev Mode' : 'Enable Dev Mode'}
          </button>
        </div>
      </div>

      {/* Execution Constraints */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-600" />
            <span>Execution Constraints</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Global resource bounds configured on the engine.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Default Timeout</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {settings.default_timeout_seconds || 30} seconds
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Max Timeout Ceiling</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {settings.max_timeout_seconds || 120} seconds
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Max Payload Size</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {(settings.max_response_size_bytes || 10485760) / 1024 / 1024} MB
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
