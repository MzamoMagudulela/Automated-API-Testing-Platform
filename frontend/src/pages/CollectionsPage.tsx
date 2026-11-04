import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderTree,
  Folder,
  FolderOpen,
  Plus,
  Play,
  Edit,
  Trash2,
  Copy,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  ArrowRight,
  MoreVertical,
  AlertTriangle,
  Code2,
  Key,
  Shield,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { TestCollection, CollectionFolder, TestCase, CollectionExecution, ExecuteResponsePayload, HttpMethod } from '../types';
import { Modal } from '../components/common/Modal';
import { MethodBadge, StatusBadge, ResultBadge } from '../components/common/Badge';

export const CollectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<TestCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filtering in Sidebar
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('ALL');

  // Expansion state
  const [expandedCollections, setExpandedCollections] = useState<Record<number, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<number, boolean>>({});

  // Active Selection
  const [selectedType, setSelectedType] = useState<'collection' | 'folder' | 'request'>('collection');
  const [selectedCollection, setSelectedCollection] = useState<TestCollection | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<CollectionFolder | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<TestCase | null>(null);

  // Collection Runs
  const [collectionRuns, setCollectionRuns] = useState<CollectionExecution[]>([]);

  // Modals
  // 1. Collection Modal
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<TestCollection | null>(null);
  const [collectionName, setCollectionName] = useState('');
  const [collectionDesc, setCollectionDesc] = useState('');

  // 2. Folder Modal
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [targetCollectionIdForFolder, setTargetCollectionIdForFolder] = useState<number | null>(null);
  const [editingFolder, setEditingFolder] = useState<CollectionFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderDesc, setFolderDesc] = useState('');

  // 3. Request Modal (Save/Create Request)
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [targetCollectionIdForReq, setTargetCollectionIdForReq] = useState<number | null>(null);
  const [targetFolderIdForReq, setTargetFolderIdForReq] = useState<number | null>(null);
  const [editingRequest, setEditingRequest] = useState<TestCase | null>(null);
  const [reqName, setReqName] = useState('');
  const [reqMethod, setReqMethod] = useState<HttpMethod>('GET');
  const [reqUrl, setReqUrl] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqHeaders, setReqHeaders] = useState('{\n  "Accept": "application/json"\n}');
  const [reqBody, setReqBody] = useState('');

  // 4. Delete Confirmation Dialog Modal
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'collection' | 'folder' | 'request';
    id: number;
    parentCollectionId?: number;
    name: string;
  } | null>(null);

  // 5. Direct Execution State for Single Request
  const [executingRequest, setExecutingRequest] = useState(false);
  const [requestExecutionResult, setRequestExecutionResult] = useState<ExecuteResponsePayload | null>(null);

  // 6. Live Runner Modal (Collection or Folder)
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runnerTitle, setRunnerTitle] = useState('');
  const [isRunningSuite, setIsRunningSuite] = useState(false);
  const [suiteRunResult, setSuiteRunResult] = useState<CollectionExecution | null>(null);

  const loadCollections = async (maintainSelectionId?: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCollections();
      setCollections(data);

      const targetId = maintainSelectionId || selectedCollection?.id || (data.length > 0 ? data[0].id : null);
      if (targetId) {
        await selectCollectionById(targetId);
      }
    } catch (err: any) {
      console.error('Failed to load collections:', err);
      setError(err?.response?.data?.detail || 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const selectCollectionById = async (id: number) => {
    try {
      const [detail, runs] = await Promise.all([
        api.getCollection(id),
        api.getCollectionRuns(id),
      ]);
      setSelectedCollection(detail);
      setCollectionRuns(runs);
      setSelectedType('collection');
      setSelectedFolder(null);
      setSelectedRequest(null);
      // Auto expand this collection
      setExpandedCollections((prev) => ({ ...prev, [id]: true }));
    } catch (err) {
      console.error('Failed to select collection:', err);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  // Filtered collections tree
  const filteredCollections = useMemo(() => {
    if (!searchQuery.trim() && filterMethod === 'ALL') {
      return collections;
    }
    const q = searchQuery.toLowerCase();
    return collections.filter((c) => {
      const matchCol = c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
      const matchTest = (c.test_cases || []).some(
        (t) =>
          (filterMethod === 'ALL' || t.method === filterMethod) &&
          (t.name.toLowerCase().includes(q) || t.url.toLowerCase().includes(q))
      );
      return matchCol || matchTest;
    });
  }, [collections, searchQuery, filterMethod]);

  // Expand / collapse handlers
  const toggleCollection = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedCollections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFolder = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Selection handlers
  const handleSelectCollection = (col: TestCollection) => {
    selectCollectionById(col.id);
  };

  const handleSelectFolder = async (colId: number, folderId: number) => {
    try {
      const folder = await api.getCollectionFolder(colId, folderId);
      setSelectedFolder(folder);
      setSelectedType('folder');
      setSelectedRequest(null);
      setExpandedFolders((prev) => ({ ...prev, [folderId]: true }));
    } catch (err) {
      console.error('Failed to select folder:', err);
    }
  };

  const handleSelectRequest = (req: TestCase) => {
    setSelectedRequest(req);
    setSelectedType('request');
    setRequestExecutionResult(null);
  };

  // Direct Execution of Single Saved Request
  const handleExecuteSingleRequest = async () => {
    if (!selectedRequest) return;
    setExecutingRequest(true);
    setRequestExecutionResult(null);
    try {
      const result = await api.executeTestCase(selectedRequest.id);
      setRequestExecutionResult(result);
    } catch (err: any) {
      console.error('Failed to execute request:', err);
      setRequestExecutionResult({
        status_code: null,
        status_text: 'Error',
        response_time_ms: 0,
        response_size_bytes: 0,
        headers: {},
        body: null,
        error_message: err.message || 'Execution failed',
        is_success: false,
        assertion_results: [],
        resolved_url: selectedRequest.url,
        resolved_headers: {},
      });
    } finally {
      setExecutingRequest(false);
    }
  };

  // Duplicate Request
  const handleDuplicateRequest = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const duplicated = await api.duplicateTestCase(id);
      await loadCollections(selectedCollection?.id);
      setSelectedRequest(duplicated);
      setSelectedType('request');
    } catch (err) {
      console.error('Failed to duplicate request:', err);
    }
  };

  // Collection CRUD Modals
  const handleOpenCreateCollection = () => {
    setEditingCollection(null);
    setCollectionName('');
    setCollectionDesc('');
    setCollectionModalOpen(true);
  };

  const handleOpenEditCollection = (col: TestCollection, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCollection(col);
    setCollectionName(col.name);
    setCollectionDesc(col.description || '');
    setCollectionModalOpen(true);
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionName.trim()) return;
    try {
      if (editingCollection) {
        await api.updateCollection(editingCollection.id, {
          name: collectionName.trim(),
          description: collectionDesc.trim() || undefined,
        });
        await loadCollections(editingCollection.id);
      } else {
        const created = await api.createCollection({
          name: collectionName.trim(),
          description: collectionDesc.trim() || undefined,
        });
        await loadCollections(created.id);
      }
      setCollectionModalOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to save collection');
    }
  };

  // Folder CRUD Modals
  const handleOpenCreateFolder = (colId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetCollectionIdForFolder(colId);
    setEditingFolder(null);
    setFolderName('');
    setFolderDesc('');
    setFolderModalOpen(true);
  };

  const handleOpenEditFolder = (folder: CollectionFolder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetCollectionIdForFolder(folder.collection_id);
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDesc(folder.description || '');
    setFolderModalOpen(true);
  };

  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim() || !targetCollectionIdForFolder) return;
    try {
      if (editingFolder) {
        await api.updateCollectionFolder(targetCollectionIdForFolder, editingFolder.id, {
          name: folderName.trim(),
          description: folderDesc.trim() || undefined,
        });
      } else {
        await api.createCollectionFolder(targetCollectionIdForFolder, {
          name: folderName.trim(),
          description: folderDesc.trim() || undefined,
        });
      }
      setFolderModalOpen(false);
      await loadCollections(targetCollectionIdForFolder);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to save folder');
    }
  };

  // Request CRUD Modals
  const handleOpenCreateRequest = (colId: number, folderId?: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetCollectionIdForReq(colId);
    setTargetFolderIdForReq(folderId || null);
    setEditingRequest(null);
    setReqName('');
    setReqMethod('GET');
    setReqUrl('https://api.example.com/v1/resource');
    setReqDesc('');
    setReqHeaders('{\n  "Accept": "application/json"\n}');
    setReqBody('');
    setRequestModalOpen(true);
  };

  const handleSaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqName.trim() || !reqUrl.trim() || !targetCollectionIdForReq) return;

    let parsedHeaders = {};
    try {
      if (reqHeaders.trim()) parsedHeaders = JSON.parse(reqHeaders);
    } catch {
      alert('Invalid JSON for headers');
      return;
    }

    try {
      if (editingRequest) {
        await api.updateTestCase(editingRequest.id, {
          name: reqName.trim(),
          method: reqMethod,
          url: reqUrl.trim(),
          description: reqDesc.trim() || undefined,
          headers: parsedHeaders,
          body: reqBody || undefined,
          collection_id: targetCollectionIdForReq,
          folder_id: targetFolderIdForReq || undefined,
        });
      } else {
        await api.createTestCase({
          name: reqName.trim(),
          method: reqMethod,
          url: reqUrl.trim(),
          description: reqDesc.trim() || undefined,
          headers: parsedHeaders,
          body: reqBody || undefined,
          collection_id: targetCollectionIdForReq,
          folder_id: targetFolderIdForReq || undefined,
        });
      }
      setRequestModalOpen(false);
      await loadCollections(targetCollectionIdForReq);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to save request');
    }
  };

  // Confirmation Delete Dialog
  const handleTriggerDelete = (
    type: 'collection' | 'folder' | 'request',
    id: number,
    name: string,
    parentCollectionId?: number,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    setDeleteTarget({ type, id, name, parentCollectionId });
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'collection') {
        await api.deleteCollection(deleteTarget.id);
        setSelectedCollection(null);
        setSelectedType('collection');
        await loadCollections();
      } else if (deleteTarget.type === 'folder' && deleteTarget.parentCollectionId) {
        await api.deleteCollectionFolder(deleteTarget.parentCollectionId, deleteTarget.id);
        if (selectedFolder?.id === deleteTarget.id) setSelectedFolder(null);
        await loadCollections(deleteTarget.parentCollectionId);
      } else if (deleteTarget.type === 'request') {
        await api.deleteTestCase(deleteTarget.id);
        if (selectedRequest?.id === deleteTarget.id) setSelectedRequest(null);
        await loadCollections(selectedCollection?.id);
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete item');
    } finally {
      setConfirmDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  // Suite Execution (Entire Collection or Folder)
  const handleRunCollection = async (col: TestCollection, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRunnerTitle(`Collection: ${col.name}`);
    setSuiteRunResult(null);
    setIsRunningSuite(true);
    setRunModalOpen(true);
    try {
      const res = await api.runCollection(col.id);
      setSuiteRunResult(res);
      await selectCollectionById(col.id);
    } catch (err: any) {
      alert(`Execution failed: ${err.message || 'Unknown error'}`);
      setRunModalOpen(false);
    } finally {
      setIsRunningSuite(false);
    }
  };

  const handleRunFolder = async (colId: number, folderId: number, folderName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRunnerTitle(`Folder: ${folderName}`);
    setSuiteRunResult(null);
    setIsRunningSuite(true);
    setRunModalOpen(true);
    try {
      const res = await api.runFolder(colId, folderId);
      setSuiteRunResult(res);
      await selectCollectionById(colId);
    } catch (err: any) {
      alert(`Folder run failed: ${err?.response?.data?.detail || err.message}`);
      setRunModalOpen(false);
    } finally {
      setIsRunningSuite(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Smart API Collections & Folders
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
              <FolderTree className="w-3.5 h-3.5" /> Workspace Explorer
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organise API requests into nested folders, manage parameters, execute suites, and inspect live responses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreateCollection}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm shadow-sky-600/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Collection</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px]">
        {/* LEFT COLUMN: Clean Hierarchical Sidebar (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search collections, folders, requests..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                <Filter className="w-3 h-3" /> Method:
              </div>
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="px-2 py-0.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
              >
                <option value="ALL">ALL VERBS</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
          </div>

          {/* Tree View Body */}
          <div className="flex-1 p-2 overflow-y-auto space-y-1">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredCollections.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400 text-xs">
                <FolderTree className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="font-semibold">No collections found</p>
                <p className="mt-1 text-[11px]">Click "New Collection" to create your first suite.</p>
              </div>
            ) : (
              filteredCollections.map((col) => {
                const isExpanded = !!expandedCollections[col.id];
                const isColSelected = selectedType === 'collection' && selectedCollection?.id === col.id;
                const folders = col.folders || [];
                // Group test cases: root test cases (without folder) vs folder test cases
                const rootTestCases = (col.test_cases || []).filter((tc) => !tc.folder_id);

                return (
                  <div key={col.id} className="rounded-xl overflow-hidden text-xs">
                    {/* Collection Row */}
                    <div
                      onClick={() => handleSelectCollection(col)}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                        isColSelected
                          ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={(e) => toggleCollection(col.id, e)}
                          className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <FolderTree className="w-4 h-4 text-sky-600 shrink-0" />
                        <span className="truncate">{col.name}</span>
                      </div>

                      {/* Collection Actions */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          {col.test_cases_count || 0}
                        </span>
                        <button
                          title="Run Collection"
                          onClick={(e) => handleRunCollection(col, e)}
                          className="p-1 text-slate-400 hover:text-emerald-600"
                        >
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                        <button
                          title="Add Folder"
                          onClick={(e) => handleOpenCreateFolder(col.id, e)}
                          className="p-1 text-slate-400 hover:text-sky-600"
                        >
                          <Folder className="w-3 h-3" />
                        </button>
                        <button
                          title="Add Request"
                          onClick={(e) => handleOpenCreateRequest(col.id, undefined, e)}
                          className="p-1 text-slate-400 hover:text-sky-600"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          title="Edit Collection"
                          onClick={(e) => handleOpenEditCollection(col, e)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          title="Delete Collection"
                          onClick={(e) => handleTriggerDelete('collection', col.id, col.name, undefined, e)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Children: Folders and Requests inside Collection */}
                    {isExpanded && (
                      <div className="ml-4 pl-2 border-l border-slate-200 dark:border-slate-800 space-y-0.5 my-1">
                        {/* Folders */}
                        {folders.map((folder) => {
                          const isFolderExpanded = !!expandedFolders[folder.id];
                          const isFolderSelected = selectedType === 'folder' && selectedFolder?.id === folder.id;
                          const folderRequests = (col.test_cases || []).filter((tc) => tc.folder_id === folder.id);

                          return (
                            <div key={folder.id} className="rounded-lg">
                              {/* Folder Row */}
                              <div
                                onClick={() => handleSelectFolder(col.id, folder.id)}
                                className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                                  isFolderSelected
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <button
                                    onClick={(e) => toggleFolder(folder.id, e)}
                                    className="p-0.5 text-slate-400"
                                  >
                                    {isFolderExpanded ? (
                                      <ChevronDown className="w-3 h-3" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3" />
                                    )}
                                  </button>
                                  {isFolderExpanded ? (
                                    <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  ) : (
                                    <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  )}
                                  <span className="truncate text-[11px]">{folder.name}</span>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-[9px] font-mono text-slate-400">
                                    {folderRequests.length}
                                  </span>
                                  <button
                                    title="Run Folder"
                                    onClick={(e) => handleRunFolder(col.id, folder.id, folder.name, e)}
                                    className="p-0.5 text-slate-400 hover:text-emerald-600"
                                  >
                                    <Play className="w-2.5 h-2.5 fill-current" />
                                  </button>
                                  <button
                                    title="Add Request inside Folder"
                                    onClick={(e) => handleOpenCreateRequest(col.id, folder.id, e)}
                                    className="p-0.5 text-slate-400 hover:text-sky-600"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    title="Edit Folder"
                                    onClick={(e) => handleOpenEditFolder(folder, e)}
                                    className="p-0.5 text-slate-400 hover:text-slate-600"
                                  >
                                    <Edit className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    title="Delete Folder"
                                    onClick={(e) => handleTriggerDelete('folder', folder.id, folder.name, col.id, e)}
                                    className="p-0.5 text-slate-400 hover:text-rose-600"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Requests inside this folder */}
                              {isFolderExpanded && (
                                <div className="ml-4 pl-2 border-l border-slate-200 dark:border-slate-800 space-y-0.5 my-0.5">
                                  {folderRequests.map((tc) => {
                                    const isReqSelected = selectedType === 'request' && selectedRequest?.id === tc.id;
                                    return (
                                      <div
                                        key={tc.id}
                                        onClick={() => handleSelectRequest(tc)}
                                        className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                                          isReqSelected
                                            ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <MethodBadge method={tc.method} size="sm" />
                                          <span className="truncate text-[11px]">{tc.name}</span>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            title="Duplicate Request"
                                            onClick={(e) => handleDuplicateRequest(tc.id, e)}
                                            className="p-0.5 text-slate-400 hover:text-sky-600"
                                          >
                                            <Copy className="w-2.5 h-2.5" />
                                          </button>
                                          <button
                                            title="Delete Request"
                                            onClick={(e) => handleTriggerDelete('request', tc.id, tc.name, undefined, e)}
                                            className="p-0.5 text-slate-400 hover:text-rose-600"
                                          >
                                            <Trash2 className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {folderRequests.length === 0 && (
                                    <div className="py-1 px-2 text-[10px] text-slate-400 italic">Empty folder</div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Root Requests in Collection */}
                        {rootTestCases.map((tc) => {
                          const isReqSelected = selectedType === 'request' && selectedRequest?.id === tc.id;
                          return (
                            <div
                              key={tc.id}
                              onClick={() => handleSelectRequest(tc)}
                              className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                                isReqSelected
                                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <MethodBadge method={tc.method} size="sm" />
                                <span className="truncate text-[11px]">{tc.name}</span>
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  title="Duplicate Request"
                                  onClick={(e) => handleDuplicateRequest(tc.id, e)}
                                  className="p-0.5 text-slate-400 hover:text-sky-600"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  title="Delete Request"
                                  onClick={(e) => handleTriggerDelete('request', tc.id, tc.name, undefined, e)}
                                  className="p-0.5 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {folders.length === 0 && rootTestCases.length === 0 && (
                          <div className="py-2 text-[11px] text-slate-400 text-center italic">
                            No folders or requests yet.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Inspection & Execution Workspace (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* VIEW 1: REQUEST INSPECTOR & LIVE EXECUTOR */}
          {selectedType === 'request' && selectedRequest ? (
            <div className="space-y-5">
              {/* Request Banner */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MethodBadge method={selectedRequest.method} />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                      {selectedRequest.name}
                    </h2>
                  </div>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400 truncate">
                    {selectedRequest.url}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleExecuteSingleRequest}
                    disabled={executingRequest}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-colors disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${executingRequest ? 'animate-spin' : ''}`} />
                    <span>{executingRequest ? 'Executing...' : 'Execute Request'}</span>
                  </button>

                  <button
                    onClick={() => handleDuplicateRequest(selectedRequest.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>

                  <button
                    onClick={() =>
                      navigate(`/request-builder?url=${encodeURIComponent(selectedRequest.url)}&method=${selectedRequest.method}`)
                    }
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Builder</span>
                  </button>
                </div>
              </div>

              {/* Live Execution Response Inspector */}
              {requestExecutionResult && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <ResultBadge isSuccess={requestExecutionResult.is_success} />
                      <StatusBadge
                        statusCode={requestExecutionResult.status_code}
                        statusText={requestExecutionResult.status_text}
                      />
                      <span className="text-xs font-mono text-slate-500">
                        {requestExecutionResult.response_time_ms.toFixed(0)} ms
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {requestExecutionResult.response_size_bytes} bytes
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-slate-400">Live Response</span>
                  </div>

                  {requestExecutionResult.error_message && (
                    <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
                      {requestExecutionResult.error_message}
                    </div>
                  )}

                  {requestExecutionResult.body && (
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Response Payload
                      </span>
                      <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-60">
                        {requestExecutionResult.body}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Request Configuration Tabs */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Request Details & Headers</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1 font-semibold">HTTP Headers</span>
                    <pre className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-[11px] overflow-x-auto">
                      {JSON.stringify(selectedRequest.headers || {}, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1 font-semibold">Query Parameters</span>
                    <pre className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-[11px] overflow-x-auto">
                      {JSON.stringify(selectedRequest.query_params || {}, null, 2)}
                    </pre>
                  </div>
                </div>

                {selectedRequest.body && (
                  <div>
                    <span className="text-slate-400 block mb-1 font-semibold text-xs">Request Body</span>
                    <pre className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-xs overflow-x-auto max-h-48">
                      {selectedRequest.body}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : selectedType === 'folder' && selectedFolder ? (
            /* VIEW 2: FOLDER OVERVIEW */
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selectedFolder.name}</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{selectedFolder.description || 'No folder description.'}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleRunFolder(
                        selectedFolder.collection_id,
                        selectedFolder.id,
                        selectedFolder.name
                      )
                    }
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Run Folder Tests</span>
                  </button>

                  <button
                    onClick={(e) =>
                      handleOpenCreateRequest(selectedFolder.collection_id, selectedFolder.id, e)
                    }
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Request</span>
                  </button>
                </div>
              </div>

              {/* Requests in this folder */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Requests in this Folder ({selectedFolder.test_cases?.length || 0})
                </h3>

                <div className="space-y-2">
                  {(selectedFolder.test_cases || []).map((tc) => (
                    <div
                      key={tc.id}
                      onClick={() => handleSelectRequest(tc)}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3 cursor-pointer hover:border-sky-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <MethodBadge method={tc.method} size="sm" />
                        <div>
                          <span className="font-semibold text-xs text-slate-900 dark:text-white block truncate">
                            {tc.name}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400 block truncate">{tc.url}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => handleDuplicateRequest(tc.id, e)}
                          className="p-1 text-slate-400 hover:text-sky-600"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) =>
                            handleTriggerDelete('request', tc.id, tc.name, undefined, e)
                          }
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(!selectedFolder.test_cases || selectedFolder.test_cases.length === 0) && (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No requests inside this folder yet. Click "Add Request" to populate this folder.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : selectedCollection ? (
            /* VIEW 3: COLLECTION OVERVIEW & RUN HISTORY */
            <div className="space-y-6">
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
                    onClick={() => handleRunCollection(selectedCollection)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Run Entire Suite</span>
                  </button>

                  <button
                    onClick={(e) => handleOpenCreateFolder(selectedCollection.id, e)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Folder className="w-3.5 h-3.5 text-amber-500" />
                    <span>New Folder</span>
                  </button>

                  <button
                    onClick={(e) => handleOpenCreateRequest(selectedCollection.id, undefined, e)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Request</span>
                  </button>
                </div>
              </div>

              {/* Collection Requests List */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Collection Requests ({selectedCollection.test_cases?.length || 0})
                  </h3>
                </div>

                <div className="space-y-2">
                  {(selectedCollection.test_cases || []).map((tc, index) => (
                    <div
                      key={tc.id}
                      onClick={() => handleSelectRequest(tc)}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3 cursor-pointer hover:border-sky-300 transition-colors"
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
                        <button
                          onClick={(e) => handleDuplicateRequest(tc.id, e)}
                          className="p-1 text-slate-400 hover:text-sky-600"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleTriggerDelete('request', tc.id, tc.name, undefined, e)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(!selectedCollection.test_cases || selectedCollection.test_cases.length === 0) && (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No requests in this collection yet. Click "New Request" to add your first request.
                    </div>
                  )}
                </div>
              </div>

              {/* Suite Execution History */}
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
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                cr.status === 'passed'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                              }`}
                            >
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
                            No runs recorded for this suite yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-sm">Select a collection, folder, or request from the sidebar</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Create / Edit Collection */}
      <Modal
        isOpen={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        title={editingCollection ? 'Edit Collection' : 'Create New Collection'}
        subtitle="Group related API requests and automated scenarios"
      >
        <form onSubmit={handleSaveCollection} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Collection Name *
            </label>
            <input
              type="text"
              required
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="e.g. Authentication & Accounts API"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={collectionDesc}
              onChange={(e) => setCollectionDesc(e.target.value)}
              placeholder="Describe scope, endpoints, and purpose..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCollectionModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold">
              {editingCollection ? 'Save Changes' : 'Create Collection'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Create / Edit Folder */}
      <Modal
        isOpen={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        title={editingFolder ? 'Edit Folder' : 'Create New Folder'}
        subtitle="Organise API requests into logical sub-groups"
      >
        <form onSubmit={handleSaveFolder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Folder Name *
            </label>
            <input
              type="text"
              required
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. User Management or OAuth2"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={folderDesc}
              onChange={(e) => setFolderDesc(e.target.value)}
              placeholder="Optional folder notes..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setFolderModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold">
              {editingFolder ? 'Save Changes' : 'Create Folder'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Save / Create Request */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title={editingRequest ? 'Edit Saved Request' : 'Save Request into Collection'}
        subtitle="Define endpoint, method, headers, and payload"
        maxWidth="xl"
      >
        <form onSubmit={handleSaveRequest} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                HTTP Method *
              </label>
              <select
                value={reqMethod}
                onChange={(e) => setReqMethod(e.target.value as HttpMethod)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold font-mono"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Request Name *
              </label>
              <input
                type="text"
                required
                value={reqName}
                onChange={(e) => setReqName(e.target.value)}
                placeholder="e.g. Get User By ID"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Endpoint URL *
            </label>
            <input
              type="text"
              required
              value={reqUrl}
              onChange={(e) => setReqUrl(e.target.value)}
              placeholder="https://api.example.com/v1/users"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Headers (JSON)
            </label>
            <textarea
              rows={3}
              value={reqHeaders}
              onChange={(e) => setReqHeaders(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
            />
          </div>

          {['POST', 'PUT', 'PATCH'].includes(reqMethod) && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Request Body (JSON / Raw)
              </label>
              <textarea
                rows={3}
                value={reqBody}
                onChange={(e) => setReqBody(e.target.value)}
                placeholder='{\n  "key": "value"\n}'
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setRequestModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold">
              Save Request
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Confirmation Dialog before Deleting */}
      <Modal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title={`Confirm Delete ${deleteTarget?.type ? deleteTarget.type.toUpperCase() : ''}`}
        subtitle="This action cannot be undone."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 dark:text-rose-300">
              <p className="font-semibold">
                Are you sure you want to delete{' '}
                <span className="font-bold underline">{deleteTarget?.name}</span>?
              </p>
              {deleteTarget?.type === 'collection' && (
                <p className="mt-1">
                  Deleting this collection will permanently remove all nested folders, test requests, and historical suite executions.
                </p>
              )}
              {deleteTarget?.type === 'folder' && (
                <p className="mt-1">
                  Deleting this folder will delete all test requests organised inside it.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
            >
              Permanently Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: Suite Runner Live Results */}
      <Modal
        isOpen={runModalOpen}
        onClose={() => setRunModalOpen(false)}
        title={`Execution Run: ${runnerTitle}`}
        subtitle="Automated sequential suite runner and live assertions"
        maxWidth="2xl"
      >
        <div>
          {isRunningSuite && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Executing requests...
              </span>
              <span className="text-xs text-slate-500">Evaluating assertions and storing history</span>
            </div>
          )}

          {suiteRunResult && !isRunningSuite && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Status</span>
                  <div className="text-lg font-bold text-slate-900 dark:text-white capitalize flex items-center gap-2 mt-0.5">
                    {suiteRunResult.status === 'passed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500" />
                    )}
                    <span>{suiteRunResult.status}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold">Total</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">{suiteRunResult.total_tests}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Passed</span>
                    <span className="text-base font-bold text-emerald-600">{suiteRunResult.passed_tests}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Failed</span>
                    <span className="text-base font-bold text-rose-600">{suiteRunResult.failed_tests}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Duration</span>
                    <span className="text-base font-bold text-slate-700 dark:text-slate-300 font-mono">
                      {suiteRunResult.duration_ms.toFixed(0)} ms
                    </span>
                  </div>
                </div>
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

export default CollectionsPage;
