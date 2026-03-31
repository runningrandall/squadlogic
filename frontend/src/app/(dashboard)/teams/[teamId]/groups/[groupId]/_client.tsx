'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleGuard } from '@/components/role-guard';

interface GroupDetail {
  groupId: string;
  name: string;
  description: string;
}

interface GroupMember {
  memberId: string;
  name: string;
  type: string;
  status: string;
}

export default function GroupDetailClient({ params }: { params: { teamId: string; groupId: string } }) {
  const { teamId, groupId } = params;
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [athleteId, setAthleteId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchGroupData() {
      try {
        setIsLoading(true);
        const [groupData, membersData] = await Promise.all([
          api.get<GroupDetail>(`/teams/${teamId}/groups/${groupId}`),
          api.get<{ items: GroupMember[] }>(`/groups/${groupId}/members`).then(r => r.items),
        ]);
        setGroup(groupData);
        setMembers(membersData);
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

  const handleAddAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newMember = await api.post<GroupMember>(`/teams/${teamId}/groups/${groupId}/members`, {
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
          <div>
            <label htmlFor="athleteId" className="block text-sm font-medium text-gray-700 mb-1">
              Athlete ID *
            </label>
            <input
              type="text"
              id="athleteId"
              required
              value={athleteId}
              onChange={(e) => setAthleteId(e.target.value)}
              placeholder="Search or enter athlete ID"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add to Squad'}
          </button>
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
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Type</th>
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
              members.map((member) => (
                <tr key={member.memberId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{member.name}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                      {member.type}
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
