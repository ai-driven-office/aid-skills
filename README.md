# AID Skills (AI Driven Office)

> **Fork Notice:** This repository is a fork of [Anthropic's Agent Skills](https://github.com/anthropics/skills), adapted for **AI Driven Office** by CyberAgent. For information about the Agent Skills standard, see [agentskills.io](http://agentskills.io).

## What are AID Skills?

AID Skills are folders of instructions, scripts, and resources that AI agents load dynamically to improve performance on specialized tasks. Skills teach AI agents how to complete specific tasks in a repeatable way, whether that's creating documents with your company's brand guidelines, analyzing data using your organization's specific workflows, or automating office tasks.

Skills enable AI-driven automation across the enterprise, making it easier to standardize workflows and improve productivity.

## About This Repository

This repository contains skills adapted for CyberAgent's AI Driven Office initiative. These skills range from creative applications (art, music, design) to technical tasks (testing web apps, MCP server generation) to enterprise workflows (communications, branding, document processing, etc.).

Each skill is self-contained in its own folder with a `SKILL.md` file containing the instructions and metadata that AI agents use. Browse through these skills to get inspiration for your own skills or to understand different patterns and approaches.

### Skill Categories

| Category | Description |
|----------|-------------|
| **Document Skills** | Excel, Word, PowerPoint, and PDF processing capabilities |
| **Creative & Design** | Algorithmic art, canvas design, frontend design, theme creation |
| **Development & Technical** | MCP server building, web app testing, artifact building |
| **Enterprise & Communication** | Internal comms, brand guidelines, document co-authoring |

## Repository Structure

```
aid-skills/
├── skills/           # Skill implementations
│   ├── docx/         # Word document processing
│   ├── xlsx/         # Excel spreadsheet processing
│   ├── pptx/         # PowerPoint presentation processing
│   ├── pdf/          # PDF document processing
│   ├── mcp-builder/  # MCP server generation
│   └── ...           # Additional skills
├── spec/             # Agent Skills specification reference
├── template/         # Skill template for creating new skills
└── AGENTS.md         # Guidelines for AI agents working with this repo
```

## Using AID Skills

### Claude Code

You can register this repository as a Claude Code Plugin marketplace:

```bash
/plugin marketplace add cyberagent/aid-skills
```

Then, to install a specific set of skills:
1. Select `Browse and install plugins`
2. Select `aid-skills`
3. Select `document-skills` or `example-skills`
4. Select `Install now`

Alternatively, directly install either Plugin via:
```bash
/plugin install document-skills@aid-skills
/plugin install example-skills@aid-skills
```

After installing the plugin, you can use the skill by mentioning it. For instance, if you install the `document-skills` plugin, you can ask: "Use the PDF skill to extract the form fields from `path/to/some-file.pdf`"

### API Integration

Skills can be integrated into your AI workflows via the appropriate API. See the skill-specific documentation for integration details.

## Creating a Basic Skill

Skills are simple to create - just a folder with a `SKILL.md` file containing YAML frontmatter and instructions. You can use the **template-skill** in this repository as a starting point:

```markdown
---
name: my-skill-name
description: A clear description of what this skill does and when to use it
---

# My Skill Name

[Add your instructions here that the AI agent will follow when this skill is active]

## Examples
- Example usage 1
- Example usage 2

## Guidelines
- Guideline 1
- Guideline 2
```

The frontmatter requires only two fields:
- `name` - A unique identifier for your skill (lowercase, hyphens for spaces)
- `description` - A complete description of what the skill does and when to use it

The markdown content below contains the instructions, examples, and guidelines that the AI agent will follow.

## License

Many skills in this repo are open source (Apache 2.0). The document creation & editing skills (`skills/docx`, `skills/pdf`, `skills/pptx`, `skills/xlsx`) are source-available and included as reference for complex skill implementations.

See individual skill folders for specific license information.

## Disclaimer

**These skills are provided for demonstration and educational purposes.** Implementations and behaviors may vary depending on the AI agent used. Always test skills thoroughly in your own environment before relying on them for critical tasks.

---

*Maintained by CyberAgent - AI Driven Office Team*
