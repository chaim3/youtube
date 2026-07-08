import { Link, useLocation } from "@tanstack/react-router";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/trends", label: "Trends" },
  { href: "/publishing", label: "Publishing" },
  { href: "/settings", label: "Settings" },
];

export function Navbar({ name }: { name?: string }) {
  const location = useLocation();
  const pathname = location.pathname;
  const brandName = name || "TrendAI Media";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-dark-900/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple text-xs font-bold text-white shadow-lg">
            T
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            {brandName}
          </span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-neon-cyan/10 text-neon-cyan"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <Link
          to="/"
          className="rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple px-5 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-neon-cyan/25"
        >
          Join Waitlist
        </Link>
      </div>
    </nav>
  );
}