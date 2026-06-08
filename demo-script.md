# Demo Script

## 30-Second Pitch

Sovereign Field Copilot is a local-first field emergency assistant. It helps responders get immediate SOP-grounded guidance when cloud connectivity is unavailable or unsafe, and it can delegate heavier inference to a trusted nearby laptop before falling back to phone-local golden SOPs.

## 3-Minute Demo Path

1. Run `npm run day1:smoke` to show local QVAC Llama completion and request cancellation.
2. Run `npm run day2:voice` to show chunk-based audio transcription into an emergency response.
3. Run `npm run day3:rag` to show offline golden SOP retrieval with source IDs.
4. Start Provider with `npm run day4:provider`.
5. Run `npm run day4:warmup` to show the warm delegated path before the live demo.
6. Run `npm run day5:state` to show cached state routing into Provider or local fallback.
7. Run `npm run day6:report` to generate and persist a human-reviewable handoff report.
8. Run `npm run day7:check` to show the submission package is complete.

## Judge-Facing Proof Points

- No cloud model API is required.
- The SDK uses canonical QVAC v0.11 model types.
- The app supports local fallback when Provider is missing.
- The voice loop is intentionally chunk-based for Expo/mobile stability.
- Generated field reports are marked as AI-generated and require human review.
