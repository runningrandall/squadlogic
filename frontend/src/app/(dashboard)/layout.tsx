'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { useAuth } from '@/lib/auth-context';
import { NavProvider, useNav } from '@/lib/nav-context';

function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { teams, selectedTeam, selectTeam } = useNav();

  const linkClasses = (href: string, exact = true) => {
    const isActive = exact ? pathname === href : pathname.startsWith(href);
    return `block px-3 py-2 rounded-lg text-sm ${
      isActive
        ? 'bg-gray-700 text-white font-medium'
        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
    }`;
  };

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const teamId = e.target.value;
    if (!teamId) {
      selectTeam(null);
      return;
    }
    const team = teams.find((t) => t.teamId === teamId);
    if (team) {
      selectTeam(team);
      router.push(`/teams/${team.teamId}`);
    }
  };

  const teamSubItems = selectedTeam
    ? [
        { label: 'Roster', href: `/teams/${selectedTeam.teamId}/roster` },
        { label: 'Coaches', href: `/teams/${selectedTeam.teamId}/coaches` },
        { label: 'Squads', href: `/teams/${selectedTeam.teamId}/groups` },
        { label: 'Challenges', href: `/teams/${selectedTeam.teamId}/challenges` },
      ]
    : [];

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">SquadLogic</h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <Link href="/dashboard" className={linkClasses('/dashboard')}>
          Dashboard
        </Link>

        <Link href="/teams" className={linkClasses('/teams')}>
          Teams
        </Link>

        {/* Team selector */}
        <div className="pt-1 pb-1">
          <select
            value={selectedTeam?.teamId ?? ''}
            onChange={handleTeamChange}
            className="w-full bg-gray-800 text-gray-300 text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-gray-500"
          >
            <option value="">Select a team...</option>
            {teams.map((team) => (
              <option key={team.teamId} value={team.teamId}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        {/* Team sub-items (only when a team is selected) */}
        {selectedTeam && (
          <div className="ml-3 space-y-1">
            {teamSubItems.map((item) => (
              <Link key={item.href} href={item.href} className={linkClasses(item.href)}>
                {item.label}
              </Link>
            ))}
          </div>
        )}

        <Link href="/athletes" className={linkClasses('/athletes')}>
          Athletes
        </Link>

        <Link href="/coaches" className={linkClasses('/coaches')}>
          Coaches
        </Link>
      </nav>

      {user && (
        <div className="p-4 border-t border-gray-700">
          <div className="text-sm text-gray-400 mb-1">{user.email}</div>
          <div className="text-xs text-gray-500 mb-3">{user.role}</div>
          <button
            onClick={() => signOut()}
            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg"
          >
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <NavProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-8 bg-gray-50">
            {children}
          </main>
        </div>
      </NavProvider>
    </AuthGuard>
  );
}
