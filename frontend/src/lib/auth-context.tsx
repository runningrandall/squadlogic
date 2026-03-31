'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  signOut as amplifySignOut,
  confirmSignUp as amplifyConfirmSignUp,
  resetPassword as amplifyResetPassword,
  confirmResetPassword as amplifyConfirmResetPassword,
  getCurrentUser,
  fetchAuthSession,
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

const ROLE_PRIORITY = [
  'SuperAdmin', 'OrgAdmin', 'OrgManager', 'OrgUser',
  'TeamAdmin', 'TeamManager', 'TeamUser', 'Athlete',
] as const;

export type UserRole = typeof ROLE_PRIORITY[number];

export interface AuthUser {
  userId: string;
  email: string;
  organizationId?: string;
  teamId?: string;
  role: UserRole;
  groups: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ nextStep: string }>;
  signUp: (email: string, password: string) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmResetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getHighestRole(groups: string[]): UserRole {
  for (const role of ROLE_PRIORITY) {
    if (groups.includes(role)) return role;
  }
  return 'Athlete';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const accessPayload = session.tokens?.accessToken?.payload;
      const idPayload = session.tokens?.idToken?.payload;

      const groups = (accessPayload?.['cognito:groups'] as string[]) ?? [];
      // Try access token first (V2 trigger), then ID token (always has custom attrs)
      const organizationId =
        (accessPayload?.['custom:organizationId'] as string) ||
        (idPayload?.['custom:organizationId'] as string) ||
        undefined;
      const teamId =
        (accessPayload?.['custom:teamId'] as string) ||
        (idPayload?.['custom:teamId'] as string) ||
        undefined;

      setUser({
        userId: currentUser.userId,
        email: currentUser.signInDetails?.loginId ?? (idPayload?.email as string) ?? '',
        organizationId,
        teamId,
        role: getHighestRole(groups),
        groups,
      });
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signInWithRedirect') {
        loadUser();
      }
    });
    return unsubscribe;
  }, [loadUser]);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    const result = await amplifySignIn({ username: email, password });
    if (result.isSignedIn) {
      await loadUser();
    }
    return { nextStep: result.nextStep.signInStep };
  }, [loadUser]);

  const handleSignUp = useCallback(async (email: string, password: string) => {
    await amplifySignUp({
      username: email,
      password,
      options: { userAttributes: { email } },
    });
  }, []);

  const handleConfirmSignUp = useCallback(async (email: string, code: string) => {
    await amplifyConfirmSignUp({ username: email, confirmationCode: code });
  }, []);

  const handleSignOut = useCallback(async () => {
    await amplifySignOut();
    setUser(null);
  }, []);

  const handleResetPassword = useCallback(async (email: string) => {
    await amplifyResetPassword({ username: email });
  }, []);

  const handleConfirmResetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      await amplifyConfirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword,
      });
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn: handleSignIn,
        signUp: handleSignUp,
        confirmSignUp: handleConfirmSignUp,
        signOut: handleSignOut,
        resetPassword: handleResetPassword,
        confirmResetPassword: handleConfirmResetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
