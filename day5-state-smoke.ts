import { loadEnvFile, requiredEnv } from "./env.js";
import { DelegationStateService } from "./delegation-state-service.js";
import {
  formatSopContext,
  loadGoldenSops,
  searchGoldenSops,
  type RankedSop
} from "./local-rag.js";
import { ModelManager } from "./model-manager.js";
import { QvacRuntimeService } from "./qvac-runtime-service.js";
import type { ChatMessage, QvacDelegateOptions } from "./qvac-types.js";

function optionalNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildDelegateOptions(): QvacDelegateOptions | undefined {
  const providerPublicKey = process.env.SFC_PROVIDER_PUBLIC_KEY;

  if (!providerPublicKey) {
    return undefined;
  }

  const healthCheckTimeout = optionalNumber(process.env.SFC_PROVIDER_HEALTH_TIMEOUT_MS, 3000);

  return {
    providerPublicKey,
    topic: process.env.SFC_PROVIDER_TOPIC || undefined,
    timeout: healthCheckTimeout,
    healthCheckTimeout,
    fallbackToLocal: true,
    forceNewConnection: false
  };
}

function buildHistory(query: string, matches: RankedSop[], track: "provider" | "local"): ChatMessage[] {
  const trackLabel =
    track === "provider"
      ? "Provider Ready track. Use expanded retrieved context and delegated inference."
      : "Fallback Local track. Use only the compact golden SOP context available on device.";

  return [
    {
      role: "system",
      content:
        "You are Sovereign Field Copilot. Answer only from the provided SOP context. Be concise, action-oriented, and safety-first. Prioritize the first retrieved SOP as the primary hazard unless the user explicitly states another immediate hazard. Treat lower-ranked SOPs as secondary context only. Include a Sources line with SOP ids. For critical or high severity cases, explicitly require human confirmation or emergency escalation."
    },
    {
      role: "user",
      content: [
        trackLabel,
        `Question: ${query}`,
        "",
        "Retrieved SOP context:",
        formatSopContext(matches),
        "",
        "Return format:",
        "Immediate action:",
        "Do not:",
        "Escalation/human confirmation:",
        "Sources:"
      ].join("\n")
    }
  ];
}

async function answerWithLocal(modelSrc: string, history: ChatMessage[]) {
  const modelManager = new ModelManager();
  const runtime = new QvacRuntimeService();
  const local = await modelManager.loadCompletionModel({
    modelSrc,
    modelConfig: {
      ctx_size: 2048
    }
  });

  console.log(`localModelId=${local.modelId}`);
  return runtime.runCompletion({
    modelId: local.modelId,
    history,
    onToken: (token) => process.stdout.write(token)
  });
}

async function answerWithProvider(
  modelSrc: string,
  history: ChatMessage[],
  delegate: QvacDelegateOptions
) {
  const modelManager = new ModelManager();
  const runtime = new QvacRuntimeService();
  const delegated = await modelManager.loadDelegatedCompletionModel({
    modelSrc,
    modelConfig: {
      ctx_size: 2048
    },
    delegate
  });

  console.log(`delegatedModelId=${delegated.modelId}`);
  return runtime.runCompletion({
    modelId: delegated.modelId,
    history,
    onToken: (token) => process.stdout.write(token)
  });
}

async function runDay5StateSmoke() {
  loadEnvFile();

  const modelSrc = requiredEnv("SFC_LOCAL_LLM_MODEL_SRC");
  const query =
    process.argv.slice(2).join(" ").trim() ||
    process.env.SFC_DAY5_QUERY ||
    "Someone has severe bleeding after an industrial accident. What should I do first?";

  const delegate = buildDelegateOptions();
  const state = new DelegationStateService();

  console.log("Day 5 state machine and dual-track RAG smoke test");
  console.log(`Query: ${query}`);
  console.log("Starting background-style heartbeat probe before routing user request...");

  await state.probeProvider(delegate);
  console.log(`cachedStatus=${state.snapshot.status}`);
  console.log(`cachedReason=${state.snapshot.reason}`);
  console.log("Routing request from cached state without a new network probe.");

  const sops = loadGoldenSops();
  const useProvider = state.shouldUseProvider() && delegate;
  const matches = searchGoldenSops(query, sops, useProvider ? 5 : 3);

  if (matches.length === 0) {
    throw new Error(`No SOP matched query: ${query}`);
  }

  console.log(`selectedTrack=${useProvider ? "provider" : "local"}`);
  console.log("Retrieved SOPs:");

  for (const { sop, score } of matches) {
    console.log(`- ${sop.id} score=${score} severity=${sop.severity} title=${sop.title}`);
  }

  let answerStatus = "unknown";

  if (useProvider) {
    try {
      const result = await answerWithProvider(modelSrc, buildHistory(query, matches, "provider"), delegate);
      answerStatus = result.status;
      console.log(`\nproviderAnswerStatus=${result.status}`);
    } catch (error) {
      console.error("\nProvider answer failed after Ready state. Switching to local fallback.");
      console.error(error);
      state.update("Fallback_Local", "Provider answer failed after cached Ready", delegate.providerPublicKey);
      const fallbackMatches = searchGoldenSops(query, sops, 3);
      const result = await answerWithLocal(modelSrc, buildHistory(query, fallbackMatches, "local"));
      answerStatus = result.status;
      console.log(`\nfallbackAnswerStatus=${result.status}`);
    }
  } else {
    const result = await answerWithLocal(modelSrc, buildHistory(query, matches, "local"));
    answerStatus = result.status;
    console.log(`\nlocalAnswerStatus=${result.status}`);
  }

  if (answerStatus !== "completed") {
    throw new Error(`Expected Day 5 answer to complete, got ${answerStatus}.`);
  }

  console.log(`finalStatus=${state.snapshot.status}`);
  console.log("Day 5 state machine and dual-track RAG smoke passed");
}

runDay5StateSmoke().catch((error: unknown) => {
  console.error("Day 5 state machine and dual-track RAG smoke failed");
  console.error(error);
  process.exitCode = 1;
});
