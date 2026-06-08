# Sovereign Field Copilot Architecture

Sovereign Field Copilot is a local-first emergency assistant for constrained field environments. The MVP proves the critical path with QVAC SDK v0.11, local Llama completion, chunk-based audio transcription, offline golden SOP retrieval, warm delegated inference, and local field report persistence.

## Runtime Flow

1. The operator gives a push-to-talk audio command or typed field query.
2. The app uses chunk-based transcription with `whispercpp-transcription`.
3. The domain layer retrieves compact local SOPs from `fixtures/golden-sops.json`.
4. The delegation state machine reads cached Provider status.
5. If Provider is `Ready`, completion is delegated through QVAC peer delegation.
6. If Provider is unavailable, completion stays local with golden SOP context.
7. Day 6 stores a human-reviewable handoff report locally.

## QVAC API Rules

- Completion models use `llamacpp-completion`.
- Transcription models use `whispercpp-transcription`.
- Completion consumes `run.events` and `run.final`.
- Cancellation uses request lifecycle state through `cancel({ requestId })`.
- The MVP avoids `modelType: "llm"`, `.tokenStream`, completion `.text` shortcuts, and real-time Expo audio streaming.

## Reliability Choices

- Voice is chunk-based to avoid blocking the React Native JS thread.
- Provider warm-up is run before demo to avoid DHT cold-start delay on stage.
- The state machine never probes the network synchronously during request handling.
- The local golden SOP dataset remains available in full offline mode.
- Field reports are stored with SQLite WAL when available, with JSON atomic-write fallback.

## Privacy Boundary

The MVP has no cloud model dependency. Field prompts, SOP context, transcription, completion, and reports stay on local/edge devices or on the trusted QVAC delegated Provider path.
