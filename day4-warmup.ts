import { heartbeat } from "@qvac/sdk";
import { loadEnvFile, requiredEnv } from "./env.js";
import { ModelManager } from "./model-manager.js";
import { QvacRuntimeService } from "./qvac-runtime-service.js";
import type { ChatMessage, DelegationStatus, QvacDelegateOptions } from "./qvac-types.js";

const heartbeatQvac = heartbeat as unknown as (options: {
  delegate: QvacDelegateOptions;
}) => Promise<unknown>;

function optionalNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildDelegateOptions(): QvacDelegateOptions {
  const providerPublicKey = requiredEnv("SFC_PROVIDER_PUBLIC_KEY");
  const topic = process.env.SFC_PROVIDER_TOPIC || undefined;
  const healthCheckTimeout = optionalNumber(process.env.SFC_PROVIDER_HEALTH_TIMEOUT_MS, 3000);

  return {
    providerPublicKey,
    topic,
    timeout: healthCheckTimeout,
    healthCheckTimeout,
    fallbackToLocal: true,
    forceNewConnection: false
  };
}

async function runCompletion(modelId: string, label: string) {
  const runtime = new QvacRuntimeService();
  const warmupPrompt = process.env.SFC_PROVIDER_WARMUP_PROMPT || "Reply with OK.";
  const history: ChatMessage[] = [
    {
      role: "system",
      content: "You are a concise QVAC warm-up checker. Reply briefly."
    },
    {
      role: "user",
      content: warmupPrompt
    }
  ];

  console.log(`${label} completion:`);
  const result = await runtime.runCompletion({
    modelId,
    history,
    onToken: (token) => process.stdout.write(token)
  });

  console.log(`\n${label} status=${result.status}`);
  return result;
}

async function runDay4Warmup() {
  loadEnvFile();

  const modelSrc = requiredEnv("SFC_LOCAL_LLM_MODEL_SRC");
  const modelManager = new ModelManager();
  let status: DelegationStatus = "Cold";

  console.log("Day 4 delegated inference warm-up");
  console.log("Goal: establish provider connection before demo, then reuse the warm path.");

  try {
    status = "Warming";
    const delegate = buildDelegateOptions();

    console.log(`status=${status}`);
    console.log(`providerPublicKey=${delegate.providerPublicKey}`);
    console.log("Running provider heartbeat...");
    await heartbeatQvac({ delegate });
    console.log("Heartbeat completed");

    console.log("Loading delegated completion model...");
    const delegated = await modelManager.loadDelegatedCompletionModel({
      modelSrc,
      modelConfig: {
        ctx_size: 2048
      },
      delegate
    });

    console.log(`delegatedModelId=${delegated.modelId}`);
    console.log(`delegatedLoadRequestId=${delegated.requestId}`);

    await runCompletion(delegated.modelId, "delegated warm-up");

    status = "Ready";
    console.log(`status=${status}`);
    console.log("Day 4 delegated warm-up passed");
  } catch (error) {
    console.error("Delegated warm-up failed. Falling back to local completion.");
    console.error(error);

    status = "Fallback_Local";
    console.log(`status=${status}`);

    const local = await modelManager.loadCompletionModel({
      modelSrc,
      modelConfig: {
        ctx_size: 2048
      }
    });

    console.log(`localModelId=${local.modelId}`);
    await runCompletion(local.modelId, "fallback local");
    console.log("Day 4 fallback local path passed");
  }
}

runDay4Warmup().catch((error: unknown) => {
  console.error("Day 4 warm-up failed");
  console.error(error);
  process.exitCode = 1;
});

