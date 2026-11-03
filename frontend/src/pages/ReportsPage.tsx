import React, { useState, useEffect } from 'react';
import {
  FileBarChart2,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';
import { ReportSummary, TestCollection } from '../types';
import { MethodBadge, StatusBadge, ResultBadge } from '../components/common/Badge';

export const ReportsPage: React.FC = () => {
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [collections, setCollections] = useState<TestCollection[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [collectionFilter, setCollectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const loadReport = async () => {
    setLoading(true);
    try {
      const [rep, cols] = await Promise.all([
        api.getReportSummary({
          collection_id: collectionFilter ? Number(collectionFilter) : undefined,
          status: statusFilter || undefined,
          method: methodFilter || undefined,
        }),
        api.getCollections(),
      ]);
      setReport(rep);
      setCollections(cols);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [collectionFilter, statusFilter, methodFilter]);

  const csvUrl = api.getReportCsvUrl({
    collection_id: collectionFilter ? Number(collectionFilter) : undefined,
    status: statusFilter || undefined,
    method: methodFilter || undefined,
  });

  const pdfUrl = api.getReportPdfUrl({
    collection_id: collectionFilter ? Number(collectionFilter) : undefined,
    status: statusFilter || undefined,
    method: methodFilter || undefined,
  });

  return (
    <div className="space-y-6">
      {/* Title & Downloads */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Reports & Documentation</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate and export comprehensive testing audit documentation in CSV and PDF formats.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Download CSV */}
          <a
            href={csvUrl}
            download
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </a>

          {/* Download PDF */}
          <a
            href={pdfUrl}
            download
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm shadow-sky-600/30 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF Report</span>
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 shrink-0">
          <Filter className="w-4 h-4" />
          <span>Report Scope:</span>
        </div>

        <select
          value={collectionFilter}
          onChange={(e) => setCollectionFilter(e.target.value)}
          className="w-full md:w-56 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
        >
          <option value="">All Collections</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full md:w-44 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
        >
          <option value="">All Statuses</option>
          <option value="pass">Passed Tests Only</option>
          <option value="fail">Failed Tests Only</option>
        </select>

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
      </div>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Scoped Tests</span>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{report?.total_tests || 0}</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Passed Tests</span>
          <div className="text-xl font-bold text-emerald-600 mt-1">{report?.passed_tests || 0}</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Failed Tests</span>
          <div className="text-xl font-bold text-rose-600 mt-1">{report?.failed_tests || 0}</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Success Rate</span>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{report?.success_rate || 0}%</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400">Avg Response Time</span>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{report?.avg_response_time_ms || 0} ms</div>
        </div>
      </div>

      {/* Failure Highlights Section if any */}
      {(report?.total_failed_assertions || 0) > 0 && (
        <div className="p-5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
              Failed Assertions Warning ({report?.total_failed_assertions} total assertion failures)
            </h3>
          </div>
          <p className="text-xs text-rose-700 dark:text-rose-300">
            One or more assertions did not meet the configured thresholds. Review the breakdown below before generating release sign-off.
          </p>
        </div>
      )}

      {/* Report Executions Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Execution Audit Table Preview</h3>
          <span className="text-xs text-slate-400 font-mono">
            Generated {report ? new Date(report.generated_at).toLocaleTimeString() : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-[10px] uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Result</th>
                <th className="py-2.5 px-4">Method</th>
                <th className="py-2.5 px-4">Test Name & URL</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Latency</th>
                <th className="py-2.5 px-4">Failed Assertions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(report?.executions || []).map((ex) => {
                const failedAssertions = (ex.assertion_results || []).filter((a) => !a.passed);
                return (
                  <tr key={ex.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <ResultBadge isSuccess={ex.is_success} />
                    </td>
                    <td className="py-3 px-4">
                      <MethodBadge method={ex.http_method} size="sm" />
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 dark:text-white truncate">{ex.test_name}</div>
                      <div className="font-mono text-[11px] text-slate-400 truncate">{ex.endpoint_url}</div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge statusCode={ex.status_code} statusText={ex.status_text} />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {ex.response_time_ms.toFixed(0)} ms
                    </td>
                    <td className="py-3 px-4">
                      {failedAssertions.length > 0 ? (
                        <div className="space-y-1">
                          {failedAssertions.map((fa, idx) => (
                            <span
                              key={idx}
                              className="inline-block text-[10px] font-mono bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 px-1.5 py-0.5 rounded mr-1"
                            >
                              [{fa.assertion_type}]: {fa.message}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-emerald-600 font-semibold text-[11px]">All Passed</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {(!report?.executions || report.executions.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No executions matched the selected filter criteria.
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
