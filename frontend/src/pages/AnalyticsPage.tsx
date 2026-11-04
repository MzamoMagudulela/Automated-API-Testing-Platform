import React, { useEffect, useState, useMemo } from 'react';
import {
  Gauge,
  Zap,
  Turtle,
  CheckCircle2,
  XCircle,
  Activity,
  Calendar,
  Filter,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  AlertOctagon,
  Info,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '../services/api';
import { PerformanceAnalyticsResponse, HttpMethod } from '../types';
import { MethodBadge } from '../components/common/Badge';

const METHOD_COLORS: Record<string, string> = {
  GET: '#10b981',
  POST: '#0284c7',
  PUT: '#f59e0b',
  DELETE: '#ef4444',
  PATCH: '#8b5cf6',
  HEAD: '#06b6d4',
  OPTIONS: '#64748b',
};

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<PerformanceAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [dateRangePreset, setDateRangePreset] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [useCustomDates, setUseCustomDates] = useState(false);

  const calculateDateRange = () => {
    if (useCustomDates) {
      return {
        start_date: customStartDate ? new Date(customStartDate).toISOString() : undefined,
        end_date: customEndDate ? new Date(customEndDate).toISOString() : undefined,
      };
    }
    const now = new Date();
    if (dateRangePreset === '24h') {
      const past = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return { start_date: past.toISOString() };
    }
    if (dateRangePreset === '7d') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start_date: past.toISOString() };
    }
    if (dateRangePreset === '30d') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start_date: past.toISOString() };
    }
    return {};
  };

  const fetchAnalytics = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const range = calculateDateRange();
      const params: { start_date?: string; end_date?: string; method?: string } = {
        ...range,
      };
      if (selectedMethod !== 'ALL') {
        params.method = selectedMethod;
      }
      const response = await api.getPerformanceAnalytics(params);
      setData(response);
    } catch (err: any) {
      console.error('Failed to load performance analytics:', err);
      setError(err?.response?.data?.detail || 'Failed to fetch performance analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedMethod, dateRangePreset, useCustomDates, customStartDate, customEndDate]);

  const methodComparisonData = useMemo(() => {
    if (!data?.method_performance) return [];
    return data.method_performance.map((m) => ({
      name: m.method,
      avgMs: m.avg_response_time_ms,
      minMs: m.min_response_time_ms,
      maxMs: m.max_response_time_ms,
      count: m.count,
      successRate: m.success_rate,
      fill: METHOD_COLORS[m.method] || '#64748b',
    }));
  }, [data]);

  const latencyTrendData = useMemo(() => {
    if (!data?.response_time_trends) return [];
    return data.response_time_trends.map((t) => ({
      date: t.date,
      avg: t.avg_response_time_ms,
      min: t.min_response_time_ms,
      max: t.max_response_time_ms,
      total: t.total_requests,
      passed: t.passed_requests,
      failed: t.failed_requests,
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              API Performance Analytics
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
              <Gauge className="w-3.5 h-3.5" /> Live Benchmarks
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time latency metrics, SLA distributions, HTTP method comparisons, and automated performance insights.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-sky-600' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Date presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">
            <Calendar className="w-3.5 h-3.5 mr-1" /> Time Range:
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800">
            {(['24h', '7d', '30d', 'all'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setUseCustomDates(false);
                  setDateRangePreset(preset);
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  !useCustomDates && dateRangePreset === preset
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {preset === '24h' ? 'Last 24h' : preset === '7d' ? 'Last 7 Days' : preset === '30d' ? 'Last 30 Days' : 'All Time'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setUseCustomDates(!useCustomDates)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              useCustomDates
                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Custom Range
          </button>

          {useCustomDates && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-sky-500"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          )}
        </div>

        {/* Method Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="method-filter" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Method:
          </label>
          <select
            id="method-filter"
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-sm flex items-center gap-3">
          <AlertOctagon className="w-5 h-5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Metric Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Average Latency */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Avg Response Time</span>
              <div className="p-2 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {data?.avg_response_time_ms ?? 0}
              </span>
              <span className="text-sm font-medium text-slate-500">ms</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Min: <b className="text-slate-700 dark:text-slate-300">{data?.min_response_time_ms ?? 0}ms</b></span>
              <span>Max: <b className="text-slate-700 dark:text-slate-300">{data?.max_response_time_ms ?? 0}ms</b></span>
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>API Success Rate</span>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {data?.success_rate ?? 0}%
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {data?.successful_tests ?? 0} passed
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                {data?.failed_tests ?? 0} failed
              </span>
            </div>
          </div>

          {/* Total Executions */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Total Executed Tests</span>
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {data?.total_tests ?? 0}
              </span>
              <span className="text-sm font-medium text-slate-500">runs</span>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Executed across active test collections & direct requests
            </p>
          </div>

          {/* Fastest Request Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Fastest Request</span>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            {data?.fastest_request ? (
              <>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                    {data.fastest_request.response_time_ms}
                  </span>
                  <span className="text-sm font-medium text-slate-500">ms</span>
                </div>
                <div className="mt-2 flex items-center gap-2 truncate">
                  <MethodBadge method={data.fastest_request.http_method as HttpMethod} />
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate" title={data.fastest_request.endpoint_url}>
                    {data.fastest_request.endpoint_url}
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-4 text-xs text-slate-400 italic">No executions logged yet</p>
            )}
          </div>
        </div>
      )}

      {/* Extreme Comparison: Fastest vs Slowest Banner */}
      {data?.fastest_request && data?.slowest_request && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Fastest Request Spotlight */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 flex items-start gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-xl">
              <Zap className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Peak Performance (Fastest)
                </span>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                  {data.fastest_request.response_time_ms} ms
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <MethodBadge method={data.fastest_request.http_method as HttpMethod} />
                <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate" title={data.fastest_request.endpoint_url}>
                  {data.fastest_request.endpoint_url}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-4">
                <span>Status: <b className="text-emerald-600">{data.fastest_request.status_code || 200}</b></span>
                <span>Executed: {new Date(data.fastest_request.executed_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Slowest Request Spotlight */}
          <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 rounded-xl p-4 flex items-start gap-4">
            <div className="p-3 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-xl">
              <Turtle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                  Bottleneck Outlier (Slowest)
                </span>
                <span className="text-lg font-bold text-rose-700 dark:text-rose-400 font-mono">
                  {data.slowest_request.response_time_ms} ms
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <MethodBadge method={data.slowest_request.http_method as HttpMethod} />
                <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate" title={data.slowest_request.endpoint_url}>
                  {data.slowest_request.endpoint_url}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-4">
                <span>Status: <b className="text-rose-600">{data.slowest_request.status_code || 500}</b></span>
                <span>Executed: {new Date(data.slowest_request.executed_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Over Time Trend */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                Response Time Trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Average vs peak latency progression over time (ms)
              </p>
            </div>
            <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>

          <div className="h-72 w-full">
            {latencyTrendData.length === 0 || latencyTrendData.every((d) => d.total === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                <Clock className="w-8 h-8 mb-2 opacity-50" />
                <span>No latency timeline points for selected interval</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latencyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="peakGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="ms" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '8px',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="avg"
                    name="Average Latency (ms)"
                    stroke="#0284c7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#latencyGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="max"
                    name="Max Peak (ms)"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#peakGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Method Performance Comparison */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                HTTP Method Latency Benchmark
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Average latency (ms) partitioned by HTTP verb
              </p>
            </div>
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Gauge className="w-4 h-4" />
            </span>
          </div>

          <div className="h-72 w-full">
            {methodComparisonData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                <Activity className="w-8 h-8 mb-2 opacity-50" />
                <span>No HTTP method benchmark records</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={methodComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="ms" />
                  <Tooltip
                    formatter={(val: any, name?: any) => [
                      `${val} ms`,
                      name === 'avgMs' ? 'Avg Duration' : name === 'minMs' ? 'Min Duration' : 'Max Duration',
                    ]}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '8px',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="avgMs" name="Avg Latency (ms)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="minMs" name="Min Latency (ms)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Granular Method Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-base">
              HTTP Method Performance Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Detailed latency aggregates, volume, and success percentages by verb
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3 text-right">Volume</th>
                <th className="px-5 py-3 text-right">Avg Response</th>
                <th className="px-5 py-3 text-right">Min Latency</th>
                <th className="px-5 py-3 text-right">Max Latency</th>
                <th className="px-5 py-3 text-right">Success Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data?.method_performance && data.method_performance.length > 0 ? (
                data.method_performance.map((m) => (
                  <tr key={m.method} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <MethodBadge method={m.method as HttpMethod} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-900 dark:text-white">
                      {m.count}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-sky-600 dark:text-sky-400 font-semibold">
                      {m.avg_response_time_ms} ms
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {m.min_response_time_ms} ms
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-amber-600 dark:text-amber-400">
                      {m.max_response_time_ms} ms
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        m.success_rate >= 90
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : m.success_rate >= 75
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {m.success_rate}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-sm">
                    No HTTP method performance data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Automated Performance Insights */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-base">
              Performance Insights & Diagnostics
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Heuristic automated diagnostic findings generated from your API testing telemetry
            </p>
          </div>
          <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
            <Info className="w-4 h-4" />
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.insights && data.insights.length > 0 ? (
            data.insights.map((insight, idx) => {
              const isSuccess = insight.category === 'success';
              const isWarning = insight.category === 'warning';
              const isDanger = insight.category === 'danger';

              const icon = isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : isWarning ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              ) : isDanger ? (
                <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              ) : (
                <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
              );

              const bgClasses = isSuccess
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/60'
                : isWarning
                ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/60'
                : isDanger
                ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/60'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800';

              return (
                <div key={idx} className={`p-4 rounded-xl border flex items-start gap-3.5 ${bgClasses}`}>
                  {icon}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {insight.title}
                      </h4>
                      {insight.metric && (
                        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs border border-slate-200/60 dark:border-slate-700">
                          {insight.metric}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {insight.message}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 py-6 text-center text-slate-400 text-xs italic">
              No performance insights to display.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
