import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FileCode2,
  Plus,
  Search,
  Filter,
  Play,
  Edit,
  Trash2,
  Copy,
  Clock,
  Layers,
  CheckCircle2,
  XCircle,
  FolderTree,
} from 'lucide-react';
import { api } from '../services/api';
import type { TestCase, TestCollection, TestCaseAssertion, ExecuteResponsePayload, HttpMethod } from '../types';
import { MethodBadge, StatusBadge, ResultBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const TestCasesPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [collections, setCollections] = useState<TestCollection[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [collectionFilter, setCollectionFilter] = useState<string>('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCollectionId, setFormCollectionId] = useState<number | undefined>(undefined);
  const [formMethod, setFormMethod] = useState<HttpMethod>('GET');
  const [formUrl, setFormUrl] = useState('{{baseUrl}}/users');
  const [formExpectedStatus, setFormExpectedStatus] = useState<number | undefined>(200);
  const [formMaxLatency, setFormMaxLatency] = useState<number | undefined>(1500);
  const [formBody, setFormBody] = useState('');
  const [formAssertions, setFormAssertions] = useState<TestCaseAssertion[]>([]);

  // Execution Modal
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runningTest, setRunningTest] = useState<TestCase | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecuteResponsePayload | null>(null);
  const [executing, setExecuting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tcList, colList] = await Promise.all([
        api.getTestCases({
          method: methodFilter || undefined,
          collection_id: collectionFilter ? Number(collectionFilter) : undefined,
          search: search || undefined,
        }),
        api.getCollections(),
      ]);
      setTestCases(tcList);
      setCollections(colList);
    } catch (err) {
      console.error('Failed to load test cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [methodFilter, collectionFilter]);

  // Check if routed with initial data to save as test case
  useEffect(() => {
    if (location.state) {
      const s = location.state as any;
      if (s.initialUrl) setFormUrl(s.initialUrl);
      if (s.initialMethod) setFormMethod(s.initialMethod);
      if (s.initialBody) setFormBody(s.initialBody);
      if (s.initialAssertions) setFormAssertions(s.initialAssertions);
      setFormName(`Test ${s.initialMethod || 'GET'} ${s.initialUrl || ''}`);
      setModalOpen(true);
    }
  }, [location.state]);

  const handleOpenCreate = () => {
    setEditingTestCase(null);
    setFormName('');
    setFormDescription('');
    setFormCollectionId(undefined);
    setFormMethod('GET');
    setFormUrl('{{baseUrl}}/users');
    setFormExpectedStatus(200);
    setFormMaxLatency(1500);
    setFormBody('');
    setFormAssertions([
      { assertion_type: 'status_code', operator: 'equals', expected_value: '200' },
    ]);
    setModalOpen(true);
  };

  const handleOpenEdit = (tc: TestCase) => {
    setEditingTestCase(tc);
    setFormName(tc.name);
    setFormDescription(tc.description || '');
    setFormCollectionId(tc.collection_id || undefined);
    setFormMethod(tc.method);
    setFormUrl(tc.url);
    setFormExpectedStatus(tc.expected_status_code || undefined);
    setFormMaxLatency(tc.max_response_time_ms || undefined);
    setFormBody(tc.body || '');
    setFormAssertions(tc.assertions || []);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formUrl.trim()) return;

    const payload = {
      name: formName,
      description: formDescription,
      collection_id: formCollectionId,
      method: formMethod,
      url: formUrl,
      expected_status_code: formExpectedStatus ? Number(formExpectedStatus) : undefined,
      max_response_time_ms: formMaxLatency ? Number(formMaxLatency) : undefined,
      body: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(formMethod) ? formBody : undefined,
      assertions: formAssertions,
    };

    try {
      if (editingTestCase) {
        await api.updateTestCase(editingTestCase.id, payload);
      } else {
        await api.createTestCase(payload);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to save test case:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this test case?')) return;
    try {
      await api.deleteTestCase(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete test case:', err);
    }
  };

  // Run Test Case Inline
  const handleRunTestCase = async (tc: TestCase) => {
    setRunningTest(tc);
    setExecutionResult(null);
    setExecuting(true);
    setRunModalOpen(true);

    try {
      const res = await api.executeTestCase(tc.id);
      setExecutionResult(res);
    } catch (err: any) {
      setExecutionResult({
        status_code: null,
        status_text: 'Failed',
        response_time_ms: 0,
        response_size_bytes: 0,
        headers: {},
        body: null,
        error_message: err.message || 'Execution failed',
        is_success: false,
        assertion_results: [],
        resolved_url: tc.url,
        resolved_headers: {},
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">API Test Cases</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create, configure and manage reusable automated tests with validation thresholds.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm shadow-sky-600/30 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Test Case</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search test cases by name or endpoint URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadData()}
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

        {/* Collection Filter */}
        <select
          value={collectionFilter}
          onChange={(e) => setCollectionFilter(e.target.value)}
          className="w-full md:w-48 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
        >
          <option value="">All Collections</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Test Cases Table / List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Test Name & Description</th>
                <th className="py-3 px-4">Target Endpoint</th>
                <th className="py-3 px-4">Collection</th>
                <th className="py-3 px-4">Expected</th>
                <th className="py-3 px-4">Assertions</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {testCases.map((tc) => {
                const col = collections.find((c) => c.id === tc.collection_id);
                return (
                  <tr key={tc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <MethodBadge method={tc.method} />
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 dark:text-white truncate">{tc.name}</div>
                      {tc.description && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{tc.description}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {tc.url}
                    </td>
                    <td className="py-3.5 px-4">
                      {col ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          <FolderTree className="w-3 h-3 text-sky-500" />
                          {col.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Standalone</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {tc.expected_status_code && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold mr-2">
                          Status {tc.expected_status_code}
                        </span>
                      )}
                      {tc.max_response_time_ms && (
                        <span className="text-slate-500">&le; {tc.max_response_time_ms}ms</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                        {tc.assertions?.length || 0} assertions
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleRunTestCase(tc)}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                        title="Run Test Case"
                      >
                        <Play className="w-4 h-4 fill-emerald-600" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(tc)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Test Case"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Test Case"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {testCases.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileCode2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No test cases found</p>
                    <p className="text-xs text-slate-500 mt-1">Create a new test case to begin automated testing.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Test Case Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTestCase ? 'Edit Test Case' : 'Create New API Test Case'}
        subtitle="Define reusable endpoint parameters, payload and assertions"
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Test Name *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Verify User Authentication"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Collection</label>
              <select
                value={formCollectionId || ''}
                onChange={(e) => setFormCollectionId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              >
                <option value="">None (Standalone)</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Brief description of the test scenario"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Method *</label>
              <select
                value={formMethod}
                onChange={(e) => setFormMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">URL Endpoint *</label>
              <input
                type="text"
                required
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="{{baseUrl}}/users"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Expected Status Code</label>
              <input
                type="number"
                value={formExpectedStatus || ''}
                onChange={(e) => setFormExpectedStatus(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="200"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Acceptable Latency (ms)</label>
              <input
                type="number"
                value={formMaxLatency || ''}
                onChange={(e) => setFormMaxLatency(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="1000"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
              />
            </div>
          </div>

          {['POST', 'PUT', 'PATCH', 'DELETE'].includes(formMethod) && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">JSON Request Body</label>
              <textarea
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                rows={4}
                placeholder='{\n  "name": "Alex"\n}'
                className="w-full p-2.5 font-mono text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          {/* Assertions Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Assertions ({formAssertions.length})</span>
              <button
                type="button"
                onClick={() =>
                  setFormAssertions([
                    ...formAssertions,
                    { assertion_type: 'jsonpath', target: '$.status', operator: 'equals', expected_value: 'success' },
                  ])
                }
                className="text-xs text-sky-600 hover:underline font-semibold"
              >
                + Add Assertion
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {formAssertions.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <select
                    value={a.assertion_type}
                    onChange={(e) => {
                      const copy = [...formAssertions];
                      copy[i].assertion_type = e.target.value as any;
                      setFormAssertions(copy);
                    }}
                    className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="status_code">Status Code</option>
                    <option value="response_time">Response Time</option>
                    <option value="jsonpath">JSONPath</option>
                    <option value="header">Header</option>
                    <option value="body_contains">Body Contains</option>
                  </select>

                  {['jsonpath', 'header'].includes(a.assertion_type) && (
                    <input
                      type="text"
                      placeholder="Target"
                      value={a.target || ''}
                      onChange={(e) => {
                        const copy = [...formAssertions];
                        copy[i].target = e.target.value;
                        setFormAssertions(copy);
                      }}
                      className="flex-1 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-xs"
                    />
                  )}

                  <select
                    value={a.operator}
                    onChange={(e) => {
                      const copy = [...formAssertions];
                      copy[i].operator = e.target.value as any;
                      setFormAssertions(copy);
                    }}
                    className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="equals">==</option>
                    <option value="not_equals">!=</option>
                    <option value="contains">contains</option>
                    <option value="less_than">&lt;</option>
                    <option value="less_than_or_equal">&lt;=</option>
                    <option value="greater_than">&gt;</option>
                    <option value="exists">exists</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Expected"
                    value={a.expected_value || ''}
                    onChange={(e) => {
                      const copy = [...formAssertions];
                      copy[i].expected_value = e.target.value;
                      setFormAssertions(copy);
                    }}
                    className="flex-1 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-xs"
                  />

                  <button
                    type="button"
                    onClick={() => setFormAssertions(formAssertions.filter((_, idx) => idx !== i))}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm"
            >
              {editingTestCase ? 'Update Test Case' : 'Create Test Case'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Live Execution Results Modal */}
      <Modal
        isOpen={runModalOpen}
        onClose={() => setRunModalOpen(false)}
        title={`Execution Result: ${runningTest?.name || ''}`}
        subtitle={`${runningTest?.method || ''} ${runningTest?.url || ''}`}
        maxWidth="2xl"
      >
        <div>
          {executing && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
              <span className="text-xs font-medium text-slate-500">Executing test case and running assertions...</span>
            </div>
          )}

          {executionResult && !executing && (
            <div className="space-y-4">
              {/* Status Header */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge statusCode={executionResult.status_code} statusText={executionResult.status_text} />
                  <span className="text-xs font-mono text-slate-500">
                    {executionResult.response_time_ms.toFixed(0)} ms
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {(executionResult.response_size_bytes / 1024).toFixed(1)} KB
                  </span>
                </div>
                <ResultBadge isSuccess={executionResult.is_success} />
              </div>

              {/* Assertions Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Assertion Results</h4>
                {(executionResult.assertion_results || []).map((ar, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                      ar.passed
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        [{ar.assertion_type}] {ar.target || ''} {ar.operator} {ar.expected_value || ''}
                      </div>
                      <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 mt-0.5">{ar.message}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      ar.passed ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                    }`}>
                      {ar.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                ))}

                {(!executionResult.assertion_results || executionResult.assertion_results.length === 0) && (
                  <p className="text-xs text-slate-400">No assertions attached to this test case.</p>
                )}
              </div>

              {/* Response Preview */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Response Body Preview</h4>
                <pre className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs max-h-48 overflow-y-auto">
                  {executionResult.body || (
                    <span className="italic text-slate-400">Empty response body returned</span>
                  )}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setRunModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
