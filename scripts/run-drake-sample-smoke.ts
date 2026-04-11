import { analyzeFit } from "@/lib/fits/analyze-fit";
import { benchmarkCharacters } from "@/lib/fits/fixtures/characters";
import {
  benchmarkItemDefinitions,
  benchmarkPrerequisiteEdges,
  benchmarkSkillCatalog,
} from "@/lib/fits/fixtures/reference-data";
import { phaseFourSampleFit } from "@/lib/fits/sample-fit";

const specialist = benchmarkCharacters.specialist;

if (!specialist) {
  throw new Error("Specialist benchmark character is not available.");
}

const result = analyzeFit({
  fitText: phaseFourSampleFit,
  character: specialist,
  itemDefinitions: benchmarkItemDefinitions,
  skillCatalog: benchmarkSkillCatalog,
  prerequisiteEdges: benchmarkPrerequisiteEdges,
});

if (result.unknownItems.length > 0) {
  throw new Error(
    `Drake sample fit still has ${result.unknownItems.length} unknown item(s): ${result.unknownItems.map((item) => item.name).join(", ")}`,
  );
}

if (result.directRequirements.length === 0 || result.totalRequirements.length === 0) {
  throw new Error("Drake sample fit resolved no requirements.");
}

console.log(
  JSON.stringify(
    {
      fit: "drake-sample",
      label: result.readiness.label,
      score: result.readiness.score,
      unknownItems: result.unknownItems.length,
      missingRequirements: result.missingRequirements.length,
      directRequirements: result.directRequirements.length,
      totalRequirements: result.totalRequirements.length,
      trainingSeconds: result.trainingPlan.totalTrainingSeconds,
      summary: result.readiness.summary,
    },
    null,
    2,
  ),
);