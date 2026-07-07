import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";
import { Navbar } from "~/components/Navbar";

// Read the business name at request time
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

// Inline data matching the API endpoint
const trendingNiches = [
  {
    id: 1,
    name: "World Cup / Football",
    signal: "EXTREME",
    searchVolume: "Very High (millions)",
    competition: "Medium",
    rpm: "$8-15",
    facelessCompat: 5,
    spike: "+3,350%",
    description: "World Cup is active NOW. Match predictions, player rankings, historic moments — massive search volume with under-saturated Shorts format.",
    formats: ["Match predictions", "Player comparisons", "Top 5 moments", "Historical facts"],
    color: "neon-cyan",
  },
  {
    id: 2,
    name: "Finance / Personal Finance",
    signal: "HIGH",
    searchVolume: "High",
    competition: "Medium-High",
    rpm: "$10-30+",
    facelessCompat: 5,
    spike: "Consistent",
    description: "Highest RPM of any niche. Perfect for top-10 lists with an animated mascot explaining money concepts.",
    formats: ["5 ways to save $1000/mo", "Top 10 stocks under $10", "Investing tips", "Money mistakes"],
    color: "neon-green",
  },
  {
    id: 3,
    name: "Historical War / Ancient History",
    signal: "HIGH",
    searchVolume: "Medium-High",
    competition: "Low-Medium",
    rpm: "$6-12",
    facelessCompat: 5,
    spike: "Growing",
    description: "Thriving right now per multiple creators. Endless content angles, strong retention, works perfectly with AI-generated historical imagery.",
    formats: ["WWII alternate history", "Deadliest ancient weapons", "How Romans lived", "Dinosaurs uncovered"],
    color: "neon-purple",
  },
  {
    id: 4,
    name: "True Crime / Mystery",
    signal: "HIGH",
    searchVolume: "Very High",
    competition: "High",
    rpm: "$5-10",
    facelessCompat: 4,
    spike: "Consistently viral",
    description: "The #1 most-watched genre on YouTube. Mini case files with animated illustrations. High retention = algorithm boost.",
    formats: ["Unsolved mysteries", "Famous case files", "Mysterious disappearances", "Dark stories"],
    color: "neon-pink",
  },
  {
    id: 5,
    name: "AI / Tech News",
    signal: "HIGH",
    searchVolume: "High and growing",
    competition: "Medium",
    rpm: "$8-15",
    facelessCompat: 5,
    spike: "Trending up",
    description: "AI is the hottest topic of 2026. Perfect for faceless channels since the content IS about AI tools. Mascot as futuristic AI guide.",
    formats: ["Top 5 AI tools", "AI just shocked the world", "Future of AI", "Tech news recap"],
    color: "neon-cyan",
  },
  {
    id: 6,
    name: "Motivation / Self-Improvement",
    signal: "STEADY",
    searchVolume: "Very High",
    competition: "High",
    rpm: "$5-10",
    facelessCompat: 5,
    spike: "Evergreen",
    description: "Massive audience, high shareability, low production cost. Inspirational quotes over cinematic footage with mascot delivering speeches.",
    formats: ["5 habits of millionaires", "The 1% rule", "Stop procrastinating", "Morning routines"],
    color: "neon-green",
  },
  {
    id: 7,
    name: "Pop Culture / Celebrity News",
    signal: "HIGH",
    searchVolume: "Very High",
    competition: "High",
    rpm: "$4-8",
    facelessCompat: 4,
    spike: "+900-1,000%",
    description: "Always trending topics. Speed matters — first to cover wins. Mascot as reporter/host delivering entertainment news.",
    formats: ["Celebrity scandals", "Entertainment news", "Top 10 this week", "Viral moments"],
    color: "neon-pink",
  },
  {
    id: 8,
    name: "Gaming / Streaming Culture",
    signal: "HIGH",
    searchVolume: "High",
    competition: "Medium-High",
    rpm: "$4-8",
    facelessCompat: 5,
    spike: "+800%",
    description: "Gaming culture is massive. Mascot as VTuber-style virtual streamer. Covers drama, reviews, esports highlights.",
    formats: ["Streamer moments", "Gaming news", "Esports highlights", "Game reviews"],
    color: "neon-purple",
  },
  {
    id: 9,
    name: "Food / Cooking (Comedy)",
    signal: "SOLID",
    searchVolume: "Very High",
    competition: "Very High",
    rpm: "$4-8",
    facelessCompat: 4,
    spike: "Steady",
    description: "Saturated niche but comedy mascot angle differentiates. Food is universally appealing with massive potential audience.",
    formats: ["Weirdest foods", "Cooking hacks", "Food rankings", "Comedy recipes"],
    color: "neon-green",
  },
  {
    id: 10,
    name: "Fantasy Warfare / Ancient Creatures",
    signal: "GROWING",
    searchVolume: "Medium",
    competition: "Low",
    rpm: "$5-10",
    facelessCompat: 5,
    spike: "Blue ocean",
    description: "Untapped blue ocean with unlimited content angles. 'What if' scenarios perform extremely well with AI-generated battle scenes.",
    formats: ["What if Vikings had guns?", "Extinct creatures", "Fantasy battles", "Speculative history"],
    color: "neon-cyan",
  },
];

