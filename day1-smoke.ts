import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ModelManager } from "./model-manager.js";
import { QvacRuntimeService } from "./qvac-runtime-service.js";
import { QVAC_MODEL_TYPES, type ChatMessage } from "./qvac-types.js";

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

function requireModelPath(): string {
  const modelSrc = process.env.SFC_LOCAL_LLM_MODEL_SRC;

  if (modelSrc) {
    return modelSrc;
  }

  throw new Error(
    [
      "Missing SFC_LOCAL_LLM_MODEL_SRC.",
      "Copy .env.example to .env.local and set it to your verified Linux-native GGUF path."
    ].join(" ")
  );
}

async function runDay1Smoke() {
  loadEnvFile();

  const modelSrc = requireModelPath();
  const modelManager = new ModelManager();
  const runtime = new QvacRuntimeService();

  console.log("Day 1 QVAC smoke test");
  console.log(`Canonical modelType: ${QVAC_MODEL_TYPES.completion}`);
  console.log(`Model source: ${modelSrc}`);

  const loaded = await modelManager.loadCompletionModel({
    modelSrc,
    modelConfig: {
      ctx_size: 2048
    },
    onProgress: (progress) => {
      console.log("load progress", progress);
    }
  });

  console.log("Model loaded");
  console.log(`modelId=${loaded.modelId}`);
  console.log(`loadRequestId=${loaded.requestId}`);

  const history: ChatMessage[] = [
    {
      role: "system",
      content: "You are a concise local-first field safety assistant."
    },
    {
      role: "user",
      content: "Day 1 smoke check: say READY and mention local QVAC inference."
    }
  ];

  const firstRun = await runtime.runCompletion({
    modelId: loaded.modelId,
    history,
    onToken: (token) => process.stdout.write(token)
  });

  console.log("\nCompletion finished");
  console.log(`completionRequestId=${firstRun.requestId}`);
  console.log(`status=${firstRun.status}`);

  const cancellableRun = runtime.runCompletion({
    modelId: loaded.modelId,
    history: [
      {
        role: "system",
        content: "You are testing cancellation. Produce a long numbered list unless cancelled."
      },
      {
        role: "user",
        content: "Write 200 short numbered safety checklist items."
      }
    ],
    onToken: () => undefined
  });

  await new Promise((resolve) => setTimeout(resolve, 150));
  await runtime.interruptActive();

  const cancelResult = await cancellableRun.catch((error: unknown) => {
    console.log("Cancellation surfaced as SDK error, which is acceptable for Day 1.");
    return {
      status: "cancelled" as const,
      outputText: "",
      requestId: error instanceof Error ? error.message : "unknown"
    };
  });

  console.log("Cancellation check finished");
  console.log(`cancelStatus=${cancelResult.status}`);

  if (cancelResult.status !== "cancelled") {
    throw new Error("Expected the long completion to be cancelled before Day 1 smoke passes.");
  }

  console.log("Day 1 smoke passed");
}

runDay1Smoke().catch((error: unknown) => {
  console.error("Day 1 smoke failed");
  console.error(error);
  process.exitCode = 1;
});

