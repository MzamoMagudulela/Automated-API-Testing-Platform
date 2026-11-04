import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  Trash2,
  Clock,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Activity,
  Calendar,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';
import { TestExecution, HistorySummaryStats } from '../types';
import { MethodBadge, StatusBadge, ResultBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const HistoryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // History Data & Pagination
  const [historyItems, setHistoryItems] = useState<TestExecution[]>([]);
  const [summaryStats, setSummaryStats] = useState<HistorySummaryStats | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7days'>('all');

  // Inspection Modal
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TestExecution | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'response' | 'request' | 'assertions'>('response');

  const calculateDateBounds = () => {
    if (dateRange === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return { start_date: start.toISOString() };
    } else if (dateRange === '7days') {
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return { start_date: start.toISOString() };
    }
    return {};
  };

  const loadHistory = async (pageToLoad = page, refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const dateBounds = calculateDateBounds();
      const params = {
        method: methodFilter || undefined,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
        page: pageToLoad,
        page_size: pageSize,
        ...dateBounds,
      };

      const [pagedData, stats] = await Promise.all([
        api.getHistory(params),
        api.getHistorySummary({
          method: methodFilter || undefined,
          status: statusFilter || undefined,
          search: search.trim() || undefined,
          ...dateBounds,
        }),
      ]);

      setHistoryItems(pagedData.items || []);
      setTotal(pagedData.total || 0);
      setPage(pagedData.page || 1);
      setTotalPages(pagedData.total_pages || 1);
      setSummaryStats(stats);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadHistory(1);
  }, [methodFilter, statusFilter, dateRange, pageSize]);

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
    setActiveDetailTab('response');
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
    if (!confirm('Are you sure you want to delete this test execution record?')) return;
    try {
      await api.deleteHistoryItem(id);
      if (selectedItem?.id === id) setInspectModalOpen(false);
      loadHistory(page, true);
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete ALL test execution audit records? This action cannot be undone.')) return;
    try {
      await api.clearHistory();
      setHistoryItems([]);
      setTotal(0);
      setTotalPages(1);
      setPage(1);
      loadHistory(1, true);
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">API Testing History</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Audit log of previously executed API requests with latency, headers, payloads, and assertion results.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => loadHistory(page, true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh History"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {total > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All History</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Tests</span>
            <Activity className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{summaryStats?.total_executions ?? 0}</div>
          <span className="text-[11px] text-slate-400">Recorded executions</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Passed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summaryStats?.passed_count ?? 0}</div>
          <span className="text-[11px] text-emerald-600/80 font-medium">{summaryStats?.success_rate ?? 0}% success rate</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Failed</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{summaryStats?.failed_count ?? 0}</div>
          <span className="text-[11px] text-slate-400">Errors or assertion fails</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Latency</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {summaryStats?.avg_response_time_ms ?? 0} <span className="text-xs font-normal text-slate-500">ms</span>
          </div>
          <span className="text-[11px] text-slate-400">Mean response time</span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Fastest / Slowest</span>
            <Zap className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
            <span className="text-emerald-600">{summaryStats?.fastest_response_time_ms ? `${summaryStats.fastest_response_time_ms}ms` : '—'}</span>
            <span className="text-slate-400 font-normal mx-1">/</span>
            <span className="text-rose-600">{summaryStats?.slowest_response_time_ms ? `${summaryStats.slowest_response_time_ms}ms` : '—'}</span>
          </div>
          <span className="text-[11px] text-slate-400">Min / Max bounds</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search test name or endpoint URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                loadHistory(1);
              }
            }}
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

        {/* Date Filter */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as any)}
          className="w-full md:w-36 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="7days">Last 7 Days</option>
        </select>

        {/* Page Size */}
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="w-full md:w-28 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
        >
          <option value={10}>10 / page</option>
          <option value={15}>15 / page</option>
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
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
                <th className="py-3 px-4">Test Scenario & Endpoint</th>
                <th className="py-3 px-4">HTTP Status</th>
                <th className="py-3 px-4">Response Time</th>
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
                  <td className="py-3 px-4 max-w-sm">
                    <div className="font-bold text-slate-900 dark:text-white truncate">{item.test_name}</div>
                    <div className="font-mono text-[11px] text-slate-400 truncate">{item.endpoint_url}</div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge statusCode={item.status_code} statusText={item.status_text} />
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {item.response_time_ms.toFixed(0)} ms
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    {new Date(item.executed_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleInspect(item.id)}
                      className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Inspect Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRerunInBuilder(item)}
                      className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Rerun in Request Builder"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {historyItems.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm">No test execution records found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {search || methodFilter || statusFilter || dateRange !== 'all'
                        ? 'Try clearing or modifying your search and filter criteria.'
                        : 'Execute an API test in Request Builder or Test Cases to populate your history log.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {total > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-900 dark:text-white">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {Math.min(page * pageSize, total)}
              </span>{' '}
              of <span className="font-bold text-slate-900 dark:text-white">{total}</span> total test results
            </div>

            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              <button
                onClick={() => {
                  const newPage = Math.max(1, page - 1);
                  setPage(newPage);
                  loadHistory(newPage);
                }}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <span className="px-3 py-1.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => {
                  const newPage = Math.min(totalPages, page + 1);
                  setPage(newPage);
                  loadHistory(newPage);
                }}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Execution Details Modal */}
      <Modal
        isOpen={inspectModalOpen}
        onClose={() => setInspectModalOpen(false)}
        title={selectedItem?.test_name || 'Execution Details'}
        subtitle={`Executed on ${selectedItem ? new Date(selectedItem.executed_at).toLocaleString() : ''}`}
        maxWidth="2xl"
      >
        <div>
          {detailLoading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Loading audit details...</span>
            </div>
          )}

          {selectedItem && !detailLoading && (
            <div className="space-y-4">
              {/* Badge Bar */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MethodBadge method={selectedItem.http_method} />
                  <StatusBadge statusCode={selectedItem.status_code} statusText={selectedItem.status_text} />
                  <span className="text-xs font-mono text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {selectedItem.response_time_ms.toFixed(0)} ms
                  </span>
                  <span className="text-xs font-mono text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {(selectedItem.response_size_bytes / 1024).toFixed(1)} KB
                  </span>
                </div>
                <ResultBadge isSuccess={selectedItem.is_success} />
              </div>

              {/* Endpoint Display */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Target Endpoint URL
                </span>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-slate-100 break-all select-all">
                  {selectedItem.endpoint_url}
                </div>
              </div>

              {selectedItem.error_message && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                  <span className="font-bold block">Execution Error:</span>
                  <span>{selectedItem.error_message}</span>
                </div>
              )}

              {/* Detail Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 text-xs">
                <button
                  onClick={() => setActiveDetailTab('response')}
                  className={`pb-2 font-semibold border-b-2 transition-colors ${
                    activeDetailTab === 'response'
                      ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Response Body
                </button>
                <button
                  onClick={() => setActiveDetailTab('request')}
                  className={`pb-2 font-semibold border-b-2 transition-colors ${
                    activeDetailTab === 'request'
                      ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Headers & Payload
                </button>
                <button
                  onClick={() => setActiveDetailTab('assertions')}
                  className={`pb-2 font-semibold border-b-2 transition-colors ${
                    activeDetailTab === 'assertions'
                      ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Assertions ({selectedItem.assertion_results?.length || 0})
                </button>
              </div>

              {/* Tab: Response Body */}
              {activeDetailTab === 'response' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Response Payload</span>
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
                  <pre className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs max-h-56 overflow-y-auto">
                    {selectedItem.response_body || (
                      <span className="italic text-slate-400">Empty response body returned</span>
                    )}
                  </pre>
                </div>
              )}

              {/* Tab: Request Headers & Payload */}
              {activeDetailTab === 'request' && (
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Response Headers</span>
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs max-h-36 overflow-y-auto space-y-1">
                      {Object.entries(selectedItem.response_headers || {}).map(([hk, hv]) => (
                        <div key={hk} className="flex justify-between gap-2">
                          <span className="text-slate-500 dark:text-slate-400 font-semibold">{hk}:</span>
                          <span className="text-slate-800 dark:text-slate-200 truncate">{hv}</span>
                        </div>
                      ))}
                      {Object.keys(selectedItem.response_headers || {}).length === 0 && (
                        <span className="text-slate-400 italic">No headers recorded</span>
                      )}
                    </div>
                  </div>

                  {selectedItem.request_body && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Outbound Request Body</span>
                      <pre className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs max-h-32 overflow-y-auto">
                        {selectedItem.request_body}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Assertions */}
              {activeDetailTab === 'assertions' && (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {(selectedItem.assertion_results || []).map((ar, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                        ar.passed
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          [{ar.assertion_type}] {ar.target ? `${ar.target} ` : ''}{ar.operator} {ar.expected_value || ''}
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">{ar.message}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        ar.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {ar.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  ))}

                  {(!selectedItem.assertion_results || selectedItem.assertion_results.length === 0) && (
                    <p className="text-xs text-slate-400 italic py-4 text-center">
                      No automated assertions were recorded for this execution.
                    </p>
                  )}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => handleRerunInBuilder(selectedItem)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Send className="w-3.5 h-3.5 text-sky-600" />
                  <span>Rerun in Request Builder</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteItem(selectedItem.id)}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    Delete Record
                  </button>
                  <button
                    onClick={() => setInspectModalOpen(false)}
                    className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
