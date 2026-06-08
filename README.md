# Sovereign Field Copilot: Clean MVP

This is the clean MVP proof for Sovereign Field Copilot.

It verifies the local QVAC AI core first, then adds a chunk-based voice loop, offline RAG, delegated inference warm-up, cached routing, and local field report persistence.

## Day 1: Local LLM Smoke

- Loads a local Llama GGUF model with QVAC SDK.
- Uses the QVAC v0.11 canonical model type: `llamacpp-completion`.
- Streams completion through `run.events`.
- Awaits `run.final`.
- Prints model-load and completion `requestId`.
- Verifies interruption with `cancel({ requestId })`.

## Day 2: Chunk-Based Voice Loop

- Loads a local transcription model with `whispercpp-transcription`.
- Uses `transcribe()` with a complete audio file path.
- Sends the transcript into the local LLM.
- Keeps the MVP away from real-time microphone streaming.

## Day 3: Local Golden SOP RAG

- Loads a tiny local golden SOP dataset from `fixtures/golden-sops.json`.
- Retrieves the most relevant SOPs without network access.
- Sends the retrieved SOP context into the local QVAC LLM.
- Requires source citations and human confirmation for high-risk answers.

## Day 4: Delegated Inference Warm-Up

- Starts a trusted QVAC provider process on a laptop or edge workstation.
- Lets the consumer run `heartbeat` before demo time.
- Loads a delegated completion model through `providerPublicKey`.
- Runs a short warm-up completion to avoid live-demo cold start.
- Falls back to local completion if provider connection fails.

## Day 5: State Machine and Dual-Track RAG

- Probes Provider health before routing the user request.
- Caches status as `Ready` or `Fallback_Local`.
- Routes the request from cached state without a new network probe.
- Uses delegated inference when Provider is ready.
- Falls back to local golden SOP RAG when Provider is missing or fails.

## Day 6: Local Field Report Persistence

- Generates an AI draft, then stores a deterministic SOP-grounded handoff report.
- Marks the report as AI-generated and requiring human review.
- Does not persist invented vitals, patient counts, locations, or completed actions.
- Stores it locally with SQLite WAL when available.
- Falls back to JSON atomic writes when `node:sqlite` is not available.
- Keeps generated reports out of Git through `.sfc/`.

## Day 7: Submission Readiness Check

- Verifies the expected source files and docs exist.
- Checks the npm scripts needed for the demo.
- Scans source code for deprecated QVAC API patterns.
- Confirms the project is ready to share without local secrets or models.

## Run Day 1

```bash
cp .env.example .env.local
# Edit SFC_LOCAL_LLM_MODEL_SRC to your real Linux-native GGUF path.
npm install --ignore-scripts
npm run day1:smoke
```

Example model path:

```bash
SFC_LOCAL_LLM_MODEL_SRC=/home/yzhh/.qvac/models/f2bade0bc5cd4a8c_Llama-3.2-1B-Instruct-Q4_0.gguf
```

## Expected Success Output

```text
Model loaded
status=completed
cancelStatus=cancelled
Day 1 smoke passed
```

## Run Day 2

Add these values to `.env.local`:

```bash
SFC_LOCAL_TRANSCRIPTION_MODEL_SRC=/home/you/.qvac/models/your-whisper-model.bin
SFC_SAMPLE_AUDIO_PATH=/home/you/qvac-linux/audio/sample.wav
```

Then run:

```bash
npm run day2:voice
```

## Run Day 3

Use the same `.env.local` from Day 1, then run:

```bash
npm run day3:rag
```

You can also pass a custom field query:

```bash
npm run day3:rag -- "chemical splash in eyes what should I do"
```

Expected success output:

```text
Retrieved SOPs:
...
status=completed
Day 3 local golden RAG smoke passed
```

## Run Day 4

Terminal A, provider side:

```bash
npm run day4:provider
```

Copy the printed provider public key into `.env.local`:

```bash
SFC_PROVIDER_PUBLIC_KEY=your-provider-public-key
SFC_PROVIDER_HEALTH_TIMEOUT_MS=3000
SFC_PROVIDER_WARMUP_PROMPT=Reply with OK.
```

Terminal B, consumer warm-up side:

```bash
npm run day4:warmup
```

Expected success output:

```text
Heartbeat completed
delegatedModelId=...
status=Ready
Day 4 delegated warm-up passed
```

If the provider is unavailable, the command should fall back:

```text
status=Fallback_Local
Day 4 fallback local path passed
```

## Run Day 5

Keep the Provider terminal running if you want the `Ready` path:

```bash
npm run day4:provider
```

Then in a second terminal:

```bash
npm run day5:state
```

Custom query:

```bash
npm run day5:state -- "electrical injury person down what should I do"
```

Expected outputs:

```text
cachedStatus=Ready
selectedTrack=provider
Day 5 state machine and dual-track RAG smoke passed
```

or, when Provider is unavailable:

```text
cachedStatus=Fallback_Local
selectedTrack=local
Day 5 state machine and dual-track RAG smoke passed
```

## Run Day 6

Use the same `.env.local` from Day 1, then run:

```bash
npm run day6:report
```

Custom report request:

```bash
npm run day6:report -- "handoff report for chemical splash in eyes"
```

Expected success output:

```text
answerStatus=completed
reportStoreMode=sqlite-wal
Day 6 report persistence smoke passed
```

If the runtime does not expose `node:sqlite`, `reportStoreMode=json-atomic` is also valid.

## Run Day 7

```bash
npm run day7:check
```

Expected success output:

```text
Day 7 submission self-check passed
```

## Demo Docs

- `docs/architecture.md`
- `docs/demo-script.md`
- `docs/submission-checklist.md`

## API Rules

This clean MVP intentionally avoids deprecated QVAC surfaces:

- No `modelType: "llm"`.
- No `.tokenStream`.
- No completion `.text` shortcut.
- No real-time Expo microphone streaming in the MVP.
- No cloud model API dependency.
