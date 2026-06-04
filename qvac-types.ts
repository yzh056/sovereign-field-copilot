export const QVAC_MODEL_TYPES = {
  completion: "llamacpp-completion",
  transcription: "whispercpp-transcription"
} as const;

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type QvacOperation<T> = Promise<T> & {
  requestId: string;
};

export interface QvacDelegateOptions {
  providerPublicKey: string;
  topic?: string;
  timeout?: number;
  healthCheckTimeout?: number;
  fallbackToLocal?: boolean;
  forceNewConnection?: boolean;
}

export interface QvacLoadModelOptions {
  modelSrc: string;
  modelType: string;
  modelConfig?: Record<string, unknown>;
  delegate?: QvacDelegateOptions;
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

export type QvacTranscribeOperation = Promise<string> & {
  requestId?: string;
};

export interface QvacTranscribeOptions {
  modelId: string;
  audioChunk: string | Buffer;
  prompt?: string;
}

export type DelegationStatus = "Cold" | "Warming" | "Ready" | "Degraded" | "Fallback_Local";

export interface DelegationStateSnapshot {
  status: DelegationStatus;
  updatedAt: string;
  providerPublicKey?: string;
  reason?: string;
}
