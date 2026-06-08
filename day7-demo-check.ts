import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");

function assertFile(path: string): void {
  if (!existsSync(join(root, path))) {
    throw new Error(`Missing required file: ${path}`);
  }
}

function assertScript(packageJson: { scripts?: Record<string, string> }, name: string): void {
  if (!packageJson.scripts?.[name]) {
    throw new Error(`Missing npm script: ${name}`);
  }
}

function assertNoDeprecatedApis(): void {
  const srcFiles = [
    "src/model-manager.ts",
    "src/qvac-runtime-service.ts",
    "src/day1-smoke.ts",
    "src/day2-voice-smoke.ts",
    "src/day3-rag-smoke.ts",
    "src/day4-warmup.ts",
    "src/day5-state-smoke.ts",
    "src/day6-report-smoke.ts"
  ];
  const deprecatedPatterns = [
    "modelType: " + "\"llm\"",
    "modelType: " + "'llm'",
    "token" + "Stream",
    "transcribe" + "Stream"
  ];

  for (const file of srcFiles) {
    const body = readFileSync(join(root, file), "utf8");

    for (const pattern of deprecatedPatterns) {
      if (body.includes(pattern)) {
        throw new Error(`Deprecated QVAC API pattern "${pattern}" found in ${file}`);
      }
    }
  }
}

function runDay7DemoCheck() {
  console.log("Day 7 submission readiness self-check");

  const requiredFiles = [
    "README.md",
    "LICENSE",
    ".env.example",
    "fixtures/golden-sops.json",
    "docs/architecture.md",
    "docs/demo-script.md",
    "docs/submission-checklist.md",
    "src/day1-smoke.ts",
    "src/day2-voice-smoke.ts",
    "src/day3-rag-smoke.ts",
    "src/day4-provider.ts",
    "src/day4-warmup.ts",
    "src/day5-state-smoke.ts",
    "src/day6-report-smoke.ts",
    "src/report-store.ts"
  ];

  for (const file of requiredFiles) {
    assertFile(file);
    console.log(`ok file ${file}`);
  }

  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };

  for (const script of [
    "day1:smoke",
    "day2:voice",
    "day3:rag",
    "day4:warmup",
    "day5:state",
    "day6:report",
    "day7:check",
    "typecheck"
  ]) {
    assertScript(packageJson, script);
    console.log(`ok script ${script}`);
  }

  assertNoDeprecatedApis();
  console.log("ok qvac api canonical patterns");
  console.log("Day 7 submission self-check passed");
}

try {
  runDay7DemoCheck();
} catch (error) {
  console.error("Day 7 submission self-check failed");
  console.error(error);
  process.exitCode = 1;
}
