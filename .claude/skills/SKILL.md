---
description: "Use when the user wants to create a new skill. Generates a SKILL.md with proper frontmatter and scaffolds optional cookbook/references folders."
---

# Skill Creator

## Purpose

Scaffold a new skill with proper frontmatter, structure, and optional cookbook/references folders.

## Trigger

User asks to create a new skill, modify a skill structure, or scaffold skill files.

## Golden Rules

1. **Description <= 200 characters** — the description in frontmatter must be concise and specific
2. **SKILL.md is self-contained** — everything needed to execute the skill lives in SKILL.md (or files it explicitly references)
3. **No emojis** — keep skill content professional and searchable

## Workflow

1. **Collect info**
   - Ask for skill name via AskUserQuestion (kebab-case only)
   - Ask for description (one clear sentence, under 200 chars)
   - Ask for complexity: `minimal` or `with-cookbook`

2. **Validate**
   - Name must be kebab-case: `^[a-z][a-z0-9-]*$`
   - No collision with existing skills in `.claude/skills/`
   - Description must have a clear trigger (when to use it)

3. **Generate**
   - Read the appropriate template:
     - `.claude/skills/skill-creator/templates/minimal-skill.md`
     - `.claude/skills/skill-creator/templates/with-cookbook-skill.md`
   - Substitute `{{NAME}}` and `{{DESCRIPTION}}` placeholders
   - Create directory structure:
     - `.claude/skills/[name]/SKILL.md`
     - If with-cookbook: also create `cookbook/` and `references/` subdirectories

4. **Report**
   - Show the path to the new skill
   - Remind the golden rules
   - Suggest testing by invoking the skill

## Report

```
Skill Created

Name: [name]
Path: .claude/skills/[name]/SKILL.md
Complexity: [minimal/with-cookbook]

Structure:
[tree output]

Golden Rules Reminder:
1. Description <= 200 characters
2. SKILL.md is self-contained
3. No emojis

Next: Test by invoking the skill in a new conversation
```
