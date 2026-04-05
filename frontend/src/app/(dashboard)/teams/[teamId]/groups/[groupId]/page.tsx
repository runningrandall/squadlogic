'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleGuard } from '@/components/role-guard';

interface GroupDetail {
  groupId: string;
  name: string;
  description: string;
  aliases: string[];
}

interface Challenge {
  challengeId: string;
  title: string;
  description: string;
  points: number;
  status: string;
  routeUrl?: string | null;
  dueDate?: string | null;
}

interface ChallengeCompletion {
  completionId: string;
  challengeId: string;
  groupId: string;
  completedBy: string;
  completedAt: string;
  status: string;
}

interface GroupMember {
  groupMemberId: string;
  athleteId: string;
  role: string;
  status: string;
}

interface TeamMember {
  memberId: string;
  memberType: string;
  teamMemberId: string;
}

interface AthleteInfo {
  athleteId: string;
  firstName: string;
  lastName: string;
}

export default function GroupDetailPage() {
  const { teamId, groupId } = useParams() as { teamId: string; groupId: string };
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [availableAthletes, setAvailableAthletes] = useState<AthleteInfo[]>([]);
  const [athleteDetailsMap, setAthleteDetailsMap] = useState<Record<string, AthleteInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [completions, setCompletions] = useState<ChallengeCompletion[]>([]);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [athleteId, setAthleteId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchGroupData() {
      try {
        setIsLoading(true);
        const [groupData, membersData] = await Promise.all([
          api.get<GroupDetail>(`/groups/${groupId}`),
          api.get<{ items: GroupMember[] }>(`/groups/${groupId}/members`).then(r => r.items),
        ]);
        setGroup(groupData);
        setMembers(membersData);

        // Fetch athlete details for display names
        const detailsMap: Record<string, AthleteInfo> = {};
        await Promise.all(
          membersData.map(async (m) => {
            try {
              const a = await api.get<AthleteInfo>(`/athletes/${m.athleteId}`);
              detailsMap[m.athleteId] = a;
            } catch {
              detailsMap[m.athleteId] = { athleteId: m.athleteId, firstName: 'Unknown', lastName: '' };
            }
          }),
        );
        setAthleteDetailsMap(detailsMap);

        // Fetch all team challenges and this squad's completions
        const [challengesRes, completionsRes] = await Promise.all([
          api.get<{ items: Challenge[] }>(`/teams/${teamId}/challenges`).catch(() => ({ items: [] as Challenge[] })),
          api.get<{ items: ChallengeCompletion[] }>(`/groups/${groupId}/completions`).catch(() => ({ items: [] as ChallengeCompletion[] })),
        ]);
        setChallenges(challengesRes.items.filter((c) => c.status === 'active'));
        setCompletions(completionsRes.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load squad');
      } finally {
        setIsLoading(false);
      }
    }

    if (user && teamId && groupId) {
      fetchGroupData();
    }
  }, [user, teamId, groupId]);

  // Fetch available athletes (team roster athletes minus existing squad members)
  useEffect(() => {
    if (!showAddForm || !teamId) return;

    async function loadAvailable() {
      try {
        // Get team members (athletes only)
        const teamMembers = await api.get<{ items: TeamMember[] }>(`/teams/${teamId}/members`);
        const athleteIds = teamMembers.items
          .filter((m) => m.memberType === 'athlete')
          .map((m) => m.memberId);

        // Get existing squad member IDs
        const existingIds = new Set(members.map((m) => m.athleteId));

        // Fetch athlete details for available ones
        const available: AthleteInfo[] = [];
        for (const id of athleteIds) {
          if (existingIds.has(id)) continue;
          try {
            const a = await api.get<AthleteInfo>(`/athletes/${id}`);
            available.push(a);
          } catch {
            // skip
          }
        }
        setAvailableAthletes(available);
      } catch {
        setAvailableAthletes([]);
      }
    }

    loadAvailable();
  }, [showAddForm, teamId, members]);

  const completedChallengeIds = new Set(completions.map((c) => c.challengeId));

  const handleMarkComplete = async (challengeId: string) => {
    setCompletingId(challengeId);
    try {
      const completion = await api.post<ChallengeCompletion>(`/challenges/${challengeId}/completions`, {
        groupId,
      });
      setCompletions((prev) => [...prev, completion]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark challenge as completed');
    } finally {
      setCompletingId(null);
    }
  };

  const handleAddAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newMember = await api.post<GroupMember>(`/groups/${groupId}/members`, {
        athleteId,
      });
      setMembers((prev) => [...prev, newMember]);
      setShowAddForm(false);
      setAthleteId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add athlete to squad');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading squad...</div>
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

  if (!group) {
    return (
      <div className="text-center py-12 text-gray-500">Squad not found.</div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/teams/${teamId}/groups`} className="text-sm text-blue-600 hover:underline">
          &larr; Back to Squads
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
          {group.aliases?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {group.aliases.map((alias) => (
                <span key={alias} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  {alias}
                </span>
              ))}
            </div>
          )}
          {group.description && (
            <p className="text-gray-500 mt-1">{group.description}</p>
          )}
        </div>
        <RoleGuard allowedRoles={['SuperAdmin', 'OrgAdmin', 'OrgManager', 'TeamAdmin', 'TeamManager']}>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            {showAddForm ? 'Cancel' : 'Add Athlete'}
          </button>
        </RoleGuard>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddAthlete} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Athlete to Squad</h2>
          {availableAthletes.length === 0 ? (
            <p className="text-sm text-gray-500">
              No available athletes. All team roster athletes are already in this squad, or the team has no athletes.
            </p>
          ) : (
            <>
              <div>
                <label htmlFor="athleteId" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Athlete *
                </label>
                <select
                  id="athleteId"
                  required
                  value={athleteId}
                  onChange={(e) => setAthleteId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose an athlete...</option>
                  {availableAthletes.map((a) => (
                    <option key={a.athleteId} value={a.athleteId}>
                      {a.firstName} {a.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !athleteId}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add to Squad'}
              </button>
            </>
          )}
        </form>
      )}

      <div className="rounded-xl bg-white shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Members ({members.length})</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Role</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-500">
                  No members in this squad yet.
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const details = athleteDetailsMap[member.athleteId];
                return (
                <tr key={member.groupMemberId || member.athleteId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {details ? `${details.firstName} ${details.lastName}` : member.athleteId}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      member.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {member.status}
                    </span>
                  </td>
                </tr>
                );
              }))
            }
          </tbody>
        </table>
      </div>

      {/* Challenges section */}
      {challenges.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-200 mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Challenges ({completedChallengeIds.size}/{challenges.length} completed)
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {challenges.reduce((sum, c) => completedChallengeIds.has(c.challengeId) ? sum + c.points : sum, 0)} / {challenges.reduce((sum, c) => sum + c.points, 0)} points earned
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {challenges.map((challenge) => {
              const isCompleted = completedChallengeIds.has(challenge.challengeId);
              const completion = completions.find((c) => c.challengeId === challenge.challengeId);
              return (
                <div key={challenge.challengeId} className={`px-6 py-4 flex items-center justify-between ${isCompleted ? 'bg-green-50' : ''}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <span className="text-green-600 text-lg">&#10003;</span>
                      ) : (
                        <span className="text-gray-300 text-lg">&#9675;</span>
                      )}
                      <span className={`text-sm font-medium ${isCompleted ? 'text-green-800' : 'text-gray-900'}`}>
                        {challenge.title}
                      </span>
                      <span className="text-xs text-gray-500">{challenge.points} pts</span>
                    </div>
                    {challenge.description && (
                      <p className="text-xs text-gray-500 ml-7 mt-0.5">{challenge.description.slice(0, 100)}</p>
                    )}
                    {challenge.routeUrl && (
                      <a href={challenge.routeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline ml-7">
                        View Route &#8599;
                      </a>
                    )}
                    {isCompleted && completion && (
                      <p className="text-xs text-green-600 ml-7 mt-0.5">
                        Completed {new Date(completion.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {!isCompleted && (
                    <RoleGuard allowedRoles={['SuperAdmin', 'OrgAdmin', 'TeamAdmin', 'TeamManager']}>
                      <button
                        onClick={() => handleMarkComplete(challenge.challengeId)}
                        disabled={completingId === challenge.challengeId}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {completingId === challenge.challengeId ? 'Completing...' : 'Mark Complete'}
                      </button>
                    </RoleGuard>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
