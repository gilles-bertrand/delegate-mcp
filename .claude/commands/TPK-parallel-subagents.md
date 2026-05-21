---
description: Dispatch N independent subagents in parallel and merge findings
allowed-tools: Agent, TaskCreate, TaskUpdate, TaskList, AskUserQuestion
model: opus
argument-hint: "[task1] | [task2] | ... [--subagent-type general-purpose|Explore]"
---

# TPK-Parallel-Subagents

## Purpose

Orchestrate multiple independent research or implementation tasks in parallel using subagents, then merge results into a single synthesized report.

## Variables

ARGUMENTS: $ARGUMENTS

## Instructions

- Maximum 5 tasks in parallel (guardrail against context explosion)
- All tasks must be truly independent (no shared mutable state)
- Use a single message with N Agent tool calls for true parallelism
- Each subagent gets a self-contained prompt (no reference to sibling tasks)

## Workflow

1. **Parse tasks**
   - Split ARGUMENTS on `|` to get individual task descriptions
   - Extract optional `--subagent-type` flag (default: `general-purpose`)
   - Strip whitespace from each task description

2. **Validate**
   - Count tasks: if more than 5, ask user to prioritize or split
   - If 0 tasks, ask user via AskUserQuestion
   - Check that tasks are genuinely independent (no sequential dependencies)

3. **Create tracking**
   - Create one TaskCreate entry per task (status: pending)
   - Show the task list to the user before dispatching

4. **Dispatch in parallel**
   - Send a single message with N Agent tool calls
   - Each agent gets:
     - A clear, self-contained prompt describing the task
     - The subagent_type from the flag
     - instruction to keep output under 500 words
   - Do NOT use `run_in_background` — let all agents run concurrently in one message

5. **Merge results**
   - As each agent completes, update its TaskCreate entry
   - After all complete, synthesize into a single report with:
     - A summary section
     - Per-task sections with key findings
     - Cross-cutting insights (if any patterns emerge)

6. **Report**
   - Present the merged report
   - Suggest next steps based on findings

## Report

```
Parallel Subagents Complete

Tasks Dispatched: [N]
Subagent Type: [type]
Status: [ALL SUCCESS / N failures]

## Summary
[Cross-cutting synthesis]

## Task Results

### Task 1: [description]
- Status: SUCCESS
- Key Findings: [bulleted list]

### Task 2: [description]
- Status: SUCCESS
- Key Findings: [bulleted list]

Next: [suggested actions based on merged findings]
```
