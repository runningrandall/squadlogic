'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface SquadStat {
  groupId: string;
  completionCount: number;
  pointsEarned: number;
}

interface ChallengeStats {
  totalChallenges: number;
  totalCompletions: number;
  totalPointsAvailable: number;
  totalPointsEarned: number;
  squadStats: SquadStat[];
}

interface Group {
  groupId: string;
  name: string;
}

export default function ChallengeStatsPage() {
  const { teamId } = useParams() as { teamId: string };
  const { user } = useAuth();
  const [stats, setStats] = useState<ChallengeStats | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [statsData, groupsData] = await Promise.all([
          api.get<ChallengeStats>(`/teams/${teamId}/challenge-stats`),
          api.get<{ items: Group[] }>(`/teams/${teamId}/groups`),
        ]);
        setStats(statsData);
        setGroups(groupsData.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load challenge stats');
      } finally {
        setIsLoading(false);
      }
    }

    if (user && teamId) {
      fetchData();
    }
  }, [user, teamId]);

  const getGroupName = (groupId: string): string => {
    const group = groups.find((g) => g.groupId === groupId);
    return group?.name ?? groupId;
  };

  const progressPercent =
    stats && stats.totalPointsAvailable > 0
      ? Math.round((stats.totalPointsEarned / stats.totalPointsAvailable) * 100)
      : 0;

  const sortedSquadStats = stats
    ? [...stats.squadStats].sort((a, b) => b.pointsEarned - a.pointsEarned)
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading stats...</div>
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

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-500">No stats available.</div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/teams/${teamId}/challenges`} className="text-sm text-blue-600 hover:underline">
          &larr; Back to Challenges
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Challenge Stats</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Challenges</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalChallenges}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Completions</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalCompletions}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Points Available</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPointsAvailable}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Points Earned</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPointsEarned}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Overall Progress</h3>
          <span className="text-sm font-medium text-gray-500">{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {stats.totalPointsEarned} / {stats.totalPointsAvailable} points earned
        </p>
      </div>

      {/* Squad leaderboard */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Squad Leaderboard</h2>
        </div>

        {sortedSquadStats.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No squad stats available yet.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Squad
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completions
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedSquadStats.map((squad, index) => (
                <tr key={squad.groupId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {getGroupName(squad.groupId)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-right">
                    {squad.completionCount}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                    {squad.pointsEarned}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
