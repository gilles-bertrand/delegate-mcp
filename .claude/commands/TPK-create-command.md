---
description: Scaffold a new TPK slash command from a template
allowed-tools: Read, Write, Bash, Glob, AskUserQuestion
model: sonnet
argument-hint: [command-name] [--purpose "short description"]
---

# TPK-Create-Command

## Purpose

Generate a new TPK slash command from the shared template. Produces a ready-to-use markdown file in `.claude/commands/`.

## Variables

ARGUMENTS: $ARGUMENTS

## Instructions

- Command names must be kebab-case (lowercase, hyphens only)
- Never overwrite an existing command without explicit confirmation
- Generated commands follow the same structure as existing TPK commands

## Workflow

1. **Parse arguments**
   - Extract command name from ARGUMENTS (required)
   - Extract `--purpose` value if provided
   - Extract optional `--tools`, `--model`, `--argument-hint` flags

2. **Validate name**
   - Check kebab-case format (`^[a-z][a-z0-9-]*$`)
   - Check for collisions: glob `.claude/commands/TPK-[name].md`
   - If collision, inform user and suggest alternatives

3. **Collect missing info**
   - If purpose not provided, ask via AskUserQuestion
   - If tools not specified, ask via AskUserQuestion with sensible defaults (Read, Edit, Glob, Grep, Bash)
   - If model not specified, default to `sonnet`

4. **Generate from template**
   - Read `.claude/commands/templates/command.template.md`
   - Substitute placeholders:
     - `{{NAME}}` with the command name (without TPK- prefix)
     - `{{PURPOSE}}` with the description
     - `{{TOOLS}}` with the allowed-tools list
     - `{{MODEL}}` with the chosen model
     - `{{ARGUMENT_HINT}}` with a generated hint

5. **Write file**
   - Write to `.claude/commands/TPK-[name].md`
   - Confirm the file was created

6. **Report**
   - Show the path to the new command
   - Suggest testing via `/TPK-[name]`

## Report

```
Command Created

Name: TPK-[name]
Path: .claude/commands/TPK-[name].md
Purpose: [description]
Tools: [tool list]
Model: [model]

Next: Test it with /TPK-[name]
```
