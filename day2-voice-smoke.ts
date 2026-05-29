import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ModelManager } from "./model-manager.js";
import { QvacRuntimeService, type CompletionRunResult } from "./qvac-runtime-service.js";
import type { ModelLoadResult } from "./qvac-types.js";

interface VoiceLoopModels {
  completion: ModelLoadResult;
  transcription: ModelLoadResult;
}

interface VoiceLoopResult {
  transcript: string;
  answer: CompletionRunResult;
}

class VoiceLoopService {
  private models?: VoiceLoopModels;
  private readonly modelManager = new ModelManager();
  private readonly runtime = new QvacRuntimeService();

  async loadModels(config: {
    completionModelSrc: string;
    transcriptionModelSrc: string;
  }): Promise<VoiceLoopModels> {
    const completion = await this.modelManager.loadCompletionModel({
      modelSrc: config.completionModelSrc,
      modelConfig: {
        ctx_size: 2048
      }
    });

    const transcription = await this.modelManager.loadTranscriptionModel({
      modelSrc: config.transcriptionModelSrc
    });

    this.models = {
      completion,
      transcription
    };

    return this.models;
  }

  async handleAudioFile(audioFilePath: string): Promise<VoiceLoopResult> {
    if (!this.models) {
      throw new Error("VoiceLoopService models are not loaded.");
    }

    await this.runtime.interruptActive();

    const transcription = await this.runtime.transcribeFile(
      this.models.transcription.modelId,
      audioFilePath
    );

    const answer = await this.runtime.runCompletion({
      modelId: this.models.completion.modelId,
      history: [
        {
          role: "system",
          content:
            "You are Sovereign Field Copilot. Give concise, safety-first field guidance. Mention when human confirmation is required."
        },
        {
          role: "user",
          content: `Voice transcript: ${transcription.text}`
        }
      ],
      onToken: (token) => process.stdout.write(token)
    });

    return {
      transcript: transcription.text,
      answer
    };
  }
}

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

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (value) {
    return value;
  }

  throw new Error(`Missing ${name}. Set it in .env.local before running Day 2.`);
}

async function runDay2VoiceSmoke() {
  loadEnvFile();

  const completionModelSrc = requiredEnv("SFC_LOCAL_LLM_MODEL_SRC");
  const transcriptionModelSrc = requiredEnv("SFC_LOCAL_TRANSCRIPTION_MODEL_SRC");
  const sampleAudioPath = requiredEnv("SFC_SAMPLE_AUDIO_PATH");

  if (!existsSync(sampleAudioPath)) {
    throw new Error(`SFC_SAMPLE_AUDIO_PATH does not exist: ${sampleAudioPath}`);
  }

  console.log("Day 2 voice smoke test");
  console.log(`Completion model: ${completionModelSrc}`);
  console.log(`Transcription model: ${transcriptionModelSrc}`);
  console.log(`Sample audio: ${sampleAudioPath}`);

  const voiceLoop = new VoiceLoopService();
  const models = await voiceLoop.loadModels({
    completionModelSrc,
    transcriptionModelSrc
  });

  console.log("Models loaded");
  console.log(`completionModelId=${models.completion.modelId}`);
  console.log(`transcriptionModelId=${models.transcription.modelId}`);

  const result = await voiceLoop.handleAudioFile(sampleAudioPath);

  console.log("\nVoice loop finished");
  console.log(`transcript=${result.transcript}`);
  console.log(`answerStatus=${result.answer.status}`);

  if (!result.transcript.trim()) {
    throw new Error("Expected non-empty transcript.");
  }

  if (result.answer.status !== "completed") {
    throw new Error("Expected completion answer to finish successfully.");
  }

  console.log("Day 2 voice smoke passed");
}

runDay2VoiceSmoke().catch((error: unknown) => {
  console.error("Day 2 voice smoke failed");
  console.error(error);
  process.exitCode = 1;
});
