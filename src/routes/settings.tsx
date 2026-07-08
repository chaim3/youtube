import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";
import { Navbar } from "~/components/Navbar";
import { execSync } from "node:child_process";
import React from "react";

// ── Server Functions ──────────────────────────────────────────────

const getBusinessName = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const cfg = JSON.parse(await readFile("site.json", "utf8")) as {
      businessName?: string;
    };
    return cfg.businessName?.trim() ?? "";
  } catch {
    return "";
  }
});

const getYouTubeConfig = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const result = execSync(
      `team-db "SELECT client_id, client_secret, refresh_token, channel_id, channel_name FROM youtube_channels WHERE is_active = 1 LIMIT 1"`,
      { encoding: "utf-8" }
    );
    const channels = JSON.parse(result);
    return channels[0] ?? null;
  } catch {
    return null;
  }
});

const saveYouTubeConfig = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { client_id: string; client_secret: string } }) => {
    try {
      // Check if any channel exists
      const existing = execSync(
        `team-db "SELECT id FROM youtube_channels LIMIT 1"`,
        { encoding: "utf-8" }
      );
      const existingRows = JSON.parse(existing);

      if (existingRows.length > 0) {
        // Update existing
        execSync(
          `team-db "UPDATE youtube_channels SET client_id = '${data.client_id.replace(/'/g, "''")}', client_secret = '${data.client_secret.replace(/'/g, "''")}', updated_at = datetime('now') WHERE is_active = 1"`,
          { encoding: "utf-8" }
        );
      } else {
        // Insert new
        execSync(
          `team-db "INSERT INTO youtube_channels (id, client_id, client_secret, is_active) VALUES ('chan-1', '${data.client_id.replace(/'/g, "''")}', '${data.client_secret.replace(/'/g, "''")}', 1)"`,
          { encoding: "utf-8" }
        );
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
);

const getScheduleSlots = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const result = execSync(
      `team-db "SELECT id, upload_time, is_active FROM publish_schedule ORDER BY upload_time"`,
      { encoding: "utf-8" }
    );
    return JSON.parse(result);
  } catch {
    return [];
  }
});

const toggleSlot = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { slotId: string; isActive: number } }) => {
    try {
      execSync(
        `team-db "UPDATE publish_schedule SET is_active = ${data.isActive}, updated_at = datetime('now') WHERE id = '${data.slotId}'"`,
        { encoding: "utf-8" }
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
);

const getSimulationMode = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const result = execSync(
      `team-db "SELECT value FROM config WHERE key = 'simulation_mode'"`,
      { encoding: "utf-8" }
    );
    const rows = JSON.parse(result);
    return rows[0]?.value === "true";
  } catch {
    return true; // Default to simulation
  }
});

