import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getReferenceDataReviewState } from "@/lib/reference-data/internal-review";

type ReferenceDataAdminPageProps = {
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
};

type ReferenceDataReviewState = Awaited<ReturnType<typeof getReferenceDataReviewState>>;

function decodeParam(value?: string) {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function ReferenceDataAdminPage({ searchParams }: ReferenceDataAdminPageProps) {
  const userId = await getCurrentUserId();
  const params = searchParams ? await searchParams : undefined;

  if (!userId) {
    redirect("/login?error=login_required");
  }

  const message = decodeParam(params?.message);
  const error = decodeParam(params?.error);
  let loadError: string | null = null;
  let reviewState: ReferenceDataReviewState = {
    summary: {
      pendingObservations: 0,
      ambiguousCount: 0,
      matchedCount: 0,
      pendingAliasCount: 0,
      acceptedAliasCount: 0,
    },
    ambiguousObservations: [],
    pendingAliases: [],
  };

  try {
    reviewState = await getReferenceDataReviewState(prisma);
  } catch (reviewError) {
    loadError = reviewError instanceof Error ? reviewError.message : "Failed to load reference-data review state.";
  }

  return (
    <section className="space-y-6">
      <div className="panel rounded-3xl p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-starlight/70">Internal tools</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Reference data review</h2>
        <p className="mt-4 max-w-3xl text-slate-300">
          Review ambiguous unknown-item recoveries, approve or reject pending aliases, and trigger a small recovery batch without touching runtime fit-analysis routes.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <form action="/api/admin/reference-data/recover-unknown-items" method="post">
            <input name="limit" type="hidden" value="10" />
            <button className="rounded-full bg-flux px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300" type="submit">
              Recover 10 pending observations
            </button>
          </form>
          <Link
            className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-200 transition hover:border-white/30"
            href="/dashboard"
          >
            Back to dashboard
          </Link>
        </div>
        {message ? (
          <div className="mt-6 rounded-2xl border border-flux/40 bg-flux/10 px-4 py-3 text-sm text-emerald-100">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-6 rounded-2xl border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
        {loadError ? (
          <div className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {loadError}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        <article className="panel rounded-3xl p-6">
          <p className="text-sm text-slate-400">Pending observations</p>
          <p className="mt-2 text-3xl font-semibold text-white">{reviewState.summary.pendingObservations}</p>
        </article>
        <article className="panel rounded-3xl p-6">
          <p className="text-sm text-slate-400">Ambiguous observations</p>
          <p className="mt-2 text-3xl font-semibold text-white">{reviewState.summary.ambiguousCount}</p>
        </article>
        <article className="panel rounded-3xl p-6">
          <p className="text-sm text-slate-400">Matched observations</p>
          <p className="mt-2 text-3xl font-semibold text-white">{reviewState.summary.matchedCount}</p>
        </article>
        <article className="panel rounded-3xl p-6">
          <p className="text-sm text-slate-400">Pending aliases</p>
          <p className="mt-2 text-3xl font-semibold text-white">{reviewState.summary.pendingAliasCount}</p>
        </article>
        <article className="panel rounded-3xl p-6">
          <p className="text-sm text-slate-400">Accepted aliases</p>
          <p className="mt-2 text-3xl font-semibold text-white">{reviewState.summary.acceptedAliasCount}</p>
        </article>
      </div>

      <section className="panel rounded-3xl p-8">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-white">Ambiguous observations</h3>
          <p className="text-sm text-slate-400">Top 30 by seen count</p>
        </div>
        {reviewState.ambiguousObservations.length === 0 ? (
          <p className="mt-6 text-sm text-slate-300">No ambiguous observations are waiting for manual review.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {reviewState.ambiguousObservations.map((observation) => (
              <article key={observation.id} className="rounded-3xl border border-white/5 bg-white/5 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{observation.originalName}</h4>
                    <p className="mt-2 text-sm text-slate-400">
                      normalized: {observation.normalizedName} · seen {observation.seenCount} · last seen {observation.lastSeenAt.toLocaleString()}
                    </p>
                    {observation.lastError ? (
                      <p className="mt-2 text-sm text-amber-200">{observation.lastError}</p>
                    ) : null}
                  </div>
                  <form action="/api/admin/reference-data/review" method="post">
                    <input name="action" type="hidden" value="reject-observation" />
                    <input name="observationId" type="hidden" value={observation.id} />
                    <button className="rounded-full border border-ember/40 px-4 py-2 text-sm text-rose-100 transition hover:border-ember hover:text-white" type="submit">
                      Reject observation
                    </button>
                  </form>
                </div>

                <div className="mt-5 grid gap-3">
                  {observation.candidates.length === 0 ? (
                    <p className="text-sm text-slate-400">No persisted candidates yet.</p>
                  ) : observation.candidates.map((candidate) => (
                    <div key={candidate.id} className="rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-white">{candidate.candidateName}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            source {candidate.source.toLowerCase()} · score {candidate.confidenceScore.toFixed(1)} · {candidate.confidenceReason}
                          </p>
                        </div>
                        <form action="/api/admin/reference-data/review" method="post">
                          <input name="action" type="hidden" value="accept-candidate" />
                          <input name="candidateId" type="hidden" value={candidate.id} />
                          <button
                            className="rounded-full bg-flux px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={!candidate.candidateTypeId}
                            type="submit"
                          >
                            Accept candidate
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel rounded-3xl p-8">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-white">Pending aliases</h3>
          <p className="text-sm text-slate-400">Review before runtime uses them</p>
        </div>
        {reviewState.pendingAliases.length === 0 ? (
          <p className="mt-6 text-sm text-slate-300">No pending aliases are queued for review.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {reviewState.pendingAliases.map((alias) => (
              <article key={alias.id} className="rounded-2xl border border-white/5 bg-white/5 px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-white">{alias.aliasNormalized}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      canonical {alias.canonicalName} · type {alias.canonicalTypeId} · source {alias.source.toLowerCase()} · confidence {alias.confidenceScore?.toFixed(1) ?? "n/a"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <form action="/api/admin/reference-data/review" method="post">
                      <input name="action" type="hidden" value="accept-alias" />
                      <input name="aliasId" type="hidden" value={alias.id} />
                      <button className="rounded-full bg-flux px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300" type="submit">
                        Accept alias
                      </button>
                    </form>
                    <form action="/api/admin/reference-data/review" method="post">
                      <input name="action" type="hidden" value="reject-alias" />
                      <input name="aliasId" type="hidden" value={alias.id} />
                      <button className="rounded-full border border-ember/40 px-4 py-2 text-sm text-rose-100 transition hover:border-ember hover:text-white" type="submit">
                        Reject alias
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}