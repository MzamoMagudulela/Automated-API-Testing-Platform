import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  Trash2,
  Play,
  Clock,
  Layers,
  ArrowRight,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { TestExecution } from '../types';
import { MethodBadge, StatusBadge, ResultBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const HistoryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [historyItems, setHistoryItems] = useState<TestExecution[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Inspection Modal
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TestExecution | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory({
        method: methodFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
        limit: 100,
      });
      setHistoryItems(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [methodFilter, statusFilter]);

  // Check if URL has inspect param
  useEffect(() => {
    const inspectId = searchParams.get('inspect');
    if (inspectId) {
      handleInspect(Number(inspectId));
    }
  }, [searchParams]);

  const handleInspect = async (id: number) => {
    setDetailLoading(true);
    setInspectModalOpen(true);
    try {
      const detail = await api.getHistoryDetail(id);
      setSelectedItem(detail);
    } catch (err) {
      console.error('Failed to load execution detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Delete this execution record?')) return;
    try {
      await api.deleteHistoryItem(id);
      if (selectedItem?.id === id) setInspectModalOpen(false);
      loadHistory();
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete ALL test execution audit records?')) return;
    try {
      await api.clearHistory();
      loadHistory();
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const handleRerunInBuilder = (item: TestExecution) => {
    navigate(`/request-builder?url=${encodeURIComponent(item.endpoint_url)}&method=${item.http_method}`);
  };

  const handleCopyBody = () => {
    if (selectedItem?.response_body) {
      navigator.clipboard.writeText(selectedItem.response_body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Execution History</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Audit log of all executed requests, responses, timings, and assertion results.
          </p>
        </div>

        {historyItems.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search executions by test name or URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadHistory()}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Method Filter */}
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="w-full md:w-36 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
        >
          <option value="">All Methods</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full md:w-36 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
        >
          <option value="">All Results</option>
          <option value="pass">Passed Only</option>
          <option value="fail">Failed Only</option>
        </select>
      </div>

      {/* Execution Records Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-[10px] uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Test Name & Target Endpoint</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Executed At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {historyItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => handleInspect(item.id)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <ResultBadge isSuccess={item.is_success} />
                  </td>
                  <td className="py-3 px-4">
                    <MethodBadge method={item.http_method} size="sm" />
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-bold text-slate-900 dark:text-white truncate">{item.test_name}</div>
                    <div className="font-mono text-[11px] text-slate-400 truncate">{item.endpoint_url}</div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge statusCode={item.status_code} statusText={item.status_text} />
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {item.response_time_ms.toFixed(0)} ms
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    {new Date(item.executed_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleRerunInBuilder(item)}
                      className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Load in Request Builder"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {historyItems.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-sm">No executions found</p>
                    <p className="text-xs text-slate-500 mt-1">Execute requests to see historical logs.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Execution Modal */}
      <Modal
        isOpen={inspectModalOpen}
        onClose={() => setInspectModalOpen(false)}
        title={selectedItem?.test_name || 'Execution Details'}
        subtitle={`Executed on ${selectedItem ? new Date(selectedItem.executed_at).toLocaleString() : ''}`}
        maxWidth="2xl"
      >
        <div>
          {detailLoading && (
            <div className="py-8 flex items-center justify-center space-x-2">
              <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Loading details...</span>
            </div>
          )}

          {selectedItem && !detailLoading && (
            <div className="space-y-4">
              {/* Header Badge Strip */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MethodBadge method={selectedItem.http_method} />
                  <StatusBadge statusCode={selectedItem.status_code} statusText={selectedItem.status_text} />
                  <span className="text-xs font-mono text-slate-500">{selectedItem.response_time_ms.toFixed(0)} ms</span>
                  <span className="text-xs font-mono text-slate-400">{(selectedItem.response_size_bytes / 1024).toFixed(1)} KB</span>
                </div>
                <ResultBadge isSuccess={selectedItem.is_success} />
              </div>

              {/* Endpoint */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Target Endpoint</span>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-slate-100 break-all">
                  {selectedItem.endpoint_url}
                </div>
              </div>

              {selectedItem.error_message && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                  <span className="font-bold block">Execution Error:</span>
                  <span>{selectedItem.error_message}</span>
                </div>
              )}

              {/* Assertion Results */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Assertion Results ({selectedItem.assertion_results?.length || 0})
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {(selectedItem.assertion_results || []).map((ar, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                        ar.passed
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          [{ar.assertion_type}] {ar.target || ''} {ar.operator} {ar.expected_value || ''}
                        </span>
                        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">{ar.message}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        ar.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {ar.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  ))}

                  {(!selectedItem.assertion_results || selectedItem.assertion_results.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No assertions attached to this execution.</p>
                  )}
                </div>
              </div>

              {/* Response Body Preview */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Response Body</span>
                  {selectedItem.response_body && (
                    <button
                      onClick={handleCopyBody}
                      className="flex items-center gap-1 text-[11px] text-sky-600 hover:underline"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
                <pre className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs max-h-48 overflow-y-auto">
                  {selectedItem.response_body || (
                    <span className="italic text-slate-400">Empty response body</span>
                  )}
                </pre>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => handleRerunInBuilder(selectedItem)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                >
                  <Send className="w-3.5 h-3.5 text-sky-600" />
                  <span>Open in Request Builder</span>
                </button>

                <button
                  onClick={() => setInspectModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
