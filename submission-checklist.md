# Submission Checklist

- [ ] Public GitHub repository is available.
- [ ] `LICENSE` is present.
- [ ] `README.md` explains Day 1 through Day 7.
- [ ] `.env.example` contains placeholders only.
- [ ] No `.env.local`, models, reports, logs, or `node_modules` are uploaded.
- [ ] `npm run typecheck` passes.
- [ ] `npm run day1:smoke` passes.
- [ ] `npm run day2:voice` passes with a local sample audio file.
- [ ] `npm run day3:rag` passes.
- [ ] `npm run day4:warmup` passes in either Ready or fallback mode.
- [ ] `npm run day5:state` passes in fallback mode and, when Provider is warm, Ready mode.
- [ ] `npm run day6:report` persists a local report.
- [ ] `npm run day7:check` passes.

## Upload Exclusions

Do not upload:

- `.env.local`
- `.sfc/`
- `node_modules/`
- local `.gguf` or `.bin` model files
- QVAC worker logs
