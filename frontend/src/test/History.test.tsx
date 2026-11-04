import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HistoryPage } from '../pages/HistoryPage';
import { api } from '../services/api';

describe('HistoryPage Component', () => {
  it('renders history page header and filter controls', async () => {
    vi.spyOn(api, 'getHistory').mockResolvedValue({
      items: [
        {
          id: 1,
          test_name: 'Mock Test Scenario',
          endpoint_url: 'https://api.example.com/v1/users',
          http_method: 'GET',
          status_code: 200,
          status_text: 'OK',
          response_time_ms: 125,
          response_size_bytes: 512,
          is_success: true,
          executed_at: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      page_size: 15,
      total_pages: 1,
    });

    vi.spyOn(api, 'getHistorySummary').mockResolvedValue({
      total_executions: 1,
      passed_count: 1,
      failed_count: 0,
      success_rate: 100,
      avg_response_time_ms: 125,
      fastest_response_time_ms: 125,
      slowest_response_time_ms: 125,
    });

    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );

    expect(screen.getByText('API Testing History')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search test name or endpoint url/i)).toBeInTheDocument();
    expect(await screen.findByText('Mock Test Scenario')).toBeInTheDocument();
  });
});
