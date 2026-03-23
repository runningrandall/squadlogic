'use client';

import { type ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from '@/lib/amplify-config';
import { AuthProvider } from '@/lib/auth-context';

Amplify.configure(amplifyConfig, { ssr: true });

export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
