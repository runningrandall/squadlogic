'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleGuard } from '@/components/role-guard';

interface Athlete {
  athleteId: string;
  firstName: string;
  lastName: string;
  email: string;
  positions: string[];
  status: string;
}

export default function AthletesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAthletes() {
      try {
        setIsLoading(true);
        const { items: data } = await api.get<{ items: Athlete[] }>('/athletes');
        setAthletes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load athletes');
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchAthletes();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading athletes...</div>
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Athletes</h1>
        <RoleGuard allowedRoles={['SuperAdmin', 'OrgAdmin', 'OrgManager', 'TeamAdmin', 'TeamManager']}>
          <button
            onClick={() => router.push('/athletes/new')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Add Athlete
          </button>
        </RoleGuard>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Email</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Positions</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {athletes.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">
                  No athletes yet. Click &quot;Add Athlete&quot; to get started.
                </td>
              </tr>
            ) : (
              athletes.map((athlete) => (
                <tr key={athlete.athleteId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link href={`/athletes/${athlete.athleteId}`} className="text-blue-600 hover:underline font-medium">
                      {athlete.firstName} {athlete.lastName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{athlete.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {athlete.positions?.length > 0
                      ? athlete.positions.join(', ')
                      : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      athlete.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {athlete.status}
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
