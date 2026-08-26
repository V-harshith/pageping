import { diffLines } from "diff";

export type Condition = "any-change" | "keyword" | "price-below";

export type DiffRow = {
  type: " " | "+" | "-";
  line: string;
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

export function extractPrice(content: string): { price: number; currency: string } | null {
  const match = content.match(/[₹$€£]\s*([0-9][0-9,]*(?:\.[0-9]+)?)/);
  if (!match) return null;
  const price = Number(match[1].replace(/,/g, ""));
  return price > 0 && price <= 10_000_000 ? { price, currency: match[0][0] } : null;
}

export type EvalInput = {
  condition: Condition;
  keyword?: string;
  targetPrice?: number;
  prevHash?: string | null;
  prevHadKeyword: boolean;
  nextHash: string;
  nextText: string;
  nextPrice: number | null;
  lastAlertedAt?: number | null;
  lastAlertedPrice?: number | null;
  now: number;
};

export type EvalOutput = {
  changed: boolean;
  alert: "change" | "keyword" | "price" | null;
};

export function evaluate(options: EvalInput): EvalOutput {
  const changed = options.prevHash == null || options.prevHash !== options.nextHash;
  if (options.lastAlertedAt != null && options.now - options.lastAlertedAt < ALERT_MIN_GAP_MS) {
    return { changed, alert: null };
  }

  let alert: EvalOutput["alert"] = null;
  if (options.condition === "any-change") {
    if (changed) alert = "change";
  } else if (options.condition === "keyword") {
    if (!options.prevHadKeyword &&
      options.keyword != null &&
      options.nextText.toLocaleLowerCase().includes(options.keyword.toLocaleLowerCase())) {
      alert = "keyword";
    }
  } else {
    if (options.nextPrice != null &&
      options.targetPrice != null &&
      options.nextPrice <= options.targetPrice &&
      (options.lastAlertedPrice == null || options.nextPrice < options.lastAlertedPrice)) {
      alert = "price";
    }
  }

  return { changed, alert };
}

export function buildDiff(previous: string, next: string): DiffRow[] {
  const changes = diffLines(previous, next);
  const rows: DiffRow[] = [];
  for (const change of changes) {
    const type: DiffRow["type"] = change.added ? "+" : change.removed ? "-" : " ";
    const lines = change.value.split(/\r?\n/);
    if (lines.at(-1) === "") lines.pop();
    for (const line of lines) rows.push({ type, line });
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
