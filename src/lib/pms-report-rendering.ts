type ReportTable = string[][];

function normalizeReturnHorizon(header: string): string | null {
  const normalized = header.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (/\b(si|since inception|inception)\b/.test(normalized)) return "since-inception";

  const period = normalized.match(/\b(\d+(?:\.\d+)?)\s*(m|mo|month|months|y|yr|yrs|year|years)\b/);
  if (!period) return null;
  const unit = period[2].startsWith("m") ? "months" : "years";
  return `${Number(period[1])}-${unit}`;
}

function normalizeEntity(value: string | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeReturnValue(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const numeric = Number(value.replace(/,/g, "").replace(/%/g, "").trim());
  return Number.isFinite(numeric) ? numeric.toFixed(8) : value.trim().toLowerCase();
}

/**
 * PMS source pages sometimes repeat a fund's same return horizon in a trailing
 * returns table and again in a profile table. Keep the first disclosed value
 * and remove only later columns whose entity, horizon, and value all match.
 */
export function removeRepeatedPmsReturnColumns(tables: ReportTable[]): ReportTable[] {
  const previouslyRendered = new Map<string, string>();

  return tables.map((table) => {
    if (table.length < 2) return table;
    const headers = table[0] ?? [];
    const returnColumns = headers
      .map((header, index) => ({
        index,
        horizon: index === 0 ? null : normalizeReturnHorizon(header),
      }))
      .filter((column): column is { index: number; horizon: string } => column.horizon !== null);

    const duplicateColumns = new Set<number>();
    for (const column of returnColumns) {
      const entries = table.slice(1)
        .map((row) => ({
          entity: normalizeEntity(row[0]),
          value: normalizeReturnValue(row[column.index]),
        }))
        .filter((entry) => entry.entity && entry.value !== null);
      if (entries.length > 0 && entries.every((entry) =>
        previouslyRendered.get(`${entry.entity}|${column.horizon}`) === entry.value
      )) {
        duplicateColumns.add(column.index);
      }
    }

    for (const column of returnColumns) {
      if (duplicateColumns.has(column.index)) continue;
      for (const row of table.slice(1)) {
        const entity = normalizeEntity(row[0]);
        const value = normalizeReturnValue(row[column.index]);
        if (entity && value !== null) {
          previouslyRendered.set(`${entity}|${column.horizon}`, value);
        }
      }
    }

    return duplicateColumns.size === 0
      ? table
      : table.map((row) => row.filter((_, index) => !duplicateColumns.has(index)));
  });
}
