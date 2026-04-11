export type AttributeKey =
  | "intelligence"
  | "memory"
  | "perception"
  | "willpower"
  | "charisma";

export type SkillTrainingAttributes = {
  primaryAttribute: AttributeKey;
  secondaryAttribute: AttributeKey;
};

export type SkillCatalogEntry = {
  typeId: number;
  name: string;
  rank: number;
  description?: string | null;
  trainingAttributes: SkillTrainingAttributes;
};

export type SkillDependency = {
  skillTypeId: number;
  requiredLevel: number;
};

export type ItemRequirementSkillEntry = {
  skillTypeId: number;
  requiredLevel: number;
  source: string;
};

export type ItemDefinitionEntry = {
  typeId: number;
  name: string;
  groupName?: string | null;
  categoryName?: string | null;
  published: boolean;
  source: "generated" | "manual";
  requirementSkills: ItemRequirementSkillEntry[];
};

export type ParsedFitEntryKind = "ship" | "item" | "drone" | "charge";

export type ParsedFitEntry = {
  name: string;
  normalizedName: string;
  kind: ParsedFitEntryKind;
  quantity: number;
  originalLine: string;
};

export type ParsedFit = {
  shipName: string;
  fitName: string | null;
  entries: ParsedFitEntry[];
  warnings: string[];
};

export type UnknownFitItem = {
  name: string;
  kind: ParsedFitEntryKind;
  quantity: number;
  reason: string;
};

export type UnknownItemSuggestion = {
  typeId: number;
  name: string;
  groupName?: string | null;
  categoryName?: string | null;
  score: number;
  matchReason: string;
};

export type UnknownItemSuggestionSet = {
  unknownItemName: string;
  unknownItemKind: ParsedFitEntryKind;
  suggestions: UnknownItemSuggestion[];
};

export type CharacterSkillSnapshot = {
  skillTypeId: number;
  trainedLevel: number;
  skillpoints: number;
};

export type CharacterAttributesSnapshot = {
  intelligence: number;
  memory: number;
  perception: number;
  willpower: number;
  charisma: number;
};

export type CharacterAnalysisInput = {
  id?: string;
  name: string;
  skills: CharacterSkillSnapshot[];
  attributes: CharacterAttributesSnapshot;
};

export type ResolvedFitItem = {
  entry: ParsedFitEntry;
  definition: ItemDefinitionEntry;
};

export type FitRequirement = {
  skillTypeId: number;
  skillName: string;
  requiredLevel: number;
  source: "direct" | "prerequisite";
  sourceNames: string[];
};

export type SkillRequirementAssessment = FitRequirement & {
  currentLevel: number;
  currentSkillpoints: number;
  missingLevels: number;
};

export type MissingSkillRequirement = SkillRequirementAssessment & {
  rank: number;
  trainingAttributes: SkillTrainingAttributes;
  requiredSkillpoints: number;
  remainingSkillpoints: number;
  trainingRatePerMinute: number;
  trainingSeconds: number;
};

export type TrainingPlanStep = {
  position: number;
  skillTypeId: number;
  skillName: string;
  rank: number;
  fromLevel: number;
  toLevel: number;
  requiredSkillpoints: number;
  remainingSkillpoints: number;
  trainingRatePerMinute: number;
  trainingSeconds: number;
  primaryAttribute: AttributeKey;
  secondaryAttribute: AttributeKey;
};

export type ReadinessScore = {
  score: number;
  label: string;
  isReady: boolean;
  summary: string;
  breakdown: {
    directCoverage: number;
    prerequisiteCoverage: number;
    directCompletedSkillpoints: number;
    directRequiredSkillpoints: number;
    prerequisiteCompletedSkillpoints: number;
    prerequisiteRequiredSkillpoints: number;
    weightedCoverage: number;
    unknownPenalty: number;
  };
};

export type FitAnalysisDebug = {
  parsedWarnings: string[];
  resolvedItemCount: number;
  unknownItemCount: number;
  directRequirementCount: number;
  totalRequirementCount: number;
  missingRequirementCount: number;
  readinessBreakdown: ReadinessScore["breakdown"];
};

export type FitAnalysisResult = {
  parsedFit: ParsedFit;
  resolvedItems: ResolvedFitItem[];
  directRequirements: FitRequirement[];
  totalRequirements: FitRequirement[];
  requirementAssessments: SkillRequirementAssessment[];
  missingRequirements: MissingSkillRequirement[];
  trainingPlan: {
    steps: TrainingPlanStep[];
    totalTrainingSeconds: number;
  };
  readiness: ReadinessScore;
  unknownItems: UnknownFitItem[];
  unknownItemSuggestions: UnknownItemSuggestionSet[];
  debug?: FitAnalysisDebug;
};

export type FitComparisonEntry = {
  rank: number;
  characterId?: string;
  characterName: string;
  analysis: FitAnalysisResult;
};

export type FitComparisonResult = {
  best: FitComparisonEntry | null;
  comparisons: FitComparisonEntry[];
};