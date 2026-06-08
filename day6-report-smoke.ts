import { loadEnvFile, requiredEnv } from "./env.js";
import {
  formatSopContext,
  loadGoldenSops,
  searchGoldenSops,
  type RankedSop
} from "./local-rag.js";
import { ModelManager } from "./model-manager.js";
import {
  buildReportId,
  createReportStore,
  reportDirectoryFromEnv,
  type FieldReport
} from "./report-store.js";
import { QvacRuntimeService } from "./qvac-runtime-service.js";
import type { ChatMessage } from "./qvac-types.js";

function buildHistory(query: string, context: string): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are Sovereign Field Copilot. Generate a concise field handoff report for a trained human responder. Use only the supplied SOP context and the user's request. Use the report SOP only for the report structure. Prioritize the first non-report SOP as the primary hazard unless the request explicitly states another immediate hazard. Treat lower-ranked SOPs as secondary context only. Do not invent facts, completed actions, patient counts, diagnoses, locations, or hazards. If an action was not explicitly completed, write it as a recommendation. Require human review."
    },
    {
      role: "user",
      content: [
        `Field request: ${query}`,
        "",
        "SOP context:",
        context,
        "",
        "Return a handoff report with these labels:",
        "Known facts from request:",
        "Recommended immediate actions:",
        "Unknowns to confirm:",
        "Human review required:",
        "Sources:"
      ].join("\n")
    }
  ];
}

function buildReportMatches(query: string): RankedSop[] {
  const sops = loadGoldenSops();
  const reportSop = sops.find((sop) => sop.id === "golden-report-001");
  const hazardQuery = query.replace(/\b(generate|field|handoff|report|for)\b/gi, " ");
  const hazardMatches = searchGoldenSops(hazardQuery, sops, 3).filter(
    ({ sop }) => sop.id !== "golden-report-001"
  );
  const reportMatches: RankedSop[] = reportSop ? [{ sop: reportSop, score: 1 }] : [];

  return [...reportMatches, ...hazardMatches];
}

function buildSanitizedReport(query: string, matches: RankedSop[]): string {
  const primaryMatch =
    matches.find(({ sop }) => sop.id !== "golden-report-001") ?? matches[0];

  if (!primaryMatch) {
    throw new Error("Cannot build report without at least one SOP match.");
  }

  const secondaryMatches = matches.filter(
    ({ sop }) => sop.id !== "golden-report-001" && sop.id !== primaryMatch.sop.id
  );

  const secondaryLines =
    secondaryMatches.length > 0
      ? secondaryMatches
          .map(
            ({ sop }) =>
              `- Confirm only if present: ${sop.title} (${sop.id}). Do not assume this hazard without field confirmation.`
          )
          .join("\n")
      : "- No secondary SOP hazards were retrieved.";

  return [
    "Known facts from request:",
    `- ${query}`,
    "",
    "Primary SOP-grounded hazard:",
    `- ${primaryMatch.sop.title} (${primaryMatch.sop.id}, severity=${primaryMatch.sop.severity})`,
    "",
    "Recommended immediate actions:",
    `- ${primaryMatch.sop.body}`,
    "",
    "Unknowns to confirm:",
    "- Exact location, responder name, number of people affected, vital signs, and actions already completed were not provided.",
    "- Record these details only after a human responder confirms them.",
    "",
    "Secondary hazards to confirm, not assume:",
    secondaryLines,
    "",
    "Human review required:",
    "- Yes. This report is AI-assisted and must be verified by a trained human responder before operational use.",
    "",
    "Sources:",
    ...matches.map(({ sop }) => `- ${sop.id}: ${sop.title}`)
  ].join("\n");
}

async function runDay6ReportSmoke() {
  loadEnvFile();

  const modelSrc = requiredEnv("SFC_LOCAL_LLM_MODEL_SRC");
  const query =
    process.argv.slice(2).join(" ").trim() ||
    process.env.SFC_DAY6_QUERY ||
    "Generate a field handoff report for severe bleeding after an industrial accident.";

  const matches = buildReportMatches(query);

  if (matches.length === 0) {
    throw new Error(`No SOP matched Day 6 report query: ${query}`);
  }

  console.log("Day 6 local field report persistence smoke test");
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

  console.log(`localModelId=${loaded.modelId}`);

  const answer = await runtime.runCompletion({
    modelId: loaded.modelId,
    history: buildHistory(query, formatSopContext(matches))
  });

  console.log("Report draft generation finished");
  console.log(`draftStatus=${answer.status}`);

  if (answer.status !== "completed") {
    throw new Error(`Expected Day 6 answer to complete, got ${answer.status}.`);
  }

  const sanitizedReport = buildSanitizedReport(query, matches);
  console.log("Sanitized field report:");
  console.log(sanitizedReport);

  const createdAt = new Date().toISOString();
  const report: FieldReport = {
    id: buildReportId(createdAt),
    createdAt,
    query,
    track: "local",
    summary: sanitizedReport,
    sourceIds: matches.map(({ sop }) => sop.id),
    aiGenerated: true,
    requiresHumanReview: true
  };

  const store = await createReportStore(reportDirectoryFromEnv());

  try {
    await store.save(report);
    const latest = await store.latest();

    if (!latest || latest.id !== report.id) {
      throw new Error("Report persistence verification failed.");
    }

    console.log(`reportStoreMode=${store.mode}`);
    console.log(`reportId=${latest.id}`);
    console.log(`sourceIds=${latest.sourceIds.join(",")}`);
    console.log("Day 6 report persistence smoke passed");
  } finally {
    await store.close();
  }
}

runDay6ReportSmoke()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("Day 6 report persistence smoke failed");
    console.error(error);
    process.exit(1);
  });
