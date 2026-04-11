import Link from "next/link";

import { env } from "@/lib/env";
import { eveSsoConfigured } from "@/lib/env";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    logged_out?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  sso_not_configured: "EVE SSO credentials are not configured in the container environment yet.",
  invalid_oauth_state: "The EVE login state could not be verified. Start the login flow again.",
  login_required: "Sign in with EVE before requesting a manual character sync.",
  resume_not_available: "No local development session could be restored.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const errorMessage = params?.error
    ? errorMessages[params.error] ?? params.error
    : null;
  const loggedOutMessage = params?.logged_out
    ? "You have been signed out and the local session cookie has been cleared."
    : null;
  const eveLoginUrl = new URL("/api/auth/login", env.APP_URL).toString();

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <article className="panel rounded-3xl p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-starlight/70">
          Phase 2
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Connect an EVE character</h2>
        <p className="mt-4 max-w-2xl text-slate-300">
          FitPilotHQ uses EVE SSO for character authorization, then snapshots
          skills, attributes, and queue state into PostgreSQL for later fit
          analysis.
        </p>
        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}
        {loggedOutMessage ? (
          <div className="mt-6 rounded-2xl border border-flux/40 bg-flux/10 px-4 py-3 text-sm text-emerald-100">
            {loggedOutMessage}
          </div>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          {eveSsoConfigured ? (
            <a
              className="rounded-full bg-flux px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              href={eveLoginUrl}
            >
              Sign in with EVE Online
            </a>
          ) : (
            <span className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-300">
              Set EVE_CLIENT_ID, EVE_CLIENT_SECRET, and EVE_CALLBACK_URL to enable login.
            </span>
          )}
          <Link
            className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-200 transition hover:border-white/30"
            href="/dashboard"
          >
            View dashboard
          </Link>
        </div>
      </article>

      <aside className="panel rounded-3xl p-8">
        <h3 className="text-lg font-semibold text-white">Required ESI scopes</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-300">
          <li className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
            esi-skills.read_skills.v1
          </li>
          <li className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
            esi-skills.read_skillqueue.v1
          </li>
        </ul>
      </aside>
    </section>
  );
}
