import { benchmarkCharacters } from "@/lib/fits/fixtures/characters";
import { runFixtureAnalysis } from "@/lib/fits/fixture-reporting";

function formatDuration(totalSeconds: number) {
  if (totalSeconds <= 0) {
    return "ready now";
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

for (const { fixture, result } of runFixtureAnalysis(benchmarkCharacters.rookie)) {

  console.log(
    [
      fixture.label,
      `score=${result.readiness.score}`,
      `label=${result.readiness.label}`,
      `unknown=${result.unknownItems.length}`,
      `missing=${result.missingRequirements.length}`,
      `training=${formatDuration(result.trainingPlan.totalTrainingSeconds)}`,
    ].join(" | "),
  );
}