'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Team {
  teamId: string;
  name: string;
  sport: string;
}

interface NavContextType {
  teams: Team[];
  selectedTeam: Team | null;
  selectTeam: (team: Team | null) => void;
  isLoadingTeams: boolean;
}

const NavContext = createContext<NavContextType | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);

  const loadTeams = useCallback(() => {
    if (!user) return;
    setIsLoadingTeams(true);
    api.get<{ items: Team[] }>('/teams')
      .then((res) => {
        setTeams(res.items);
      })
      .catch(() => {})
      .finally(() => setIsLoadingTeams(false));
  }, [user]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // Auto-select team from URL if on a team page
  const pathname = usePathname();
  useEffect(() => {
    const match = pathname.match(/\/teams\/([^/]+)/);
    if (match && teams.length > 0) {
      const team = teams.find(t => t.teamId === match[1]);
      if (team) {
        setSelectedTeam(team);
      }
    }
  }, [pathname, teams]);

  const selectTeam = useCallback((team: Team | null) => {
    setSelectedTeam(team);
  }, []);

  return (
    <NavContext.Provider value={{ teams, selectedTeam, selectTeam, isLoadingTeams }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  const context = useContext(NavContext);
  if (!context) throw new Error('useNav must be used within NavProvider');
  return context;
}
