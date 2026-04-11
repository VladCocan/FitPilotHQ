"use client";

import { useState } from "react";

import type { AnalyzeFitResponse } from "@/lib/fits/api-contract";

type CharacterOption = {
  id: string;
  name: string;
  lastSyncedAt: string | null;
  skillCount: number;
  hasAttributes: boolean;
};

type FitAnalyzerClientProps = {
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

export function FitAnalyzerClient({
  characters,
  initialCharacterId,
  initialFitText,
}: FitAnalyzerClientProps) {
  const [characterId, setCharacterId] = useState(initialCharacterId);
  const [fitText, setFitText] = useState(initialFitText);
  const [includeDebug, setIncludeDebug] = useState(false);
  const [result, setResult] = useState<AnalyzeFitResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/fits/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          characterId,
          fitText,
          includeDebug,
        }),
      });

      const payload = (await response.json()) as AnalyzeFitResponse | ApiErrorPayload;

      if (!response.ok) {
        const errorPayload = payload as ApiErrorPayload;
        setResult(null);
        setErrorMessage(errorPayload.error?.message ?? "Fit analysis failed.");
        return;
      }

      setResult(payload as AnalyzeFitResponse);
    } catch (error) {
      setResult(null);
      setErrorMessage(error instanceof Error ? error.message : "Fit analysis failed.");
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
        <h2 className="mt-3 text-3xl font-semibold text-white">Analyze a fit</h2>
        <p className="mt-4 max-w-2xl text-slate-300">
          Select one synced character, paste an EFT fit, and inspect readiness,
          missing skills, training time, and unknown item warnings for that pilot.
        </p>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Character</span>
              <select
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-flux"
                value={characterId}
                onChange={(event) => setCharacterId(event.target.value)}
              >
                {characters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name} · {character.skillCount} skills · {character.hasAttributes ? "attrs" : "no attrs"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4 rounded-3xl border border-white/5 bg-white/5 px-4 py-4 text-sm text-slate-300">
              {characters
                .filter((character) => character.id === characterId)
                .map((character) => (
                  <div key={character.id}>
                    <p className="text-slate-400">Selected character</p>
                    <p className="mt-2 text-white">{character.name}</p>
                    <p className="mt-1 text-slate-400">
                      {character.lastSyncedAt ? `Last synced ${character.lastSyncedAt}` : "Never synced"}
                    </p>
                  </div>
                ))}

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
              disabled={isSubmitting}
            >
              {isSubmitting ? "Analyzing..." : "Analyze fit"}
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
          <h3 className="text-lg font-semibold text-white">Analysis result</h3>
          {!result ? (
            <p className="mt-4 text-sm text-slate-300">
              Submit a fit to view readiness, missing skills, training time, and unknown item warnings.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                <p className="text-sm text-slate-400">Readiness</p>
                <p className="mt-2 text-white">
                  {result.readiness.score}% {result.readiness.label}
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                <p className="text-sm text-slate-400">Training time</p>
                <p className="mt-2 text-white">
                  {formatDuration(result.trainingPlan.totalTrainingSeconds)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                <p className="text-sm text-slate-400">Direct requirements</p>
                <p className="mt-2 text-white">{result.requirements.direct.length}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                <p className="text-sm text-slate-400">Unknown items</p>
                <p className="mt-2 text-white">{result.unknownItems.length}</p>
              </div>
            </div>
          )}

          {result ? (
            <div className="mt-6 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-300">
              {result.readiness.summary}
            </div>
          ) : null}
        </section>

        <section className="panel rounded-3xl p-8">
          <h3 className="text-lg font-semibold text-white">Missing skills</h3>
          {!result ? (
            <p className="mt-4 text-sm text-slate-300">No analysis has been run yet.</p>
          ) : result.gapAnalysis.missing.length === 0 ? (
            <p className="mt-4 text-sm text-slate-300">This character meets all resolved requirements.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {result.gapAnalysis.missing.map((requirement) => (
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
          {!result ? (
            <p className="mt-4 text-sm text-slate-300">No analysis has been run yet.</p>
          ) : result.trainingPlan.steps.length === 0 ? (
            <p className="mt-4 text-sm text-slate-300">No training plan is required.</p>
          ) : (
            <ol className="mt-4 space-y-3 text-sm text-slate-300">
              {result.trainingPlan.steps.map((step) => (
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
          {!result ? (
            <p className="mt-4 text-sm text-slate-300">No analysis has been run yet.</p>
          ) : result.unknownItems.length === 0 ? (
            <p className="mt-4 text-sm text-slate-300">No unknown items were encountered.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {result.unknownItems.map((item) => {
                const suggestions = result.unknownItemSuggestions.find(
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
          {!result?.debug ? (
            <p className="mt-4 text-sm text-slate-300">Enable debug mode to inspect pipeline counts and weighted scoring.</p>
          ) : (
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                <p className="text-white">Resolved items {result.debug.resolvedItemCount}</p>
                <p className="mt-1 text-slate-400">
                  Unknown items {result.debug.unknownItemCount} · direct requirements {result.debug.directRequirementCount} · total requirements {result.debug.totalRequirementCount}
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                <p className="text-white">Weighted readiness breakdown</p>
                <p className="mt-1 text-slate-400">
                  Direct coverage {(result.debug.readinessBreakdown.directCoverage * 100).toFixed(1)}% · prerequisite coverage {(result.debug.readinessBreakdown.prerequisiteCoverage * 100).toFixed(1)}%
                </p>
                <p className="mt-1 text-slate-400">
                  Weighted coverage {(result.debug.readinessBreakdown.weightedCoverage * 100).toFixed(1)}% · unknown penalty {result.debug.readinessBreakdown.unknownPenalty}
                </p>
              </div>
            </div>
          )}
        </section>
      </aside>
    </section>
  );
}