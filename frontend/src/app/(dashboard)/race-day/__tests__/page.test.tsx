import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RaceDayPage from '../page';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock the auth context
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { email: 'test@test.com', role: 'OrgAdmin' }, signOut: vi.fn() }),
}));

// Mock the API — use vi.hoisted to avoid hoisting issues
const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: mockApi,
}));

describe('RaceDayPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the URL input step by default', () => {
    render(<RaceDayPage />);
    expect(screen.getByText('Race Day Schedule')).toBeInTheDocument();
    expect(screen.getByText('Import from RaceResult')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://my.raceresult.com/411620/')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Import$/ })).toBeInTheDocument();
  });

  it('shows step indicator with 3 steps', () => {
    render(<RaceDayPage />);
    expect(screen.getAllByText('Import').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Select Team')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  it('has a link to Team Branding', () => {
    render(<RaceDayPage />);
    const link = screen.getByText('Team Branding');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/race-day/branding');
  });

  it('disables Import button when URL is empty', () => {
    render(<RaceDayPage />);
    const importBtn = screen.getByRole('button', { name: /^Import$/ });
    expect(importBtn).toBeDisabled();
  });

  it('enables Import button when URL is entered', () => {
    render(<RaceDayPage />);
    const input = screen.getByPlaceholderText('https://my.raceresult.com/411620/');
    fireEvent.change(input, { target: { value: 'https://my.raceresult.com/411620/' } });
    const importBtn = screen.getByRole('button', { name: /^Import$/ });
    expect(importBtn).not.toBeDisabled();
  });

  it('shows team selection step after successful import', async () => {
    mockApi.post.mockResolvedValueOnce({
      eventId: '411620',
      eventName: 'UTAH HS MTB 2026',
      eventDate: '2026-08-02',
      eventLocation: 'American Fork, UT',
      teams: ['Alpine', 'Brighton'],
      participantCount: 50,
    });
    mockApi.get.mockResolvedValueOnce({
      teams: [
        { name: 'Alpine', count: 20 },
        { name: 'Brighton', count: 30 },
      ],
    });

    render(<RaceDayPage />);

    const input = screen.getByPlaceholderText('https://my.raceresult.com/411620/');
    fireEvent.change(input, { target: { value: 'https://my.raceresult.com/411620/' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => {
      expect(screen.getByText('Select Your Team')).toBeInTheDocument();
    });

    expect(screen.getByText('UTAH HS MTB 2026')).toBeInTheDocument();
    expect(screen.getByText('Choose a team...')).toBeInTheDocument();
  });

  it('shows error message on import failure', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('Network error'));

    render(<RaceDayPage />);

    const input = screen.getByPlaceholderText('https://my.raceresult.com/411620/');
    fireEvent.change(input, { target: { value: 'https://my.raceresult.com/411620/' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows schedule view after team selection', async () => {
    // Import
    mockApi.post.mockResolvedValueOnce({
      eventId: '411620',
      eventName: 'UTAH HS MTB 2026',
      eventDate: '2026-08-02',
      eventLocation: 'American Fork, UT',
      teams: ['Brighton'],
      participantCount: 10,
    });
    mockApi.get.mockResolvedValueOnce({
      teams: [{ name: 'Brighton', count: 10 }],
    });

    render(<RaceDayPage />);

    fireEvent.change(screen.getByPlaceholderText('https://my.raceresult.com/411620/'), {
      target: { value: 'https://my.raceresult.com/411620/' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => {
      expect(screen.getByText('Select Your Team')).toBeInTheDocument();
    });

    // Select team
    mockApi.post.mockResolvedValueOnce({
      teamName: 'Brighton',
      eventName: 'UTAH HS MTB 2026',
      eventDate: '2026-08-02',
      totalAthletes: 3,
      waves: [
        {
          waveName: 'Wave 1 - HS',
          categories: [
            {
              categoryName: 'JV B Boys',
              stageTime: '07:40',
              startTime: '08:00',
              laps: 2,
              athletes: [
                {
                  firstName: 'John',
                  lastName: 'Adams',
                  bibNumber: '101',
                  logistics: {
                    arrivalTime: '07:00',
                    warmupStart: '07:00',
                    warmupEnd: '07:30',
                    stagingTime: '07:40',
                    raceStart: '08:00',
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Brighton' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Schedule' }));

    await waitFor(() => {
      expect(screen.getByText('Brighton')).toBeInTheDocument();
      expect(screen.getByText('Wave 1 - HS')).toBeInTheDocument();
      expect(screen.getByText('JV B Boys')).toBeInTheDocument();
      expect(screen.getByText('Adams, John')).toBeInTheDocument();
    });

    expect(screen.getByText('Export PDF')).toBeInTheDocument();
    expect(screen.getByText('Export Sheets')).toBeInTheDocument();
  });

  it('resets to URL step when Start Over is clicked', async () => {
    mockApi.post.mockResolvedValueOnce({
      eventId: '411620',
      eventName: 'Test',
      eventDate: '2026-08-02',
      eventLocation: 'Test, UT',
      teams: ['A'],
      participantCount: 1,
    });
    mockApi.get.mockResolvedValueOnce({ teams: [{ name: 'A', count: 1 }] });

    render(<RaceDayPage />);

    fireEvent.change(screen.getByPlaceholderText('https://my.raceresult.com/411620/'), {
      target: { value: 'https://my.raceresult.com/411620/' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => {
      expect(screen.getByText('Start Over')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Start Over'));
    expect(screen.getByText('Import from RaceResult')).toBeInTheDocument();
  });
});
