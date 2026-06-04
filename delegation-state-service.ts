import { heartbeat } from "@qvac/sdk";
import type {
  DelegationStateSnapshot,
  DelegationStatus,
  QvacDelegateOptions
} from "./qvac-types.js";

const heartbeatQvac = heartbeat as unknown as (options: {
  delegate: QvacDelegateOptions;
}) => Promise<unknown>;

export class DelegationStateService {
  private state: DelegationStateSnapshot = {
    status: "Cold",
    updatedAt: new Date(0).toISOString(),
    reason: "State machine created"
  };

  get snapshot(): DelegationStateSnapshot {
    return this.state;
  }

  update(status: DelegationStatus, reason?: string, providerPublicKey?: string): DelegationStateSnapshot {
    this.state = {
      status,
      updatedAt: new Date().toISOString(),
      providerPublicKey,
      reason
    };

    return this.state;
  }

  async probeProvider(delegate?: QvacDelegateOptions): Promise<DelegationStateSnapshot> {
    if (!delegate?.providerPublicKey) {
      return this.update("Fallback_Local", "No provider public key configured");
    }

    this.update("Warming", "Heartbeat probe started", delegate.providerPublicKey);

    try {
      await heartbeatQvac({ delegate });
      return this.update("Ready", "Provider heartbeat completed", delegate.providerPublicKey);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Provider heartbeat failed";
      return this.update("Fallback_Local", reason, delegate.providerPublicKey);
    }
  }

  shouldUseProvider(): boolean {
    return this.state.status === "Ready";
  }
}

