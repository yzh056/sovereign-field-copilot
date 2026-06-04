import { readFileSync } from "node:fs";
import { findUp } from "./env.js";

export type Severity = "low" | "medium" | "high" | "critical";

export interface GoldenSop {
  id: string;
  title: string;
  severity: Severity;
  tags: string[];
  source: string;
  body: string;
}

export interface RankedSop {
  sop: GoldenSop;
  score: number;
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "do",
  "first",
  "for",
  "has",
  "i",
  "in",
  "is",
  "it",
  "of",
  "or",
  "should",
  "the",
  "to",
  "what",
  "with"
]);

export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function loadGoldenSops(): GoldenSop[] {
  const sopPath = findUp("fixtures/golden-sops.json");

  if (!sopPath) {
    throw new Error("Missing fixtures/golden-sops.json.");
  }

  return JSON.parse(readFileSync(sopPath, "utf8")) as GoldenSop[];
}

export function searchGoldenSops(query: string, sops: GoldenSop[], limit = 3): RankedSop[] {
  const queryTokens = tokenize(query);

  return sops
    .map((sop) => {
      const titleTokens = tokenize(sop.title);
      const tagTokens = sop.tags.flatMap(tokenize);
      const bodyTokens = tokenize(sop.body);
      const allTokens = new Set([...titleTokens, ...tagTokens, ...bodyTokens]);

      const score = queryTokens.reduce((total, token) => {
        if (!allTokens.has(token)) {
          return total;
        }

        const titleBoost = titleTokens.includes(token) ? 3 : 0;
        const tagBoost = tagTokens.includes(token) ? 2 : 0;
        return total + 1 + titleBoost + tagBoost;
      }, 0);

      return { sop, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const severityRank: Record<Severity, number> = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1
      };

      return severityRank[b.sop.severity] - severityRank[a.sop.severity];
    })
    .slice(0, limit);
}

export function formatSopContext(rankedSops: RankedSop[]): string {
  return rankedSops
    .map(
      ({ sop }, index) =>
        `[${index + 1}] ${sop.title}\nSeverity: ${sop.severity}\nSource: ${sop.source} (${sop.id})\n${sop.body}`
    )
    .join("\n\n");
}

