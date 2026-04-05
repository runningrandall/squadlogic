'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
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

  useEffect(() => {
    if (!user) return;
    setIsLoadingTeams(true);
    api.get<{ items: Team[] }>('/teams')
      .then((res) => setTeams(res.items))
      .catch(() => {})
      .finally(() => setIsLoadingTeams(false));
  }, [user]);

  // Auto-select team from URL if on a team page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const match = window.location.pathname.match(/\/teams\/([^/]+)/);
    if (match && teams.length > 0) {
      const team = teams.find(t => t.teamId === match[1]);
      if (team && (!selectedTeam || selectedTeam.teamId !== team.teamId)) {
        setSelectedTeam(team);
      }
    }
  }, [teams, selectedTeam]);

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
