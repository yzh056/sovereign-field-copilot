# Sovereign Field Copilot: Clean MVP

This is the clean MVP proof for Sovereign Field Copilot.

It verifies the local QVAC AI core first, then adds a chunk-based voice loop.

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

## API Rules

This clean MVP intentionally avoids deprecated QVAC surfaces:

- No `modelType: "llm"`.
- No `.tokenStream`.
- No completion `.text` shortcut.
- No real-time Expo microphone streaming in the MVP.
- No cloud model API dependency.
