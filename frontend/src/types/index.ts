export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface EnvironmentVariable {
  id?: number;
  environment_id?: number;
  key: string;
  value: string;
  is_secret: boolean;
  created_at?: string;
}

export interface Environment {
  id: number;
  name: string;
  base_url: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  variables: EnvironmentVariable[];
}

export interface TestCaseAssertion {
  id?: number;
  test_case_id?: number;
  assertion_type: 'status_code' | 'response_time' | 'jsonpath' | 'header' | 'body_contains';
  target?: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal' | 'is_null' | 'is_not_null' | 'exists';
  expected_value?: string;
}

export interface TestCase {
  id: number;
  collection_id?: number | null;
  name: string;
  description?: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  query_params: Record<string, string>;
  body?: string;
  auth_type: 'none' | 'bearer' | 'api_key' | 'basic';
  auth_config: Record<string, any>;
  expected_status_code?: number | null;
  max_response_time_ms?: number | null;
  order_index?: number;
  created_at: string;
  updated_at: string;
  assertions: TestCaseAssertion[];
}

export interface TestCollection {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  test_cases_count?: number;
  test_cases?: TestCase[];
}

export interface AssertionResult {
  id?: number;
  assertion_type: string;
  target?: string;
  operator: string;
  expected_value?: string;
  actual_value?: string;
  passed: boolean;
  message: string;
}

export interface TestExecution {
  id: number;
  test_case_id?: number | null;
  collection_id?: number | null;
  collection_execution_id?: number | null;
  environment_id?: number | null;
  test_name: string;
  endpoint_url: string;
  http_method: HttpMethod;
  status_code?: number | null;
  status_text?: string | null;
  response_time_ms: number;
  response_size_bytes: number;
  is_success: boolean;
  error_message?: string | null;
  executed_at: string;
  request_headers?: Record<string, string>;
  request_body?: string;
  response_headers?: Record<string, string>;
  response_body?: string;
  assertion_results?: AssertionResult[];
}

export interface CollectionExecution {
  id: number;
  collection_id: number;
  environment_id?: number | null;
  collection_name: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  duration_ms: number;
  status: 'passed' | 'failed' | 'partial' | 'running';
  executed_at: string;
  executions?: TestExecution[];
}

export interface ActivityTrendPoint {
  date: string;
  total: number;
  passed: number;
  failed: number;
}

export interface LatencyTrendPoint {
  date: string;
  avg_latency_ms: number;
}

export interface MethodDistributionItem {
  method: string;
  count: number;
}

export interface DashboardStats {
  total_tests: number;
  successful_tests: number;
  failed_tests: number;
  success_rate: number;
  avg_response_time_ms: number;
  total_collections: number;
  total_test_cases: number;
  recent_executions: TestExecution[];
  activity_trends: ActivityTrendPoint[];
  latency_trends: LatencyTrendPoint[];
  method_distribution: MethodDistributionItem[];
}

export interface ExecuteRequestPayload {
  name?: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  body?: string;
  auth_type?: string;
  auth_config?: Record<string, any>;
  timeout?: number;
  environment_id?: number | null;
  assertions?: TestCaseAssertion[];
  test_case_id?: number | null;
  collection_id?: number | null;
  save_history?: boolean;
}

export interface ExecuteResponsePayload {
  execution_id?: number;
  status_code?: number | null;
  status_text?: string | null;
  response_time_ms: number;
  response_size_bytes: number;
  headers: Record<string, string>;
  body?: string | null;
  error_message?: string | null;
  is_success: boolean;
  assertion_results: AssertionResult[];
  resolved_url: string;
  resolved_headers: Record<string, string>;
}

export interface HistoryPaginationResponse {
  items: TestExecution[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface HistorySummaryStats {
  total_executions: number;
  passed_count: number;
  failed_count: number;
  success_rate: number;
  avg_response_time_ms: number;
  fastest_response_time_ms?: number | null;
  slowest_response_time_ms?: number | null;
}

export interface ReportSummary {
  generated_at: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  success_rate: number;
  avg_response_time_ms: number;
  total_failed_assertions: number;
  executions: TestExecution[];
}
