import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="text-center max-w-2xl px-6">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">SquadLogic</h1>
        <p className="text-xl text-gray-600 mb-8">
          The all-in-one platform for managing your sports teams. Organize
          rosters, coordinate schedules, and streamline communications.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-300 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
