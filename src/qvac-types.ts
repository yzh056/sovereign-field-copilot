export const QVAC_MODEL_TYPES = {
  completion: "llamacpp-completion"
} as const;

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type QvacOperation<T> = Promise<T> & {
  requestId: string;
};

export interface QvacLoadModelOptions {
  modelSrc: string;
  modelType: string;
  modelConfig?: Record<string, unknown>;
  onProgress?: (progress: unknown) => void;
}

export interface ModelLoadResult {
  modelId: string;
  requestId: string;
  modelType: string;
}

export interface QvacCompletionEvent {
  type: string;
  text?: string;
  stopReason?: string;
}

export interface QvacCompletionRun {
  requestId: string;
  events: AsyncIterable<QvacCompletionEvent>;
  final: Promise<unknown>;
}

export interface QvacCompletionOptions {
  modelId: string;
  history: ChatMessage[];
  stream: boolean;
  generationParams?: Record<string, unknown>;
}

