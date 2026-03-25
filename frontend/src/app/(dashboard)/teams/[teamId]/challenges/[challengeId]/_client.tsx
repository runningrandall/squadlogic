'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleGuard } from '@/components/role-guard';

interface Challenge {
  challengeId: string;
  title: string;
  description: string;
  dueDate: string;
  points: number;
  status: string;
}

interface ChallengeCompletion {
  completionId: string;
  challengeId: string;
  groupId: string;
  completedAt: string;
  completedBy: string;
}

interface Group {
  groupId: string;
  name: string;
  description: string;
  memberCount: number;
}

function statusBadgeClasses(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'draft':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'expired':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function ChallengeDetailClient({ params }: { params: { teamId: string; challengeId: string } }) {
  const { teamId, challengeId } = params;
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [completions, setCompletions] = useState<ChallengeCompletion[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingGroupId, setMarkingGroupId] = useState<string | null>(null);

  const fetchCompletions = useCallback(async () => {
    const data = await api.get<{ items: ChallengeCompletion[] }>(`/challenges/${challengeId}/completions`);
    setCompletions(data.items);
  }, [challengeId]);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [challengeData, completionsData, groupsData] = await Promise.all([
          api.get<Challenge>(`/challenges/${challengeId}`),
          api.get<{ items: ChallengeCompletion[] }>(`/challenges/${challengeId}/completions`),
          api.get<{ items: Group[] }>(`/teams/${teamId}/groups`),
        ]);
        setChallenge(challengeData);
        setCompletions(completionsData.items);
        setGroups(groupsData.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load challenge');
      } finally {
        setIsLoading(false);
      }
    }

    if (user && teamId && challengeId) {
      fetchData();
    }
  }, [user, teamId, challengeId, fetchCompletions]);

  const handleMarkComplete = async (groupId: string) => {
    setMarkingGroupId(groupId);
    try {
      await api.post(`/challenges/${challengeId}/completions`, { groupId });
      await fetchCompletions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark challenge as complete');
    } finally {
      setMarkingGroupId(null);
    }
  };

  const getCompletionForGroup = (groupId: string): ChallengeCompletion | undefined => {
    return completions.find((c) => c.groupId === groupId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading challenge...</div>
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

  if (!challenge) {
    return (
      <div className="text-center py-12 text-gray-500">Challenge not found.</div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/teams/${teamId}/challenges`} className="text-sm text-blue-600 hover:underline">
          &larr; Back to Challenges
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{challenge.title}</h1>
          {challenge.description && (
            <p className="text-gray-500 mt-1">{challenge.description}</p>
          )}
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusBadgeClasses(challenge.status)}`}>
          {challenge.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Due Date</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {new Date(challenge.dueDate).toLocaleDateString()}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Points</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{challenge.points}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Completions</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {completions.length} / {groups.length}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Group Completion Status</h2>
        </div>

        {groups.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No groups in this team yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {groups.map((group) => {
              const completion = getCompletionForGroup(group.groupId);
              const isCompleted = !!completion;
              const isMarking = markingGroupId === group.groupId;

              return (
                <li key={group.groupId} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    {isCompleted ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-300" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{group.name}</p>
                      {isCompleted && completion && (
                        <p className="text-xs text-gray-400">
                          Completed {new Date(completion.completedAt).toLocaleDateString()} by {completion.completedBy}
                        </p>
                      )}
                    </div>
                  </div>

                  {!isCompleted && (
                    <RoleGuard allowedRoles={['SuperAdmin', 'OrgAdmin', 'TeamAdmin', 'TeamManager']}>
                      <button
                        onClick={() => handleMarkComplete(group.groupId)}
                        disabled={isMarking}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {isMarking ? 'Marking...' : 'Mark Complete'}
                      </button>
                    </RoleGuard>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
