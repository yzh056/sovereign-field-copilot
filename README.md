# Sovereign Field Copilot: Day 1 Clean MVP

This is the clean Day 1 proof for Sovereign Field Copilot.

It verifies the local QVAC AI core before adding mobile audio, RAG, or P2P delegation.

## What Day 1 Proves

- Loads a local Llama GGUF model with QVAC SDK.
- Uses the QVAC v0.11 canonical model type: `llamacpp-completion`.
- Streams completion through `run.events`.
- Awaits `run.final`.
- Prints model-load and completion `requestId`.
- Verifies interruption with `cancel({ requestId })`.

## Run

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

## API Rules

This Day 1 build intentionally avoids deprecated QVAC surfaces:

- No `modelType: "llm"`.
- No `.tokenStream`.
- No completion `.text` shortcut.