const realtimeTrending = [
  { topic: "mexico vs england", volume: "100K+", spike: "Breakout", category: "Sports" },
  { topic: "brazil vs norway", volume: "50K+", spike: "+3,350%", category: "Sports" },
  { topic: "usa vs belgium", volume: "50K+", spike: "+2,950%", category: "Sports" },
  { topic: "trump account for kids", volume: "100K+", spike: "Trending", category: "Politics" },
  { topic: "dreamdoll", volume: "50K+", spike: "+1,000%", category: "Celebrity" },
  { topic: "streamer university 2026", volume: "100K+", spike: "+800%", category: "Gaming" },
  { topic: "james taylor skipped wedding", volume: "20K+", spike: "+900%", category: "Celebrity" },
  { topic: "jey uso", volume: "20K+", spike: "+500%", category: "WWE" },
  { topic: "diamondbacks vs padres", volume: "20K+", spike: "+1,000%", category: "MLB" },
  { topic: "oklahoma city thunder", volume: "20K+", spike: "+600%", category: "NBA" },
];

export const Route = createFileRoute("/trends")({
  loader: () => getBusinessName(),
  component: TrendsDashboard,
});

function SignalBadge({ signal }: { signal: string }) {
  const colors: Record<string, string> = {
    EXTREME: "bg-red-500/20 text-red-400 border-red-500/30",
    HIGH: "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20",
    STEADY: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    SOLID: "bg-neon-green/10 text-neon-green border-neon-green/20",
    GROWING: "bg-neon-purple/10 text-neon-purple border-neon-purple/20",
  };
  const color = colors[signal] || colors.HIGH;

  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${color}`}>
      {signal}
    </span>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <span className="text-neon-cyan">
      {"★".repeat(count)}{"☆".repeat(5 - count)}
    </span>
  );
}

function TrendsDashboard() {
  const businessName = Route.useLoaderData();
  const name = businessName || "TrendAI Media";

  return (
    <div className="min-h-dvh bg-dark-900">
      <div className="pointer-events-none fixed inset-0 bg-grid" />
      <Navbar name={name} />

      <main className="relative mx-auto max-w-7xl px-6 pt-24 pb-20">
        {/* Header */}
        <div className="mb-10">
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              Trend Analytics
            </h1>
            <span className="animate-pulse-glow inline-block rounded-full border border-neon-cyan/20 bg-neon-cyan/5 px-3 py-0.5 text-[10px] font-medium text-neon-cyan uppercase tracking-wider">
              Live
            </span>
          </div>
          <p className="max-w-2xl text-gray-400">
            Top viral niches ranked by search volume, competition level, RPM estimates, and faceless compatibility.
            Data sourced from YouTube trending, Google Trends, and competitor analysis.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="card-gradient rounded-xl border border-white/5 p-4 text-center">
            <div className="text-2xl font-bold text-white">10</div>
            <div className="mt-1 text-xs text-gray-500">Tracked Niches</div>
          </div>
          <div className="card-gradient rounded-xl border border-white/5 p-4 text-center">
            <div className="text-2xl font-bold text-neon-cyan">3</div>
            <div className="mt-1 text-xs text-gray-500">High Priority</div>
          </div>
          <div className="card-gradient rounded-xl border border-white/5 p-4 text-center">
            <div className="text-2xl font-bold text-neon-green">$10-30+</div>
            <div className="mt-1 text-xs text-gray-500">Max RPM</div>
          </div>
          <div className="card-gradient rounded-xl border border-white/5 p-4 text-center">
            <div className="text-2xl font-bold text-neon-purple">5/5</div>
            <div className="mt-1 text-xs text-gray-500">Avg Faceless Score</div>
          </div>
        </div>

        {/* Trending Niches Grid */}
        <div className="mb-12">
          <h2 className="mb-6 text-xl font-semibold text-white">
            Top Viral Niches
            <span className="ml-2 text-sm font-normal text-gray-500">Ranked by opportunity</span>
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {trendingNiches.map((niche) => {
              const glowClass =
                niche.color === "neon-cyan"
                  ? "glow-cyan"
                  : niche.color === "neon-purple"
                    ? "glow-purple"
                    : niche.color === "neon-green"
                      ? "glow-green"
                      : "";

              return (
                <div
                  key={niche.id}
                  className={`card-gradient group relative rounded-2xl border border-white/5 p-6 transition-all hover:scale-[1.02] ${glowClass}`}
                >
                  {/* Rank badge */}
                  <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-dark-800 text-xs font-bold text-gray-500 ring-1 ring-white/10">
                    #{niche.id}
                  </div>

                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {niche.name}
                      </h3>
                      <div className="mt-1.5 flex items-center gap-2">
                        <SignalBadge signal={niche.signal} />
                        <span className="text-xs text-gray-500">{niche.spike}</span>
                      </div>
                    </div>
                  </div>

                  <p className="mb-4 text-sm leading-relaxed text-gray-400">
                    {niche.description}
                  </p>

                  {/* Metrics Grid */}
                  <div className="mb-4 grid grid-cols-3 gap-3 rounded-xl bg-white/[0.02] p-3">
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Search Vol.</div>
                      <div className="mt-0.5 text-sm font-medium text-white truncate" title={niche.searchVolume}>
                        {niche.searchVolume}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Competition</div>
                      <div className="mt-0.5 text-sm font-medium text-white">
                        {niche.competition}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Est. RPM</div>
                      <div className="mt-0.5 text-sm font-medium text-neon-green">
                        {niche.rpm}
                      </div>
                    </div>
                  </div>

                  {/* Faceless Compatibility */}
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Faceless Compat.</span>
                    <Stars count={niche.facelessCompat} />
                  </div>

                  {/* Formats */}
                  <div className="flex flex-wrap gap-1.5">
                    {niche.formats.map((fmt) => (
                      <span
                        key={fmt}
                        className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] text-gray-400"
                      >
                        {fmt}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-Time Trending */}
        <div className="mb-12">
          <h2 className="mb-6 text-xl font-semibold text-white">
            Real-Time Trending
            <span className="ml-2 text-sm font-normal text-gray-500">Google Trends data</span>
          </h2>
          <div className="card-gradient rounded-2xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-3 text-left font-medium text-gray-400">Topic</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-400">Search Volume</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-400">Spike</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-400">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {realtimeTrending.map((item, i) => (
                    <tr key={i} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-medium text-white">{item.topic}</td>
                      <td className="px-4 py-3 text-gray-400">{item.volume}</td>
                      <td className="px-4 py-3">
                        <span className="text-neon-cyan">{item.spike}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-400">
                          {item.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="card-gradient rounded-2xl border border-white/5 p-8 text-center">
          <h2 className="text-2xl font-bold text-white">
            Ready to Act on These Trends?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-gray-400">
            Our AI pipeline converts trending niches into scripts, generates videos, and publishes them automatically.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link
              to="/publishing"
              className="rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105"
            >
              Go to Publishing
            </Link>
            <Link
              to="/"
              className="rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-gray-300 transition-all hover:border-white/20 hover:text-white"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/5 px-6 py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-sm text-gray-500">
          <span>{name}</span>
          <p>
            Built with{" "}
            <a href="https://cto.new" className="underline transition-colors hover:text-gray-300">
              cto.new
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}