'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface DashboardStats {
  teams: number;
  athletes: number;
  coaches: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({ teams: 0, athletes: 0, coaches: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchStats() {
      try {
        const [teamsRes, athletesRes, coachesRes] = await Promise.all([
          api.get<{ items: unknown[] }>('/teams').catch(() => ({ items: [] })),
          api.get<{ items: unknown[] }>('/athletes').catch(() => ({ items: [] })),
          api.get<{ items: unknown[] }>('/coaches').catch(() => ({ items: [] })),
        ]);
        setStats({
          teams: teamsRes.items.length,
          athletes: athletesRes.items.length,
          coaches: coachesRes.items.length,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [user]);

  const statCards = [
    { label: 'Total Teams', value: stats.teams, href: '/teams', color: 'blue' },
    { label: 'Athletes', value: stats.athletes, href: '/athletes', color: 'green' },
    { label: 'Coaches', value: stats.coaches, href: '/coaches', color: 'purple' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Welcome to SquadLogic
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {isLoading ? '...' : card.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/teams/new"
          className="bg-blue-50 border border-blue-200 rounded-xl p-6 hover:bg-blue-100 transition-colors"
        >
          <h3 className="text-lg font-semibold text-blue-900">Create a Team</h3>
          <p className="text-sm text-blue-700 mt-1">Set up a new team for your organization</p>
        </Link>
        <Link
          href="/athletes/new"
          className="bg-green-50 border border-green-200 rounded-xl p-6 hover:bg-green-100 transition-colors"
        >
          <h3 className="text-lg font-semibold text-green-900">Add an Athlete</h3>
          <p className="text-sm text-green-700 mt-1">Register a new athlete in your organization</p>
        </Link>
      </div>
    </div>
  );
}
