Sovereign Field Copilot
Local-first AI field assistant for rescue, rural healthcare, industrial inspection, and disaster response.
面向救援、基层医疗、工业巡检与灾害现场的本地优先 AI 作业助手。
  中文简介：Sovereign Field Copilot 是一个"本地优先"（local-first）的现场作业 AI 助手 MVP：在完全离线或弱网环境下，串联本地 LLM、语音转写与离线 Golden SOP 知识库，为现场人员提供强制溯源、高风险操作需人工确认的操作指引，并将交接报告持久化在本地设备。项目全程不依赖任何云端模型 API。
Highlights / 核心特性
      🔌 Local-first
      全程可离线运行：本地 GGUF 大模型 + 本地 Whisper 转写，零云端模型依赖
      📖 Forced source grounding
      Golden SOP 离线 RAG，回答强制附带 SOP 出处，不凭空生成
      ⚠️ Human-in-the-loop
      高风险操作必须人工确认后才输出，符合现场安全规范
      🔁 Dual-track routing
      缓存 Provider 健康状态（Ready / Fallback_Local），请求路径中不做同步网络探测
      💾 Crash-safe persistence
      SQLite WAL 持久化 + JSON 原子写降级；AI 生成的报告强制标注"需人工复核"
      ✅ Phased validation
      7 阶段冒烟测试覆盖完整关键路径
Architecture / 运行架构
现场人员语音输入（whispercpp-transcription 分块转写，不阻塞 JS 线程）或键入文本
领域层从 fixtures/golden-sops.json 检索本地 SOP 知识（完全离线）
委托状态机读取缓存的 Provider 健康状态
Provider 就绪 → 委托推理（QVAC peer delegation）；不可用 → 本地 LLM + SOP 上下文兜底
交接报告本地持久化（SQLite WAL / JSON 原子写），始终标注 AI 生成 + 需人工复核
详细设计见 architecture.md ｜ 演示流程见 demo-script.md ｜ 发布自检见 submission-checklist.md
Tech Stack / 技术栈
Runtime: Node.js ≥ 22.17 · TypeScript 5.8
Inference: QVAC SDK v0.11（llamacpp-completion）· 本地 GGUF 模型（llama.cpp）
Voice: whispercpp-transcription 分块转写（MVP 刻意避开实时麦克风流）
Storage: SQLite WAL（node:sqlite）+ JSON 原子写降级
工程纪律: 全程规避废弃 QVAC 接口（modelType: "llm"、.tokenStream、completion .text 捷径）
Quick Start / 快速开始
cp .env.example .env.local   # 将 SFC_LOCAL_LLM_MODEL_SRC 指向你本地的 GGUF 模型路径
npm install --ignore-scripts
npm run day1:smoke
预期输出：Model loaded → status=completed → cancelStatus=cancelled → Day 1 smoke passed
Phased Validation / 七阶段验证
      阶段
      命令
      验证内容
      1 · 本地 LLM
      npm run day1:smoke
      模型加载、流式补全、请求取消（cancel({ requestId })）
      2 · 语音链路
      npm run day2:voice
      分块转写 → 本地 LLM 全链路（需配 SFC_LOCAL_TRANSCRIPTION_MODEL_SRC）
      3 · 离线 RAG
      npm run day3:rag
      Golden SOP 检索、强制溯源、高风险人工确认
      4 · 委托预热
      npm run day4:provider + npm run day4:warmup
      Provider 心跳、委托模型加载、预热、本地降级路径
      5 · 状态机路由
      npm run day5:state
      缓存路由 Ready/Fallback_Local 双轨 RAG
      6 · 报告持久化
      npm run day6:report
      SOP 接地交接报告、SQLite WAL / JSON 降级
      7 · 发布自检
      npm run day7:check
      源码/文档/脚本完备性、废弃 API 模式扫描
支持自定义查询：
npm run day3:rag -- "chemical splash in eyes what should I do"
npm run day5:state -- "electrical injury person down what should I do"
npm run day6:report -- "handoff report for chemical splash in eyes"
Day 2 / 4 所需环境变量（转写模型路径、采样音频、SFC_PROVIDER_PUBLIC_KEY 等）见 .env.example。
Reliability & Privacy / 可靠性与隐私边界
语音采用分块转写，避免阻塞 JS 线程
Provider 预热在演示前完成，规避 DHT 冷启动延迟
状态机在请求处理路径中从不做同步网络探测
现场提示词、SOP 上下文、转写文本、补全结果与报告永不离开本地/受信设备
License
MIT — 详见 LICENSE。
