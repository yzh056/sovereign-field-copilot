import { loadModel } from "@qvac/sdk";
import {
  QVAC_MODEL_TYPES,
  type ModelLoadResult,
  type QvacDelegateOptions,
  type QvacLoadModelOptions,
  type QvacOperation
} from "./qvac-types.js";

const loadQvacModel = loadModel as unknown as (
  options: QvacLoadModelOptions
) => QvacOperation<string>;

export interface LoadCompletionModelOptions {
  modelSrc: string;
  modelConfig?: Record<string, unknown>;
  onProgress?: (progress: unknown) => void;
}

export interface LoadDelegatedCompletionModelOptions extends LoadCompletionModelOptions {
  delegate: QvacDelegateOptions;
}

export class ModelManager {
  async loadCompletionModel(options: LoadCompletionModelOptions): Promise<ModelLoadResult> {
    const operation = loadQvacModel({
      modelSrc: options.modelSrc,
      modelType: QVAC_MODEL_TYPES.completion,
      modelConfig: options.modelConfig,
      onProgress: options.onProgress
    });

    const modelId = await operation;

    return {
      modelId,
      modelType: QVAC_MODEL_TYPES.completion,
      requestId: operation.requestId
    };
  }

  async loadTranscriptionModel(options: LoadCompletionModelOptions): Promise<ModelLoadResult> {
    const operation = loadQvacModel({
      modelSrc: options.modelSrc,
      modelType: QVAC_MODEL_TYPES.transcription,
      modelConfig: options.modelConfig,
      onProgress: options.onProgress
    });

    const modelId = await operation;

    return {
      modelId,
      modelType: QVAC_MODEL_TYPES.transcription,
      requestId: operation.requestId
    };
  }

  async loadDelegatedCompletionModel(
    options: LoadDelegatedCompletionModelOptions
  ): Promise<ModelLoadResult> {
    const operation = loadQvacModel({
      modelSrc: options.modelSrc,
      modelType: QVAC_MODEL_TYPES.completion,
      modelConfig: options.modelConfig,
      delegate: options.delegate,
      onProgress: options.onProgress
    });

    const modelId = await operation;

    return {
      modelId,
      modelType: QVAC_MODEL_TYPES.completion,
      requestId: operation.requestId
    };
  }
}
