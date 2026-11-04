import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CollectionsPage } from '../pages/CollectionsPage';
import { api } from '../services/api';

describe('CollectionsPage Component', () => {
  it('renders collections, folders, and request tree in sidebar', async () => {
    vi.spyOn(api, 'getCollections').mockResolvedValue([
      {
        id: 1,
        name: 'Orders Microservice',
        description: 'Orders creation and checkout flow',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        test_cases_count: 2,
        folders_count: 1,
        folders: [
          {
            id: 10,
            collection_id: 1,
            name: 'Checkout Flow',
            description: 'Cart and payments',
            order_index: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        test_cases: [
          {
            id: 100,
            collection_id: 1,
            folder_id: 10,
            name: 'Process Stripe Payment',
            method: 'POST',
            url: 'https://api.example.com/checkout',
            headers: {},
            query_params: {},
            auth_type: 'none',
            auth_config: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            assertions: [],
          },
          {
            id: 101,
            collection_id: 1,
            name: 'Get Order Status',
            method: 'GET',
            url: 'https://api.example.com/orders/42',
            headers: {},
            query_params: {},
            auth_type: 'none',
            auth_config: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            assertions: [],
          },
        ],
      },
    ]);

    vi.spyOn(api, 'getCollection').mockResolvedValue({
      id: 1,
      name: 'Orders Microservice',
      description: 'Orders creation and checkout flow',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      test_cases_count: 2,
      folders_count: 1,
      test_cases: [],
      folders: [],
    });

    vi.spyOn(api, 'getCollectionRuns').mockResolvedValue([]);

    render(
      <BrowserRouter>
        <CollectionsPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Smart API Collections & Folders')).toBeInTheDocument();
    expect(screen.getByText('Workspace Explorer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search collections, folders, requests/i)).toBeInTheDocument();

    // Verify collection item loads in sidebar and main pane
    const items = await screen.findAllByText('Orders Microservice');
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0]).toBeInTheDocument();
  });
});
