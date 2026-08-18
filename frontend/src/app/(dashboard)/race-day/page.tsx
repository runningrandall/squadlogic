'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatTime12Hour } from '@/lib/time-format';

type Step = 'upload' | 'team' | 'schedule';

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
  waveMeetingTime: string;
  warmupStart: string;
  warmupEnd: string;
  stagingTime: string;
  raceStart: string;
}

interface ScheduleAthlete {
  firstName: string;
  lastName: string;
  bibNumber: string;
  callUpNumber: string | null;
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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export default function RaceDayPage() {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const buffer = ev.target?.result as ArrayBuffer | undefined;
      setFileData(buffer ? arrayBufferToBase64(buffer) : '');
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    setError(null);
    setIsLoading(true);
    try {
      const result = await api.post<ImportResult>('/race-events/import/callup', {
        fileData,
        eventName: eventName || undefined,
        eventLocation: eventLocation || undefined,
      });
      setImportResult(result);

      const teamData = await api.get<{ teams: TeamEntry[] }>(
        `/race-events/${result.eventId}/teams`,
      );
      setTeams(teamData.teams);
      setStep('team');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import call-up list');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTeamSelect() {
    if (!selectedTeam || !importResult) return;
    setError(null);
    setIsLoading(true);
    try {
      const enriched = await api.post<Schedule>(
        `/race-events/${importResult.eventId}/schedule`,
        { teamName: selectedTeam },
      );
      setSchedule(enriched);
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
      const blob = await api.postBlob(
        `/race-events/${importResult.eventId}/export/pdf`,
        { teamName: selectedTeam },
      );
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
    setStep('upload');
    setFileName('');
    setFileData('');
    setEventName('');
    setEventLocation('');
    if (fileInputRef.current) fileInputRef.current.value = '';
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
        <div className="flex items-center gap-4">
          <Link
            href="/race-day/branding"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Team Branding
          </Link>
          {step !== 'upload' && (
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Start Over
            </button>
          )}
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(['upload', 'team', 'schedule'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? 'bg-blue-600 text-white'
                  : i < ['upload', 'team', 'schedule'].indexOf(step)
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
              {s === 'upload' ? 'Upload' : s === 'team' ? 'Select Team' : 'Schedule'}
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

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 mb-4">
            Upload the league&apos;s call-up list (.xlsx or .pdf) to import categories, staging/start
            times, and staging numbers, and generate your team&apos;s race day schedule.
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="UTAH HS MTB 2026 - REGION 5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Beaver County, UT"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Call-Up List File (.xlsx or .pdf) *</label>
              <div className="flex gap-3 items-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Choose file
                </button>
                <span className="text-sm text-gray-500">
                  {fileName || 'No file selected'}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
            <button
              onClick={handleImport}
              disabled={!fileData || isLoading}
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
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 text-sm font-medium"
                  disabled={isExporting}
                  onClick={async () => {
                    if (!schedule || !importResult) return;
                    setIsExporting(true);
                    setError(null);
                    setSheetsUrl(null);
                    try {
                      const result = await api.post<{ spreadsheetUrl: string }>(
                        `/race-events/${importResult.eventId}/export/sheets`,
                        { schedule },
                      );
                      setSheetsUrl(result.spreadsheetUrl);
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : 'Google Sheets export failed. Try PDF export instead.',
                      );
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                >
                  Export Sheets
                </button>
              </div>
            </div>
          </div>

          {/* Sheets URL */}
          {sheetsUrl && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
              Google Sheet created:{' '}
              <a
                href={sheetsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 underline font-medium"
              >
                Open Spreadsheet
              </a>
            </div>
          )}

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
                        Stage: {formatTime12Hour(cat.stageTime)} &mdash; Start: {formatTime12Hour(cat.startTime)} &mdash;{' '}
                        {cat.laps ? `${cat.laps} laps` : ''}
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b">
                          <th className="px-4 py-2 font-medium">Athlete</th>
                          <th className="px-4 py-2 font-medium">Staging #</th>
                          <th className="px-4 py-2 font-medium">Bib</th>
                          <th className="px-4 py-2 font-medium">Wave Meeting</th>
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
                            <td className="px-4 py-2">{athlete.callUpNumber ?? '—'}</td>
                            <td className="px-4 py-2">{athlete.bibNumber}</td>
                            <td className="px-4 py-2">
                              {athlete.logistics?.waveMeetingTime ? formatTime12Hour(athlete.logistics.waveMeetingTime) : '—'}
                            </td>
                            <td className="px-4 py-2">
                              {athlete.logistics?.warmupStart ? formatTime12Hour(athlete.logistics.warmupStart) : '—'}
                            </td>
                            <td className="px-4 py-2">
                              {athlete.logistics?.warmupEnd ? formatTime12Hour(athlete.logistics.warmupEnd) : '—'}
                            </td>
                            <td className="px-4 py-2">
                              {athlete.logistics?.stagingTime ? formatTime12Hour(athlete.logistics.stagingTime) : '—'}
                            </td>
                            <td className="px-4 py-2 font-semibold">
                              {athlete.logistics?.raceStart ? formatTime12Hour(athlete.logistics.raceStart) : '—'}
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
