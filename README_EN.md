# OmniFic

> Forked from [OpenFic](https://github.com/syrizelink/OpenFic) v0.7.5 and developed independently — an AI-assisted long-form fiction writing tool.

![License](https://img.shields.io/badge/License-Apache_2.0-red)
![Python](https://img.shields.io/badge/Python-3.12%2B-3776AB?logo=python&logoColor=white)
![Based on OpenFic](https://img.shields.io/badge/Based%20on-OpenFic%20v0.7.5-blue)

[中文](./README.md) | English

## Positioning

**OmniFic is forked from OpenFic and now develops independently. It no longer tracks upstream updates.**

OpenFic is an excellent AI-native fiction writing tool with solid worldbuilding management, Agent collaboration, and local persistence. OmniFic builds on all of this and takes a different path — these improvements are not generic feature requests, but the result of a heavy user optimizing the tool after hitting real pain points in daily use.

OmniFic may suit you better than OpenFic if:

- You use a company or personal model relay / API proxy instead of official provider endpoints
- You want a Codex / Claude Code-level interaction experience, operating everything with `/`
- You need to quickly turn Markdown, PDF, Word, and other setting documents into usable worldbook entries
- You write million-word novels and have real needs around context management, task goals, and Agent transparency
- You're a power user who prefers to optimize your own tools rather than wait for features

## Key Differences from OpenFic

### Model Integration

| Capability | OpenFic | OmniFic |
|---|---|---|
| Official model catalog | ✅ | ✅ |
| Arbitrary OpenAI-compatible relay | ⚠️ Limited | ✅ First-class support |
| Auto-discover relay models | ❌ | ✅ One-click fetch all |
| Per-model reasoning capability override | ❌ | ✅ Manual override supported |

Relay users no longer need to guess whether a model supports reasoning effort, or switch between multiple provider pages to compare options.

### Interaction Experience

| Capability | OpenFic | OmniFic |
|---|---|---|
| Agent input | Plain text | `@` references + `/` command center |
| Skill selection | No shortcut | `/` menu + blue visual Skill Token |
| Session config | Scattered selectors | `/reasoning` `/model` unified entry |
| Agent reasoning timer | None | Real-time display, survives refresh/reconnect |
| Runtime status panel | Header summary | `/status` full session details |

The input box is no longer a chat box — it's the Agent control center.

### Writing Assistance

| Capability | OpenFic | OmniFic |
|---|---|---|
| Worldbook import | SillyTavern JSON | + Markdown / PDF / Word / PPT / TXT |
| AI-organized worldbook | ❌ | ✅ LLM enhancement during import |
| Novel TXT volume-aware import | ❌ | ✅ Auto-detect volume-chapter structure |
| Task goal | ❌ | ✅ Persistent goal, injected into context |

### Agent System

| Capability | OpenFic | OmniFic |
|---|---|---|
| Multi-select Agent questions | ❌ | ✅ Checkbox multi-select |
| Character page Agent assistant | ❌ | ✅ Three-column Agent panel |

## Architecture

```
OmniFic
├── OpenFic v0.7.5 core          ← Worldbuilding / Agent Runtime / RAG / Writing editor
├── Deep relay/proxy support      ← Model discovery, capability override, URL-first strategy
├── Codex-style command center    ← /MCP /Reasoning /Model /Status /Goal /Skills
├── Multi-format worldbook import ← MarkItDown parsing + LLM enhancement
├── Novel TXT smart import        ← Volume parsing + auto Volume creation
└── Writing efficiency            ← Task goal persistence / Reasoning timer / Multi-select
```

## Quick Start

> OmniFic shares the exact same tech stack and deployment approach as OpenFic.

### Requirements

- Python 3.12+
- Node.js 22+
- pnpm

### Local Development

```bash
# Clone the repository
git clone https://github.com/F0rJay/OmniFic.git
cd OmniFic

# Backend
cd backend
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --app-dir .

# Frontend
cd frontend
pnpm install
pnpm dev
```

Frontend runs at `http://127.0.0.1:9000` by default, backend at `http://127.0.0.1:8001`.

### Docker

```bash
docker run -d -p 8000:8000 -v "omnific:/data" --name omnific ghcr.io/F0rJay/omnific:latest
```

## Migrating from OpenFic

If you already have OpenFic project data, simply copy the data directory:

```bash
cp -r ~/openfic-data ~/omnific-data
```

OmniFic's database schema is backward-compatible with OpenFic. All new fields have defaults, and existing data requires no conversion.

## Acknowledgements

This project is based on [OpenFic](https://github.com/syrizelink/OpenFic). Thanks to the original authors for their outstanding work.

OpenFic's design philosophy — "let the Agent fit your writing process, not the other way around" — is also OmniFic's starting point. Every customization we've made is about pushing that philosophy further.

Other inspirations:

- [SillyTavern](https://github.com/SillyTavern/SillyTavern) — worldbook format reference
- [Claude Code](https://claude.ai/code) — `/` command interaction paradigm
- [oh-story-claudecode](https://github.com/worldwonderer/oh-story-claudecode) — built-in writing Skill reference

## Communication

Anyone interested in AI-assisted fiction writing is welcome to exchange ideas and learn together — open an Issue or reach out directly.

## License

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
