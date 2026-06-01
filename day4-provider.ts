import { startQVACProvider } from "@qvac/sdk";
import { loadEnvFile } from "./env.js";

interface QvacProviderHandle {
  publicKey?: string;
  providerPublicKey?: string;
  close?: () => Promise<void> | void;
}

const startProvider = startQVACProvider as unknown as (
  options?: Record<string, unknown>
) => Promise<QvacProviderHandle> | QvacProviderHandle;

function buildProviderOptions(): Record<string, unknown> {
  const topic = process.env.SFC_PROVIDER_TOPIC;

  return topic ? { topic } : {};
}

async function runProvider() {
  loadEnvFile();

  console.log("Day 4 QVAC provider");
  console.log("Starting provider. Keep this terminal open during warm-up and demo.");

  const provider = await startProvider(buildProviderOptions());
  const publicKey = provider.publicKey ?? provider.providerPublicKey;

  console.log("Provider started");
  console.log(`providerPublicKey=${publicKey ?? "unknown"}`);

  if (!publicKey) {
    console.log("If the SDK printed a provider key above, copy that value into SFC_PROVIDER_PUBLIC_KEY.");
  }

  process.on("SIGINT", async () => {
    console.log("\nStopping provider...");
    await provider.close?.();
    process.exit(0);
  });

  await new Promise(() => undefined);
}

runProvider().catch((error: unknown) => {
  console.error("Day 4 provider failed");
  console.error(error);
  process.exitCode = 1;
});

