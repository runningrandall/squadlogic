'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { useAuth, type UserRole } from '@/lib/auth-context';

interface NavItem {
  label: string;
  href: string;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Teams', href: '/teams' },
  { label: 'Athletes', href: '/athletes' },
  { label: 'Coaches', href: '/coaches' },
  { label: 'Schedule', href: '/schedule' },
  { label: 'Communications', href: '/communications' },
];

function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const visibleItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">SquadLogic</h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-lg text-sm ${
                isActive
                  ? 'bg-gray-700 text-white font-medium'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
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

function RouteReconciler({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // After hydration, force Next.js to navigate to the actual URL
    // This handles the case where CloudFront serves /dashboard/index.html
    // for a dynamic route like /teams/123
    router.replace(pathname);
    setIsReady(true);
    // Only run once on mount to reconcile the route after CloudFront serves the dashboard shell
    // eslint-disable-next-line
  }, []);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 bg-gray-50">
          <RouteReconciler>{children}</RouteReconciler>
        </main>
      </div>
    </AuthGuard>
  );
}
