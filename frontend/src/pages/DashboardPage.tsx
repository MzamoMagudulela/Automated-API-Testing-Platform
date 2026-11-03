import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  FolderTree,
  FileCode2,
  TrendingUp,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { api } from '../services/api';
import { DashboardStats, TestExecution } from '../types';
import { MethodBadge, StatusBadge, ResultBadge } from '../components/common/Badge';

const METHOD_COLORS: Record<string, string> = {
  GET: '#10b981',
  POST: '#0284c7',
  PUT: '#f59e0b',
  DELETE: '#ef4444',
  PATCH: '#8b5cf6',
  OTHER: '#64748b',
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
        <span className="text-sm font-medium text-slate-500">Loading dashboard metrics...</span>
      </div>
    );
  }

  const methodPieData = (stats?.method_distribution || []).map((m) => ({
    name: m.method,
    value: m.count,
  }));

  return (
    <div className="space-y-6">
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">API Testing Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time analytics and performance health across test executions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadStats(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => navigate('/request-builder')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm shadow-sky-600/30 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Test Endpoint</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Executions */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Executed</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats?.total_tests || 0}</div>
            <span className="text-xs text-slate-500 mt-1 block">Audit executions stored</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Success Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Success Rate</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 flex items-baseline gap-1">
              <span>{stats?.success_rate ?? 0}%</span>
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 block font-medium">
              {stats?.successful_tests || 0} passed / {stats?.failed_tests || 0} failed
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Average Latency */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Average Latency</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {stats?.avg_response_time_ms ?? 0} <span className="text-sm font-normal text-slate-500">ms</span>
            </div>
            <span className="text-xs text-slate-500 mt-1 block">Across all HTTP requests</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Test Inventory */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Inventory</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {stats?.total_test_cases || 0} <span className="text-sm font-normal text-slate-500">tests</span>
            </div>
            <span className="text-xs text-slate-500 mt-1 block">{stats?.total_collections || 0} collections configured</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
            <FolderTree className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Over Time (2 Columns) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">API Testing Activity Over Time</h3>
              <p className="text-xs text-slate-500">Daily breakdown of passed vs failed tests</p>
            </div>
            <span className="text-xs font-mono text-slate-400">Last 7 Days</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.activity_trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="passedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="failedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="passed" name="Passed Tests" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#passedGradient)" />
                <Area type="monotone" dataKey="failed" name="Failed Tests" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#failedGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Method Distribution (1 Column) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">HTTP Method Distribution</h3>
            <p className="text-xs text-slate-500">Distribution of executed verbs</p>
          </div>

          <div className="h-56 w-full my-auto flex items-center justify-center">
            {methodPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={methodPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {methodPieData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={METHOD_COLORS[entry.name] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No test data recorded yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Latency Performance Trends */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Response Time Performance Trend</h3>
            <p className="text-xs text-slate-500">Average latency (ms) per calendar day</p>
          </div>
          <span className="text-xs font-mono text-slate-400">Latency (ms)</span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.latency_trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                  border: 'none',
                }}
              />
              <Line
                type="monotone"
                dataKey="avg_latency_ms"
                name="Avg Latency (ms)"
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#0284c7' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Executions Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Test Executions</h3>
            <p className="text-xs text-slate-500">Latest activity records from database</p>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
          >
            <span>View All History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-2.5 px-3 rounded-l-lg">Result</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Test Name & Endpoint</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3 rounded-r-lg">Executed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(stats?.recent_executions || []).map((ex) => (
                <tr
                  key={ex.id}
                  onClick={() => navigate(`/history?inspect=${ex.id}`)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3">
                    <ResultBadge isSuccess={ex.is_success} />
                  </td>
                  <td className="py-3 px-3">
                    <MethodBadge method={ex.http_method} size="sm" />
                  </td>
                  <td className="py-3 px-3 max-w-xs">
                    <div className="font-semibold text-slate-900 dark:text-white truncate">{ex.test_name}</div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">{ex.endpoint_url}</div>
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge statusCode={ex.status_code} statusText={ex.status_text} />
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                    {ex.response_time_ms.toFixed(0)} ms
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {new Date(ex.executed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}

              {(!stats?.recent_executions || stats.recent_executions.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No executions recorded yet. Execute an API test to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
