# OmniFic user guide

> Last updated: 2026-07-29 · Applies to OmniFic 0.8.1

This guide is for writers using OmniFic for the first time. It covers starting a manuscript, importing existing work, organizing characters and worldbuilding material, and collaborating with Agents under explicit permissions.

For installation, updates, backups, and complete removal, see the [installation and removal guide](./installation_EN.md).

## Quick-start path

For a first setup, follow this order:

1. Open **Settings** from the lower-left area of the application.
2. Add a model service URL and API key under **Providers**, then validate the connection.
3. Create at least one language model under **Models** and make it the default model.
4. Return to **Projects** and create a project or import a TXT manuscript.
5. Open the project, create a volume and chapter, and begin writing.
6. When you need AI assistance, create a conversation in the right-hand Agent panel.
7. Configure an Embedding model and indexing only when you need semantic chapter search.

Manual writing does not require a model. Agent work, automatic summaries, and model-assisted import cleanup require a language model. Semantic chapter retrieval requires an Embedding model.

## Main interface

The primary sidebar contains:

| Area | Purpose |
|---|---|
| Projects | Create, import, search, and manage novels |
| Worldbook | Store locations, rules, organizations, objects, history, and research |
| Characters | Maintain character profiles, portraits, descriptions, and favorites |
| Prompts | Inspect and version the prompt chains used by the system |
| Dashboard | Review writing activity, model usage, and individual calls |
| Settings | Configure appearance, models, indexing, permissions, rules, skills, and Agents |

Inside a project, the workspace normally has three areas:

- Left: the volume/chapter tree and notes tree.
- Center: chapter and note editors with multiple tabs.
- Right: Agent conversations, task state, tool calls, and context controls.

Each panel can be collapsed. On narrow windows, some panels become drawers or overlays.

## Configure model services

### Add a provider

Open **Settings → Providers** and choose **New connection**:

1. Choose the provider type. For a relay or OpenAI-compatible service, use **Custom / Relay**.
2. Enter the service URL. Use the provider's documented Base URL for a relay.
3. Enter the API key.
4. Select **Validate connection**.
5. Save after validation succeeds.

Some providers do not implement a model-list API. An empty remote model list does not always mean the connection is unusable; enter the exact model ID manually when creating a model.

### Create a language model

Open **Settings → Models → Language models**, then choose **New model**:

1. Enter a recognizable local name.
2. Select the provider.
3. Select a discovered model or enter its model ID manually.
4. Keep the task type as **Language model (LLM)**.
5. Set context length and maximum output according to the provider. Leave advanced sampling parameters unchanged if unsure.
6. Save and assign the model as the **Default model**.

It is also useful to set a **Light model** for titles, summaries, and other smaller tasks. It may be the same model as the default.

Agents require tool-calling support. A model that only produces text may chat normally but cannot reliably read or modify project content.

### Reasoning models and relays

OmniFic tries to detect reasoning support automatically. If a relay does not expose correct model metadata, override reasoning support in the model settings. See [model reasoning capabilities](./features/model-reasoning.md) and [relay providers](./features/relay-provider.md).

## Create or import a project

### Start an empty project

On the **Projects** page, select **New project**:

1. Enter a title.
2. Optionally add a description and cover.
3. Open the project card.
4. Create a volume in the left panel, then add a chapter.

Projects can be searched, sorted by recent edit, creation time, or name, and displayed as a grid or list.

### Import a TXT manuscript

Select **Import** on the Projects page and choose a TXT file. OmniFic attempts to detect the encoding, volume headings, and chapter headings, then shows the chapter count, total words, and a preview before writing data.

If no chapter headings are detected, the entire document is imported as one chapter. Inspect the preview before confirming the title and import. See [volume-aware TXT import](./features/txt-volume-import.md) for detection rules.

Import creates a new project; it is not intended to overwrite an existing one. Keep the original manuscript as a backup.

## Volumes, chapters, and writing

### Manage volumes and chapters

Select **Chapters** in the project sidebar:

- Create volumes and edit their names, descriptions, and order.
- Create, duplicate, rename, move, or delete chapters.
- Enter sorting mode to drag volumes and chapters, then save the new order.
- Open a chapter in the editor or use its menu to open it in a new tab.

Deleting a project, volume, or chapter is irreversible. Deleting a volume that contains chapters requires an additional confirmation.

### Editing and autosave