const setSimulationMode = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { enabled: boolean } }) => {
    try {
      const val = data.enabled ? "true" : "false";
      // Check if key exists
      const existing = execSync(
        `team-db "SELECT key FROM config WHERE key = 'simulation_mode'"`,
        { encoding: "utf-8" }
      );
      const rows = JSON.parse(existing);

      if (rows.length > 0) {
        execSync(
          `team-db "UPDATE config SET value = '${val}' WHERE key = 'simulation_mode'"`,
          { encoding: "utf-8" }
        );
      } else {
        execSync(
          `team-db "INSERT INTO config (key, value) VALUES ('simulation_mode', '${val}')"`,
          { encoding: "utf-8" }
        );
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
);

// ── Route ─────────────────────────────────────────────────────────

export const Route = createFileRoute("/settings")({
  loader: async () => {
    const [name, youtubeConfig, scheduleSlots, simulationMode] =
      await Promise.all([
        getBusinessName(),
        getYouTubeConfig(),
        getScheduleSlots(),
        getSimulationMode(),
      ]);
    return { name, youtubeConfig, scheduleSlots, simulationMode };
  },
  component: SettingsPage,
});

// ── Components ────────────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        enabled ? "bg-neon-cyan" : "bg-white/10"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingsPage() {
  const { name, youtubeConfig, scheduleSlots, simulationMode } =
    Route.useLoaderData();
  const brandName = name || "TrendAI Media";

  return (
    <div className="min-h-dvh bg-dark-900">
      <div className="pointer-events-none fixed inset-0 bg-grid" />
      <Navbar name={brandName} />

      <main className="relative mx-auto max-w-4xl px-6 pt-24 pb-20">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Settings</h1>
          <p className="mt-2 text-gray-400">
            Configure your YouTube channel, publishing schedule, and preferences.
          </p>
        </div>

        <div className="space-y-8">
          {/* ── Status Indicator ── */}
          <SettingsSection title="System Status" icon="status">
            <div className="flex items-center justify-between rounded-xl bg-white/[0.02] p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      simulationMode ? "bg-yellow-400" : "bg-neon-green"
                    }`}
                  />
                  <span className="font-medium text-white">
                    {simulationMode ? "Simulation Mode" : "Live Mode"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {simulationMode
                    ? "Videos are processed but NOT uploaded to YouTube. Ideal for testing."
                    : "Videos will be uploaded to YouTube in real-time."}
                </p>
              </div>
              <Toggle
                enabled={!simulationMode}
                onChange={async (v) => {
                  await setSimulationMode({ data: { enabled: !v } });
                  window.location.reload();
                }}
              />
            </div>
          </SettingsSection>

          {/* ── YouTube Channel Configuration ── */}
          <SettingsSection title="YouTube Channel" icon="youtube">
            <YouTubeConfigSection config={youtubeConfig} />
          </SettingsSection>

          {/* ── Publishing Schedule ── */}
          <SettingsSection title="Publishing Schedule" icon="schedule">
            <ScheduleSection slots={scheduleSlots} />
          </SettingsSection>

          {/* ── Niche Preferences ── */}
          <SettingsSection title="Niche Preferences" icon="niche">
            <NichePreferences />
          </SettingsSection>
        </div>
      </main>
    </div>
  );
}

// ── Settings Section Wrapper ──────────────────────────────────────

function SettingsSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  const icons: Record<string, React.ReactNode> = {
    status: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    youtube: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    schedule: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    niche: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  };

  return (
    <div className="card-gradient rounded-2xl border border-white/5 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-white/5 px-6 py-4">
        <span className="text-neon-cyan">{icons[icon]}</span>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── YouTube Config Section ────────────────────────────────────────

function YouTubeConfigSection({ config }: { config: Record<string, string> | null }) {
  const isConnected = config?.client_id && config?.client_id.length > 0;

  return (
    <div className="space-y-5">
      {/* Connection Status */}
      <div className="flex items-center justify-between rounded-xl bg-white/[0.02] p-4">
        <div className="flex items-center gap-3">
          <span
            className={`h-3 w-3 rounded-full ${
              isConnected ? "bg-neon-green" : "bg-gray-500"
            }`}
          />
          <div>
            <span className="font-medium text-white">
              {isConnected ? "Connected" : "Not Connected"}
            </span>
            {config?.channel_name && (
              <p className="text-sm text-gray-500">{config.channel_name}</p>
            )}
          </div>
        </div>
        {!isConnected && (
          <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs text-yellow-400">
            Setup Required
          </span>
        )}
      </div>

      {/* Credentials Form */}
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-400">
            Client ID
          </label>
          <input
            type="text"
            id="client-id"
            defaultValue={config?.client_id ?? ""}
            placeholder="Paste your YouTube OAuth Client ID"
            className="w-full rounded-xl border border-white/10 bg-dark-800 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-neon-cyan/40 focus:ring-1 focus:ring-neon-cyan/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-400">
            Client Secret
          </label>
          <input
            type="password"
            id="client-secret"
            defaultValue={config?.client_secret ?? ""}
            placeholder="Paste your YouTube OAuth Client Secret"
            className="w-full rounded-xl border border-white/10 bg-dark-800 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-neon-cyan/40 focus:ring-1 focus:ring-neon-cyan/20"
          />
        </div>
        <button
          onClick={async () => {
            const clientId = (
              document.getElementById("client-id") as HTMLInputElement
            )?.value;
            const clientSecret = (
              document.getElementById("client-secret") as HTMLInputElement
            )?.value;
            if (!clientId || !clientSecret) {
              alert("Please fill in both Client ID and Client Secret");
              return;
            }
            const result = await saveYouTubeConfig({
              data: { client_id: clientId, client_secret: clientSecret },
            });
            if (result.success) {
              alert("YouTube credentials saved successfully!");
              window.location.reload();
            } else {
              alert("Failed to save: " + (result.error || "unknown error"));
            }
          }}
          className="rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105"
        >
          Save Credentials
        </button>
      </div>

      {/* Setup Guide */}
      <details className="group rounded-xl bg-white/[0.02] p-4">
        <summary className="cursor-pointer text-sm font-medium text-neon-cyan transition-colors hover:text-neon-cyan/80">
          How to get YouTube API credentials
        </summary>
        <div className="mt-3 space-y-2 text-sm text-gray-400">
          <p>1. Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-neon-cyan underline">Google Cloud Console</a></p>
          <p>2. Create a new project or select an existing one</p>
          <p>3. Enable the <strong>YouTube Data API v3</strong></p>
          <p>4. Create OAuth 2.0 credentials (Desktop app type)</p>
          <p>5. Copy the Client ID and Client Secret</p>
          <p>6. Paste them above and save</p>
          <p className="mt-2 text-xs text-gray-500">
            Full guide: <span className="text-neon-cyan">/home/team/shared/YOUTUBE_SETUP.md</span>
          </p>
        </div>
      </details>
    </div>
  );
}

// ── Schedule Section ──────────────────────────────────────────────

function ScheduleSection({ slots }: { slots: Array<{ id: string; upload_time: string; is_active: number }> }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Toggle individual time slots on or off. Each active slot publishes one video per day.
        </p>
        <span className="text-xs text-gray-500">
          {slots.filter((s) => s.is_active).length} / {slots.length} active
        </span>
      </div>

      <div className="space-y-2">
        {slots.map((slot) => (
          <ScheduleSlotRow key={slot.id} slot={slot} />
        ))}
      </div>

      {/* Daily Target */}
      <div className="mt-4 rounded-xl bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Daily Upload Target</span>
          <span className="text-sm font-medium text-white">
            {slots.filter((s) => s.is_active).length} videos/day
          </span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple transition-all"
            style={{
              width: `${(slots.filter((s) => s.is_active).length / slots.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ScheduleSlotRow({
  slot,
}: {
  slot: { id: string; upload_time: string; is_active: number };
}) {
  const isActive = slot.is_active === 1;
  const [optimistic, setOptimistic] = React.useState(isActive);

  // Format time for display
  const [hours, minutes] = slot.upload_time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayTime = `${displayHour}:${minutes} ${ampm}`;

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/10">
      <div className="flex items-center gap-3">
        <span
          className={`h-2 w-2 rounded-full ${
            optimistic ? "bg-neon-green" : "bg-gray-600"
          }`}
        />
        <div>
          <span className="text-sm font-medium text-white">{displayTime}</span>
          <span className="ml-2 text-xs text-gray-500">
            Slot {slot.id.replace("slot-", "#")}
          </span>
        </div>
      </div>
      <Toggle
        enabled={optimistic}
        onChange={async (v) => {
          setOptimistic(v);
          await toggleSlot({
            data: { slotId: slot.id, isActive: v ? 1 : 0 },
          });
        }}
      />
    </div>
  );
}

// ── Niche Preferences ─────────────────────────────────────────────

const availableNiches = [
  { id: "world-cup", name: "World Cup / Football", priority: "high" },
  { id: "finance", name: "Finance / Personal Finance", priority: "high" },
  { id: "history", name: "Historical War / Ancient History", priority: "high" },
  { id: "true-crime", name: "True Crime / Mystery", priority: "medium" },
  { id: "ai-tech", name: "AI / Tech News", priority: "high" },
  { id: "motivation", name: "Motivation / Self-Improvement", priority: "medium" },
  { id: "pop-culture", name: "Pop Culture / Celebrity News", priority: "medium" },
  { id: "gaming", name: "Gaming / Streaming Culture", priority: "medium" },
  { id: "food", name: "Food / Cooking (Comedy)", priority: "low" },
  { id: "fantasy", name: "Fantasy Warfare / Ancient Creatures", priority: "low" },
];

function NichePreferences() {
  const [selected, setSelected] = React.useState<string[]>([
    "world-cup",
    "finance",
    "history",
    "true-crime",
    "ai-tech",
  ]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const priorityColors: Record<string, string> = {
    high: "border-neon-cyan/30 bg-neon-cyan/5 text-neon-cyan",
    medium: "border-neon-purple/30 bg-neon-purple/5 text-neon-purple",
    low: "border-gray-500/30 bg-gray-500/5 text-gray-400",
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Select which niches TrendAI should prioritize for content generation.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {availableNiches.map((niche) => {
          const isSelected = selected.includes(niche.id);
          return (
            <button
              key={niche.id}
              onClick={() => toggle(niche.id)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                isSelected
                  ? "border-neon-cyan/40 bg-neon-cyan/5"
                  : "border-white/5 bg-white/[0.02] hover:border-white/10"
              }`}
            >
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                  isSelected
                    ? "border-neon-cyan bg-neon-cyan text-white"
                    : "border-white/10"
                }`}
              >
                {isSelected && (
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">
                  {niche.name}
                </div>
                <span
                  className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${priorityColors[niche.priority]}`}
                >
                  {niche.priority}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3">
        <span className="text-sm text-gray-500">
          {selected.length} niches selected
        </span>
        <button
          onClick={() => alert("Niche preferences saved! (Database storage coming soon)")}
          className="rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple px-5 py-1.5 text-xs font-semibold text-white shadow-lg transition-all hover:scale-105"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
}