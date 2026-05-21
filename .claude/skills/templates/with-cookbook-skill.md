---
description: "{{DESCRIPTION}}"
---

# {{NAME}}

## Purpose

[What this skill does in 1-2 sentences]

## Trigger

[When to use this skill — specific user actions or contexts]

## Workflow

1. **Assess**
   - Read the user's request
   - Determine which cookbook recipe applies (see `cookbook/`)
   - If no recipe matches, fall back to the general workflow below

2. **Execute**
   - Follow the matching cookbook recipe step by step
   - Use reference materials from `references/` when needed
   - Adapt the recipe to the specific context

3. **Validate**
   - Check the result against the expected outcome
   - Fix any issues before reporting

4. **Report**
   - Summarize what was done
   - Note any deviations from the cookbook

## Rules

- [rule 1]
- [rule 2]
- [rule 3]

## Cookbook Structure

```
cookbook/
  recipe-1.md    — [when to use]
  recipe-2.md    — [when to use]
references/
  ref-1.md       — [what it contains]
```

## Report

```
## [Skill Name] Result

Status: SUCCESS / FAILED
Recipe Used: [name or "general workflow"]
Details: [summary]

Changes:
- [change 1]
- [change 2]

Next: [suggested action]
```