The editor supports headings, lists, quotes, code blocks, and other common rich-text structures. Changes enter an autosave flow; watch for the saving, saved, failed, or retry state before closing the application.

Useful shortcuts:

| Windows/Linux | macOS | Action |
|---|---|---|
| `Ctrl + S` | `Command + S` | Save now |
| `Ctrl + F` | `Command + F` | Find |
| `Ctrl + H` | `Command + H` | Find and replace |

Use multiple tabs to keep chapters, outlines, and reference notes open together. Tabs can be locked, closed individually, or closed in groups.

### Notes

Switch the left panel from **Chapters** to **Notes** to:

- Create nested categories and notes.
- Move, duplicate, rename, or delete notes.
- Keep outlines, timelines, research, and unresolved questions separate from the manuscript.
- Lock notes that an Agent must not edit.

Chapters, notes, volumes, and selected editor text can be attached to the current Agent conversation.

## Characters and worldbooks

### Characters

Open **Characters**, select a project, and create a profile:

- Enter a name and description.
- Upload and crop a portrait.
- Search, favorite, sort, and batch-manage large casts.
- Record motivations, relationships, abilities, voice, and hard constraints so Agents can maintain consistency.

Keep character names reasonably stable. Frequent renaming makes references in old chapters, summaries, and prompts harder to match.

### Worldbooks

Open **Worldbook**, select a project and worldbook, then create entries. Prefer one coherent topic per entry, such as a place, faction, rule, object, historical event, or research source.

Entries can be enabled or disabled. Disable material that should remain stored but should no longer be treated as active canon.

### Import worldbuilding material

Worldbook import supports:

- SillyTavern worldbook JSON.
- Markdown, PDF, DOCX, PPTX, and TXT documents.

The import flow parses the file and presents a preview. **Append** preserves existing entries and may update duplicate names. **Overwrite** removes current entries before import, so back up first.

Document import can optionally use a model to improve names, merge duplicates, or split long entries. This consumes model requests and tokens. See [multi-format worldbook import](./features/worldbook-import.md).

## Work with Agents

### Prerequisites

Agent work requires at least:

1. A validated provider.
2. A default language model with tool-calling support.
3. A current project with content or reference material.
4. Tool permissions that do not deny the required read, search, or write tools.

Embedding and Rerank models are optional for basic conversation, but semantic chapter search requires Embedding.

### Start a task

Create a conversation in the right-hand Agent panel and state the goal, scope, and constraints. For example:

> Read the existing chapters in Volume One and the protagonist profile. Check whether Chapter Twelve is consistent. List issues first and do not edit the manuscript.

For editing tasks, specify:

- The chapters, volumes, or notes in scope.
- Voice, viewpoint, and length requirements.
- Canon that must not change.
- Whether you want advice only or allow writes.
- Whether the Agent should plan or ask questions before editing.

Specific requests help the Agent choose the correct tools and context.

### Attach context

Attach chapters, volumes, notes, characters, worldbook entries, or selected text when they are mandatory reading. Agents can retrieve other material with search and read tools.

Avoid attaching large amounts of unrelated text. Excess context increases token use and can dilute the most important constraints.

### Permissions, approvals, and previews

Under **Settings → Tool permissions**, each tool has a default policy:

- Allow: the Agent may call it directly.
- Ask: you must approve the call.
- Deny: the Agent cannot call it.

For create, edit, and delete tools, start with **Ask**. Before approval, inspect the tool name, target, and change preview.

Cancelling an Agent does not automatically undo data that was already written successfully. Back up before large edits and use approval previews to limit the write scope.

### Tasks, goals, and slash commands

The Agent panel stores conversation and task history. Use `/` commands to inspect status, switch model or reasoning effort, maintain a persistent goal, and select skills.

Persistent goals help long tasks survive conversation compaction or reopening. See the [`/` command center](./features/codex-slash.md) and [persistent task goals](./features/task-goal.md).

### Primary Agents and subagents

A primary Agent may delegate independent research or review tasks to configured subagents. Their queued, running, waiting, completed, and failed states remain visible in the conversation.

Configure them under **Settings → Agents**. Multi-agent execution is useful only when work can be separated; a single Agent is usually clearer for small edits.

## Summaries, indexing, and long context

### Summaries

Chapter summaries compress manuscript content into shorter plot and canon notes. Range summaries combine consecutive chapters. They help Agents navigate a long story but do not replace important source chapters.

