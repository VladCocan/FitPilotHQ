export function normalizeEveName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}