import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");

async function loadJson(relativePath) {
  const fullPath = path.join(workspaceRoot, relativePath);
  return JSON.parse(await readFile(fullPath, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const skills = await loadJson("data/source/skills.catalog.json");
const prerequisites = await loadJson("data/source/skill-prerequisites.json");
const generatedItems = await loadJson("data/generated/item-requirements.generated.json");
const generatedReport = await loadJson("data/generated/item-requirements.generated.report.json");

const skillIds = new Set();
const skillNames = new Set();

for (const skill of skills) {
  assert(Number.isInteger(skill.typeId), `Skill typeId must be an integer: ${JSON.stringify(skill)}`);
  assert(typeof skill.name === "string" && skill.name.trim().length > 0, `Skill name is required for typeId ${skill.typeId}.`);
  assert(!skillIds.has(skill.typeId), `Duplicate skill typeId ${skill.typeId}.`);
  assert(!skillNames.has(skill.name.toLowerCase()), `Duplicate skill name ${skill.name}.`);
  skillIds.add(skill.typeId);
  skillNames.add(skill.name.toLowerCase());
}

for (const prerequisite of prerequisites) {
  assert(skillIds.has(prerequisite.skillTypeId), `Unknown prerequisite target skill ${prerequisite.skillTypeId}.`);
  assert(skillIds.has(prerequisite.prerequisiteTypeId), `Unknown prerequisite source skill ${prerequisite.prerequisiteTypeId}.`);
  assert(
    Number.isInteger(prerequisite.requiredLevel) &&
      prerequisite.requiredLevel >= 1 &&
      prerequisite.requiredLevel <= 5,
    `Invalid prerequisite level for ${prerequisite.skillTypeId}.`,
  );
}

const itemIds = new Set();
const normalizedItemNames = new Set();
const coverageByCategory = new Map();
const coverageByGroup = new Map();
let requirementLinkCount = 0;

for (const item of generatedItems) {
  assert(Number.isInteger(item.typeId), `Item typeId must be an integer: ${JSON.stringify(item)}`);
  assert(typeof item.name === "string" && item.name.trim().length > 0, `Item name is required for typeId ${item.typeId}.`);
  assert(typeof item.normalizedName === "string" && item.normalizedName.trim().length > 0, `Item normalizedName is required for typeId ${item.typeId}.`);
  assert(!itemIds.has(item.typeId), `Duplicate item typeId ${item.typeId}.`);
  assert(!normalizedItemNames.has(item.normalizedName), `Duplicate normalized item name ${item.normalizedName}.`);
  itemIds.add(item.typeId);
  normalizedItemNames.add(item.normalizedName);
  coverageByCategory.set(item.categoryName ?? "Unknown", (coverageByCategory.get(item.categoryName ?? "Unknown") ?? 0) + 1);
  coverageByGroup.set(item.groupName ?? "Unknown", (coverageByGroup.get(item.groupName ?? "Unknown") ?? 0) + 1);

  const seenSkillKeys = new Set();

  for (const requirement of item.requirementSkills ?? []) {
    assert(skillIds.has(requirement.skillTypeId), `Item ${item.typeId} references unknown skill ${requirement.skillTypeId}.`);
    assert(
      Number.isInteger(requirement.requiredLevel) &&
        requirement.requiredLevel >= 1 &&
        requirement.requiredLevel <= 5,
      `Invalid required level on item ${item.typeId} for skill ${requirement.skillTypeId}.`,
    );
    const key = `${item.typeId}:${requirement.skillTypeId}`;
    assert(!seenSkillKeys.has(key), `Duplicate requirement ${key}.`);
    seenSkillKeys.add(key);
    requirementLinkCount += 1;
  }
}

assert(generatedReport.seededItemCount === generatedItems.length, "Generated report item count does not match generated items.");
assert(generatedReport.requirementLinkCount === requirementLinkCount, "Generated report requirement link count does not match generated items.");

console.log(
  `Validated ${skills.length} skills, ${prerequisites.length} prerequisites, and ${generatedItems.length} generated items.`,
);
console.log(`Requirement links: ${requirementLinkCount}`);
console.log(`Coverage by category: ${JSON.stringify(Object.fromEntries([...coverageByCategory.entries()].sort((left, right) => right[1] - left[1]).slice(0, 10)))}`);
console.log(`Coverage by group: ${JSON.stringify(Object.fromEntries([...coverageByGroup.entries()].sort((left, right) => right[1] - left[1]).slice(0, 10)))}`);
console.log(`Skipped items with reasons: ${generatedReport.skipped.length}`);
