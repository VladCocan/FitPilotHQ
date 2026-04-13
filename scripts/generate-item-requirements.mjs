import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(workspaceRoot, "data/source/item-input.json");
const targetDir = path.join(workspaceRoot, "data/generated");
const targetPath = path.join(targetDir, "item-requirements.generated.json");
const reportPath = path.join(targetDir, "item-requirements.generated.report.json");

const source = JSON.parse(await readFile(sourcePath, "utf8"));

function normalizeName(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function incrementCount(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

const seenTypeIds = new Set();
const seenNames = new Set();
const skipped = [];
const coverageByCategory = new Map();
const coverageByGroup = new Map();
let requirementLinkCount = 0;

const generated = [];

for (const item of source) {
  if (!Number.isInteger(item.typeId)) {
    skipped.push({ name: item.name ?? "<missing>", reason: "missing_or_invalid_type_id" });
    continue;
  }

  if (typeof item.name !== "string" || item.name.trim().length === 0) {
    skipped.push({ name: `type:${item.typeId}`, reason: "missing_name" });
    continue;
  }

  const normalizedName = normalizeName(item.name);

  if (seenTypeIds.has(item.typeId)) {
    skipped.push({ name: item.name, reason: "duplicate_type_id" });
    continue;
  }

  if (seenNames.has(normalizedName)) {
    skipped.push({ name: item.name, reason: "duplicate_normalized_name" });
    continue;
  }

  seenTypeIds.add(item.typeId);
  seenNames.add(normalizedName);

  const requirementSkills = (item.dogma?.requiredSkills ?? []).map((entry) => ({
    skillTypeId: entry.skillTypeId,
    requiredLevel: entry.requiredLevel,
    source: "generated",
  }));

  requirementLinkCount += requirementSkills.length;
  incrementCount(coverageByCategory, item.categoryName ?? "Unknown");
  incrementCount(coverageByGroup, item.groupName ?? "Unknown");

  generated.push({
    typeId: item.typeId,
    name: item.name,
    normalizedName,
    groupName: item.groupName ?? null,
    categoryName: item.categoryName ?? null,
    published: item.published !== false,
    requirementSkills,
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  seededItemCount: generated.length,
  requirementLinkCount,
  coverageByCategory: Object.fromEntries([...coverageByCategory.entries()].sort((left, right) => right[1] - left[1])),
  coverageByGroup: Object.fromEntries([...coverageByGroup.entries()].sort((left, right) => right[1] - left[1])),
  skipped,
};

await mkdir(targetDir, { recursive: true });
await writeFile(targetPath, `${JSON.stringify(generated, null, 2)}\n`, "utf8");
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Generated ${generated.length} item definitions at ${path.relative(workspaceRoot, targetPath)}.`);
console.log(`Requirement links: ${requirementLinkCount}`);
console.log(`Skipped items: ${skipped.length}`);
