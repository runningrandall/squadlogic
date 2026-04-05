'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleGuard } from '@/components/role-guard';

interface Athlete {
  athleteId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  positions: string[];
  jerseyNumber: string;
  status: string;
}

interface TeamMembership {
  teamId: string;
  teamName: string;
  role: string;
  status: string;
}

export default function AthleteDetailPage() {
  const { athleteId } = useParams() as { athleteId: string };
  const { user } = useAuth();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
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
    dateOfBirth: '',
    positions: '',
    jerseyNumber: '',
    status: '',
  });

  const fetchAthlete = useCallback(async () => {
    try {
      setIsLoading(true);
      const [athleteData, teamsData] = await Promise.all([
        api.get<Athlete>(`/athletes/${athleteId}`),
        api.get<{ items: TeamMembership[] }>(`/athletes/${athleteId}/teams`).then(r => r.items).catch(() => [] as TeamMembership[]),
      ]);
      setAthlete(athleteData);
      setTeams(teamsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load athlete');
    } finally {
      setIsLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    if (user && athleteId) {
      fetchAthlete();
    }
  }, [user, athleteId, fetchAthlete]);

  const startEditing = () => {
    if (!athlete) return;
    setForm({
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      email: athlete.email || '',
      phone: athlete.phone || '',
      dateOfBirth: athlete.dateOfBirth || '',
      positions: athlete.positions?.join(', ') || '',
      jerseyNumber: athlete.jerseyNumber || '',
      status: athlete.status,
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
    if (!athlete) return;

    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);

    try {
      const updates: Record<string, unknown> = {};

      if (form.firstName !== athlete.firstName) updates.firstName = form.firstName;
      if (form.lastName !== athlete.lastName) updates.lastName = form.lastName;
      if (form.email !== (athlete.email || '')) updates.email = form.email || undefined;
      if (form.phone !== (athlete.phone || '')) updates.phone = form.phone || undefined;
      if (form.dateOfBirth !== (athlete.dateOfBirth || '')) updates.dateOfBirth = form.dateOfBirth || undefined;
      if (form.jerseyNumber !== (athlete.jerseyNumber || '')) updates.jerseyNumber = form.jerseyNumber || undefined;
      if (form.status !== athlete.status) updates.status = form.status;

      const newPositions = form.positions
        ? form.positions.split(',').map((p) => p.trim()).filter(Boolean)
        : [];
      const oldPositions = athlete.positions || [];
      if (JSON.stringify(newPositions) !== JSON.stringify(oldPositions)) {
        updates.positions = newPositions;
      }

      if (Object.keys(updates).length === 0) {
        setIsEditing(false);
        return;
      }

      await api.put(`/athletes/${athleteId}`, updates);
      setSaveSuccess(true);
      setIsEditing(false);
      await fetchAthlete();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update athlete');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading athlete...</div>
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

  if (!athlete) {
    return (
      <div className="text-center py-12 text-gray-500">Athlete not found.</div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/athletes" className="text-sm text-blue-600 hover:underline">
          &larr; Back to Athletes
        </Link>
      </div>

      {saveSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 mb-6">
          <p className="text-green-800">Athlete updated successfully.</p>
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
            {athlete.firstName} {athlete.lastName}
          </h1>
          <p className="text-gray-500 mt-1">{athlete.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            athlete.status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {athlete.status}
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

          <div className="grid grid-cols-2 gap-4">
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
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="positions" className="block text-sm font-medium text-gray-700 mb-1">
                Positions
              </label>
              <input
                type="text"
                id="positions"
                name="positions"
                value={form.positions}
                onChange={handleChange}
                placeholder="e.g. Forward, Midfielder"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="jerseyNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Jersey Number
              </label>
              <input
                type="text"
                id="jerseyNumber"
                name="jerseyNumber"
                value={form.jerseyNumber}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
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
                <dd className="text-sm text-gray-900">{athlete.phone || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                <dd className="text-sm text-gray-900">{athlete.dateOfBirth || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Positions</dt>
                <dd className="text-sm text-gray-900">
                  {athlete.positions?.length > 0 ? athlete.positions.join(', ') : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Jersey Number</dt>
                <dd className="text-sm text-gray-900">{athlete.jerseyNumber || '-'}</dd>
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
