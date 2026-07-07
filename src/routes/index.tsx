import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";
import { Navbar } from "~/components/Navbar";

// Read the business name at request time from site.json
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

export const Route = createFileRoute("/")({
  loader: () => getBusinessName(),
  component: Home,
});

function Home() {
  const businessName = Route.useLoaderData();
  const name = businessName || "TrendAI Media";

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative min-h-dvh bg-dark-900">
      {/* Background grid overlay */}
      <div className="pointer-events-none fixed inset-0 bg-grid" />

      <Navbar name={name} />

      {/* Hero Section */}
      <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 pt-20">
        {/* Floating orbs */}
        <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-neon-cyan/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-neon-purple/5 blur-3xl" />

        {/* Badge */}
        <div className="mb-8 animate-pulse-glow">
          <span className="inline-block rounded-full border border-neon-cyan/20 bg-neon-cyan/5 px-4 py-1.5 text-xs font-medium tracking-wider text-neon-cyan uppercase">
            ✦ AI-Powered Content Network
          </span>
        </div>

        {/* Main headline */}
        <h1 className="max-w-4xl text-center text-4xl font-bold leading-tight tracking-tight sm:text-6xl md:text-7xl">
          <span className="text-gradient-hero">
            From Trend to Viral
          </span>
          <br />
          <span className="text-white">
            — Fully Automated.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-2xl text-center text-lg leading-relaxed text-gray-400 sm:text-xl">
          TrendAI detects trending niches, generates optimized scripts, and
          produces high-volume YouTube Shorts — all powered by AI and fronted by
          a recognizable mascot host. No face. No crew. Just content at scale.
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <a
            href="#cta"
            className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            Get Early Access
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          <button
            onClick={() => scrollTo("features")}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-3.5 text-base font-medium text-gray-300 backdrop-blur-sm transition-all hover:border-white/20 hover:text-white"
          >
            Learn More
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>

        {/* Stats bar */}
        <div className="mt-16 grid grid-cols-3 gap-8 border-t border-white/5 pt-8 text-center">
          <div>
            <div className="text-2xl font-bold text-white sm:text-3xl">5+</div>
            <div className="mt-1 text-xs text-gray-500 sm:text-sm">Videos / Day</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white sm:text-3xl">100%</div>
            <div className="mt-1 text-xs text-gray-500 sm:text-sm">AI Generated</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white sm:text-3xl">∞</div>
            <div className="mt-1 text-xs text-gray-500 sm:text-sm">Scalable Niches</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Everything You Need to{" "}
              <span className="text-gradient">Scale Content</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              From spotting the next viral trend to publishing polished videos —
              our AI pipeline handles the entire workflow.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {/* Feature 1: Trend Detection */}
            <div className="card-gradient glow-cyan group rounded-2xl border border-white/5 p-8 transition-all hover:border-neon-cyan/20 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neon-cyan/10 text-neon-cyan">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">Trend Detection</h3>
              <p className="mt-3 leading-relaxed text-gray-400">
                Our engine scans YouTube trending, Google Trends, and social signals to pinpoint
                viral niches before they peak. Get data-backed topic recommendations daily.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-neon-cyan" /> YouTube trending analysis
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-neon-cyan" /> Google Trends integration
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-neon-cyan" /> Competition scoring
                </li>
              </ul>
            </div>

            {/* Feature 2: AI Video Generation */}
            <div className="card-gradient glow-purple group rounded-2xl border border-white/5 p-8 transition-all hover:border-neon-purple/20 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neon-purple/10 text-neon-purple">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">AI Video Generation</h3>
              <p className="mt-3 leading-relaxed text-gray-400">
                Scripts are optimized for retention, then transformed into animated
                YouTube Shorts with voiceover, captions, and our signature mascot host.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-neon-purple" /> Script optimization
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-neon-purple" /> AI voiceover & captions
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-neon-purple" /> Animated mascot host
                </li>
              </ul>
            </div>

            {/* Feature 3: Auto-Publishing */}
            <div className="card-gradient glow-green group rounded-2xl border border-white/5 p-8 transition-all hover:border-neon-green/20 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neon-green/10 text-neon-green">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">Auto-Publishing</h3>
              <p className="mt-3 leading-relaxed text-gray-400">
                Videos are automatically queued and published on schedule — 5+
                per day, every day. Our scheduler manages uploads so you don't
                have to.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-neon-green" /> Scheduled 5x/day
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-neon-green" /> YouTube API integration
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-neon-green" /> Dashboard analytics
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              How It <span className="text-gradient">Works</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              From trend data to published video in three automated steps.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="relative text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-cyan/5 text-2xl font-bold text-neon-cyan ring-1 ring-neon-cyan/20">
                01
              </div>
              <h3 className="text-lg font-semibold text-white">Discover Trends</h3>
              <p className="mt-2 text-sm text-gray-400">
                Our AI scans YouTube, Google Trends, and social platforms to find
                high-potential niches with low competition.
              </p>
            </div>

            {/* Arrow connector (desktop) */}
            <div className="hidden items-center justify-center md:flex">
              <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>

            {/* Step 2 */}
            <div className="relative text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-purple/20 to-neon-purple/5 text-2xl font-bold text-neon-purple ring-1 ring-neon-purple/20">
                02
              </div>
              <h3 className="text-lg font-semibold text-white">Generate Content</h3>
              <p className="mt-2 text-sm text-gray-400">
                Scripts are written for maximum retention, then turned into animated
                Shorts with voiceover, captions, and our mascot.
              </p>
            </div>

            {/* Arrow connector (desktop) */}
            <div className="hidden items-center justify-center md:flex">
              <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>

            {/* Step 3 */}
            <div className="relative text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-green/20 to-neon-green/5 text-2xl font-bold text-neon-green ring-1 ring-neon-green/20">
                03
              </div>
              <h3 className="text-lg font-semibold text-white">Publish & Profit</h3>
              <p className="mt-2 text-sm text-gray-400">
                Videos are automatically uploaded on a 5x/day schedule. AdSense,
                affiliate links, and sponsorships do the rest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="relative px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-dark-800 via-dark-700 to-dark-800 p-12 text-center shadow-2xl sm:p-16">
            {/* Background orbs */}
            <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-neon-cyan/5 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-neon-purple/5 blur-3xl" />

            <h2 className="relative text-3xl font-bold text-white sm:text-4xl">
              Ready to Scale Your{" "}
              <span className="text-gradient">Content Empire</span>?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-gray-400">
              Join the waitlist for early access. Be among the first to automate
              your YouTube channel with AI-powered content at scale.
            </p>

            <div className="relative mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full max-w-sm rounded-full border border-white/10 bg-dark-800 px-6 py-3.5 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-neon-cyan/40 focus:ring-1 focus:ring-neon-cyan/20"
              />
              <button className="rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl">
                Get Early Access
              </button>
            </div>
            <p className="relative mt-4 text-xs text-gray-500">
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-gray-500 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-neon-cyan to-neon-purple text-[10px] font-bold text-white">
              T
            </div>
            <span>{name}</span>
          </div>
          <p>
            Built with{" "}
            <a
              href="https://cto.new"
              className="underline transition-colors hover:text-gray-300"
            >
              cto.new
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}