import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { api } from '../services/api';

describe('AnalyticsPage Component', () => {
  it('renders analytics metrics, fastest/slowest requests, and insights', async () => {
    vi.spyOn(api, 'getPerformanceAnalytics').mockResolvedValue({
      total_tests: 42,
      successful_tests: 40,
      failed_tests: 2,
      success_rate: 95.2,
      avg_response_time_ms: 135.4,
      min_response_time_ms: 45.0,
      max_response_time_ms: 820.0,
      fastest_request: {
        id: 1,
        endpoint_url: 'https://api.example.com/v1/health',
        http_method: 'GET',
        status_code: 200,
        response_time_ms: 45.0,
        is_success: true,
        executed_at: new Date().toISOString(),
      },
      slowest_request: {
        id: 2,
        endpoint_url: 'https://api.example.com/v1/sync',
        http_method: 'POST',
        status_code: 504,
        response_time_ms: 820.0,
        is_success: false,
        executed_at: new Date().toISOString(),
      },
      method_performance: [
        {
          method: 'GET',
          count: 30,
          avg_response_time_ms: 80.0,
          min_response_time_ms: 45.0,
          max_response_time_ms: 150.0,
          success_count: 30,
          failure_count: 0,
          success_rate: 100.0,
        },
        {
          method: 'POST',
          count: 12,
          avg_response_time_ms: 270.0,
          min_response_time_ms: 120.0,
          max_response_time_ms: 820.0,
          success_count: 10,
          failure_count: 2,
          success_rate: 83.3,
        },
      ],
      response_time_trends: [
        {
          date: 'May 01',
          avg_response_time_ms: 120.0,
          min_response_time_ms: 45.0,
          max_response_time_ms: 300.0,
          total_requests: 20,
          passed_requests: 19,
          failed_requests: 1,
        },
      ],
      insights: [
        {
          category: 'success',
          title: 'High Reliability',
          message: 'Outstanding reliability with a 95.2% success rate.',
          metric: '95.2% success',
        },
      ],
    });

    render(
      <BrowserRouter>
        <AnalyticsPage />
      </BrowserRouter>
    );

    expect(screen.getByText('API Performance Analytics')).toBeInTheDocument();
    expect(screen.getByText('Live Benchmarks')).toBeInTheDocument();

    // Verify key metrics populate asynchronously
    expect(await screen.findByText('135.4')).toBeInTheDocument();
    expect(await screen.findByText('95.2%')).toBeInTheDocument();
    expect(await screen.findByText('42')).toBeInTheDocument();

    // Verify insights
    expect(await screen.findByText('High Reliability')).toBeInTheDocument();
    expect(await screen.findByText('Outstanding reliability with a 95.2% success rate.')).toBeInTheDocument();
  });
});
