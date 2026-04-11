import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(workspaceRoot, "data/source/item-input.json");
const targetDir = path.join(workspaceRoot, "data/generated");
const targetPath = path.join(targetDir, "item-requirements.generated.json");

const source = JSON.parse(await readFile(sourcePath, "utf8"));

const generated = source.map((item) => ({
  typeId: item.typeId,
  name: item.name,
  groupName: item.groupName ?? null,
  categoryName: item.categoryName ?? null,
  published: item.published !== false,
  requirementSkills: (item.dogma?.requiredSkills ?? []).map((entry) => ({
    skillTypeId: entry.skillTypeId,
    requiredLevel: entry.requiredLevel,
    source: "generated",
  })),
}));

await mkdir(targetDir, { recursive: true });
await writeFile(targetPath, `${JSON.stringify(generated, null, 2)}\n`, "utf8");

console.log(`Generated ${generated.length} item definitions at ${path.relative(workspaceRoot, targetPath)}.`);
