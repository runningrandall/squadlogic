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

function getFileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

async function chooseFile(container: HTMLElement) {
  const file = new File(['fake xlsx content'], 'callup.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const input = getFileInput(container);
  fireEvent.change(input, { target: { files: [file] } });
  // FileReader.onload resolves asynchronously
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /^Import$/ })).not.toBeDisabled();
  });
}

describe('RaceDayPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the upload step by default', () => {
    render(<RaceDayPage />);
    expect(screen.getByText('Race Day Schedule')).toBeInTheDocument();
    expect(screen.getByText('Choose file')).toBeInTheDocument();
    expect(screen.getByText('No file selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Import$/ })).toBeInTheDocument();
  });

  it('shows step indicator with 3 steps', () => {
    render(<RaceDayPage />);
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Select Team')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  it('has a link to Team Branding', () => {
    render(<RaceDayPage />);
    const link = screen.getByText('Team Branding');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/race-day/branding');
  });

  it('disables Import button when no file is chosen', () => {
    render(<RaceDayPage />);
    const importBtn = screen.getByRole('button', { name: /^Import$/ });
    expect(importBtn).toBeDisabled();
  });

  it('enables Import button once a file is chosen', async () => {
    const { container } = render(<RaceDayPage />);
    await chooseFile(container);
  });

  it('shows team selection step after successful import', async () => {
    mockApi.post.mockResolvedValueOnce({
      eventId: 'evt-1',
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

    const { container } = render(<RaceDayPage />);
    await chooseFile(container);
    fireEvent.click(screen.getByRole('button', { name: /^Import$/ }));

    await waitFor(() => {
      expect(screen.getByText('Select Your Team')).toBeInTheDocument();
    });

    expect(screen.getByText('UTAH HS MTB 2026')).toBeInTheDocument();
    expect(screen.getByText('Choose a team...')).toBeInTheDocument();
    expect(mockApi.post).toHaveBeenCalledWith(
      '/race-events/import/callup',
      expect.objectContaining({ fileData: expect.any(String) }),
    );
  });

  it('shows error message on import failure', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('Network error'));

    const { container } = render(<RaceDayPage />);
    await chooseFile(container);
    fireEvent.click(screen.getByRole('button', { name: /^Import$/ }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows schedule view with staging number column after team selection', async () => {
    // Import
    mockApi.post.mockResolvedValueOnce({
      eventId: 'evt-2',
      eventName: 'UTAH HS MTB 2026',
      eventDate: '2026-08-02',
      eventLocation: 'American Fork, UT',
      teams: ['Brighton'],
      participantCount: 10,
    });
    mockApi.get.mockResolvedValueOnce({
      teams: [{ name: 'Brighton', count: 10 }],
    });

    const { container } = render(<RaceDayPage />);
    await chooseFile(container);
    fireEvent.click(screen.getByRole('button', { name: /^Import$/ }));

    await waitFor(() => {
      expect(screen.getByText('Select Your Team')).toBeInTheDocument();
    });

    // Select team
    mockApi.post.mockResolvedValueOnce({
      teamName: 'Brighton',
      eventName: 'UTAH HS MTB 2026',
      eventDate: '2026-08-02',
      totalAthletes: 1,
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
                  callUpNumber: '5',
                  logistics: {
                    waveMeetingTime: '07:00',
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

    expect(screen.getByText('Staging #')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // callUpNumber
    expect(screen.getByText('101')).toBeInTheDocument(); // bibNumber
    expect(screen.getByText('Export PDF')).toBeInTheDocument();
    expect(screen.getByText('Export Sheets')).toBeInTheDocument();
  });

  it('resets to upload step when Start Over is clicked', async () => {
    mockApi.post.mockResolvedValueOnce({
      eventId: 'evt-3',
      eventName: 'Test',
      eventDate: '2026-08-02',
      eventLocation: 'Test, UT',
      teams: ['A'],
      participantCount: 1,
    });
    mockApi.get.mockResolvedValueOnce({ teams: [{ name: 'A', count: 1 }] });

    const { container } = render(<RaceDayPage />);
    await chooseFile(container);
    fireEvent.click(screen.getByRole('button', { name: /^Import$/ }));

    await waitFor(() => {
      expect(screen.getByText('Start Over')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Start Over'));
    expect(screen.getByText('No file selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Import$/ })).toBeDisabled();
  });
});
