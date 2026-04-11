import Link from "next/link";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isDevelopment } from "@/lib/env";

type DashboardPageProps = {
  searchParams?: Promise<{
    synced?: string;
    resumed?: string;
    error?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const userId = await getCurrentUserId();

  if (!userId) {
    const latestCharacter = isDevelopment
      ? await prisma.character.findFirst({
          include: {
            user: true,
          },
          orderBy: [
            { lastSyncedAt: "desc" },
            { updatedAt: "desc" },
          ],
        })
      : null;

    return (
      <section className="panel rounded-3xl p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-starlight/70">
          Phase 2
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Character dashboard</h2>
        <p className="mt-4 max-w-2xl text-slate-300">
          Sign in with EVE first, then synced characters will appear here with
          their snapshot status and skill totals.
        </p>
        {latestCharacter ? (
          <div className="mt-6 rounded-2xl border border-flux/40 bg-flux/10 px-4 py-3 text-sm text-emerald-100">
            Local synced data exists for {latestCharacter.name}, but this browser session is missing its auth cookie.
          </div>
        ) : null}
        <Link
          className="mt-6 inline-flex rounded-full bg-flux px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          href="/login"
        >
          Go to login
        </Link>
        {latestCharacter ? (
          <Link
            className="mt-3 inline-flex rounded-full border border-white/10 px-5 py-3 text-sm text-slate-200 transition hover:border-white/30"
            href="/api/auth/resume"
          >
            Resume local dev session
          </Link>
        ) : null}
      </section>
    );
  }

  const characters = await prisma.character.findMany({
    where: { userId },
    include: {
      attributes: true,
      _count: {
        select: {
          skills: true,
          skillQueue: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <section className="space-y-6">
      <div className="panel rounded-3xl p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-starlight/70">
          Phase 2
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Synced characters</h2>
        <p className="mt-4 max-w-2xl text-slate-300">
          Character data is snapshotted from ESI into PostgreSQL. Later phases
          will analyze fits against this stored runtime state.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="rounded-full bg-flux px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            href="/login"
          >
            Add another character
          </Link>
          <Link
            className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-200 transition hover:border-white/30"
            href="/fit-analyzer"
          >
            Open fit analyzer
          </Link>
          <Link
            className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-200 transition hover:border-white/30"
            href="/comparison-tool"
          >
            Open comparison tool
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-200 transition hover:border-ember hover:text-white"
              type="submit"
            >
              Log out
            </button>
          </form>
        </div>
        {params?.synced ? (
          <div className="mt-6 rounded-2xl border border-flux/40 bg-flux/10 px-4 py-3 text-sm text-emerald-100">
            Character sync completed.
          </div>
        ) : null}
        {params?.resumed ? (
          <div className="mt-6 rounded-2xl border border-flux/40 bg-flux/10 px-4 py-3 text-sm text-emerald-100">
            Local development session restored.
          </div>
        ) : null}
        {params?.error ? (
          <div className="mt-6 rounded-2xl border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-rose-100">
            {params.error}
          </div>
        ) : null}
      </div>

      {characters.length === 0 ? (
        <div className="panel rounded-3xl p-8 text-slate-300">
          No characters have been synced yet.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {characters.map((character) => (
            <article key={character.id} className="panel rounded-3xl p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold text-white">{character.name}</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Character ID {character.eveCharacterId.toString()}
                  </p>
                </div>
                <form action={`/api/characters/${character.id}/sync`} method="post">
                  <button
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-flux hover:text-white"
                    type="submit"
                  >
                    Sync now
                  </button>
                </form>
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-4 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                  <dt className="text-slate-400">Last synced</dt>
                  <dd className="mt-2 text-white">
                    {character.lastSyncedAt
                      ? character.lastSyncedAt.toLocaleString()
                      : "Not synced yet"}
                  </dd>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                  <dt className="text-slate-400">Total SP</dt>
                  <dd className="mt-2 text-white">
                    {character.totalSkillPoints?.toLocaleString() ?? "Unknown"}
                  </dd>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                  <dt className="text-slate-400">Tracked skills</dt>
                  <dd className="mt-2 text-white">{character._count.skills}</dd>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                  <dt className="text-slate-400">Queue entries</dt>
                  <dd className="mt-2 text-white">{character._count.skillQueue}</dd>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                  <dt className="text-slate-400">Unallocated SP</dt>
                  <dd className="mt-2 text-white">
                    {character.unallocatedSkillPoints?.toLocaleString() ?? "0"}
                  </dd>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                  <dt className="text-slate-400">Attributes loaded</dt>
                  <dd className="mt-2 text-white">
                    {character.attributes ? "Yes" : "No"}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
