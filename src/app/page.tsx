const milestones = [
  "Docker-first local runtime with Next.js and PostgreSQL",
  "Prisma baseline schema covering the runtime source-of-truth models",
  "Health endpoint that validates database connectivity",
  "EVE SSO login and character snapshot sync plumbing",
  "Seeded static skill and item requirement datasets loaded through PostgreSQL",
  "Phase 4 pure fit-analysis pipeline preview running against synced characters",
  "Phase 6 browser workflow for selecting a character, pasting EFT, and rendering API-backed analysis",
];

export default function HomePage() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
      <article className="panel rounded-3xl p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-flux">Phase 4</p>
        <h2 className="mt-4 text-4xl font-semibold text-white">
          Move from synced data into real fit analysis.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          FitPilotHQ now has a Dockerized Next.js runtime, Prisma-managed
          PostgreSQL schema, the first pass of EVE SSO plus character sync, and
          a generated static intelligence seed path. Phase four now adds the
          first pure fit-analysis pipeline so runtime readiness checks can be
          computed from DB-backed character and item requirement data.
        </p>
      </article>

      <aside className="panel rounded-3xl p-8">
        <h3 className="text-lg font-semibold text-white">Current deliverables</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-300">
          {milestones.map((item) => (
            <li key={item} className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
              {item}
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}
