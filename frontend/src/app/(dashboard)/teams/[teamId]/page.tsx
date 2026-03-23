'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Team {
  teamId: string;
  name: string;
  sport: string;
  season: string;
  description: string;
  status: string;
  maxRosterSize: number;
  memberCount?: number;
  groupCount?: number;
}

export default function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeam() {
      try {
        setIsLoading(true);
        const data = await api.get<Team>(`/teams/${teamId}`);
        setTeam(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load team');
      } finally {
        setIsLoading(false);
      }
    }

    if (user && teamId) {
      fetchTeam();
    }
  }, [user, teamId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading team...</div>
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

  if (!team) {
    return (
      <div className="text-center py-12 text-gray-500">Team not found.</div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/teams" className="text-sm text-blue-600 hover:underline">
          &larr; Back to Teams
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
          <p className="text-gray-500 mt-1">{team.sport} &middot; {team.season}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
          team.status === 'active'
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {team.status}
        </span>
      </div>

      {team.description && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-2">Description</h2>
          <p className="text-gray-700">{team.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Members</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{team.memberCount ?? 0}</p>
          {team.maxRosterSize > 0 && (
            <p className="text-xs text-gray-400 mt-1">Max: {team.maxRosterSize}</p>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Groups</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{team.groupCount ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Season</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{team.season}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href={`/teams/${teamId}/roster`}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <h3 className="text-lg font-semibold text-gray-900">Roster</h3>
          <p className="text-sm text-gray-500 mt-1">Manage team members, athletes, and coaches</p>
        </Link>
        <Link
          href={`/teams/${teamId}/groups`}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <h3 className="text-lg font-semibold text-gray-900">Groups</h3>
          <p className="text-sm text-gray-500 mt-1">Organize members into sub-groups</p>
        </Link>
        <Link
          href={`/teams/${teamId}/challenges`}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <h3 className="text-lg font-semibold text-gray-900">Challenges</h3>
          <p className="text-sm text-gray-500 mt-1">Create and track team challenges</p>
        </Link>
        <Link
          href={`/teams/${teamId}`}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
          <p className="text-sm text-gray-500 mt-1">Team configuration and preferences</p>
        </Link>
      </div>
    </div>
  );
}
