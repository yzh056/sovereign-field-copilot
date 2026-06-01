import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export function findUp(fileName: string, startDirectory = process.cwd()): string | undefined {
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

export function loadEnvFile(fileName = ".env.local"): void {
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

export function requiredEnv(name: string): string {
  const value = process.env[name];

  if (value) {
    return value;
  }

  throw new Error(`Missing ${name}. Set it in .env.local.`);
}

