'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleGuard } from '@/components/role-guard';

interface TeamMember {
  memberId: string;
  name: string;
  type: 'athlete' | 'coach';
  role: string;
  jerseyNumber?: string;
  status: string;
}

interface AddMemberForm {
  memberType: 'athlete' | 'coach';
  memberId: string;
  role: string;
}

export default function RosterClient({ params }: { params: { teamId: string } }) {
  const { teamId } = params;
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addForm, setAddForm] = useState<AddMemberForm>({
    memberType: 'athlete',
    memberId: '',
    role: '',
  });

  useEffect(() => {
    async function fetchMembers() {
      try {
        setIsLoading(true);
        const { items: data } = await api.get<{ items: TeamMember[] }>(`/teams/${teamId}/members`);
        setMembers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load roster');
      } finally {
        setIsLoading(false);
      }
    }

    if (user && teamId) {
      fetchMembers();
    }
  }, [user, teamId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newMember = await api.post<TeamMember>(`/teams/${teamId}/members`, {
        memberType: addForm.memberType,
        memberId: addForm.memberId,
        role: addForm.role,
      });
      setMembers((prev) => [...prev, newMember]);
      setShowAddForm(false);
      setAddForm({ memberType: 'athlete', memberId: '', role: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading roster...</div>
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
        <h1 className="text-3xl font-bold text-gray-900">Roster</h1>
        <RoleGuard allowedRoles={['SuperAdmin', 'OrgAdmin', 'OrgManager', 'TeamAdmin', 'TeamManager']}>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            {showAddForm ? 'Cancel' : 'Add Member'}
          </button>
        </RoleGuard>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddMember} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Member</h2>

          <div>
            <label htmlFor="memberType" className="block text-sm font-medium text-gray-700 mb-1">
              Member Type *
            </label>
            <select
              id="memberType"
              value={addForm.memberType}
              onChange={(e) => setAddForm((prev) => ({ ...prev, memberType: e.target.value as 'athlete' | 'coach' }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="athlete">Athlete</option>
              <option value="coach">Coach</option>
            </select>
          </div>

          <div>
            <label htmlFor="memberId" className="block text-sm font-medium text-gray-700 mb-1">
              Member ID *
            </label>
            <input
              type="text"
              id="memberId"
              required
              value={addForm.memberId}
              onChange={(e) => setAddForm((prev) => ({ ...prev, memberId: e.target.value }))}
              placeholder={`Search or enter ${addForm.memberType} ID`}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <input
              type="text"
              id="role"
              value={addForm.role}
              onChange={(e) => setAddForm((prev) => ({ ...prev, role: e.target.value }))}
              placeholder="e.g. Captain, Assistant Coach"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add to Roster'}
          </button>
        </form>
      )}

      <div className="rounded-xl bg-white shadow-sm border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Type</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Role</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Jersey #</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                  No members yet. Click &quot;Add Member&quot; to build your roster.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.memberId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{member.name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      member.type === 'athlete'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {member.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{member.role || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{member.jerseyNumber || '-'}</td>
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
