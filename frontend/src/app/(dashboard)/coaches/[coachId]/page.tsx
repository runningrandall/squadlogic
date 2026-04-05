'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleGuard } from '@/components/role-guard';

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
  const { coachId } = useParams() as { coachId: string };
  const { user } = useAuth();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [teams, setTeams] = useState<TeamMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    certifications: '',
    specialties: '',
    status: '',
  });

  const fetchCoach = useCallback(async () => {
    try {
      setIsLoading(true);
      const [coachData, teamsData] = await Promise.all([
        api.get<Coach>(`/coaches/${coachId}`),
        api.get<{ items: TeamMembership[] }>(`/coaches/${coachId}/teams`).then(r => r.items).catch(() => [] as TeamMembership[]),
      ]);
      setCoach(coachData);
      setTeams(teamsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load coach');
    } finally {
      setIsLoading(false);
    }
  }, [coachId]);

  useEffect(() => {
    if (user && coachId) {
      fetchCoach();
    }
  }, [user, coachId, fetchCoach]);

  const startEditing = () => {
    if (!coach) return;
    setForm({
      firstName: coach.firstName,
      lastName: coach.lastName,
      email: coach.email || '',
      phone: coach.phone || '',
      certifications: coach.certifications?.join(', ') || '',
      specialties: coach.specialties?.join(', ') || '',
      status: coach.status,
    });
    setSaveError(null);
    setSaveSuccess(false);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coach) return;

    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);

    try {
      const updates: Record<string, unknown> = {};

      if (form.firstName !== coach.firstName) updates.firstName = form.firstName;
      if (form.lastName !== coach.lastName) updates.lastName = form.lastName;
      if (form.email !== (coach.email || '')) updates.email = form.email || undefined;
      if (form.phone !== (coach.phone || '')) updates.phone = form.phone || undefined;
      if (form.status !== coach.status) updates.status = form.status;

      const newCertifications = form.certifications
        ? form.certifications.split(',').map((c) => c.trim()).filter(Boolean)
        : [];
      const oldCertifications = coach.certifications || [];
      if (JSON.stringify(newCertifications) !== JSON.stringify(oldCertifications)) {
        updates.certifications = newCertifications;
      }

      const newSpecialties = form.specialties
        ? form.specialties.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const oldSpecialties = coach.specialties || [];
      if (JSON.stringify(newSpecialties) !== JSON.stringify(oldSpecialties)) {
        updates.specialties = newSpecialties;
      }

      if (Object.keys(updates).length === 0) {
        setIsEditing(false);
        return;
      }

      await api.put(`/coaches/${coachId}`, updates);
      setSaveSuccess(true);
      setIsEditing(false);
      await fetchCoach();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update coach');
    } finally {
      setIsSaving(false);
    }
  };

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

      {saveSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 mb-6">
          <p className="text-green-800">Coach updated successfully.</p>
        </div>
      )}

      {saveError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6">
          <p className="text-red-800">{saveError}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {coach.firstName} {coach.lastName}
          </h1>
          <p className="text-gray-500 mt-1">{coach.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            coach.status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {coach.status}
          </span>
          {!isEditing && (
            <RoleGuard allowedRoles={['SuperAdmin', 'OrgAdmin', 'OrgManager', 'TeamAdmin', 'TeamManager']}>
              <button
                onClick={startEditing}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors"
              >
                Edit
              </button>
            </RoleGuard>
          )}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                required
                value={form.firstName}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                required
                value={form.lastName}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="certifications" className="block text-sm font-medium text-gray-700 mb-1">
              Certifications
            </label>
            <input
              type="text"
              id="certifications"
              name="certifications"
              value={form.certifications}
              onChange={handleChange}
              placeholder="e.g. USSF A, NSCAA Advanced"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Comma-separated list</p>
          </div>

          <div>
            <label htmlFor="specialties" className="block text-sm font-medium text-gray-700 mb-1">
              Specialties
            </label>
            <input
              type="text"
              id="specialties"
              name="specialties"
              value={form.specialties}
              onChange={handleChange}
              placeholder="e.g. Goalkeeping, Youth Development"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Comma-separated list</p>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
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
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
