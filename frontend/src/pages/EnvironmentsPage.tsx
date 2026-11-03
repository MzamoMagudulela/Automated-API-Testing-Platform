import React, { useState, useEffect } from 'react';
import {
  Server,
  Plus,
  Check,
  Edit,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Code,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../services/api';
import { Environment, EnvironmentVariable } from '../types';
import { Modal } from '../components/common/Modal';

export const EnvironmentsPage: React.FC = () => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(false);
  const [formVariables, setFormVariables] = useState<EnvironmentVariable[]>([]);

  const loadEnvironments = async () => {
    setLoading(true);
    try {
      const data = await api.getEnvironments();
      setEnvironments(data);
    } catch (err) {
      console.error('Failed to load environments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnvironments();
  }, []);

  const handleOpenCreate = () => {
    setEditingEnv(null);
    setFormName('');
    setFormBaseUrl('https://api.example.com/v1');
    setFormDescription('');
    setFormIsActive(false);
    setFormVariables([
      { key: 'token', value: '', is_secret: true },
      { key: 'userId', value: '1', is_secret: false },
    ]);
    setModalOpen(true);
  };

  const handleOpenEdit = async (env: Environment) => {
    setEditingEnv(env);
    setFormName(env.name);
    setFormBaseUrl(env.base_url || '');
    setFormDescription(env.description || '');
    setFormIsActive(env.is_active);
    setFormVariables(env.variables || []);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const payload = {
      name: formName.trim(),
      base_url: formBaseUrl.trim(),
      description: formDescription,
      is_active: formIsActive,
      variables: formVariables.filter((v) => v.key.trim()),
    };

    try {
      if (editingEnv) {
        await api.updateEnvironment(editingEnv.id, payload);
      } else {
        await api.createEnvironment(payload);
      }
      setModalOpen(false);
      loadEnvironments();
      window.dispatchEvent(new Event('environmentChanged'));
    } catch (err) {
      console.error('Failed to save environment:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this environment?')) return;
    try {
      await api.deleteEnvironment(id);
      loadEnvironments();
      window.dispatchEvent(new Event('environmentChanged'));
    } catch (err) {
      console.error('Failed to delete environment:', err);
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await api.activateEnvironment(id);
      loadEnvironments();
      window.dispatchEvent(new Event('environmentChanged'));
    } catch (err) {
      console.error('Failed to activate environment:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Environment Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure target base URLs and secure variables for Development, Testing, and Production.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm shadow-sky-600/30 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Environment</span>
        </button>
      </div>

      {/* Info Callout for Syntax */}
      <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
        <Code className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-sky-900 dark:text-sky-200">How to use variables in URLs and Payloads:</span>
          <p className="mt-0.5 text-slate-600 dark:text-slate-400">
            Use <code className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800 font-mono text-sky-700 dark:text-sky-300">&#123;&#123;baseUrl&#125;&#125;</code> or any custom variable like <code className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800 font-mono text-sky-700 dark:text-sky-300">&#123;&#123;apiKey&#125;&#125;</code> in URL endpoints, request headers, query params, or JSON bodies. They will be resolved at execution time.
          </p>
        </div>
      </div>

      {/* Environments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {environments.map((env) => (
          <div
            key={env.id}
            className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
              env.is_active
                ? 'bg-white dark:bg-slate-900 border-sky-400 dark:border-sky-600 shadow-md ring-2 ring-sky-500/10'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
            }`}
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    env.is_active ? 'bg-sky-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{env.name}</span>
                      {env.is_active && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                          Active
                        </span>
                      )}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(env)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit Environment"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(env.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Environment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Base URL */}
              <div className="mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Base URL</span>
                <div className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 truncate">
                  {env.base_url || <span className="text-slate-400 italic">No base URL</span>}
                </div>
              </div>

              {/* Variables Preview */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Variables ({env.variables?.length || 0})
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {(env.variables || []).map((v) => (
                    <div
                      key={v.id || v.key}
                      className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                    >
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[110px]">
                        {v.key}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-slate-500 text-[11px] truncate max-w-[130px]">
                        {v.is_secret && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                        <span className="truncate">{v.value || '""'}</span>
                      </div>
                    </div>
                  ))}

                  {(!env.variables || env.variables.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No variables set</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {!env.is_active ? (
                <button
                  onClick={() => handleActivate(env.id)}
                  className="w-full py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Set as Active
                </button>
              ) : (
                <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Currently In Use
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEnv ? 'Edit Environment' : 'Create Environment'}
        subtitle="Manage base URL and variables for target deployment"
        maxWidth="xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Environment Name *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Staging or Production"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Base URL Endpoint
            </label>
            <input
              type="text"
              value={formBaseUrl}
              onChange={(e) => setFormBaseUrl(e.target.value)}
              placeholder="https://api.yourdomain.com"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Optional notes or details"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500"
            />
            <span>Set as active environment immediately</span>
          </label>

          {/* Variables Table */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Environment Variables</span>
              <button
                type="button"
                onClick={() =>
                  setFormVariables([...formVariables, { key: '', value: '', is_secret: false }])
                }
                className="text-xs text-sky-600 hover:underline font-semibold"
              >
                + Add Variable
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto">
              {formVariables.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Key (e.g. token)"
                    value={v.key}
                    onChange={(e) => {
                      const copy = [...formVariables];
                      copy[i].key = e.target.value;
                      setFormVariables(copy);
                    }}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  />
                  <input
                    type={v.is_secret ? 'password' : 'text'}
                    placeholder="Value"
                    value={v.value}
                    onChange={(e) => {
                      const copy = [...formVariables];
                      copy[i].value = e.target.value;
                      setFormVariables(copy);
                    }}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  />
                  <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer" title="Secret variables are masked in API responses">
                    <input
                      type="checkbox"
                      checked={v.is_secret}
                      onChange={(e) => {
                        const copy = [...formVariables];
                        copy[i].is_secret = e.target.checked;
                        setFormVariables(copy);
                      }}
                      className="rounded text-amber-500"
                    />
                    <span>Secret</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormVariables(formVariables.filter((_, idx) => idx !== i))}
                    className="p-1 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
            >
              Save Environment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
