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

## API Rules

This Day 1 build intentionally avoids deprecated QVAC surfaces:

- No `modelType: "llm"`.
- No `.tokenStream`.
- No completion `.text` shortcut.
- No real-time Expo microphone streaming in the MVP.
