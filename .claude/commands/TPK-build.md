---
description: Build from a plan file, then move plan to done/
allowed-tools: Read, Write, Bash, Edit, Glob, Grep
model: sonnet
argument-hint: [path-to-plan]
---

# Build

## Purpose

Implement a plan from `specs/todo/` into working code. After successful completion, the plan is moved to `specs/done/` to track progress. Pairs with `/quick-plan`.

## Variables

PATH_TO_PLAN: $ARGUMENTS

## Instructions

- If no path provided, check `specs/todo/` and ask which plan to build
- Create a git branch with the appropriate name and type prefix before building
- Read the entire plan before starting implementation
- Follow the plan's phases in order
- If build fails, leave the plan in `specs/todo/` for retry

## Workflow

1. **Locate the plan**
   - If PATH_TO_PLAN is provided, use it
   - Otherwise, list files in `specs/todo/` and ask user which to build

2. **Read and understand**
   - Read the plan file completely
   - Think through the implementation approach
   - Identify any potential issues before starting

3. **Create a git branch**
   - Infer the branch type from the plan's content and title:
     - `feat/` — new feature or capability
     - `fix/` — bug fix
     - `chore/` — maintenance, deps, config, tooling
     - `docs/` — documentation only
     - `refactor/` — code restructuring without behavior change
     - `test/` — adding or updating tests
     - `hotfix/` — urgent production fix
   - Derive a short, hyphenated name from the plan title or filename
   - Run `git checkout -b [type]/[name]` (e.g. `feat/user-auth`, `fix/login-redirect`)
   - Confirm the branch was created before proceeding

4. **Implement**
   - Follow the plan's phases step by step
   - Create/modify files as specified
   - Run any build/lint checks if applicable

5. **Validate (if applicable)**
   - If project has tests, run them
   - If frontend project, run build to check for errors
   - Fix any issues before proceeding

6. **Move plan to done**
   - On success: `mkdir -p specs/done && mv [PATH_TO_PLAN] specs/done/`
   - On failure: leave in `specs/todo/` for retry

7. **Show changes**
   - Run `git status` to show what changed
   - Ask user if they want to commit

## Report

```
Build Complete

Plan: [original path]
Branch: [type]/[name]
Status: SUCCESS / FAILED
Location: specs/done/[filename] (moved) OR specs/todo/[filename] (retry needed)

Changes Made:
- [change 1]
- [change 2]
- [change 3]

Files Modified: [count]

Next: Review changes with `git diff` or commit with `/commit`
```
