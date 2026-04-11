import { normalizeEveName } from "@/lib/fits/normalize";
import type { ParsedFit, ParsedFitEntry } from "@/lib/fits/types";

const headerPattern = /^\[(.+?)(?:,\s*(.+))?\]$/;
const quantityPattern = /^(.*?)\s+x(\d+)$/i;
const chargePattern = /^(.*?),\s*(.+)$/;

function createEntry(name: string, originalLine: string, quantity = 1, kind: ParsedFitEntry["kind"] = "item"): ParsedFitEntry {
  return {
    name,
    normalizedName: normalizeEveName(name),
    kind,
    quantity,
    originalLine,
  };
}

export function parseEft(text: string): ParsedFit {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const [headerLine, ...bodyLines] = lines;

  if (!headerLine) {
    throw new Error("EFT fit text is empty.");
  }

  const headerMatch = headerPattern.exec(headerLine);

  if (!headerMatch) {
    throw new Error("EFT fit header must match [Ship, Fit Name].");
  }

  const shipName = headerMatch[1]?.trim();
  const fitName = headerMatch[2]?.trim() || null;

  if (!shipName) {
    throw new Error("EFT fit header is missing a ship name.");
  }

  const warnings: string[] = [];
  const entries: ParsedFitEntry[] = [createEntry(shipName, headerLine, 1, "ship")];

  for (const line of bodyLines) {
    if (/^\[empty/i.test(line)) {
      continue;
    }

    const quantityMatch = quantityPattern.exec(line);

    if (quantityMatch) {
      const itemName = quantityMatch[1]?.trim();
      const quantity = Number.parseInt(quantityMatch[2] ?? "1", 10);

      if (itemName && Number.isFinite(quantity) && quantity > 0) {
        entries.push(createEntry(itemName, line, quantity, "drone"));
        continue;
      }
    }

    const chargeMatch = chargePattern.exec(line);

    if (chargeMatch) {
      const moduleName = chargeMatch[1]?.trim();
      const chargeName = chargeMatch[2]?.trim();

      if (moduleName) {
        entries.push(createEntry(moduleName, line));
      }

      if (chargeName) {
        entries.push(createEntry(chargeName, line, 1, "charge"));
      }

      continue;
    }

    if (!/[A-Za-z0-9]/.test(line)) {
      warnings.push(`Ignored unsupported EFT line: ${line}`);
      continue;
    }

    entries.push(createEntry(line, line));
  }

  return {
    shipName,
    fitName,
    entries,
    warnings,
  };
}