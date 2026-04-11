import Link from "next/link";

import { getCurrentUserId } from "@/lib/auth";
import { phaseFourSampleFit } from "@/lib/fits/sample-fit";
import { prisma } from "@/lib/db";

import { ComparisonToolClient } from "./ComparisonToolClient";

export default async function ComparisonToolPage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return (
      <section className="panel rounded-3xl p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-starlight/70">
          Phase 8
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Comparison tool</h2>
        <p className="mt-4 max-w-2xl text-slate-300">
          Sign in with EVE and sync at least one character to compare pilots for the same fit in the browser.
        </p>
        <Link
          className="mt-6 inline-flex rounded-full bg-flux px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          href="/login"
        >
          Go to login
        </Link>
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
        },
      },
    },
    orderBy: [
      { lastSyncedAt: "desc" },
      { name: "asc" },
    ],
  });

  if (characters.length === 0) {
    return (
      <section className="panel rounded-3xl p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-starlight/70">
          Phase 8
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Comparison tool</h2>
        <p className="mt-4 max-w-2xl text-slate-300">
          Sync at least one character first. The comparison tool depends on stored skills and attributes before it can rank pilots.
        </p>
        <Link
          className="mt-6 inline-flex rounded-full bg-flux px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          href="/dashboard"
        >
          Go to dashboard
        </Link>
      </section>
    );
  }

  return (
    <ComparisonToolClient
      characters={characters.map((character) => ({
        id: character.id,
        name: character.name,
        lastSyncedAt: character.lastSyncedAt?.toLocaleString() ?? null,
        skillCount: character._count.skills,
        hasAttributes: Boolean(character.attributes),
      }))}
      initialCharacterId={characters[0]?.id ?? ""}
      initialFitText={phaseFourSampleFit}
    />
  );
}