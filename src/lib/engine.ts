import { diffLines } from "diff";

export type Condition = "any-change" | "keyword" | "price-below";

export type DiffRow = {
  type: " " | "+" | "-";
  text: string;
};

export const ALERT_MIN_GAP_MS = 6 * 60 * 60 * 1000;

export function normalizeContent(content: string): string {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export async function sha256Hex(content: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function extractPrice(content: string): number | null {
  const match = content.match(/[₹$€£]\s*([0-9][0-9,]*(?:\.[0-9]+)?)/);
  if (!match) return null;
  const price = Number(match[1].replace(/,/g, ""));
  return price > 0 && price <= 10_000_000 ? price : null;
}

type EvaluateOptions = {
  condition: Condition;
  previousHash: string | null;
  nextHash: string;
  now: number;
  lastAlertAt?: number | null;
  content?: string;
  keyword?: string;
  prevHadKeyword?: boolean;
  nextPrice?: number | null;
  targetPrice?: number;
  previousAlertedPrice?: number | null;
};

export function evaluate(options: EvaluateOptions): { changed: boolean; alert: boolean } {
  const changed = options.previousHash === null || options.previousHash !== options.nextHash;
  if (!changed || (options.lastAlertAt != null && options.now - options.lastAlertAt < ALERT_MIN_GAP_MS)) {
    return { changed, alert: false };
  }

  let alert = false;
  if (options.condition === "any-change") {
    alert = true;
  } else if (options.condition === "keyword") {
    alert = !options.prevHadKeyword &&
      options.keyword != null &&
      options.content?.toLocaleLowerCase().includes(options.keyword.toLocaleLowerCase()) === true;
  } else {
    alert = options.nextPrice != null &&
      options.targetPrice != null &&
      options.nextPrice <= options.targetPrice &&
      (options.previousAlertedPrice == null || options.nextPrice < options.previousAlertedPrice);
  }

  return { changed, alert };
}

export function buildDiff(previous: string, next: string): DiffRow[] {
  const changes = diffLines(previous, next);
  const rows: DiffRow[] = [];
  let line = 0;
  for (const change of changes) {
    const type: DiffRow["type"] = change.added ? "+" : change.removed ? "-" : " ";
    const lines = change.value.split(/\r?\n/);
    if (lines.at(-1) === "") lines.pop();
    for (const text of lines) rows.push({ type, text });
    if (!change.added && !change.removed) line += lines.length;
  }

  const changedIndexes = rows.flatMap((row, index) => row.type === " " ? [] : [index]);
  if (changedIndexes.length === 0) return rows;
  const context = new Set<number>();
  for (const index of changedIndexes) {
    for (let offset = -3; offset <= 3; offset++) {
      const candidate = index + offset;
      if (candidate >= 0 && candidate < rows.length && rows[candidate].type === " ") context.add(candidate);
    }
  }
  const allowed = [...context].sort((a, b) => a - b).slice(0, 6);
  const keep = new Set([...changedIndexes, ...allowed]);
  return rows.filter((_, index) => keep.has(index));
}
