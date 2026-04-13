import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import "@/app/globals.css";
import { getCurrentUserId } from "@/lib/auth";

export const metadata: Metadata = {
  title: "FitPilotHQ",
  description: "Fit readiness analysis for EVE Online characters.",
};

const links: Array<{ href: Route; label: string }> = [
  { href: "/", label: "Overview" },
  { href: "/login", label: "Login" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/fit-analyzer", label: "Fit Analyzer" },
  { href: "/comparison-tool", label: "Comparison Tool" },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userId = await getCurrentUserId();

  return (
    <html lang="en">
      <body className="antialiased">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
          <header className="panel mb-10 flex flex-col gap-6 rounded-3xl px-6 py-5 shadow-2xl shadow-slate-950/30 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-starlight/70">
                FitPilotHQ
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                EVE fit readiness, grounded in synced character data.
              </h1>
            </div>
            <nav className="flex flex-wrap gap-3 text-sm">
              {links.map((link) => (
                <Link
                  key={link.href}
                  className="rounded-full border border-white/10 px-4 py-2 text-slate-200 transition hover:border-flux hover:text-white"
                  href={link.href}
                >
                  {link.label}
                </Link>
              ))}
              {userId ? (
                <Link
                  className="rounded-full border border-white/10 px-4 py-2 text-slate-200 transition hover:border-flux hover:text-white"
                  href="/admin/reference-data"
                >
                  Reference Data
                </Link>
              ) : null}
              {userId ? (
                <form action="/api/auth/logout" method="post">
                  <button
                    className="rounded-full border border-white/10 px-4 py-2 text-slate-200 transition hover:border-ember hover:text-white"
                    type="submit"
                  >
                    Logout
                  </button>
                </form>
              ) : null}
            </nav>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
