import { cancel, completion } from "@qvac/sdk";
import type {
  ChatMessage,
  QvacCompletionOptions,
  QvacCompletionRun
} from "./qvac-types.js";

const cancelQvac = cancel as unknown as (options: { requestId: string }) => Promise<unknown>;
const completeQvac = completion as unknown as (options: QvacCompletionOptions) => QvacCompletionRun;

export interface CompletionRunOptions {
  modelId: string;
  history: ChatMessage[];
  generationParams?: Record<string, unknown>;
  onToken?: (token: string) => void;
}

export interface CompletionRunResult {
  status: "completed" | "cancelled";
  requestId: string;
  outputText: string;
  final?: unknown;
}

export class QvacRuntimeService {
  private activeRequestId?: string;
  private sequence = 0;

  async interruptActive(): Promise<void> {
    if (!this.activeRequestId) {
      return;
    }

    await cancelQvac({ requestId: this.activeRequestId }).catch(() => undefined);
    this.activeRequestId = undefined;
  }

  async runCompletion(options: CompletionRunOptions): Promise<CompletionRunResult> {
    await this.interruptActive();

    const sequence = ++this.sequence;
    const run = completeQvac({
      modelId: options.modelId,
      history: options.history,
      stream: true,
      generationParams: options.generationParams
    });

    this.activeRequestId = run.requestId;

    let cancelled = false;
    let outputText = "";

    try {
      for await (const event of run.events) {
        if (event.type === "contentDelta" && event.text) {
          outputText += event.text;
          options.onToken?.(event.text);
        }

        if (event.type === "completionDone" && event.stopReason === "cancelled") {
          cancelled = true;
        }
      }

      if (cancelled) {
        return {
          status: "cancelled",
          outputText,
          requestId: run.requestId
        };
      }

      return {
        status: "completed",
        final: await run.final,
        outputText,
        requestId: run.requestId
      };
    } finally {
      if (this.sequence === sequence) {
        this.activeRequestId = undefined;
      }
    }
  }
}

