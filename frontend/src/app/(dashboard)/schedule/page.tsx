export default function SchedulePage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors">
          Add Event
        </button>
      </div>
      <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-6">
        <p className="text-sm text-gray-500 text-center py-12">
          No upcoming events. Click &quot;Add Event&quot; to schedule a game or
          practice.
        </p>
      </div>
    </div>
  );
}
