import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Send,
  Play,
  Copy,
  Check,
  Plus,
  Trash2,
  Clock,
  Layers,
  ShieldCheck,
  AlertCircle,
  BookmarkPlus,
  Braces,
} from 'lucide-react';
import { api } from '../services/api';
import { ExecuteResponsePayload, TestCaseAssertion, Environment } from '../types';
import { MethodBadge, StatusBadge, ResultBadge } from '../components/common/Badge';

interface KeyVal {
  key: string;
  value: string;
  enabled: boolean;
}

export const RequestBuilderPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Request State
  const [method, setMethod] = useState<string>('GET');
  const [url, setUrl] = useState<string>('{{baseUrl}}/users');
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'auth' | 'assertions' | 'settings'>('params');
  const [inspectorTab, setInspectorTab] = useState<'body' | 'headers' | 'assertions' | 'request'>('body');

  const [queryParams, setQueryParams] = useState<KeyVal[]>([
    { key: 'limit', value: '10', enabled: false },
  ]);
  const [headers, setHeaders] = useState<KeyVal[]>([
    { key: 'Accept', value: 'application/json', enabled: true },
  ]);
  const [body, setBody] = useState<string>('{\n  "name": "Jane Doe",\n  "email": "jane@example.com",\n  "role": "developer"\n}');
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'api_key' | 'basic'>('none');
  const [bearerToken, setBearerToken] = useState<string>('{{token}}');
  const [apiKeyName, setApiKeyName] = useState<string>('X-API-Key');
  const [apiKeyValue, setApiKeyValue] = useState<string>('{{apiKey}}');
  const [apiKeyAddTo, setApiKeyAddTo] = useState<'header' | 'query'>('header');
  const [basicUser, setBasicUser] = useState<string>('admin');
  const [basicPass, setBasicPass] = useState<string>('password123');

  const [timeout, setTimeoutSeconds] = useState<number>(30);
  const [saveHistory, setSaveHistory] = useState<boolean>(true);

  // Assertions
  const [assertions, setAssertions] = useState<TestCaseAssertion[]>([
    { assertion_type: 'status_code', operator: 'equals', expected_value: '200' },
    { assertion_type: 'response_time', operator: 'less_than_or_equal', expected_value: '1500' },
  ]);

  // Execution state
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<ExecuteResponsePayload | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [rawBodyView, setRawBodyView] = useState<boolean>(false);

  // Load from query params if rerun
  useEffect(() => {
    const rawUrl = searchParams.get('url');
    const rawMethod = searchParams.get('method');
    if (rawUrl) setUrl(rawUrl);
    if (rawMethod) setMethod(rawMethod);
  }, [searchParams]);

  // Execute Request
  const handleExecute = async () => {
    if (!url.trim()) return;

    setLoading(true);
    try {
      // Build headers dict
      const headersDict: Record<string, string> = {};
      headers.filter((h) => h.enabled && h.key.trim()).forEach((h) => {
        headersDict[h.key.trim()] = h.value;
      });

      // Build params dict
      const paramsDict: Record<string, string> = {};
      queryParams.filter((p) => p.enabled && p.key.trim()).forEach((p) => {
        paramsDict[p.key.trim()] = p.value;
      });

      // Build auth config
      let authConfig: Record<string, any> = {};
      if (authType === 'bearer') {
        authConfig = { token: bearerToken };
      } else if (authType === 'api_key') {
        authConfig = { key: apiKeyName, value: apiKeyValue, addTo: apiKeyAddTo };
      } else if (authType === 'basic') {
        authConfig = { username: basicUser, password: basicPass };
      }

      const payload = {
        name: `Ad-hoc ${method} ${url}`,
        url,
        method,
        headers: headersDict,
        query_params: paramsDict,
        body: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? body : undefined,
        auth_type: authType,
        auth_config: authConfig,
        timeout,
        assertions,
        save_history: saveHistory,
      };

      const result = await api.executeRequest(payload);
      setResponse(result);
    } catch (err: any) {
      console.error('Request failed:', err);
      setResponse({
        status_code: null,
        status_text: 'Error',
        response_time_ms: 0,
        response_size_bytes: 0,
        headers: {},
        body: null,
        error_message: err.response?.data?.detail || err.message || 'Execution failed',
        is_success: false,
        assertion_results: [],
        resolved_url: url,
        resolved_headers: {},
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBody = () => {
    if (response?.body) {
      navigator.clipboard.writeText(response.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatJsonBody = () => {
    try {
      const parsed = JSON.parse(body);
      setBody(JSON.stringify(parsed, null, 2));
    } catch (e) {
      alert('Invalid JSON syntax: cannot format.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">API Request Builder</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Construct, configure, execute and inspect live HTTP requests with assertions.
          </p>
        </div>

        <button
          onClick={() => {
            navigate('/test-cases', {
              state: {
                initialUrl: url,
                initialMethod: method,
                initialBody: body,
                initialHeaders: headers,
                initialAssertions: assertions,
              },
            });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm self-start sm:self-auto"
        >
          <BookmarkPlus className="w-4 h-4 text-sky-600" />
          <span>Save as Test Case</span>
        </button>
      </div>

      {/* Main Request Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch gap-2">
        {/* Method Select */}
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>

        {/* URL Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
            placeholder="Enter request URL (e.g. {{baseUrl}}/users or https://api.example.com/v1)"
            className="w-full h-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleExecute}
          disabled={loading || !url.trim()}
          className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-sm font-bold shadow-md shadow-sky-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Send Request</span>
            </>
          )}
        </button>
      </div>

      {/* Request Configuration Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Config Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto bg-slate-50/50 dark:bg-slate-900/50 px-2">
          {[
            { id: 'params', label: `Params (${queryParams.filter((p) => p.enabled).length})` },
            { id: 'headers', label: `Headers (${headers.filter((h) => h.enabled).length})` },
            { id: 'body', label: 'Body (JSON)' },
            { id: 'auth', label: `Auth (${authType})` },
            { id: 'assertions', label: `Assertions (${assertions.length})` },
            { id: 'settings', label: 'Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {/* Params Tab */}
          {activeTab === 'params' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Query Parameters</span>
                <button
                  onClick={() => setQueryParams([...queryParams, { key: '', value: '', enabled: true }])}
                  className="flex items-center gap-1 text-sky-600 hover:underline font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Param
                </button>
              </div>

              <div className="space-y-2">
                {queryParams.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={(e) => {
                        const copy = [...queryParams];
                        copy[idx].enabled = e.target.checked;
                        setQueryParams(copy);
                      }}
                      className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                    />
                    <input
                      type="text"
                      placeholder="Key (e.g. page)"
                      value={p.key}
                      onChange={(e) => {
                        const copy = [...queryParams];
                        copy[idx].key = e.target.value;
                        setQueryParams(copy);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={p.value}
                      onChange={(e) => {
                        const copy = [...queryParams];
                        copy[idx].value = e.target.value;
                        setQueryParams(copy);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                    <button
                      onClick={() => setQueryParams(queryParams.filter((_, i) => i !== idx))}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Headers Tab */}
          {activeTab === 'headers' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>HTTP Headers</span>
                <button
                  onClick={() => setHeaders([...headers, { key: '', value: '', enabled: true }])}
                  className="flex items-center gap-1 text-sky-600 hover:underline font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Header
                </button>
              </div>

              <div className="space-y-2">
                {headers.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={h.enabled}
                      onChange={(e) => {
                        const copy = [...headers];
                        copy[idx].enabled = e.target.checked;
                        setHeaders(copy);
                      }}
                      className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                    />
                    <input
                      type="text"
                      placeholder="Header Key (e.g. Content-Type)"
                      value={h.key}
                      onChange={(e) => {
                        const copy = [...headers];
                        copy[idx].key = e.target.value;
                        setHeaders(copy);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Header Value"
                      value={h.value}
                      onChange={(e) => {
                        const copy = [...headers];
                        copy[idx].value = e.target.value;
                        setHeaders(copy);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                    <button
                      onClick={() => setHeaders(headers.filter((_, i) => i !== idx))}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Body Tab */}
          {activeTab === 'body' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Raw JSON Request Body</span>
                <button
                  onClick={formatJsonBody}
                  className="flex items-center gap-1 text-sky-600 hover:underline font-semibold"
                >
                  <Braces className="w-3.5 h-3.5" /> Prettify JSON
                </button>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder='{\n  "key": "value"\n}'
              />
            </div>
          )}

          {/* Auth Tab */}
          {activeTab === 'auth' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Authentication Type
                </label>
                <select
                  value={authType}
                  onChange={(e) => setAuthType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="none">No Auth</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="api_key">API Key</option>
                  <option value="basic">Basic Auth</option>
                </select>
              </div>

              {authType === 'bearer' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Bearer Token</label>
                  <input
                    type="text"
                    value={bearerToken}
                    onChange={(e) => setBearerToken(e.target.value)}
                    placeholder="e.g. {{token}} or eyJhbGciOi..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Supports variable syntax like &#123;&#123;token&#125;&#125;</p>
                </div>
              )}

              {authType === 'api_key' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Key Name</label>
                    <input
                      type="text"
                      value={apiKeyName}
                      onChange={(e) => setApiKeyName(e.target.value)}
                      placeholder="X-API-Key"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Key Value</label>
                    <input
                      type="text"
                      value={apiKeyValue}
                      onChange={(e) => setApiKeyValue(e.target.value)}
                      placeholder="{{apiKey}}"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Add To</label>
                    <div className="flex gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="apiKeyAddTo"
                          checked={apiKeyAddTo === 'header'}
                          onChange={() => setApiKeyAddTo('header')}
                        />
                        <span>Header</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="apiKeyAddTo"
                          checked={apiKeyAddTo === 'query'}
                          onChange={() => setApiKeyAddTo('query')}
                        />
                        <span>Query Parameter</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {authType === 'basic' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Username</label>
                    <input
                      type="text"
                      value={basicUser}
                      onChange={(e) => setBasicUser(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Password</label>
                    <input
                      type="password"
                      value={basicPass}
                      onChange={(e) => setBasicPass(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Assertions Tab */}
          {activeTab === 'assertions' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Automated Response Assertions</span>
                <button
                  onClick={() =>
                    setAssertions([
                      ...assertions,
                      { assertion_type: 'jsonpath', target: '$.status', operator: 'equals', expected_value: 'success' },
                    ])
                  }
                  className="flex items-center gap-1 text-sky-600 hover:underline font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Assertion
                </button>
              </div>

              <div className="space-y-2">
                {assertions.map((a, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <select
                      value={a.assertion_type}
                      onChange={(e) => {
                        const copy = [...assertions];
                        copy[idx].assertion_type = e.target.value as any;
                        setAssertions(copy);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                    >
                      <option value="status_code">Status Code</option>
                      <option value="response_time">Response Time (ms)</option>
                      <option value="jsonpath">JSONPath</option>
                      <option value="header">Header</option>
                      <option value="body_contains">Body Contains</option>
                    </select>

                    {['jsonpath', 'header'].includes(a.assertion_type) && (
                      <input
                        type="text"
                        placeholder={a.assertion_type === 'jsonpath' ? '$.data.id' : 'Content-Type'}
                        value={a.target || ''}
                        onChange={(e) => {
                          const copy = [...assertions];
                          copy[idx].target = e.target.value;
                          setAssertions(copy);
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                    )}

                    <select
                      value={a.operator}
                      onChange={(e) => {
                        const copy = [...assertions];
                        copy[idx].operator = e.target.value as any;
                        setAssertions(copy);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                    >
                      <option value="equals">Equals (==)</option>
                      <option value="not_equals">Not Equals (!=)</option>
                      <option value="contains">Contains</option>
                      <option value="not_contains">Does Not Contain</option>
                      <option value="less_than">&lt; Less Than</option>
                      <option value="less_than_or_equal">&lt;= Less Than or Equal</option>
                      <option value="greater_than">&gt; Greater Than</option>
                      <option value="exists">Exists</option>
                      <option value="is_null">Is Null</option>
                      <option value="is_not_null">Is Not Null</option>
                    </select>

                    {!['exists', 'is_null', 'is_not_null'].includes(a.operator) && (
                      <input
                        type="text"
                        placeholder="Expected Value"
                        value={a.expected_value || ''}
                        onChange={(e) => {
                          const copy = [...assertions];
                          copy[idx].expected_value = e.target.value;
                          setAssertions(copy);
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                    )}

                    <button
                      onClick={() => setAssertions(assertions.filter((_, i) => i !== idx))}
                      className="p-1.5 text-slate-400 hover:text-rose-500 self-end sm:self-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {assertions.length === 0 && (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    No assertions configured. Click "Add Assertion" above to test status, latency, headers or JSONPath!
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-4 max-w-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Request Timeout (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={timeout}
                  onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={saveHistory}
                  onChange={(e) => setSaveHistory(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Save execution to Audit History</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Response Inspector Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Response Inspector</h2>
            {response && (
              <div className="flex items-center gap-2">
                <StatusBadge statusCode={response.status_code} statusText={response.status_text} />
                <span className="flex items-center gap-1 text-xs font-mono font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {response.response_time_ms.toFixed(0)} ms
                </span>
                <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {(response.response_size_bytes / 1024).toFixed(1)} KB
                </span>
                <ResultBadge isSuccess={response.is_success} />
              </div>
            )}
          </div>

          {/* Action Tabs for Response */}
          {response && (
            <div className="flex items-center gap-1">
              {[
                { id: 'body', label: 'Body' },
                { id: 'headers', label: `Headers (${Object.keys(response.headers || {}).length})` },
                { id: 'assertions', label: `Assertions (${response.assertion_results?.length || 0})` },
                { id: 'request', label: 'Request Details' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setInspectorTab(t.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    inspectorTab === t.id
                      ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 font-semibold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Response Body Inspector */}
        <div className="p-5">
          {!response && !loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
              <Send className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm font-medium">Click "Send Request" to test an endpoint</p>
              <p className="text-xs text-slate-400 mt-1">Live response body, headers, timing and assertions will appear here.</p>
            </div>
          )}

          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-8 h-8 border-3 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
              <span className="text-xs font-medium text-slate-500">Executing request via HTTP engine...</span>
            </div>
          )}

          {response && !loading && (
            <>
              {response.error_message && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <span className="font-bold block">Execution Alert:</span>
                    <span>{response.error_message}</span>
                  </div>
                </div>
              )}

              {inspectorTab === 'body' && (
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 font-mono">Response Payload</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setRawBodyView(!rawBodyView)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        {rawBodyView ? 'Formatted View' : 'Raw View'}
                      </button>
                      <button
                        onClick={handleCopyBody}
                        className="flex items-center gap-1 text-[11px] text-sky-600 hover:underline font-medium"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <pre className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-emerald-400 font-mono text-xs overflow-x-auto max-h-[450px]">
                    {response.body || (
                      <span className="text-slate-400 italic">Empty response body returned (Status {response.status_code || 0})</span>
                    )}
                  </pre>
                </div>
              )}

              {inspectorTab === 'headers' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3">Header Name</th>
                        <th className="py-2 px-3">Header Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {Object.entries(response.headers || {}).map(([hk, hv]) => (
                        <tr key={hk}>
                          <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">{hk}</td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 break-all">{hv}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {inspectorTab === 'assertions' && (
                <div className="space-y-2.5">
                  {(response.assertion_results || []).map((ar, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                        ar.passed
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5">
                          {ar.passed ? (
                            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">✓</span>
                          ) : (
                            <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">✕</span>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="uppercase text-[10px] tracking-wider font-mono text-slate-400">
                              [{ar.assertion_type}]
                            </span>
                            <span>{ar.target ? `${ar.target} ${ar.operator} ${ar.expected_value || ''}` : `${ar.assertion_type} ${ar.operator} ${ar.expected_value || ''}`}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-mono">{ar.message}</p>
                        </div>
                      </div>
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        ar.passed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                      }`}>
                        {ar.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  ))}

                  {(!response.assertion_results || response.assertion_results.length === 0) && (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No assertions were evaluated for this request.
                    </div>
                  )}
                </div>
              )}

              {inspectorTab === 'request' && (
                <div className="space-y-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Resolved URL:</span>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                      {response.resolved_url}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Outbound Headers:</span>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                      {Object.entries(response.resolved_headers || {}).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-sky-600 dark:text-sky-400">{k}:</span>
                          <span className="text-slate-700 dark:text-slate-300">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
