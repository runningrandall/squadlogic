'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export default function ChallengesPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChallenges() {
      try {
        setIsLoading(true);
        const data = await api.get<{ items: Challenge[] }>(`/teams/${teamId}/challenges`);
        setChallenges(data.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load challenges');
      } finally {
        setIsLoading(false);
      }
    }

    if (user && teamId) {
      fetchChallenges();
    }
  }, [user, teamId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading challenges...</div>
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
        <h1 className="text-3xl font-bold text-gray-900">Challenges</h1>
        <RoleGuard allowedRoles={['SuperAdmin', 'OrgAdmin', 'TeamAdmin']}>
          <button
            onClick={() => router.push(`/teams/${teamId}/challenges/new`)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Create Challenge
          </button>
        </RoleGuard>
      </div>

      {challenges.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-500">No challenges yet. Create a challenge to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {challenges.map((challenge) => (
            <Link
              key={challenge.challengeId}
              href={`/teams/${teamId}/challenges/${challenge.challengeId}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{challenge.title}</h3>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClasses(challenge.status)}`}>
                  {challenge.status}
                </span>
              </div>
              {challenge.description && (
                <p className="text-sm text-gray-500 mt-1">{truncate(challenge.description, 100)}</p>
              )}
              <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
                <span>Due: {new Date(challenge.dueDate).toLocaleDateString()}</span>
                <span>{challenge.points} pts</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
