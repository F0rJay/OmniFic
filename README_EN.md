![OmniFic brand banner with a turning-page loop and flowing digital text](./docs/assets/readme/omnific-hero.webp)

<h1 align="center">OmniFic</h1>

<p align="center">
  <strong>A personal experiment in AI-assisted long-form fiction, shaped by actual writing practice.</strong>
</p>

<p align="center">
  <a href="./README.md">中文</a> · English
</p>

<p align="center">
  <img alt="Apache 2.0 License" src="https://img.shields.io/badge/License-Apache_2.0-8B5CF6">
  <img alt="Python 3.12–3.13" src="https://img.shields.io/badge/Python-3.12%E2%80%933.13-22D3EE">
  <img alt="Based on OpenFic v0.7.5" src="https://img.shields.io/badge/Based_on-OpenFic_v0.7.5-070A12">
</p>

## A personal note

> OmniFic is not a replacement for OpenFic, nor is it a claim to be the “more correct” version. It is simply the branch I made while adapting the project to my own writing habits, model setup, and interaction preferences.

I am deeply grateful to [OpenFic](https://github.com/syrizelink/OpenFic). It supplied everything that matters most here: worldbuilding tools, the editor, the Agent runtime, local data management, and a complete product worth building upon. OmniFic was forked from OpenFic v0.7.5 and has since taken an independent path.

That decision is not a criticism of upstream. Over time, I realized that many of my changes were highly personal. I rely on model relays, prefer command-driven Agent interaction, and care disproportionately about importing research, maintaining task continuity, and understanding reasoning state during long-form work. Those choices will not suit everyone, and upstream should not be expected to adopt them.

I keep OmniFic public primarily to share what I have learned, exchange ideas, and learn alongside others. It remains a tool shaped first by my own writing practice.

## What is OmniFic?

OmniFic is a locally run, AI-assisted environment for long-form fiction. Built on OpenFic v0.7.5, it retains project, character, worldbook, chapter-editing, and Agent collaboration capabilities while experimenting around my own workflow.

The project combines a Python backend, a React frontend, and an optional Electron shell. Running from source is currently the recommended way to use it. See the [architecture overview](./docs/architecture.md) for the system structure.

## The choices I made

These are not judgments about upstream. They are the areas I chose to prioritize after repeatedly encountering them in daily use.

### Model access

- Treat OpenAI-compatible relays and API proxies as a normal setup
- Discover models from a relay and override reasoning capabilities per model
- Make provider, base-URL, and capability configuration more direct

See [relay providers](./docs/features/relay-provider.md) and [model reasoning capabilities](./docs/features/model-reasoning.md).

### Agent interaction

- Use `/` commands for model, reasoning, status, goal, and skill operations
- Use `@` references to bring project material into a conversation
- Preserve task goals and runtime state to reduce discontinuity in long sessions

See the [`/` command center](./docs/features/codex-slash.md) and [persistent task goals](./docs/features/task-goal.md).

### Source-material import

- Turn Markdown, PDF, Word, PowerPoint, and TXT material into worldbook candidates
- Optionally use a model to organize material during import
- Detect volume and chapter structure in existing novel TXT files

See [worldbook import](./docs/features/worldbook-import.md) and [volume-aware TXT import](./docs/features/txt-volume-import.md).

### Long-form writing

- Give more attention to task continuity, context management, and Agent reasoning state
- Continue small experiments around character pages, multi-select questions, and long-running tasks
- Prioritize recurring problems in actual writing over feature count

## Who might enjoy it?

OmniFic may suit you if you:

- Use a personal or team relay, or another OpenAI-compatible endpoint
- Prefer `/` commands, `@` references, and Agent-oriented workflows
- Need to organize extensive research, setting material, old drafts, or long novel structures
- Are comfortable running software locally, reading documentation, and accepting experimental change

It may not suit you if you:

- Want a zero-configuration download-and-run product
- Require stable desktop installers, a hosted service, or long-term release support
- Expect continuous OpenFic synchronization or guaranteed lossless data migration
- Expect the roadmap to be driven primarily by broad community demand

## Current status

OmniFic is personally maintained and experimental.

- It forked from OpenFic v0.7.5 but does not promise ongoing upstream synchronization
- Features, interactions, and data structures may change as my own usage evolves
- Issues, discussions, and pull requests are welcome, but acceptance is not a roadmap commitment
- Desktop builds, a PyPI package, and remote Docker images are not currently presented as stable distribution channels
- Back up all data before database upgrades or OpenFic migration; copying an existing data directory is not guaranteed to be lossless

## Quick start

### Requirements

- Python 3.12 or 3.13
- Node.js 22+
- pnpm 8+
- [uv](https://docs.astral.sh/uv/)

### Run from source

```bash
git clone https://github.com/F0rJay/OmniFic.git
cd OmniFic

# Terminal 1: backend
cd backend
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --app-dir .
```

Open a second terminal:

```bash
cd OmniFic/frontend
pnpm install
pnpm dev
```

The frontend runs at `http://127.0.0.1:9000` by default, with the backend at `http://127.0.0.1:8001`.

For database setup, desktop development, and more detailed instructions, see the [development setup guide](./docs/develop/setup.md). The [documentation index](./docs/README.md) links to all current technical notes.

## Join the conversation

This repository is public to share practice, compare approaches, and learn together. You are welcome to open an [Issue](https://github.com/F0rJay/OmniFic/issues), send a [Pull Request](https://github.com/F0rJay/OmniFic/pulls), or read the [contribution guide](./CONTRIBUTING.md).

If an idea is not adopted, it will usually mean that it does not fit the choices of this personal branch—not that the idea lacks merit.

## Acknowledgements

My first thanks go to [OpenFic](https://github.com/syrizelink/OpenFic) and its author. OmniFic's foundation, primary product shape, and many of its core capabilities come from OpenFic. This branch would not exist without that work.

Other sources of inspiration include:

- [SillyTavern](https://github.com/SillyTavern/SillyTavern): worldbook formats and ecosystem references
- [Claude Code](https://claude.ai/code): command-driven Agent interaction
- [oh-story-claudecode](https://github.com/worldwonderer/oh-story-claudecode): writing Skill references

## License

OmniFic is released under the [Apache License 2.0](./LICENSE). Please retain any copyright and license notices required by the upstream project when using or redistributing it.
