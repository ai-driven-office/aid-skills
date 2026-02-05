# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

AID Skills (AI Driven Office) is a collection of AI agent skills for CyberAgent's enterprise automation initiative. It's a fork of Anthropic's Agent Skills adapted for enterprise use. Skills are folders of instructions, scripts, and resources that AI agents load dynamically to improve performance on specialized tasks.

## Repository Structure

```
aid-skills/
├── skills/              # Skill implementations (each with SKILL.md)
├── spec/                # Agent Skills specification (links to agentskills.io)
├── template/            # Skill template for new skills
├── .claude-plugin/      # Marketplace configuration for Claude Code plugins
└── AGENTS.md            # Guidelines for AI agents
```

## Skill Architecture

Each skill follows this structure:
```
skills/<skill-name>/
├── SKILL.md           # Required: YAML frontmatter + markdown instructions
├── LICENSE.txt        # License information
├── scripts/           # Optional: Python/shell scripts for deterministic tasks
├── reference/         # Optional: Documentation loaded on-demand
└── examples/          # Optional: Usage examples
```

### SKILL.md Format

```yaml
---
name: skill-name          # lowercase, hyphens for spaces
description: Description  # When to use this skill (primary triggering mechanism)
---

# Skill Title

Instructions for the AI agent...
```

The `description` field is critical—it's how Claude determines when to activate a skill. Include both what the skill does AND specific triggers/contexts.

## Skill Categories

| Category | Skills | Purpose |
|----------|--------|---------|
| Document | `docx`, `xlsx`, `pptx`, `pdf` | Office document processing with complex OOXML schemas |
| Creative | `algorithmic-art`, `canvas-design`, `frontend-design`, `theme-factory` | Visual design and art generation |
| Development | `mcp-builder`, `webapp-testing`, `web-artifacts-builder` | Technical development tools |
| Enterprise | `internal-comms`, `brand-guidelines`, `doc-coauthoring` | Business workflows |
| Meta | `skill-creator` | Creating new skills |

## Creating New Skills

Use the skill-creator scripts:
```bash
# Initialize a new skill
python skills/skill-creator/scripts/init_skill.py <skill-name> --path <output-dir>

# Validate and package a skill
python skills/skill-creator/scripts/package_skill.py <path/to/skill-folder>

# Quick validation only
python skills/skill-creator/scripts/quick_validate.py <path/to/skill-folder>
```

## Plugin System

Skills are organized into plugins via `.claude-plugin/marketplace.json`:
- `document-skills`: docx, xlsx, pptx, pdf
- `example-skills`: All other demonstration skills

Install via Claude Code:
```bash
/plugin marketplace add cyberagent/aid-skills
/plugin install document-skills@aid-skills
```

## Key Design Principles

1. **Concise context**: The context window is shared—only include information Claude doesn't already have
2. **Progressive disclosure**: Keep SKILL.md lean (<500 lines), split details into reference files
3. **Appropriate freedom**: Match specificity to task fragility (scripts for fragile ops, instructions for flexible ones)
4. **No extraneous files**: Skills contain only essential files—no README.md, CHANGELOG.md, etc.

## Working with Document Skills

The document skills (`docx`, `xlsx`, `pptx`, `pdf`) have complex implementations working directly with Office XML schemas. They include:
- Python scripts for common operations
- Reference files for advanced features (e.g., `FORMS.md` for PDF forms)
- OOXML schema documentation
