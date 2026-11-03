import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderTree,
  Plus,
  Play,
  Edit,
  Trash2,
  FileCode2,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  Layers,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import { TestCollection, CollectionExecution } from '../types';
import { Modal } from '../components/common/Modal';
import { MethodBadge, StatusBadge, ResultBadge } from '../components/common/Badge';

export const CollectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<TestCollection[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected collection for detail view
  const [selectedCollection, setSelectedCollection] = useState<TestCollection | null>(null);
  const [collectionRuns, setCollectionRuns] = useState<CollectionExecution[]>([]);

  // Modal State for create/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<TestCollection | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Live Collection Runner Modal
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runningCollection, setRunningCollection] = useState<TestCollection | null>(null);
  const [runResult, setRunResult] = useState<CollectionExecution | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const data = await api.getCollections();
      setCollections(data);
      if (data.length > 0 && !selectedCollection) {
        handleSelectCollection(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCollection = async (id: number) => {
    try {
      const [detail, runs] = await Promise.all([
        api.getCollection(id),
        api.getCollectionRuns(id),
      ]);
      setSelectedCollection(detail);
      setCollectionRuns(runs);
    } catch (err) {
      console.error('Failed to load collection details:', err);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const handleOpenCreate = () => {
    setEditingCollection(null);
    setFormName('');
    setFormDescription('');
    setModalOpen(true);
  };

  const handleOpenEdit = (col: TestCollection) => {
    setEditingCollection(col);
    setFormName(col.name);
    setFormDescription(col.description || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      if (editingCollection) {
        await api.updateCollection(editingCollection.id, {
          name: formName,
          description: formDescription,
        });
      } else {
        await api.createCollection({
          name: formName,
          description: formDescription,
        });
      }
      setModalOpen(false);
      loadCollections();
    } catch (err) {
      console.error('Failed to save collection:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this collection and its associated test cases?')) return;
    try {
      await api.deleteCollection(id);
      setSelectedCollection(null);
      loadCollections();
    } catch (err) {
      console.error('Failed to delete collection:', err);
    }
  };

  // Run Collection
  const handleExecuteCollection = async (col: TestCollection) => {
    setRunningCollection(col);
    setRunResult(null);
    setIsRunning(true);
    setRunModalOpen(true);

    try {
      const result = await api.runCollection(col.id);
      setRunResult(result);
      // Reload runs in background
      handleSelectCollection(col.id);
    } catch (err: any) {
      alert(`Collection execution failed: ${err.message || 'Error'}`);
      setRunModalOpen(false);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Test Collections</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Group related tests into organized test suites and execute end-to-end collection runs.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm shadow-sky-600/30 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Main Grid: Collections List + Details Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Collection Cards */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">All Collections ({collections.length})</h3>

          {collections.map((c) => {
            const isSelected = selectedCollection?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => handleSelectCollection(c.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800 shadow-sm ring-1 ring-sky-400/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center shrink-0">
                      <FolderTree className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">{c.description || 'No description'}</p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {c.test_cases_count || 0} tests
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExecuteCollection(c);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-sm transition-colors"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Run Collection</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(c);
                      }}
                      className="p-1 text-slate-400 hover:text-sky-600"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(c.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {collections.length === 0 && !loading && (
            <div className="p-8 text-center text-slate-400 border border-dashed rounded-2xl">
              <FolderTree className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">No collections yet</p>
            </div>
          )}
        </div>

        {/* Right Column: Selected Collection Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCollection ? (
            <>
              {/* Collection Header Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-5 h-5 text-sky-600" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selectedCollection.name}</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{selectedCollection.description || 'No description provided.'}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExecuteCollection(selectedCollection)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Run Suite Now</span>
                  </button>
                </div>
              </div>

              {/* Test Cases in this Collection */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Collection Test Cases ({selectedCollection.test_cases?.length || 0})
                  </h3>
                  <button
                    onClick={() => navigate('/test-cases')}
                    className="text-xs font-semibold text-sky-600 hover:underline flex items-center gap-1"
                  >
                    <span>Add or manage tests</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-2">
                  {(selectedCollection.test_cases || []).map((tc, index) => (
                    <div
                      key={tc.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-5 text-center text-xs font-mono text-slate-400 font-bold">{index + 1}</span>
                        <MethodBadge method={tc.method} size="sm" />
                        <div className="truncate">
                          <span className="font-semibold text-xs text-slate-900 dark:text-white block truncate">{tc.name}</span>
                          <span className="font-mono text-[11px] text-slate-400 truncate block">{tc.url}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {tc.expected_status_code && (
                          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                            Status {tc.expected_status_code}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {tc.assertions?.length || 0} assertions
                        </span>
                      </div>
                    </div>
                  ))}

                  {(!selectedCollection.test_cases || selectedCollection.test_cases.length === 0) && (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No test cases in this collection. Go to Test Cases to assign tests to this collection.
                    </div>
                  )}
                </div>
              </div>

              {/* Execution Run History for this Collection */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Suite Execution History</h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-[10px] uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Run Date</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Passed</th>
                        <th className="py-2.5 px-3">Failed</th>
                        <th className="py-2.5 px-3">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {collectionRuns.map((cr) => (
                        <tr key={cr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                            {new Date(cr.executed_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              cr.status === 'passed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                            }`}>
                              {cr.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-600">{cr.passed_tests}</td>
                          <td className="py-2.5 px-3 font-semibold text-rose-600">{cr.failed_tests}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{cr.duration_ms.toFixed(0)} ms</td>
                        </tr>
                      ))}

                      {collectionRuns.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                            No runs recorded for this collection yet. Click "Run Suite Now" to execute.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-sm">Select a collection to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Collection Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCollection ? 'Edit Collection' : 'Create New Collection'}
        subtitle="Organize related API requests and scenarios"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Collection Name *</label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Payments & Checkout API"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Describe the collection's purpose or test coverage"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
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
              {editingCollection ? 'Update Collection' : 'Create Collection'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Collection Execution Live Results Modal */}
      <Modal
        isOpen={runModalOpen}
        onClose={() => setRunModalOpen(false)}
        title={`Collection Execution: ${runningCollection?.name || ''}`}
        subtitle="Automated test suite runner and assertions"
        maxWidth="2xl"
      >
        <div>
          {isRunning && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Executing collection test cases...
              </span>
              <span className="text-xs text-slate-500">Evaluating assertions and storing execution history</span>
            </div>
          )}

          {runResult && !isRunning && (
            <div className="space-y-5">
              {/* Summary Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Overall Status</span>
                  <div className="text-lg font-bold text-slate-900 dark:text-white capitalize flex items-center gap-2 mt-0.5">
                    {runResult.status === 'passed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500" />
                    )}
                    <span>{runResult.status}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold">Total Tests</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">{runResult.total_tests}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Passed</span>
                    <span className="text-base font-bold text-emerald-600">{runResult.passed_tests}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Failed</span>
                    <span className="text-base font-bold text-rose-600">{runResult.failed_tests}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Duration</span>
                    <span className="text-base font-bold text-slate-700 dark:text-slate-300 font-mono">
                      {runResult.duration_ms.toFixed(0)} ms
                    </span>
                  </div>
                </div>
              </div>

              {/* Individual Execution Items */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Execution Breakdown</h4>
                {(runResult.executions || []).map((ex) => (
                  <div
                    key={ex.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <ResultBadge isSuccess={ex.is_success} />
                      <MethodBadge method={ex.http_method} size="sm" />
                      <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">{ex.test_name}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge statusCode={ex.status_code} statusText={ex.status_text} />
                      <span className="text-xs font-mono text-slate-500">{ex.response_time_ms.toFixed(0)} ms</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setRunModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
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
