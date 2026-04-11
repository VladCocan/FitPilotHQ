"use client";

import { useState } from "react";

import type { CompareFitResponse } from "@/lib/fits/api-contract";

type CharacterOption = {
  id: string;
  name: string;
  lastSyncedAt: string | null;
  skillCount: number;
  hasAttributes: boolean;
};

type ComparisonToolClientProps = {
  characters: CharacterOption[];
  initialCharacterId: string;
  initialFitText: string;
};

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

function formatDuration(totalSeconds: number) {
  if (totalSeconds <= 0) {
    return "Ready now";
  }

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes}m`);
  }

  return parts.join(" ");
}

export function ComparisonToolClient({
  characters,
  initialCharacterId,
  initialFitText,
}: ComparisonToolClientProps) {
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([initialCharacterId]);
  const [fitText, setFitText] = useState(initialFitText);
  const [includeDebug, setIncludeDebug] = useState(false);
  const [result, setResult] = useState<CompareFitResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bestComparison = result?.comparisons.find(
    (comparison) => comparison.characterId === result.bestCharacter?.characterId,
  ) ?? result?.comparisons[0] ?? null;
  const activeAnalysis = bestComparison?.analysis ?? null;

  function toggleCharacter(characterId: string) {
    setSelectedCharacterIds((current) => {
      if (current.includes(characterId)) {
        if (current.length === 1) {
          return current;
        }

        return current.filter((candidate) => candidate !== characterId);
      }

      return [...current, characterId];
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/fits/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          characterIds: selectedCharacterIds,
          fitText,
          includeDebug,
        }),
      });

      const payload = (await response.json()) as CompareFitResponse | ApiErrorPayload;

      if (!response.ok) {
        const errorPayload = payload as ApiErrorPayload;
        setResult(null);
        setErrorMessage(errorPayload.error?.message ?? "Fit comparison failed.");
        return;
      }

      setResult(payload as CompareFitResponse);
    } catch (error) {
      setResult(null);
      setErrorMessage(error instanceof Error ? error.message : "Fit comparison failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <article className="panel rounded-3xl p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-starlight/70">
          Phase 8
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Compare characters for a fit</h2>
        <p className="mt-4 max-w-2xl text-slate-300">
          Select multiple synced characters, paste an EFT fit, and rank which pilot is best suited for it.
        </p>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Characters</span>
              <div className="space-y-3 rounded-3xl border border-white/10 bg-slate-950/60 px-4 py-4">
                {characters.map((character) => {
                  const isSelected = selectedCharacterIds.includes(character.id);

                  return (
                    <label key={character.id} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-200">
                      <input
                        checked={isSelected}
                        className="mt-1"
                        onChange={() => toggleCharacter(character.id)}
                        type="checkbox"
                      />
                      <span>
                        <span className="block text-white">{character.name}</span>
                        <span className="block text-slate-400">
                          {character.skillCount} skills · {character.hasAttributes ? "attributes synced" : "attributes missing"}
                        </span>
                        <span className="block text-slate-500">
                          {character.lastSyncedAt ? `Last synced ${character.lastSyncedAt}` : "Never synced"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-white/5 bg-white/5 px-4 py-4 text-sm text-slate-300">
              <div>
                <p className="text-slate-400">Compare mode</p>
                <p className="mt-2 text-white">
                  {selectedCharacterIds.length} character{selectedCharacterIds.length === 1 ? "" : "s"} selected
                </p>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-white/5 bg-slate-950/50 px-4 py-3 text-slate-200">
                <input
                  checked={includeDebug}
                  className="mt-1"
                  onChange={(event) => setIncludeDebug(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <span className="block text-white">Enable debug mode</span>
                  <span className="block text-slate-400">
                    Include pipeline counts and weighted readiness breakdown in the response.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">EFT fit text</span>
            <textarea
              className="min-h-[24rem] w-full rounded-3xl border border-white/10 bg-slate-950/60 px-4 py-4 font-mono text-sm text-slate-100 outline-none transition focus:border-flux"
              value={fitText}
              onChange={(event) => setFitText(event.target.value)}
              spellCheck={false}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full bg-flux px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={isSubmitting || selectedCharacterIds.length === 0}
            >
              {isSubmitting ? "Comparing..." : "Compare fit"}
            </button>
          </div>
        </form>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}
      </article>

      <aside className="space-y-6">
        <section className="panel rounded-3xl p-8">
          <h3 className="text-lg font-semibold text-white">Best character</h3>
          {!bestComparison || !activeAnalysis ? (
            <p className="mt-4 text-sm text-slate-300">
              Submit a fit to view weighted readiness, best-character ranking, missing skills, and debug output.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                <p className="text-sm text-slate-400">Best match</p>
                <p className="mt-2 text-white">
                  #{bestComparison.rank} {bestComparison.characterName}
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                <p className="text-sm text-slate-400">Readiness</p>
                <p className="mt-2 text-white">
                  {activeAnalysis.readiness.score}% {activeAnalysis.readiness.label}
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                <p className="text-sm text-slate-400">Training time</p>
                <p className="mt-2 text-white">
                  {formatDuration(activeAnalysis.trainingPlan.totalTrainingSeconds)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                <p className="text-sm text-slate-400">Direct requirements</p>
                <p className="mt-2 text-white">{activeAnalysis.requirements.direct.length}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                <p className="text-sm text-slate-400">Unknown items</p>
                <p className="mt-2 text-white">{activeAnalysis.unknownItems.length}</p>
              </div>
            </div>
          )}

          {activeAnalysis ? (
            <div className="mt-6 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-300">
              {activeAnalysis.readiness.summary}
            </div>
          ) : null}
        </section>

        <section className="panel rounded-3xl p-8">
          <h3 className="text-lg font-semibold text-white">Comparison</h3>
          {!result ? (
            <p className="mt-4 text-sm text-slate-300">No comparison has been run yet.</p>
          ) : (
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              {result.comparisons.map((comparison) => (
                <div key={`${comparison.characterId ?? comparison.characterName}-${comparison.rank}`} className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                  <p className="text-white">
                    #{comparison.rank} {comparison.characterName}
                  </p>
                  <p className="mt-1 text-slate-400">
                    {comparison.analysis.readiness.score}% {comparison.analysis.readiness.label} · {comparison.analysis.gapAnalysis.missing.length} missing · {formatDuration(comparison.analysis.trainingPlan.totalTrainingSeconds)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel rounded-3xl p-8">
          <h3 className="text-lg font-semibold text-white">Missing skills</h3>
          {!activeAnalysis ? (
            <p className="mt-4 text-sm text-slate-300">No analysis has been run yet.</p>
          ) : activeAnalysis.gapAnalysis.missing.length === 0 ? (
            <p className="mt-4 text-sm text-slate-300">This character meets all resolved requirements.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {activeAnalysis.gapAnalysis.missing.map((requirement) => (
                <li key={requirement.skillTypeId} className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                  <p className="text-white">
                    {requirement.skillName} {requirement.currentLevel} to {requirement.requiredLevel}
                  </p>
                  <p className="mt-1 text-slate-400">
                    {formatDuration(requirement.trainingSeconds)} at {requirement.trainingRatePerMinute.toFixed(1)} SP/min
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel rounded-3xl p-8">
          <h3 className="text-lg font-semibold text-white">Training plan</h3>
          {!activeAnalysis ? (
            <p className="mt-4 text-sm text-slate-300">No analysis has been run yet.</p>
          ) : activeAnalysis.trainingPlan.steps.length === 0 ? (
            <p className="mt-4 text-sm text-slate-300">No training plan is required.</p>
          ) : (
            <ol className="mt-4 space-y-3 text-sm text-slate-300">
              {activeAnalysis.trainingPlan.steps.map((step) => (
                <li key={step.skillTypeId} className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                  <p className="text-white">
                    {step.position}. {step.skillName} {step.fromLevel} to {step.toLevel}
                  </p>
                  <p className="mt-1 text-slate-400">
                    {formatDuration(step.trainingSeconds)} using {step.primaryAttribute} / {step.secondaryAttribute}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="panel rounded-3xl p-8">
          <h3 className="text-lg font-semibold text-white">Unknown items</h3>
          {!activeAnalysis ? (
            <p className="mt-4 text-sm text-slate-300">No analysis has been run yet.</p>
          ) : activeAnalysis.unknownItems.length === 0 ? (
            <p className="mt-4 text-sm text-slate-300">No unknown items were encountered.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {activeAnalysis.unknownItems.map((item) => {
                const suggestions = activeAnalysis.unknownItemSuggestions.find(
                  (candidate) => candidate.unknownItemName === item.name,
                )?.suggestions ?? [];

                return (
                  <li key={`${item.kind}-${item.name}-${item.quantity}`} className="rounded-2xl border border-ember/20 bg-ember/10 px-4 py-3">
                    <p className="text-white">{item.name}</p>
                    <p className="mt-1 text-rose-100">{item.reason}</p>
                    {suggestions.length > 0 ? (
                      <p className="mt-2 text-slate-300">
                        Suggestions: {suggestions.map((suggestion) => suggestion.name).join(", ")}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel rounded-3xl p-8">
          <h3 className="text-lg font-semibold text-white">Debug</h3>
          {!activeAnalysis?.debug ? (
            <p className="mt-4 text-sm text-slate-300">Enable debug mode to inspect pipeline counts and weighted scoring.</p>
          ) : (
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                <p className="text-white">Resolved items {activeAnalysis.debug.resolvedItemCount}</p>
                <p className="mt-1 text-slate-400">
                  Unknown items {activeAnalysis.debug.unknownItemCount} · direct requirements {activeAnalysis.debug.directRequirementCount} · total requirements {activeAnalysis.debug.totalRequirementCount}
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                <p className="text-white">Weighted readiness breakdown</p>
                <p className="mt-1 text-slate-400">
                  Direct coverage {(activeAnalysis.debug.readinessBreakdown.directCoverage * 100).toFixed(1)}% · prerequisite coverage {(activeAnalysis.debug.readinessBreakdown.prerequisiteCoverage * 100).toFixed(1)}%
                </p>
                <p className="mt-1 text-slate-400">
                  Weighted coverage {(activeAnalysis.debug.readinessBreakdown.weightedCoverage * 100).toFixed(1)}% · unknown penalty {activeAnalysis.debug.readinessBreakdown.unknownPenalty}
                </p>
              </div>
            </div>
          )}
        </section>
      </aside>
    </section>
  );
}