import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MethodBadge, StatusBadge, ResultBadge } from '../components/common/Badge';

describe('Common Badges', () => {
  it('renders HTTP method badge correctly', () => {
    render(<MethodBadge method="GET" />);
    expect(screen.getByText('GET')).toBeInTheDocument();
  });

  it('renders POST method badge correctly', () => {
    render(<MethodBadge method="POST" />);
    expect(screen.getByText('POST')).toBeInTheDocument();
  });

  it('renders status badge for 200 OK', () => {
    render(<StatusBadge statusCode={200} statusText="OK" />);
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('(OK)')).toBeInTheDocument();
  });

  it('renders status badge for 404', () => {
    render(<StatusBadge statusCode={404} statusText="Not Found" />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders PASS and FAIL result badges', () => {
    const { rerender } = render(<ResultBadge isSuccess={true} />);
    expect(screen.getByText('PASS')).toBeInTheDocument();

    rerender(<ResultBadge isSuccess={false} />);
    expect(screen.getByText('FAIL')).toBeInTheDocument();
  });
});
