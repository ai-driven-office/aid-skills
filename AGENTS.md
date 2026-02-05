# AGENTS.md - AID Skills Repository

This file provides guidance for AI agents working with the AID (AI Driven Office) Skills repository.

## Repository Overview

This repository contains AI agent skills for CyberAgent's AI Driven Office initiative. It is a fork of Anthropic's Agent Skills, adapted for enterprise use.

## Key Directories

| Path | Purpose |
|------|---------|
| `skills/` | Contains all skill implementations |
| `skills/*/SKILL.md` | Skill definition and instructions |
| `spec/` | Agent Skills specification reference |
| `template/` | Template for creating new skills |

## Working with Skills

### Skill Structure

Each skill follows this structure:
```
skills/<skill-name>/
├── SKILL.md           # Required: Skill definition with YAML frontmatter
├── LICENSE.txt        # License information
├── scripts/           # Optional: Python/shell scripts
├── reference/         # Optional: Reference documentation
└── examples/          # Optional: Usage examples
```

### SKILL.md Format

```yaml
---
name: skill-name          # lowercase, hyphens for spaces
description: Description  # When to use this skill
---

# Skill Title

Instructions for the AI agent...
```

## Skill Categories

### Document Skills (Production-ready)
- `docx/` - Word document processing
- `xlsx/` - Excel spreadsheet processing  
- `pptx/` - PowerPoint presentation processing
- `pdf/` - PDF document processing

### Example Skills
- `algorithmic-art/` - Generative art creation
- `brand-guidelines/` - Brand consistency enforcement
- `canvas-design/` - Visual design on canvas
- `doc-coauthoring/` - Document collaboration
- `frontend-design/` - UI/UX design patterns
- `internal-comms/` - Internal communications
- `mcp-builder/` - MCP server generation
- `skill-creator/` - Creating new skills
- `slack-gif-creator/` - Animated GIF creation
- `theme-factory/` - Theme generation
- `web-artifacts-builder/` - Web artifact bundling
- `webapp-testing/` - Web application testing

## Development Guidelines

### Creating New Skills

1. Copy `template/SKILL.md` to `skills/<new-skill-name>/SKILL.md`
2. Update the YAML frontmatter with name and description
3. Write clear, actionable instructions
4. Include examples when helpful
5. Add scripts in `scripts/` if needed
6. Add `LICENSE.txt` for open source skills

### Code Standards

- Python scripts should be self-contained when possible
- Include `requirements.txt` if external dependencies are needed
- Scripts should handle errors gracefully
- Use type hints in Python code

### Testing Skills

- Test skills manually before committing
- Verify SKILL.md YAML frontmatter is valid
- Ensure all referenced files exist
- Test scripts independently

## Common Tasks

### Adding a Skill to a Plugin

Edit `.claude-plugin/marketplace.json` and add the skill path to the appropriate plugin's `skills` array.

### Validating Skill Structure

A valid skill must have:
1. `SKILL.md` with valid YAML frontmatter
2. `name` field (lowercase, hyphens)
3. `description` field (clear, actionable)

## Notes for AI Agents

- Always read `SKILL.md` before using a skill
- Skills may contain scripts that need to be executed
- Reference files in `reference/` provide additional context
- Examples in `examples/` show expected usage patterns
- Document skills (`docx`, `xlsx`, `pptx`, `pdf`) have complex implementations with Office XML schemas

## Contact

Maintained by CyberAgent - AI Driven Office Team
