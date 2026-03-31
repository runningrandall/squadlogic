'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleGuard } from '@/components/role-guard';

interface Team {
  teamId: string;
  name: string;
  sport: string;
  season: string;
  status: string;
}

export default function TeamsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeams() {
      try {
        setIsLoading(true);
        const { items: data } = await api.get<{ items: Team[] }>('/teams');
        setTeams(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load teams');
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchTeams();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading teams...</div>
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
        <RoleGuard allowedRoles={['SuperAdmin', 'OrgAdmin', 'OrgManager']}>
          <button
            onClick={() => router.push('/teams/new')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Create Team
          </button>
        </RoleGuard>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Sport</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Season</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                  No teams yet. Click &quot;Create Team&quot; to get started.
                </td>
              </tr>
            ) : (
              teams.map((team) => (
                <tr key={team.teamId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link href={`/teams/${team.teamId}`} className="text-blue-600 hover:underline font-medium">
                      {team.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{team.sport}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{team.season}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      team.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {team.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/teams/${team.teamId}`} className="text-sm text-blue-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
