(() => {
  "use strict";

  // Keep the landing page readable when this optional enhancement script cannot
  // load, parse, or finish running. The HTML must never depend on JavaScript
  // just to show its primary content.
  const root = document.documentElement;
  const showStaticContent = () => root.classList.remove("has-js");
  window.addEventListener("error", showStaticContent);
  window.addEventListener("unhandledrejection", showStaticContent);
  root.classList.add("has-js");

  const translations = {
    zh: {
      "meta.title": "OmniFic — 在故事的无垠之境，与 AI 共写万千世界",
      "meta.description":
        "一个可以陪你完成百万字长篇的 AI 创作空间。本地优先，Agent 协作，让正文与设定在同一个工作台里共同生长。",
      "a11y.skip": "跳至主要内容",
      "a11y.primaryNav": "主要导航",
      "a11y.projectFacts": "项目特性",
      "a11y.requirements": "环境要求",
      "a11y.footerNav": "页脚导航",
      "nav.vision": "理念",
      "nav.workflow": "工作流",
      "nav.agentDemo": "Agent 演示",
      "nav.features": "能力",
      "nav.start": "开始使用",
      "nav.github": "GitHub",
      "hero.eyebrow": "本地优先 · 长篇创作 · Agent 协作",
      "hero.title": "在故事的无垠之境<br><span>与 AI 共写万千世界</span>",
      "hero.lead":
        "一个可以陪你完成百万字长篇的 AI 创作空间。",
      "hero.githubCta": "下载桌面版",
      "hero.startCta": "查看安装方式",
      "hero.factLocal": "数据默认存于本地",
      "hero.factOpen": "Apache 2.0 开源",
      "hero.scroll": "向下阅卷",
      "philosophy.mark": "创作理念",
      "philosophy.statement":
        "AI 不应只是隔着窗口回答问题。<br>它应当理解你的世界，记得故事走过的路，<br><em>并在你的许可下，真正参与创作。</em>",
      "philosophy.oneTitle": "资料进入故事",
      "philosophy.oneText": "正文、笔记、人物与世界书不再散落，让每一条设定成为可检索、可调用的创作上下文。",
      "philosophy.twoTitle": "Agent 进入工作流",
      "philosophy.twoText": "从规划、检索到修改章节，Agent 在明确权限与变更预览下完成真实任务。",
      "philosophy.threeTitle": "创作沉淀为记忆",
      "philosophy.threeText": "摘要、索引和持续任务保存长篇上下文，让下一次协作接续而非重启。",
      "workflow.mark": "创作循环",
      "workflow.title": "从一页灵感，<em>生长为完整世界</em>",
      "workflow.intro": "OmniFic 围绕长篇创作的真实循环设计，让资料、写作、Agent 与记忆持续相互滋养。",
      "workflow.gatherTitle": "收拢万象",
      "workflow.gatherText": "导入旧稿与资料，建立卷章、角色和世界观。",
      "workflow.createTitle": "落笔成章",
      "workflow.createText": "在多标签编辑器里持续写作，自动保存每一次推进。",
      "workflow.agentTitle": "协作推演",
      "workflow.agentText": "让 Agent 检索设定、续写章节，并清晰呈现工具调用。",
      "workflow.memoryTitle": "沉淀记忆",
      "workflow.memoryText": "用摘要与索引维持长上下文，让故事继续向前。",
      "demo.label": "模拟工作流 · 不连接后端",
      "demo.title": "看一次任务如何穿过<br><em>完整的 Agent 协作链路</em>",
      "demo.intro": "从持久化任务目标，到子 Agent 检索、草稿审阅、变更预览与审批写入。点击任意步骤，可以检查每个阶段发生了什么。",
      "demo.task": "续写第 22 章拍卖会，补足篇幅并保持萧炎设定一致",
      "demo.play": "播放",
      "demo.pause": "暂停",
      "demo.resume": "继续",
      "demo.replay": "重播",
      "demo.ready": "准备运行模拟任务",
      "demo.nodeTask": "任务目标",
      "demo.nodeMain": "主 Agent",
      "demo.nodeContext": "设定检索",
      "demo.nodeReview": "剧情审阅",
      "demo.nodeDraft": "章节写入",
      "demo.diffTitle": "第 22 章 · 拍卖会",
      "demo.diffContext": "萧炎的目光从玉盘上扫过，并未急着出价。",
      "demo.diffAddOne": "那股熟悉的药香极淡，却与药老方才描述的气息分毫不差。",
      "demo.diffAddTwo": "他压下心中的波澜，指尖在袖中轻轻一扣，等待真正的竞价开始。",
      "demo.approvalLabel": "等待工具审批",
      "demo.approvalText": "预览确认后才会写入章节；演示将在短暂停留后自动批准。",
      "demo.reject": "拒绝修改",
      "demo.approve": "批准写入",
      "demo.completeTitle": "任务完成",
      "demo.completeText": "章节已更新，摘要与检索索引进入刷新队列。",
      "demo.rejectedTitle": "修改已拒绝",
      "demo.rejectedText": "演示结束，没有数据被写入。可以重播或选择其他步骤。",
      "demo.stepGoal": "接收目标",
      "demo.stepPlan": "制定计划",
      "demo.stepDispatch": "分派任务",
      "demo.stepRetrieve": "检索上下文",
      "demo.stepDraft": "生成草稿",
      "demo.stepReview": "一致性审阅",
      "demo.stepApprove": "审批变更",
      "demo.stepSave": "完成写入",
      "demo.stageGoal": "任务目标已从持久化上下文恢复",
      "demo.stagePlan": "主 Agent 正在制定执行计划",
      "demo.stageDispatch": "正在分派设定检索与剧情审阅子任务",
      "demo.stageRetrieve": "子 Agent 正在并行检索章节、人物与世界书",
      "demo.stageDraft": "主 Agent 正在合并上下文并生成章节修改",
      "demo.stageReview": "审阅 Agent 正在检查人物与剧情一致性",
      "demo.stageApproval": "章节修改等待你的审批",
      "demo.stageComplete": "修改已批准并完成写入",
      "demo.stageRejected": "修改被拒绝，没有写入任何数据",
      "demo.logGoal": "已注入持久化任务目标与当前项目上下文",
      "demo.logPlan": "四步执行计划已生成并确认",
      "demo.logDispatchLore": "设定检索子任务进入运行状态",
      "demo.logDispatchReview": "剧情审阅子任务已进入队列",
      "demo.logSearch": "找到 6 处与拍卖会相关的正文片段",
      "demo.logCharacter": "已读取萧炎人物档案与当前阶段状态",
      "demo.logWorld": "已读取筑基灵液相关世界书条目",
      "demo.logDraft": "生成章节修改预览，新增 52 字",
      "demo.logReview": "人物设定与时间线检查完成，发现 0 处冲突",
      "demo.logApproval": "写入工具已暂停，等待用户审批",
      "demo.logComplete": "章节刷新事件已发出，检索索引进入队列",
      "demo.logRejected": "用户拒绝了工具调用，章节保持不变",
      "features.mark": "核心能力",
      "features.title": "一个工作台，<em>容纳整部长篇</em>",
      "features.intro": "从文字本身到幕后运转的模型与 Agent，每一层都留给创作者掌控。",
      "features.writingTitle": "为长篇而生的写作空间",
      "features.writingText": "卷章结构、多标签编辑、自动保存、查找替换和自由排序，让数十万字依然清晰可控。",
      "features.worldTitle": "人物与世界书",
      "features.worldText": "集中维护人物、地点、规则与研究资料，并让 Agent 随时检索。",
      "features.agentTitle": "可执行任务的 Agent",
      "features.agentText": "读取、搜索和修改创作内容，支持审批、变更预览、子 Agent 与持续任务。",
      "features.contextTitle": "长上下文记忆",
      "features.contextText": "章节摘要、区间摘要、Embedding 检索与会话压缩，让故事不被上下文窗口截断。",
      "features.insightTitle": "看见创作如何发生",
      "features.insightText": "复盘写作活跃度、字数来源、模型调用、Token 和延迟，让创作与 AI 协作过程可见。",
      "showcase.mark": "真实工作台",
      "showcase.title": "创作在中央，<em>AI 在身旁</em>",
      "showcase.text": "世界书、创作资料与 Agent 面板并肩展开。设定整理、任务过程和生成成果，都在同一个视野中。",
      "showcase.alt": "OmniFic 工作台：左侧世界书条目，中间设定正文，右侧 Agent 生成结果",
      "local.mark": "本地优先",
      "local.title": "你的故事，<em>首先属于你</em>",
      "local.text": "项目正文与主要应用数据默认保存在本机 SQLite。模型供应商、提示词、工具权限与执行审批均由你配置。",
      "local.dataTitle": "本地数据",
      "local.dataText": "无需把整部小说托管给一个陌生平台。",
      "local.modelTitle": "自由模型",
      "local.modelText": "接入 OpenAI 兼容端点、中转站、Embedding 与 Rerank 模型。",
      "local.controlTitle": "明确控制",
      "local.controlText": "用权限、审批和变更预览决定 Agent 能做什么。",
      "local.note": "使用云端模型时，发送的上下文仍会经过你配置的服务。",
      "credits.mark": "源流与致谢",
      "credits.title": "从 OpenFic 出发，<em>沿自己的方向生长</em>",
      "credits.text": "OmniFic Fork 自 OpenFic v0.7.5。项目的基础架构、主要产品形态、世界观管理、写作编辑器、Agent Runtime 与本地数据能力，都建立在 OpenFic 的扎实工作之上。",
      "credits.note": "OmniFic 在此基础上独立发展，但并非 OpenFic 的替代，也不代表一个“更正确”的方向。谨向原项目及贡献者致谢。",
      "credits.cta": "访问 OpenFic 原项目",
      "credits.visualLabel": "从 OpenFic 基础分支到 OmniFic 独立方向",
      "credits.foundation": "坚实的创作工作台基础",
      "credits.inherited": "架构 · 编辑器 · 世界观 · Agent Runtime",
      "credits.direction": "面向个人长篇实践的独立探索",
      "start.mark": "开始使用",
      "start.title": "选择适合你的方式，<em>打开创作空间</em>",
      "start.text": "Windows 与 macOS 可以直接下载桌面包；也可以通过 PyPI 在浏览器中使用，或在 Linux 服务器与 NAS 上运行 Docker。",
      "start.release": "下载 Windows / macOS 桌面版",
      "start.docs": "阅读完整安装与卸载指南",
      "start.docsHref": "https://github.com/F0rJay/OmniFic/blob/main/docs/installation.md",
      "start.guide": "阅读产品使用指南",
      "start.guideHref": "https://github.com/F0rJay/OmniFic/blob/main/docs/user-guide.md",
      "start.copy": "复制命令",
      "start.copied": "已复制",
      "cta.title": "故事辽阔，愿你落笔有光。",
      "cta.text": "OmniFic 是一个仍在生长的开源项目。欢迎试用、讨论，也欢迎一起让它变得更好。",
      "cta.github": "在 GitHub 探索 OmniFic",
      "cta.issue": "提出想法",
      "footer.note": "面向长篇小说的本地优先 AI 创作工作台。",
      "footer.docs": "文档",
      "footer.guide": "使用指南",
      "footer.guideHref": "https://github.com/F0rJay/OmniFic/blob/main/docs/user-guide.md",
      "footer.contribute": "参与贡献",
      "footer.omnific": "致谢 OpenFic",
      "a11y.demoControls": "演示控制",
      "a11y.agentGraph": "Agent 节点图",
      "a11y.demoSteps": "演示步骤",
      "a11y.installCommands": "OmniFic 安装命令",
    },
    en: {
      "meta.title": "OmniFic — Write beyond generation",
      "meta.description":
        "An AI creative space built to walk with you through a million-word novel. Local-first, Agent-powered, with your manuscript and story bible growing together in one workspace.",
      "a11y.skip": "Skip to main content",
      "a11y.primaryNav": "Primary navigation",
      "a11y.projectFacts": "Project highlights",
      "a11y.requirements": "System requirements",
      "a11y.footerNav": "Footer navigation",
      "nav.vision": "Vision",
      "nav.workflow": "Workflow",
      "nav.agentDemo": "Agent demo",
      "nav.features": "Capabilities",
      "nav.start": "Get started",
      "nav.github": "GitHub",
      "hero.eyebrow": "LOCAL-FIRST · LONG-FORM FICTION · AGENT COLLABORATION",
      "hero.title": "A boundless space for stories.<br><span>Write beyond generation.</span>",
      "hero.lead":
        "An AI creative space built to walk with you through a million-word novel.",
      "hero.githubCta": "Download desktop app",
      "hero.startCta": "View install options",
      "hero.factLocal": "Data stored locally by default",
      "hero.factOpen": "Apache 2.0 open source",
      "hero.scroll": "TURN THE PAGE",
      "philosophy.mark": "CREATIVE PHILOSOPHY",
      "philosophy.statement":
        "AI should do more than answer through a window.<br>It should understand your world and remember the path of your story—<br><em>then, with your permission, take part in the work.</em>",
      "philosophy.oneTitle": "Material enters the story",
      "philosophy.oneText": "Manuscripts, notes, characters, and worldbooks become searchable, usable creative context instead of scattered files.",
      "philosophy.twoTitle": "Agents enter the workflow",
      "philosophy.twoText": "From planning and retrieval to chapter edits, Agents carry out real tasks under clear permissions and change previews.",
      "philosophy.threeTitle": "Writing becomes memory",
      "philosophy.threeText": "Summaries, indexes, and persistent tasks preserve long-form context so every collaboration continues instead of restarting.",
      "workflow.mark": "THE CREATIVE LOOP",
      "workflow.title": "From a single spark, <em>grow an entire world</em>",
      "workflow.intro": "OmniFic follows the real rhythm of long-form creation, allowing material, drafting, Agents, and memory to reinforce one another.",
      "workflow.gatherTitle": "Gather the world",
      "workflow.gatherText": "Import drafts and references, then shape volumes, chapters, characters, and lore.",
      "workflow.createTitle": "Write the story",
      "workflow.createText": "Draft across multiple editor tabs while every step is saved automatically.",
      "workflow.agentTitle": "Collaborate and explore",
      "workflow.agentText": "Let Agents retrieve lore, continue chapters, and show each tool call clearly.",
      "workflow.memoryTitle": "Build memory",
      "workflow.memoryText": "Use summaries and retrieval indexes to keep long context moving forward.",
      "demo.label": "SIMULATED WORKFLOW · NO BACKEND CONNECTION",
      "demo.title": "Watch one task travel through<br><em>the complete Agent workflow</em>",
      "demo.intro": "From a persistent task goal to delegated retrieval, draft review, change preview, and approved writeback. Select any step to inspect what happens there.",
      "demo.task": "Continue Chapter 22, expand the auction scene, and keep Xiao Yan consistent",
      "demo.play": "Play",
      "demo.pause": "Pause",
      "demo.resume": "Resume",
      "demo.replay": "Replay",
      "demo.ready": "Ready to run the simulated task",
      "demo.nodeTask": "Task goal",
      "demo.nodeMain": "Primary Agent",
      "demo.nodeContext": "Lore retrieval",
      "demo.nodeReview": "Continuity review",
      "demo.nodeDraft": "Chapter writeback",
      "demo.diffTitle": "Chapter 22 · The Auction",
      "demo.diffContext": "Xiao Yan let his gaze pass over the jade tray without bidding yet.",
      "demo.diffAddOne": "The trace of medicinal fragrance was faint, but it matched Yao Lao's description exactly.",
      "demo.diffAddTwo": "He suppressed his reaction and tapped a finger inside his sleeve, waiting for the real bidding to begin.",
      "demo.approvalLabel": "WAITING FOR TOOL APPROVAL",
      "demo.approvalText": "The chapter changes are written only after preview approval. The autoplay demo approves after a short pause.",
      "demo.reject": "Reject change",
      "demo.approve": "Approve write",
      "demo.completeTitle": "Task complete",
      "demo.completeText": "The chapter is updated, and summary and retrieval-index refreshes are queued.",
      "demo.rejectedTitle": "Change rejected",
      "demo.rejectedText": "The simulation ended without writing any data. Replay it or inspect another step.",
      "demo.stepGoal": "Receive goal",
      "demo.stepPlan": "Create plan",
      "demo.stepDispatch": "Delegate work",
      "demo.stepRetrieve": "Retrieve context",
      "demo.stepDraft": "Generate draft",
      "demo.stepReview": "Review continuity",
      "demo.stepApprove": "Approve change",
      "demo.stepSave": "Complete write",
      "demo.stageGoal": "The task goal was restored from persistent context",
      "demo.stagePlan": "The primary Agent is building an execution plan",
      "demo.stageDispatch": "Delegating lore retrieval and continuity review",
      "demo.stageRetrieve": "Subagents are retrieving chapters, characters, and worldbook entries in parallel",
      "demo.stageDraft": "The primary Agent is merging context and preparing a chapter edit",
      "demo.stageReview": "The review Agent is checking character and timeline consistency",
      "demo.stageApproval": "The chapter change is waiting for your approval",
      "demo.stageComplete": "The change was approved and written successfully",
      "demo.stageRejected": "The change was rejected and no data was written",
      "demo.logGoal": "Persistent task goal and current project context injected",
      "demo.logPlan": "Four-step execution plan generated and confirmed",
      "demo.logDispatchLore": "Lore-retrieval subtask entered the running state",
      "demo.logDispatchReview": "Continuity-review subtask entered the queue",
      "demo.logSearch": "Found 6 manuscript passages related to the auction",
      "demo.logCharacter": "Loaded Xiao Yan's character profile and current state",
      "demo.logWorld": "Loaded the Foundation Elixir worldbook entry",
      "demo.logDraft": "Generated a chapter change preview with 52 added characters",
      "demo.logReview": "Character and timeline review completed with 0 conflicts",
      "demo.logApproval": "Write tool paused and waiting for user approval",
      "demo.logComplete": "Chapter refresh emitted and retrieval-index refresh queued",
      "demo.logRejected": "The user rejected the tool call; the chapter remains unchanged",
      "features.mark": "CORE CAPABILITIES",
      "features.title": "One workspace for <em>an entire novel</em>",
      "features.intro": "From the words on the page to the models and Agents behind them, every layer remains under the writer's control.",
      "features.writingTitle": "A writing space built for novels",
      "features.writingText": "Volume and chapter structure, multi-tab editing, autosave, find and replace, and flexible ordering keep hundreds of thousands of words manageable.",
      "features.worldTitle": "Characters and worldbooks",
      "features.worldText": "Keep people, places, rules, and research together, ready for Agents to retrieve when needed.",
      "features.agentTitle": "Agents that can do the work",
      "features.agentText": "Read, search, and edit creative material with approvals, change previews, delegated Agents, and persistent tasks.",
      "features.contextTitle": "Long-context memory",
      "features.contextText": "Chapter summaries, range summaries, embedding retrieval, and conversation compaction keep the story larger than a context window.",
      "features.insightTitle": "See how the work happens",
      "features.insightText": "Review writing activity, word sources, model calls, tokens, and latency to make both writing and AI collaboration visible.",
      "showcase.mark": "THE REAL WORKSPACE",
      "showcase.title": "Creation at the center. <em>AI at your side.</em>",
      "showcase.text": "The worldbook, creative material, and Agent panel sit side by side. Lore building, task progress, and generated results stay within a single view.",
      "showcase.alt": "The OmniFic workspace with worldbook entries on the left, lore content in the center, and Agent-generated results on the right",
      "local.mark": "LOCAL FIRST",
      "local.title": "Your story <em>belongs to you first</em>",
      "local.text": "Manuscripts and primary application data are stored in local SQLite by default. You choose the model providers, prompts, tool permissions, and approval policy.",
      "local.dataTitle": "Local data",
      "local.dataText": "You do not have to hand an entire novel to an unfamiliar hosted platform.",
      "local.modelTitle": "Model freedom",
      "local.modelText": "Connect OpenAI-compatible endpoints, relays, embedding models, and rerankers.",
      "local.controlTitle": "Explicit control",
      "local.controlText": "Permissions, approvals, and change previews determine what an Agent may do.",
      "local.note": "When using cloud models, the context you send still passes through your configured provider.",
      "credits.mark": "ROOTS AND THANKS",
      "credits.title": "Starting from OpenFic, <em>growing in our own direction</em>",
      "credits.text": "OmniFic was forked from OpenFic v0.7.5. Its foundational architecture, primary product shape, worldbuilding tools, writing editor, Agent Runtime, and local data capabilities all build on OpenFic's substantial work.",
      "credits.note": "OmniFic now develops independently, but it is not a replacement for OpenFic or a claim to represent a more correct direction. Our sincere thanks go to the original project and its contributors.",
      "credits.cta": "Visit the original OpenFic project",
      "credits.visualLabel": "A branch from the OpenFic foundation toward OmniFic's independent direction",
      "credits.foundation": "A strong creative-workspace foundation",
      "credits.inherited": "Architecture · Editor · Worldbuilding · Agent Runtime",
      "credits.direction": "An independent exploration shaped by personal long-form practice",
      "start.mark": "GET STARTED",
      "start.title": "Choose your path. <em>Open the workspace.</em>",
      "start.text": "Download the desktop app for Windows or macOS, use the browser interface through PyPI, or run Docker on a Linux server or NAS.",
      "start.release": "Download Windows / macOS desktop app",
      "start.docs": "Read the installation and removal guide",
      "start.docsHref": "https://github.com/F0rJay/OmniFic/blob/main/docs/installation_EN.md",
      "start.guide": "Read the product user guide",
      "start.guideHref": "https://github.com/F0rJay/OmniFic/blob/main/docs/user-guide_EN.md",
      "start.copy": "Copy commands",
      "start.copied": "Copied",
      "cta.title": "Your story is vast. Write toward the light.",
      "cta.text": "OmniFic is an open-source project still finding its shape. Try it, discuss it, and help make it better.",
      "cta.github": "Explore OmniFic on GitHub",
      "cta.issue": "Share an idea",
      "footer.note": "A local-first AI writing workspace for long-form fiction.",
      "footer.docs": "Docs",
      "footer.guide": "User guide",
      "footer.guideHref": "https://github.com/F0rJay/OmniFic/blob/main/docs/user-guide_EN.md",
      "footer.contribute": "Contribute",
      "footer.omnific": "Thanks to OpenFic",
      "a11y.demoControls": "Demo controls",
      "a11y.agentGraph": "Agent node graph",
      "a11y.demoSteps": "Demo steps",
      "a11y.installCommands": "OmniFic installation commands",
    },
  };

  const languageToggle = document.querySelector("#language-toggle");
  const metaDescription = document.querySelector('meta[name="description"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  let currentLanguage = "zh";
  let workflowDemo = null;

  function translatePage(language) {
    const dictionary = translations[language] || translations.zh;
    currentLanguage = language;
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title = dictionary["meta.title"];
    metaDescription?.setAttribute("content", dictionary["meta.description"]);
    ogTitle?.setAttribute("content", dictionary["meta.title"]);
    ogDescription?.setAttribute("content", dictionary["meta.description"]);

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n;
      if (dictionary[key]) element.textContent = dictionary[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach((element) => {
      const key = element.dataset.i18nHtml;
      if (dictionary[key]) element.innerHTML = dictionary[key];
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      const key = element.dataset.i18nAriaLabel;
      if (dictionary[key]) element.setAttribute("aria-label", dictionary[key]);
    });
    document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
      const key = element.dataset.i18nAlt;
      if (dictionary[key]) element.setAttribute("alt", dictionary[key]);
    });
    document.querySelectorAll("[data-i18n-href]").forEach((element) => {
      const key = element.dataset.i18nHref;
      if (dictionary[key]) element.setAttribute("href", dictionary[key]);
    });

    if (languageToggle) {
      const isEnglish = language === "en";
      languageToggle.setAttribute("aria-pressed", String(isEnglish));
      languageToggle.setAttribute("aria-label", isEnglish ? "切换至中文" : "Switch to English");
    }

    workflowDemo?.refreshLanguage();
  }

  try {
    const storedLanguage = window.localStorage.getItem("omnific-landing-language");
    if (storedLanguage === "en") translatePage("en");
  } catch {
    // Storage may be unavailable in hardened or private browsing contexts.
  }

  languageToggle?.addEventListener("click", () => {
    const nextLanguage = currentLanguage === "zh" ? "en" : "zh";
    translatePage(nextLanguage);
    try {
      window.localStorage.setItem("omnific-landing-language", nextLanguage);
    } catch {
      // Language switching still works for the current session.
    }
  });

  const header = document.querySelector("[data-header]");
  const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 24);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  const revealElements = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.08 },
    );
    revealElements.forEach((element) => revealObserver.observe(element));
  } else {
    revealElements.forEach((element) => element.classList.add("is-visible"));
  }

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ── Workflow step sequential lighting ── */
  const workflowSteps = document.querySelectorAll(".workflow-step");
  if (workflowSteps.length && "IntersectionObserver" in window && !motionQuery.matches) {
    const workflowObserver = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        workflowSteps.forEach((step, index) => {
          window.setTimeout(() => step.classList.add("is-lit"), 200 + index * 220);
        });
        workflowObserver.unobserve(entries[0].target);
      },
      { threshold: 0.3 },
    );
    const workflowTrack = document.querySelector(".workflow-track");
    if (workflowTrack) workflowObserver.observe(workflowTrack);
  }

  /* ── Scroll-driven parallax & float effects ── */
  const scrollDrivenElements = [];
  const screenFrame = document.querySelector(".screen-frame");
  const terminalEl = document.querySelector(".terminal");
  const philosophySection = document.querySelector(".philosophy");

  if (screenFrame) scrollDrivenElements.push({ el: screenFrame, cls: "is-floating", offset: 0.15 });
  if (terminalEl) scrollDrivenElements.push({ el: terminalEl, cls: "is-floating", offset: 0.1 });

  if (scrollDrivenElements.length && "IntersectionObserver" in window) {
    const floatObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = scrollDrivenElements.find((item) => item.el === entry.target);
          if (!target) return;
          if (entry.isIntersecting) {
            window.setTimeout(() => target.el.classList.add(target.cls), 200);
          }
        });
      },
      { threshold: 0.08 },
    );
    scrollDrivenElements.forEach((item) => floatObserver.observe(item.el));
  }

  /* Philosophy watermark scroll parallax */
  if (philosophySection && !motionQuery.matches) {
    window.addEventListener("scroll", () => {
      const rect = philosophySection.getBoundingClientRect();
      const viewHeight = window.innerHeight;
      if (rect.top < viewHeight && rect.bottom > 0) {
        const progress = 1 - (rect.top / viewHeight);
        const shift = Math.max(-20, Math.min(10, (progress - 0.5) * 30));
        philosophySection.style.setProperty("--watermark-shift", `${shift.toFixed(1)}px`);
      }
    }, { passive: true });
  }

  const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
  const hero = document.querySelector(".hero");

  if (hero && !motionQuery.matches && !coarsePointerQuery.matches) {
    const parallaxElements = hero.querySelectorAll("[data-parallax]");
    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      hero.style.setProperty("--hero-x", `${(x * 10).toFixed(2)}px`);
      hero.style.setProperty("--hero-y", `${(y * 8).toFixed(2)}px`);
      parallaxElements.forEach((element) => {
        const depth = Number.parseFloat(element.dataset.parallax || "1") * 12;
        element.style.setProperty("--shift-x", `${(x * depth).toFixed(2)}px`);
        element.style.setProperty("--shift-y", `${(y * depth).toFixed(2)}px`);
      });
    });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--hero-x", "0px");
      hero.style.setProperty("--hero-y", "0px");
      parallaxElements.forEach((element) => {
        element.style.setProperty("--shift-x", "0px");
        element.style.setProperty("--shift-y", "0px");
      });
    });
  }

  if (!motionQuery.matches && !coarsePointerQuery.matches) {
    document.querySelectorAll("[data-shine]").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--shine-x", `${x.toFixed(1)}%`);
        card.style.setProperty("--shine-y", `${y.toFixed(1)}%`);
      });
    });
  }

  const installCommand = `python -m pip install --upgrade omnific
omnific version
omnific serve`;
  const copyButton = document.querySelector("#copy-install");

  copyButton?.addEventListener("click", async () => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(installCommand);
      copied = true;
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = installCommand;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.append(textArea);
      textArea.select();
      copied = document.execCommand("copy");
      textArea.remove();
    }

    if (!copied) return;
    const originalKey = copyButton.dataset.i18n;
    copyButton.textContent = translations[currentLanguage]["start.copied"];
    copyButton.disabled = true;
    window.setTimeout(() => {
      copyButton.disabled = false;
      copyButton.textContent = translations[currentLanguage][originalKey];
    }, 1600);
  });

  class TerminalTypewriter {
    constructor(code, motionMedia) {
      this.code = code;
      this.pre = code.closest("pre");
      this.terminal = code.closest(".terminal");
      this.motionMedia = motionMedia;
      this.entries = [];
      const textWalker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
      let textNode = textWalker.nextNode();
      while (textNode) {
        this.entries.push({ node: textNode, text: textNode.data });
        textNode = textWalker.nextNode();
      }
      this.entryIndex = 0;
      this.characterIndex = 0;
      this.timer = 0;
      this.inView = false;
      this.started = false;
      this.complete = false;

      this.handleIntersection = this.handleIntersection.bind(this);
      this.handleVisibility = this.handleVisibility.bind(this);
      this.handleMotionChange = this.handleMotionChange.bind(this);

      if (motionMedia.matches) {
        this.complete = true;
        this.terminal?.classList.add("is-typed");
        return;
      }

      if (this.pre) {
        this.pre.style.minHeight = `${Math.ceil(this.pre.getBoundingClientRect().height)}px`;
      }

      this.entries.forEach(({ node }) => {
        node.data = "";
      });

      this.caret = document.createElement("span");
      this.caret.className = "terminal-caret";
      this.caret.setAttribute("aria-hidden", "true");
      this.code.append(this.caret);
      this.terminal?.classList.add("is-typing");

      document.addEventListener("visibilitychange", this.handleVisibility);
      motionMedia.addEventListener?.("change", this.handleMotionChange);

      if ("IntersectionObserver" in window) {
        this.observer = new IntersectionObserver(this.handleIntersection, {
          threshold: 0.28,
          rootMargin: "0px 0px -6% 0px",
        });
        this.observer.observe(this.terminal || this.code);
      } else {
        this.inView = true;
        this.resume();
      }
    }

    handleIntersection(entries) {
      const entry = entries[0];
      this.inView = Boolean(entry?.isIntersecting);
      if (this.inView) this.resume();
      else this.pause();
    }

    handleVisibility() {
      if (document.hidden) this.pause();
      else if (this.inView) this.resume();
    }

    handleMotionChange(event) {
      if (event.matches) this.finish(true);
    }

    resume() {
      if (this.complete || document.hidden || !this.inView || this.motionMedia.matches) return;
      this.started = true;
      if (!this.timer) this.timer = window.setTimeout(() => this.typeNext(), 180);
    }

    pause() {
      window.clearTimeout(this.timer);
      this.timer = 0;
    }

    typeNext() {
      this.timer = 0;
      if (this.complete || document.hidden || !this.inView || this.motionMedia.matches) return;

      while (this.entryIndex < this.entries.length) {
        const entry = this.entries[this.entryIndex];
        if (this.characterIndex >= entry.text.length) {
          this.entryIndex += 1;
          this.characterIndex = 0;
          continue;
        }

        const character = entry.text[this.characterIndex];
        entry.node.appendData(character);
        this.characterIndex += 1;

        const delay = character === "\n" ? 105 : character === " " ? 6 : 18;
        this.timer = window.setTimeout(() => this.typeNext(), delay);
        return;
      }

      this.finish(false);
    }

    finish(immediate) {
      if (this.complete) return;
      this.pause();
      this.complete = true;
      this.entries.forEach(({ node, text }) => {
        node.data = text;
      });
      this.observer?.disconnect();
      document.removeEventListener("visibilitychange", this.handleVisibility);
      this.motionMedia.removeEventListener?.("change", this.handleMotionChange);
      this.terminal?.classList.remove("is-typing");
      this.terminal?.classList.add("is-typed");

      /* Show ✓ Ready indicator */
      const readyEl = this.terminal?.querySelector(".terminal-ready");
      if (readyEl && !immediate) {
        window.setTimeout(() => readyEl.classList.add("is-visible"), 300);
      }

      if (!this.caret) return;
      if (immediate) {
        this.caret.remove();
        return;
      }
      this.caret.classList.add("is-finishing");
      window.setTimeout(() => this.caret?.remove(), 240);
    }
  }

  const DEMO_STAGES = [
    {
      statusKey: "demo.stageGoal",
      tokens: 128,
      time: 0.2,
      agents: 1,
      nodes: { task: "active" },
      logs: [{ tool: "task.goal", key: "demo.logGoal" }],
    },
    {
      statusKey: "demo.stagePlan",
      tokens: 436,
      time: 0.9,
      agents: 1,
      nodes: { task: "complete", main: "active" },
      logs: [{ tool: "write_plan", key: "demo.logPlan" }],
    },
    {
      statusKey: "demo.stageDispatch",
      tokens: 782,
      time: 1.4,
      agents: 3,
      nodes: { task: "complete", main: "active", context: "queued", review: "queued" },
      logs: [
        { tool: "dispatch_subagent", key: "demo.logDispatchLore" },
        { tool: "dispatch_subagent", key: "demo.logDispatchReview" },
      ],
    },
    {
      statusKey: "demo.stageRetrieve",
      tokens: 1740,
      time: 2.8,
      agents: 3,
      nodes: { task: "complete", main: "working", context: "active", review: "queued" },
      logs: [
        { tool: "search_chapters", key: "demo.logSearch" },
        { tool: "read_character", key: "demo.logCharacter" },
        { tool: "read_world_entry", key: "demo.logWorld" },
      ],
    },
    {
      statusKey: "demo.stageDraft",
      tokens: 2916,
      time: 4.6,
      agents: 3,
      nodes: { task: "complete", main: "active", context: "complete", review: "working", draft: "active" },
      logs: [{ tool: "edit_chapter", key: "demo.logDraft" }],
    },
    {
      statusKey: "demo.stageReview",
      tokens: 3664,
      time: 5.7,
      agents: 3,
      nodes: { task: "complete", main: "working", context: "complete", review: "active", draft: "waiting" },
      logs: [{ tool: "continuity-reviewer", key: "demo.logReview" }],
    },
    {
      statusKey: "demo.stageApproval",
      tokens: 4120,
      time: 6.2,
      agents: 1,
      nodes: { task: "complete", main: "complete", context: "complete", review: "complete", draft: "active" },
      logs: [{ tool: "tool_approval", key: "demo.logApproval" }],
    },
    {
      statusKey: "demo.stageComplete",
      tokens: 4280,
      time: 6.8,
      agents: 1,
      nodes: { task: "complete", main: "complete", context: "complete", review: "complete", draft: "complete" },
      logs: [{ tool: "chapter_refresh", key: "demo.logComplete" }],
    },
  ];

  const DEMO_STAGE_DELAYS = [900, 1100, 1200, 1650, 1450, 1300, 2200, 0];
  const DEMO_LINK_STEPS = {
    "task-main": 1,
    "main-context": 2,
    "main-review": 2,
    "context-draft": 4,
    "main-draft": 4,
    "review-draft": 5,
  };

  class AgentWorkflowDemo {
    constructor(root, reducedMotion) {
      this.root = root;
      this.reducedMotion = reducedMotion;
      this.currentStep = reducedMotion ? DEMO_STAGES.length - 1 : 0;
      this.status = reducedMotion ? "completed" : "idle";
      this.pauseReason = null;
      this.timer = null;
      this.autoStartTimer = null;
      this.statsFrame = null;
      this.inView = false;
      this.hasAutoPlayed = reducedMotion;

      this.playButton = root.querySelector("#demo-play");
      this.playLabel = this.playButton?.querySelector("span");
      this.replayButton = root.querySelector("#demo-replay");
      this.approveButton = root.querySelector("#demo-approve");
      this.rejectButton = root.querySelector("#demo-reject");
      this.liveStatus = root.querySelector("#demo-live-status");
      this.logList = root.querySelector("#demo-log-list");
      this.diff = root.querySelector("#demo-diff");
      this.approval = root.querySelector("#demo-approval");
      this.result = root.querySelector("#demo-result");
      this.timelineButtons = [...root.querySelectorAll("[data-demo-step]")];
      this.nodeButtons = [...root.querySelectorAll("[data-agent-node]")];
      this.links = [...root.querySelectorAll("[data-link]")];
      this.tokensElement = root.querySelector("[data-demo-tokens]");
      this.timeElement = root.querySelector("[data-demo-time]");
      this.agentsElement = root.querySelector("[data-demo-agents]");

      this.bindEvents();
      this.render({ animateStats: false });
      this.observe();
    }

    get dictionary() {
      return translations[currentLanguage] || translations.zh;
    }

    bindEvents() {
      this.playButton?.addEventListener("click", () => {
        if (this.status === "running") {
          this.pause("manual");
          return;
        }
        if (this.status === "completed" || this.status === "rejected") {
          this.start(0);
          return;
        }
        this.resume();
      });

      this.replayButton?.addEventListener("click", () => this.start(0));
      this.approveButton?.addEventListener("click", () => this.approve());
      this.rejectButton?.addEventListener("click", () => this.reject());

      this.timelineButtons.forEach((button) => {
        button.addEventListener("click", () => this.inspectStep(Number(button.dataset.demoStep)));
      });
      this.nodeButtons.forEach((button) => {
        button.addEventListener("click", () => this.inspectStep(Number(button.dataset.step)));
      });

      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.status === "running") this.pause("visibility");
        else if (!document.hidden && this.inView && this.status === "paused" && this.pauseReason === "visibility") this.resume();
      });
    }

    observe() {
      if (!("IntersectionObserver" in window)) {
        if (!this.reducedMotion) this.start(0);
        return;
      }

      this.observer = new IntersectionObserver(
        ([entry]) => {
          this.inView = entry.isIntersecting;
          if (!this.inView) {
            window.clearTimeout(this.autoStartTimer);
            if (this.status === "running") this.pause("visibility");
            return;
          }

          if (!this.hasAutoPlayed && !this.reducedMotion) {
            this.hasAutoPlayed = true;
            this.autoStartTimer = window.setTimeout(() => {
              if (this.inView && !document.hidden) this.start(0);
            }, 420);
          } else if (this.status === "paused" && this.pauseReason === "visibility" && !document.hidden) {
            this.resume();
          }
        },
        { threshold: 0.32 },
      );
      this.observer.observe(this.root);
    }

    start(step = 0) {
      this.clearTimer();
      this.pauseReason = null;
      this.status = this.reducedMotion ? "completed" : "running";
      this.currentStep = this.reducedMotion ? DEMO_STAGES.length - 1 : Math.max(0, Math.min(step, DEMO_STAGES.length - 1));
      this.render();
      if (!this.reducedMotion) this.schedule();
    }

    pause(reason = "manual") {
      if (this.status !== "running") return;
      this.clearTimer();
      this.status = "paused";
      this.pauseReason = reason;
      this.renderControls();
      this.root.dataset.demoStatus = "paused";
    }

    resume() {
      if (this.reducedMotion) {
        this.currentStep = DEMO_STAGES.length - 1;
        this.status = "completed";
        this.render({ animateStats: false });
        return;
      }
      this.status = "running";
      this.pauseReason = null;
      this.renderControls();
      this.root.dataset.demoStatus = "running";
      this.schedule();
    }

    inspectStep(step) {
      this.clearTimer();
      this.currentStep = Math.max(0, Math.min(step, DEMO_STAGES.length - 1));
      this.status = this.currentStep === DEMO_STAGES.length - 1 ? "completed" : "paused";
      this.pauseReason = "manual";
      this.render();
    }

    schedule() {
      this.clearTimer();
      if (this.status !== "running") return;
      if (this.currentStep === 6) {
        this.timer = window.setTimeout(() => this.approve(), DEMO_STAGE_DELAYS[6]);
        return;
      }
      if (this.currentStep >= DEMO_STAGES.length - 1) {
        this.status = "completed";
        this.renderControls();
        this.root.dataset.demoStatus = "completed";
        return;
      }
      this.timer = window.setTimeout(() => {
        this.currentStep += 1;
        this.render();
        this.schedule();
      }, DEMO_STAGE_DELAYS[this.currentStep]);
    }

    approve() {
      if (this.currentStep !== 6) return;
      this.clearTimer();
      this.currentStep = 7;
      this.status = "completed";
      this.pauseReason = null;
      this.render();
    }

    reject() {
      if (this.currentStep !== 6) return;
      this.clearTimer();
      this.status = "rejected";
      this.pauseReason = null;
      this.render();
    }

    clearTimer() {
      window.clearTimeout(this.timer);
      this.timer = null;
    }

    render(options = {}) {
      const { animateStats = true } = options;
      const stage = DEMO_STAGES[this.currentStep];
      this.root.dataset.demoStatus = this.status;
      this.root.dataset.demoStep = String(this.currentStep);

      this.nodeButtons.forEach((button) => {
        const nodeStatus = stage.nodes[button.dataset.agentNode] || "idle";
        button.classList.remove("is-active", "is-complete", "is-queued", "is-waiting", "is-working");
        if (nodeStatus !== "idle") button.classList.add(`is-${nodeStatus}`);
        button.setAttribute("aria-pressed", String(button.classList.contains("is-active")));
      });

      this.links.forEach((link) => {
        const activeFrom = DEMO_LINK_STEPS[link.dataset.link];
        link.classList.toggle("is-complete", this.currentStep > activeFrom);
        link.classList.toggle("is-flowing", this.currentStep === activeFrom || (this.currentStep === 3 && link.dataset.link === "main-context"));
      });

      this.timelineButtons.forEach((button, index) => {
        button.classList.toggle("is-active", index === this.currentStep);
        button.classList.toggle("is-complete", index < this.currentStep || this.status === "completed");
        if (index === this.currentStep) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });

      this.renderLogs();
      this.renderResult();
      this.renderControls();
      this.animateStats(stage, animateStats && !this.reducedMotion);
      if (this.liveStatus) {
        const key = this.status === "rejected" ? "demo.stageRejected" : stage.statusKey;
        this.liveStatus.textContent = this.dictionary[key];
      }
    }

    renderLogs() {
      if (!this.logList) return;
      const events = [];
      for (let stageIndex = 0; stageIndex <= this.currentStep; stageIndex += 1) {
        DEMO_STAGES[stageIndex].logs.forEach((log) => events.push({ ...log, stageIndex }));
      }
      if (this.status === "rejected") events.push({ tool: "tool_approval", key: "demo.logRejected", stageIndex: 6 });

      this.logList.replaceChildren(
        ...events.map((event, index) => {
          const item = document.createElement("li");
          if (index === events.length - 1) item.className = "is-latest";
          const time = document.createElement("span");
          time.textContent = `00:${String(Math.floor(index * 0.7)).padStart(2, "0")}.${String((index * 17) % 100).padStart(2, "0")}`;
          const tool = document.createElement("code");
          tool.textContent = event.tool;
          const message = document.createElement("p");
          message.textContent = this.dictionary[event.key];
          item.append(time, tool, message);
          return item;
        }),
      );
      this.logList.scrollTop = this.logList.scrollHeight;
    }

    renderResult() {
      const showDiff = this.currentStep >= 4;
      const showApproval = this.currentStep === 6 && this.status !== "rejected";
      const showResult = this.status === "completed" || this.status === "rejected";
      this.diff?.classList.toggle("is-visible", showDiff);
      this.approval?.classList.toggle("is-visible", showApproval);
      this.result?.classList.toggle("is-visible", showResult);
      this.result?.classList.toggle("is-rejected", this.status === "rejected");

      if (this.result) {
        const title = this.result.querySelector("b");
        const text = this.result.querySelector("span");
        if (title) title.textContent = this.dictionary[this.status === "rejected" ? "demo.rejectedTitle" : "demo.completeTitle"];
        if (text) text.textContent = this.dictionary[this.status === "rejected" ? "demo.rejectedText" : "demo.completeText"];
      }
    }

    renderControls() {
      if (!this.playButton || !this.playLabel) return;
      const isRunning = this.status === "running";
      this.playButton.classList.toggle("is-running", isRunning);
      this.playButton.setAttribute("aria-pressed", String(isRunning));
      const labelKey = isRunning ? "demo.pause" : this.status === "paused" ? "demo.resume" : "demo.play";
      this.playLabel.textContent = this.dictionary[labelKey];
    }

    animateStats(stage, animate) {
      window.cancelAnimationFrame(this.statsFrame);
      const targets = [stage.tokens, stage.time, stage.agents];
      const elements = [this.tokensElement, this.timeElement, this.agentsElement];
      const decimals = [0, 1, 0];
      if (!animate) {
        elements.forEach((element, index) => {
          if (element) element.textContent = targets[index].toFixed(decimals[index]);
        });
        return;
      }

      const starts = elements.map((element) => Number.parseFloat(element?.textContent || "0"));
      const startedAt = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - startedAt) / 520);
        const eased = 1 - Math.pow(1 - progress, 3);
        elements.forEach((element, index) => {
          if (!element) return;
          const value = starts[index] + (targets[index] - starts[index]) * eased;
          element.textContent = value.toFixed(decimals[index]);
        });
        if (progress < 1) this.statsFrame = requestAnimationFrame(tick);
      };
      this.statsFrame = requestAnimationFrame(tick);
    }

    refreshLanguage() {
      this.render({ animateStats: false });
    }
  }

  class InkScene {
    constructor(canvas, host) {
      this.canvas = canvas;
      this.host = host;
      this.context = canvas.getContext("2d", { alpha: true });
      this.width = 0;
      this.height = 0;
      this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      this.running = false;
      this.visible = true;
      this.frame = 0;
      this.particles = [];
      this.lastTime = 0;
      this.reducedMotion = motionQuery.matches;
      this.boundResize = this.resize.bind(this);
      this.boundDraw = this.draw.bind(this);
      this.boundVisibility = this.onVisibilityChange.bind(this);

      this.resize();
      window.addEventListener("resize", this.boundResize, { passive: true });
      document.addEventListener("visibilitychange", this.boundVisibility);

      if ("IntersectionObserver" in window) {
        this.observer = new IntersectionObserver(
          ([entry]) => {
            this.visible = entry.isIntersecting;
            if (this.visible) this.start();
          },
          { threshold: 0.02 },
        );
        this.observer.observe(host);
      }

      if (this.reducedMotion) this.drawStatic();
      else this.start();
    }

    resize() {
      const rect = this.host.getBoundingClientRect();
      this.width = Math.max(1, Math.round(rect.width));
      this.height = Math.max(1, Math.round(rect.height));
      this.canvas.width = Math.round(this.width * this.pixelRatio);
      this.canvas.height = Math.round(this.height * this.pixelRatio);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
      this.createParticles();
      if (this.reducedMotion) this.drawStatic();
    }

    createParticles() {
      const count = this.width < 700 ? 24 : this.width < 1100 ? 38 : 54;
      const glyphs = ["·", "章", "页", "文", "01", "✦"];
      this.particles = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * this.width,
        y: Math.random() * this.height * 0.78,
        size: 5 + Math.random() * 7,
        speed: 0.08 + Math.random() * 0.2,
        drift: Math.random() * Math.PI * 2,
        alpha: 0.08 + Math.random() * 0.22,
        glyph: glyphs[index % glyphs.length],
        violet: index % 3 === 0,
      }));
    }

    onVisibilityChange() {
      if (document.hidden) {
        this.running = false;
        cancelAnimationFrame(this.frame);
      } else if (this.visible) {
        this.start();
      }
    }

    start() {
      if (this.running || this.reducedMotion || document.hidden || !this.visible) return;
      this.running = true;
      this.lastTime = performance.now();
      this.frame = requestAnimationFrame(this.boundDraw);
    }

    draw(now) {
      if (!this.running || !this.visible || document.hidden) {
        this.running = false;
        return;
      }
      const delta = Math.min(32, now - this.lastTime || 16.7);
      this.lastTime = now;
      this.render(now * 0.001, delta);
      this.frame = requestAnimationFrame(this.boundDraw);
    }

    drawStatic() {
      this.render(3.2, 0);
    }

    render(time, delta) {
      const ctx = this.context;
      ctx.clearRect(0, 0, this.width, this.height);
      this.drawMountains(ctx, time);
      this.drawStreams(ctx, time);
      this.drawParticles(ctx, time, delta);
    }

    drawMountains(ctx, time) {
      const baseline = this.height * 0.82;
      const layers = [
        { offset: 0, height: 0.19, color: "rgba(22, 34, 47, 0.58)", blur: 0 },
        { offset: 34, height: 0.14, color: "rgba(15, 25, 36, 0.76)", blur: 0 },
        { offset: 70, height: 0.1, color: "rgba(9, 16, 25, 0.92)", blur: 0 },
      ];

      layers.forEach((layer, index) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, this.height);
        const points = 14;
        for (let point = 0; point <= points; point += 1) {
          const x = (point / points) * this.width;
          const peak = Math.sin(point * 1.73 + index * 1.4) * 0.55 + Math.sin(point * 0.61 + 2) * 0.45;
          const y = baseline + layer.offset - Math.max(0, peak) * this.height * layer.height;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(this.width, this.height);
        ctx.closePath();
        ctx.fillStyle = layer.color;
        ctx.fill();
        ctx.restore();
      });

      const mist = ctx.createLinearGradient(0, baseline - 120, 0, baseline + 90);
      mist.addColorStop(0, "rgba(126, 171, 184, 0)");
      mist.addColorStop(0.45, `rgba(126, 171, 184, ${0.025 + Math.sin(time * 0.2) * 0.008})`);
      mist.addColorStop(1, "rgba(126, 171, 184, 0)");
      ctx.fillStyle = mist;
      ctx.fillRect(0, baseline - 120, this.width, 210);
    }

    drawStreams(ctx, time) {
      const streams = [
        { y: 0.62, color: [67, 216, 232], width: 0.8, phase: 0 },
        { y: 0.68, color: [156, 108, 255], width: 1.1, phase: 1.8 },
        { y: 0.73, color: [67, 216, 232], width: 0.45, phase: 3.4 },
      ];

      streams.forEach((stream, index) => {
        ctx.save();
        const gradient = ctx.createLinearGradient(0, 0, this.width, 0);
        gradient.addColorStop(0, `rgba(${stream.color.join(",")},0)`);
        gradient.addColorStop(0.35, `rgba(${stream.color.join(",")},0.08)`);
        gradient.addColorStop(0.75, `rgba(${stream.color.join(",")},0.26)`);
        gradient.addColorStop(1, `rgba(${stream.color.join(",")},0)`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = stream.width;
        ctx.shadowColor = `rgba(${stream.color.join(",")},0.35)`;
        ctx.shadowBlur = 7;
        ctx.beginPath();
        ctx.moveTo(-30, this.height * stream.y);
        ctx.bezierCurveTo(
          this.width * 0.34,
          this.height * (stream.y + 0.08 + Math.sin(time * 0.22 + stream.phase) * 0.008),
          this.width * 0.66,
          this.height * (stream.y - 0.22),
          this.width + 40,
          this.height * (stream.y - 0.36 + index * 0.02),
        );
        ctx.stroke();
        ctx.restore();
      });
    }

    drawParticles(ctx, time, delta) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      this.particles.forEach((particle) => {
        if (delta > 0) {
          particle.x += particle.speed * delta;
          particle.y += Math.sin(time * 0.7 + particle.drift) * 0.05 * delta;
          if (particle.x > this.width + 20) {
            particle.x = -20;
            particle.y = Math.random() * this.height * 0.75;
          }
        }
        const pulse = 0.65 + Math.sin(time * 0.9 + particle.drift) * 0.35;
        ctx.fillStyle = particle.violet
          ? `rgba(164, 133, 236, ${particle.alpha * pulse})`
          : `rgba(108, 211, 222, ${particle.alpha * pulse})`;
        ctx.font = `${particle.size}px ${particle.glyph.length > 1 ? "monospace" : "serif"}`;
        ctx.fillText(particle.glyph, particle.x, particle.y);
      });
    }
  }

  const canvas = document.querySelector("#ink-canvas");
  const workflowDemoRoot = document.querySelector("#agent-workflow-demo");
  const terminalCode = document.querySelector("#terminal-code");
  if (workflowDemoRoot) workflowDemo = new AgentWorkflowDemo(workflowDemoRoot, motionQuery.matches);
  if (terminalCode) new TerminalTypewriter(terminalCode, motionQuery);
  if (canvas && hero) new InkScene(canvas, hero);
})();
