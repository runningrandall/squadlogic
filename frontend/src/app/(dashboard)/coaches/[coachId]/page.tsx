'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Coach {
  coachId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  certifications: string[];
  specialties: string[];
  status: string;
}

interface TeamMembership {
  teamId: string;
  teamName: string;
  role: string;
  status: string;
}

export default function CoachDetailPage() {
  const { coachId } = useParams<{ coachId: string }>();
  const { user } = useAuth();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [teams, setTeams] = useState<TeamMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCoach() {
      try {
        setIsLoading(true);
        const [coachData, teamsData] = await Promise.all([
          api.get<Coach>(`/coaches/${coachId}`),
          api.get<TeamMembership[]>(`/coaches/${coachId}/teams`).catch(() => [] as TeamMembership[]),
        ]);
        setCoach(coachData);
        setTeams(teamsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load coach');
      } finally {
        setIsLoading(false);
      }
    }

    if (user && coachId) {
      fetchCoach();
    }
  }, [user, coachId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading coach...</div>
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

  if (!coach) {
    return (
      <div className="text-center py-12 text-gray-500">Coach not found.</div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/coaches" className="text-sm text-blue-600 hover:underline">
          &larr; Back to Coaches
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {coach.firstName} {coach.lastName}
          </h1>
          <p className="text-gray-500 mt-1">{coach.email}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
          coach.status === 'active'
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {coach.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="text-sm text-gray-900">{coach.phone || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Certifications</dt>
              <dd className="text-sm text-gray-900">
                {coach.certifications?.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {coach.certifications.map((cert) => (
                      <span key={cert} className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {cert}
                      </span>
                    ))}
                  </div>
                ) : (
                  '-'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Specialties</dt>
              <dd className="text-sm text-gray-900">
                {coach.specialties?.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {coach.specialties.map((spec) => (
                      <span key={spec} className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                        {spec}
                      </span>
                    ))}
                  </div>
                ) : (
                  '-'
                )}
              </dd>
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
