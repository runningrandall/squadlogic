'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleGuard } from '@/components/role-guard';

interface Team {
  teamId: string;
  name: string;
  sport: string;
}

export default function NewAthletePage() {
  useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    positions: '',
    jerseyNumber: '',
  });

  useEffect(() => {
    api.get<{ items: Team[] }>('/teams')
      .then((res) => setTeams(res.items))
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeams((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const athlete = await api.post<{ athleteId: string }>('/athletes', {
        firstName: form.firstName,
        lastName: form.lastName,
        ...(form.email ? { email: form.email } : {}),
        phone: form.phone || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        positions: form.positions
          ? form.positions.split(',').map((p) => p.trim()).filter(Boolean)
          : [],
        jerseyNumber: form.jerseyNumber || undefined,
      });

      // Add athlete to selected teams
      for (const teamId of selectedTeams) {
        await api.post(`/teams/${teamId}/members`, {
          memberId: athlete.athleteId,
          memberType: 'athlete',
          role: 'player',
        }).catch(() => {}); // Don't fail if team assignment fails
      }

      router.push('/athletes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create athlete');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RoleGuard
      allowedRoles={['SuperAdmin', 'OrgAdmin', 'OrgManager', 'TeamAdmin', 'TeamManager']}
      fallback={
        <div className="text-center py-12 text-gray-500">
          You do not have permission to add athletes.
        </div>
      }
    >
      <div className="max-w-2xl">
        <div className="mb-8">
          <Link href="/athletes" className="text-sm text-blue-600 hover:underline">
            &larr; Back to Athletes
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Add Athlete</h1>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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

          {teams.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Teams
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {teams.map((team) => (
                  <label key={team.teamId} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedTeams.includes(team.teamId)}
                      onChange={() => toggleTeam(team.teamId)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{team.name}</span>
                    <span className="text-xs text-gray-400">{team.sport}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedTeams.length} team{selectedTeams.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Athlete'}
            </button>
            <Link
              href="/athletes"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </RoleGuard>
  );
}
