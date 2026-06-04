import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ModelManager } from "./model-manager.js";
import { QvacRuntimeService } from "./qvac-runtime-service.js";
import type { ChatMessage } from "./qvac-types.js";

type Severity = "low" | "medium" | "high" | "critical";

interface GoldenSop {
  id: string;
  title: string;
  severity: Severity;
  tags: string[];
  source: string;
  body: string;
}

interface RankedSop {
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

function findUp(fileName: string, startDirectory = process.cwd()): string | undefined {
  let currentDirectory = resolve(startDirectory);

  while (true) {
    const candidate = join(currentDirectory, fileName);

    if (existsSync(candidate)) {
      return candidate;
    }

    const parentDirectory = dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return undefined;
    }

    currentDirectory = parentDirectory;
  }
}

function loadEnvFile(fileName = ".env.local"): void {
  const envPath = findUp(fileName);

  if (!envPath) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");

    if (equalsIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function loadGoldenSops(): GoldenSop[] {
  const sopPath = findUp("fixtures/golden-sops.json");

  if (!sopPath) {
    throw new Error("Missing fixtures/golden-sops.json.");
  }

  return JSON.parse(readFileSync(sopPath, "utf8")) as GoldenSop[];
}

function searchGoldenSops(query: string, sops: GoldenSop[], limit = 3): RankedSop[] {
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

function formatContext(rankedSops: RankedSop[]): string {
  return rankedSops
    .map(
      ({ sop }, index) =>
        `[${index + 1}] ${sop.title}\nSeverity: ${sop.severity}\nSource: ${sop.source} (${sop.id})\n${sop.body}`
    )
    .join("\n\n");
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (value) {
    return value;
  }

  throw new Error(`Missing ${name}. Set it in .env.local.`);
}

async function runDay3RagSmoke() {
  loadEnvFile();

  const modelSrc = requiredEnv("SFC_LOCAL_LLM_MODEL_SRC");
  const query =
    process.argv.slice(2).join(" ").trim() ||
    process.env.SFC_DAY3_QUERY ||
    "Someone has severe bleeding after an industrial accident. What should I do first?";

  const sops = loadGoldenSops();
  const matches = searchGoldenSops(query, sops);

  if (matches.length === 0) {
    throw new Error(`No local golden SOP matched query: ${query}`);
  }

  console.log("Day 3 local golden RAG smoke test");
  console.log(`Query: ${query}`);
  console.log("Retrieved SOPs:");

  for (const { sop, score } of matches) {
    console.log(`- ${sop.id} score=${score} severity=${sop.severity} title=${sop.title}`);
  }

  const modelManager = new ModelManager();
  const runtime = new QvacRuntimeService();
  const loaded = await modelManager.loadCompletionModel({
    modelSrc,
    modelConfig: {
      ctx_size: 2048
    }
  });

  const history: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are Sovereign Field Copilot. Answer only from the provided local SOP context. Be concise, action-oriented, and safety-first. Include a Sources line with SOP ids. For critical or high severity cases, explicitly require human confirmation or emergency escalation."
    },
    {
      role: "user",
      content: [
        `Question: ${query}`,
        "",
        "Local SOP context:",
        formatContext(matches),
        "",
        "Return format:",
        "Immediate action:",
        "Do not:",
        "Escalation/human confirmation:",
        "Sources:"
      ].join("\n")
    }
  ];

  const answer = await runtime.runCompletion({
    modelId: loaded.modelId,
    history,
    onToken: (token) => process.stdout.write(token)
  });

  console.log("\nRAG answer finished");
  console.log(`status=${answer.status}`);

  if (answer.status !== "completed") {
    throw new Error("Expected Day 3 RAG answer to complete.");
  }

  const topMatch = matches[0];

  if (topMatch && !answer.outputText.includes(topMatch.sop.id)) {
    console.warn("Warning: answer did not visibly include the top SOP id.");
  }

  console.log("Day 3 local golden RAG smoke passed");
}

runDay3RagSmoke().catch((error: unknown) => {
  console.error("Day 3 local golden RAG smoke failed");
  console.error(error);
  process.exitCode = 1;
});
