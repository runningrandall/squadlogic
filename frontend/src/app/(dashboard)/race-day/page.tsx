'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

type Step = 'url' | 'team' | 'schedule';

interface ImportResult {
  eventId: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  teams: string[];
  participantCount: number;
}

interface TeamEntry {
  name: string;
  count: number;
}

interface AthleteLogistics {
  arrivalTime: string;
  warmupStart: string;
  warmupEnd: string;
  stagingTime: string;
  raceStart: string;
}

interface ScheduleAthlete {
  firstName: string;
  lastName: string;
  bibNumber: string;
  logistics?: AthleteLogistics;
}

interface WaveCategory {
  categoryName: string;
  stageTime: string;
  startTime: string;
  laps: number | null;
  athletes: ScheduleAthlete[];
}

interface WaveGroup {
  waveName: string;
  categories: WaveCategory[];
}

interface Schedule {
  teamName: string;
  eventName: string;
  eventDate: string;
  totalAthletes: number;
  waves: WaveGroup[];
}

export default function RaceDayPage() {
  const [step, setStep] = useState<Step>('url');
  const [url, setUrl] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  async function handleImport() {
    setError(null);
    setIsLoading(true);
    try {
      const result = await api.post<ImportResult>('/race-events/import', { url });
      setImportResult(result);

      const teamData = await api.get<{ teams: TeamEntry[] }>(
        `/race-events/${result.eventId}/teams`,
      );
      setTeams(teamData.teams);
      setStep('team');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import event');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTeamSelect() {
    if (!selectedTeam || !importResult) return;
    setError(null);
    setIsLoading(true);
    try {
      // For now, we pass the wave config and let the backend generate the schedule
      // In a full implementation this would call the schedule generation endpoint
      const scheduleData = await api.post<Schedule>(
        `/race-events/${importResult.eventId}/export/pdf`,
        { teamName: selectedTeam, waveConfig: [] },
      ).catch(() => null);

      // Fallback: construct schedule display from the data we have
      // This would be replaced by a proper schedule generation endpoint
      setSchedule({
        teamName: selectedTeam,
        eventName: importResult.eventName,
        eventDate: importResult.eventDate,
        totalAthletes: teams.find((t) => t.name === selectedTeam)?.count ?? 0,
        waves: [],
      });
      setStep('schedule');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate schedule');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExportPdf() {
    if (!importResult) return;
    setIsExporting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/race-events/${importResult.eventId}/export/pdf`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamName: selectedTeam,
            waveConfig: [],
          }),
        },
      );

      if (!response.ok) throw new Error('PDF export failed');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${selectedTeam.replace(/\s+/g, '_')}_${importResult.eventDate}_schedule.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF export failed');
    } finally {
      setIsExporting(false);
    }
  }

  function handleReset() {
    setStep('url');
    setUrl('');
    setImportResult(null);
    setTeams([]);
    setSelectedTeam('');
    setSchedule(null);
    setError(null);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Race Day Schedule</h1>
        {step !== 'url' && (
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Start Over
          </button>
        )}
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(['url', 'team', 'schedule'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? 'bg-blue-600 text-white'
                  : i < ['url', 'team', 'schedule'].indexOf(step)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm ${
                step === s ? 'font-medium text-gray-900' : 'text-gray-500'
              }`}
            >
              {s === 'url' ? 'Import' : s === 'team' ? 'Select Team' : 'Schedule'}
            </span>
            {i < 2 && <div className="w-12 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: URL Input */}
      {step === 'url' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Import from RaceResult</h2>
          <p className="text-sm text-gray-500 mb-4">
            Paste a RaceResult event URL to import the participant roster and generate
            your team&apos;s race day schedule.
          </p>
          <div className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://my.raceresult.com/411620/"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              onClick={handleImport}
              disabled={!url || isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Team Selection */}
      {step === 'team' && importResult && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
            <strong>{importResult.eventName}</strong> &mdash; {importResult.eventDate} &mdash;{' '}
            {importResult.eventLocation} &mdash; {importResult.participantCount} participants
          </div>

          <h2 className="text-lg font-semibold mb-4">Select Your Team</h2>

          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-4"
          >
            <option value="">Choose a team...</option>
            {teams.map((team) => (
              <option key={team.name} value={team.name}>
                {team.name} ({team.count})
              </option>
            ))}
          </select>

          <button
            onClick={handleTeamSelect}
            disabled={!selectedTeam || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Generating...' : 'Generate Schedule'}
          </button>
        </div>
      )}

      {/* Step 3: Schedule View */}
      {step === 'schedule' && schedule && (
        <div>
          {/* Event Header */}
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{schedule.teamName}</h2>
                <p className="text-sm text-gray-500">
                  {schedule.eventName} &mdash; {schedule.eventDate} &mdash;{' '}
                  {schedule.totalAthletes} athletes
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportPdf}
                  disabled={isExporting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 text-sm font-medium"
                >
                  {isExporting ? 'Exporting...' : 'Export PDF'}
                </button>
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                  onClick={() => setError('Google Sheets export coming soon')}
                >
                  Export Sheets
                </button>
              </div>
            </div>
          </div>

          {/* Wave Schedule Table */}
          {schedule.waves.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No wave schedule data available. Configure wave times in Settings.
            </div>
          ) : (
            schedule.waves.map((wave) => (
              <div key={wave.waveName} className="bg-white rounded-lg shadow mb-4 overflow-hidden">
                <div className="bg-gray-800 text-white px-4 py-3 font-semibold">
                  {wave.waveName}
                </div>
                {wave.categories.map((cat) => (
                  <div key={cat.categoryName} className="border-b last:border-b-0">
                    <div className="bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 flex justify-between">
                      <span>{cat.categoryName}</span>
                      <span className="text-gray-500">
                        Stage: {cat.stageTime} &mdash; Start: {cat.startTime} &mdash;{' '}
                        {cat.laps ? `${cat.laps} laps` : ''}
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b">
                          <th className="px-4 py-2 font-medium">Athlete</th>
                          <th className="px-4 py-2 font-medium">Bib</th>
                          <th className="px-4 py-2 font-medium">Arrive</th>
                          <th className="px-4 py-2 font-medium">Warmup</th>
                          <th className="px-4 py-2 font-medium">WU End</th>
                          <th className="px-4 py-2 font-medium">Staging</th>
                          <th className="px-4 py-2 font-medium">Race</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.athletes.map((athlete, idx) => (
                          <tr
                            key={`${athlete.lastName}-${athlete.firstName}`}
                            className={idx % 2 === 1 ? 'bg-gray-50' : ''}
                          >
                            <td className="px-4 py-2 font-medium">
                              {athlete.lastName}, {athlete.firstName}
                            </td>
                            <td className="px-4 py-2">{athlete.bibNumber}</td>
                            <td className="px-4 py-2">{athlete.logistics?.arrivalTime ?? '—'}</td>
                            <td className="px-4 py-2">{athlete.logistics?.warmupStart ?? '—'}</td>
                            <td className="px-4 py-2">{athlete.logistics?.warmupEnd ?? '—'}</td>
                            <td className="px-4 py-2">{athlete.logistics?.stagingTime ?? '—'}</td>
                            <td className="px-4 py-2 font-semibold">
                              {athlete.logistics?.raceStart ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
