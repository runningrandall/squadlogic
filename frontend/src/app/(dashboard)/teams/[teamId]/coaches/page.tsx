'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleGuard } from '@/components/role-guard';

interface TeamMember {
  teamMemberId: string;
  memberId: string;
  memberType: 'athlete' | 'coach';
  role: string;
  status: string;
}

interface CoachInfo {
  coachId: string;
  firstName: string;
  lastName: string;
  email: string;
  certifications?: string[];
  specialties?: string[];
}

export default function TeamCoachesPage() {
  const { teamId } = useParams() as { teamId: string };
  const { user } = useAuth();
  const [coaches, setCoaches] = useState<Array<TeamMember & { details: CoachInfo }>>([]);
  const [availableCoaches, setAvailableCoaches] = useState<CoachInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCoachId, setSelectedCoachId] = useState('');
  const [selectedRole, setSelectedRole] = useState('assistant_coach');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCoaches = useCallback(async () => {
    try {
      setIsLoading(true);
      const { items: members } = await api.get<{ items: TeamMember[] }>(`/teams/${teamId}/members`);
      const coachMembers = members.filter((m) => m.memberType === 'coach');

      // Fetch coach details
      const withDetails = await Promise.all(
        coachMembers.map(async (member) => {
          try {
            const details = await api.get<CoachInfo>(`/coaches/${member.memberId}`);
            return { ...member, details };
          } catch {
            return {
              ...member,
              details: { coachId: member.memberId, firstName: 'Unknown', lastName: '', email: '', certifications: [], specialties: [] },
            };
          }
        }),
      );
      setCoaches(withDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load coaches');
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (user && teamId) fetchCoaches();
  }, [user, teamId, fetchCoaches]);

  // Load available coaches when add form opens
  useEffect(() => {
    if (!showAddForm) return;

    async function loadAvailable() {
      try {
        const { items: allCoaches } = await api.get<{ items: CoachInfo[] }>('/coaches');
        const existingIds = new Set(coaches.map((c) => c.memberId));
        setAvailableCoaches(allCoaches.filter((c) => !existingIds.has(c.coachId)));
      } catch {
        setAvailableCoaches([]);
      }
    }

    loadAvailable();
  }, [showAddForm, coaches]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoachId) return;
    setIsSubmitting(true);

    try {
      await api.post(`/teams/${teamId}/members`, {
        memberId: selectedCoachId,
        memberType: 'coach',
        role: selectedRole,
      });
      setShowAddForm(false);
      setSelectedCoachId('');
      await fetchCoaches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add coach');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (teamMemberId: string) => {
    try {
      await api.delete(`/team-members/${teamMemberId}`);
      setCoaches((prev) => prev.filter((c) => c.teamMemberId !== teamMemberId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove coach');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="text-gray-500">Loading coaches...</div></div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/teams/${teamId}`} className="text-sm text-blue-600 hover:underline">&larr; Back to Team</Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Team Coaches</h1>
        <RoleGuard allowedRoles={['SuperAdmin', 'OrgAdmin', 'OrgManager', 'TeamAdmin', 'TeamManager']}>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            {showAddForm ? 'Cancel' : 'Add Coach'}
          </button>
        </RoleGuard>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Coach to Team</h2>
          {availableCoaches.length === 0 ? (
            <div className="text-sm text-gray-500">
              No available coaches.{' '}
              <Link href="/coaches/new" className="text-blue-600 hover:underline">Create a new coach</Link> first.
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Coach *</label>
                <select
                  required
                  value={selectedCoachId}
                  onChange={(e) => setSelectedCoachId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a coach...</option>
                  {availableCoaches.map((c) => (
                    <option key={c.coachId} value={c.coachId}>
                      {c.firstName} {c.lastName}{c.email ? ` (${c.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="head_coach">Head Coach</option>
                  <option value="assistant_coach">Assistant Coach</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !selectedCoachId}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Adding...' : 'Add to Team'}
              </button>
            </>
          )}
        </form>
      )}

      <div className="rounded-xl bg-white shadow-sm border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Email</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Role</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Certifications</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coaches.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                  No coaches assigned to this team yet.
                </td>
              </tr>
            ) : (
              coaches.map((coach) => (
                <tr key={coach.teamMemberId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <Link href={`/coaches/${coach.memberId}`} className="text-blue-600 hover:underline">
                      {coach.details.firstName} {coach.details.lastName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{coach.details.email || '—'}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800">
                      {coach.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(coach.details.certifications || []).map((cert) => (
                        <span key={cert} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {cert}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <RoleGuard allowedRoles={['SuperAdmin', 'OrgAdmin', 'TeamAdmin']}>
                      <button
                        onClick={() => handleRemove(coach.teamMemberId)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </RoleGuard>
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
