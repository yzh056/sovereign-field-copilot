import { loadModel } from "@qvac/sdk";
import {
  QVAC_MODEL_TYPES,
  type ModelLoadResult,
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
}