After manuscript edits, summaries may become stale. Use the summary maintenance view to generate, update, or retry missing, stale, or failed items.

### Semantic retrieval index

Before enabling semantic chapter search:

1. Create an Embedding model under **Settings → Models → Embedding models**.
2. Assign it as the default Embedding model.
3. Under **Settings → Index**, enable all projects or selected projects.
4. Configure automatic updates, chunk size, and overlap if needed.
5. Build the index after first setup or a model change.

Changing the default Embedding model invalidates existing indexes and requires a rebuild. A Rerank model is optional and reorders initial retrieval results.

If the Agent reports that indexing is disabled, unconfigured, stale, failed, or requires rebuilding, resolve that state before retrying semantic search.

## Prompts, rules, skills, and Agent definitions

Adjust these after the basic workflow is stable:

- Prompts: edit and version conversation, summary, compaction, and Agent prompt chains.
- Rules: maintain writing or execution constraints that should persist across conversations.
- Skills: enable built-in skills or import specialized workflows.
- Agents: configure primary Agents, subagents, models, tools, skills, and delegation relationships.

Prompt and Agent changes can significantly alter behavior. Change one objective at a time, keep version notes, and validate on a small task before using it across a manuscript.

## Dashboard and diagnostics

The **Dashboard** provides:

- Writing: calendar activity, active days, word trends, and user/Agent/import sources.
- LLM: call count, tokens, latency, time to first token, model distribution, and project distribution.
- Records: individual call status and, when detailed recording is enabled, tools, input, and output.

Detailed call recording under **Settings → Advanced** increases database size and is best enabled temporarily for diagnosis. Clearing details preserves aggregate call, token, and timing statistics.

## Recommended workflows

### Start a new novel

1. Create a project and first volume.
2. Build an outline, timeline, and unresolved-question list in Notes.
3. Create the main characters and core worldbook entries.
4. Generate summaries after several chapters.
5. Configure Embedding and build an index.
6. Let Agents begin with read-only analysis before granting write permission.

### Continue an existing manuscript

1. Back up the original TXT and supporting material.
2. Import the TXT and inspect volume/chapter detection.
3. Import or organize characters, canon, and research.
4. Generate summaries and a retrieval index.
5. Ask an Agent to perform read-only analysis of characters, timeline, and unresolved threads before continuing the story.

### Large revision

1. Back up the desktop data directory.
2. Put the revision goal and immutable canon into a task goal or rules.
3. Ask the Agent for a plan and affected-chapter list first.
4. Set write tools to **Ask**.
5. Approve edits by volume or chapter, then refresh stale summaries and indexes.

## Data safety and privacy

- Manuscripts and primary application data are stored in local SQLite by default.
- Context used with cloud LLM, relay, Embedding, or Rerank services is sent to the service you configured.
- API-key and manuscript security depends on local device security and the selected provider.
- Back up before deleting projects, volumes, chapters, characters, worldbook entries, or data directories.
- OmniFic 0.8.1 remains Alpha software and does not guarantee lossless direct reuse of OpenFic or 0.8.0 data directories.

See the [installation and removal guide](./installation_EN.md) for backup paths and residual files.

## Troubleshooting

### The startup screen keeps loading or reports initialization failure

Use the visible retry action. If it still fails, check whether the local backend is running, whether the port is occupied, and whether a proxy is interfering with local connections. Inspect the desktop startup logs described in the [installation guide](./installation_EN.md).

### The Agent can chat but cannot read or edit content

Confirm that the model supports tool calling and that **Settings → Tool permissions** does not deny the required tools. Semantic search also requires an Embedding model and a healthy index.

### The Agent asks for approval every time

The relevant tool policy is set to **Ask**. Change it under Tool permissions only after you trust the model and workflow; keep approval for deletion and large writes.

### Semantic search returns nothing

Confirm that indexing is enabled for the project, the default Embedding model works, and the index is not missing, stale, failed, or awaiting rebuild. Title search does not require Embedding.

### Content is not saving

Inspect the editor save state and retry before closing the application. Check disk space, data-directory permissions, and backend health, then wait for the saved state.

### macOS blocks the application or requires manual updates

OmniFic 0.8.1 is not Developer ID signed or notarized. See the [installation guide](./installation_EN.md) for first launch and manual updates.

### Can I use OmniFic without AI?

Yes. Projects, volumes, chapters, notes, characters, and worldbooks can be used without configuring a model, which prevents model requests from being made.

