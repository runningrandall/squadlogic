'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleGuard } from '@/components/role-guard';

interface Group {
  groupId: string;
  name: string;
  description: string;
  memberCount: number;
}

export default function GroupsClient({ params }: { params: { teamId: string } }) {
  const { teamId } = params;
  const { user } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGroups() {
      try {
        setIsLoading(true);
        const { items: data } = await api.get<{ items: Group[] }>(`/teams/${teamId}/groups`);
        setGroups(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load groups');
      } finally {
        setIsLoading(false);
      }
    }

    if (user && teamId) {
      fetchGroups();
    }
  }, [user, teamId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading squads...</div>
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
      <div className="mb-6">
        <Link href={`/teams/${teamId}`} className="text-sm text-blue-600 hover:underline">
          &larr; Back to Team
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Squads</h1>
        <RoleGuard allowedRoles={['SuperAdmin', 'OrgAdmin', 'OrgManager', 'TeamAdmin', 'TeamManager']}>
          <button
            onClick={() => router.push(`/teams/${teamId}/groups/new`)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Create Squad
          </button>
        </RoleGuard>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-500">No squads yet. Create a squad to organize team members.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Link
              key={group.groupId}
              href={`/teams/${teamId}/groups/${group.groupId}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
              {group.description && (
                <p className="text-sm text-gray-500 mt-1">{group.description}</p>
              )}
              <p className="text-sm text-gray-400 mt-3">{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
