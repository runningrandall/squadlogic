'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Athlete {
  athleteId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  positions: string[];
  jerseyNumber: string;
  status: string;
}

interface TeamMembership {
  teamId: string;
  teamName: string;
  role: string;
  status: string;
}

export default function AthleteDetailPage() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const { user } = useAuth();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [teams, setTeams] = useState<TeamMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAthlete() {
      try {
        setIsLoading(true);
        const [athleteData, teamsData] = await Promise.all([
          api.get<Athlete>(`/athletes/${athleteId}`),
          api.get<TeamMembership[]>(`/athletes/${athleteId}/teams`).catch(() => [] as TeamMembership[]),
        ]);
        setAthlete(athleteData);
        setTeams(teamsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load athlete');
      } finally {
        setIsLoading(false);
      }
    }

    if (user && athleteId) {
      fetchAthlete();
    }
  }, [user, athleteId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading athlete...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="text-center py-12 text-gray-500">Athlete not found.</div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/athletes" className="text-sm text-blue-600 hover:underline">
          &larr; Back to Athletes
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {athlete.firstName} {athlete.lastName}
          </h1>
          <p className="text-gray-500 mt-1">{athlete.email}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
          athlete.status === 'active'
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {athlete.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="text-sm text-gray-900">{athlete.phone || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
              <dd className="text-sm text-gray-900">{athlete.dateOfBirth || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Positions</dt>
              <dd className="text-sm text-gray-900">
                {athlete.positions?.length > 0 ? athlete.positions.join(', ') : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Jersey Number</dt>
              <dd className="text-sm text-gray-900">{athlete.jerseyNumber || '-'}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Memberships</h2>
          {teams.length === 0 ? (
            <p className="text-sm text-gray-500">Not a member of any teams.</p>
          ) : (
            <ul className="space-y-3">
              {teams.map((team) => (
                <li key={team.teamId} className="flex items-center justify-between">
                  <div>
                    <Link href={`/teams/${team.teamId}`} className="text-sm text-blue-600 hover:underline font-medium">
                      {team.teamName}
                    </Link>
                    {team.role && (
                      <span className="ml-2 text-xs text-gray-500">({team.role})</span>
                    )}
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    team.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {team.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
