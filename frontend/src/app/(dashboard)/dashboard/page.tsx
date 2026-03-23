export default function DashboardPage() {
  const stats = [
    { label: "Total Teams", value: "—" },
    { label: "Active Players", value: "—" },
    { label: "Upcoming Games", value: "—" },
    { label: "Unread Messages", value: "—" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Welcome to SquadLogic
      </h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl bg-white p-6 shadow-sm border border-gray-200"
          >
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
