import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { PublishStats, VideoQueueItem } from "~/lib/publisher-types";

const getStats = createServerFn({ method: "GET" }).handler(async () => {
  const { getPublishStats } = await import("~/lib/publisher");
  return getPublishStats();
});

const getQueueData = createServerFn({ method: "GET" }).handler(async () => {
  const { getQueue } = await import("~/lib/publisher");
  return getQueue("all");
});

export const Route = createFileRoute("/publishing")({
  loader: async () => {
    const [stats, queue] = await Promise.all([getStats(), getQueueData()]);
    return { stats, queue };
  },
  component: PublishingPage,
});

function PublishingPage() {
  const { stats, queue } = Route.useLoaderData();

  const statusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-green-100 text-green-800";
      case "uploading": return "bg-blue-100 text-blue-800";
      case "queued":
      case "ready":
      case "scheduled": return "bg-yellow-100 text-yellow-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  };

  return (
    <div className="min-h-dvh bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Publishing Dashboard</h1>
          <p className="text-gray-500">YouTube auto-publisher status and queue management</p>
        </header>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">In Queue</p>
            <p className="text-3xl font-bold">{stats.total_queued}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Published Today</p>
            <p className="text-3xl font-bold text-green-600">{stats.total_published_today}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">All Time Published</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total_published_all}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Failed</p>
            <p className="text-3xl font-bold text-red-600">{stats.total_failed}</p>
          </div>
        </div>

        {/* Schedule */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Today's Schedule</h2>
          <div className="flex flex-wrap gap-2">
            {stats.today_slots.map((slot) => (
              <div
                key={slot.id}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  slot.is_active
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {slot.upload_time}
                {slot.is_active ? "" : " (paused)"}
              </div>
            ))}
          </div>
          {stats.next_scheduled && (
            <p className="mt-3 text-sm text-gray-500">
              Next upload: {formatTime(stats.next_scheduled)}
            </p>
          )}
          {stats.last_upload && (
            <p className="text-sm text-gray-500">
              Last upload: {formatTime(stats.last_upload)}
            </p>
          )}
          <div className="mt-4">
            <p className="text-sm text-gray-400">
              Target: 5 videos/day | Daily progress: {stats.total_published_today}/5
            </p>
            <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-indigo-500 transition-all"
                style={{ width: `${Math.min(100, (stats.total_published_today / 5) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Queue Table */}
        <div className="rounded-lg bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold">Video Queue</h2>
            <p className="text-sm text-gray-500">{queue.length} total items</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Title</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Scheduled</th>
                  <th className="px-6 py-3 font-medium">Published</th>
                  <th className="px-6 py-3 font-medium">YouTube ID</th>
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      No videos in the queue yet. Videos from the Video Producer will appear here.
                    </td>
                  </tr>
                ) : (
                  queue.slice(0, 50).map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="max-w-xs truncate px-6 py-3 font-medium">
                        {item.title}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {formatTime(item.scheduled_at)}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {formatTime(item.published_at)}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-gray-500">
                        {item.youtube_video_id ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* YouTube Config Status */}
        <div className="mt-8 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">YouTube API Status</h2>
          <p className="text-sm text-gray-500">
            YouTube OAuth credentials are required before real uploads can begin.
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <p><strong>Setup required:</strong></p>
            <ol className="ml-5 list-decimal space-y-1 text-gray-600">
              <li>Create a Google Cloud Console project</li>
              <li>Enable YouTube Data API v3</li>
              <li>Create OAuth 2.0 credentials (Desktop app)</li>
              <li>Authorize the YouTube channel via OAuth flow</li>
              <li>Store credentials in the <code className="rounded bg-gray-100 px-1">youtube_channels</code> table</li>
            </ol>
            <p className="mt-2 text-gray-400">
              Until then, the scheduler will simulate uploads and queue videos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}