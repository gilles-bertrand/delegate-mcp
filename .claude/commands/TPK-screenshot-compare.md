---
description: Compare two screenshots and surface visual diffs
allowed-tools: Read, Bash
model: sonnet
argument-hint: [baseline.png] [current.png]
---

# TPK-Screenshot-Compare

## Purpose

Compare two screenshots using Claude's multimodal vision capabilities. Surfaces visual differences in layout, colors, text, and structure — without pixel-level diffing.

## Variables

ARGUMENTS: $ARGUMENTS

## Instructions

- Both files must exist and be valid PNG/JPEG images
- This is a qualitative comparison (visual perception), not pixel-exact diffing
- Focus on meaningful differences, not anti-aliasing or minor rendering variations

## Workflow

1. **Parse arguments**
   - Extract baseline image path (first argument)
   - Extract current image path (second argument)
   - If paths missing, ask via AskUserQuestion

2. **Validate files**
   - Check both files exist using Bash `ls`
   - Check they are image files (PNG, JPEG, JPG extension)
   - If either missing, report and exit

3. **Read and compare**
   - Use Read tool on both image files (Read supports images)
   - Analyze both images side by side
   - Identify and describe:
     - Layout shifts or structural changes
     - Color changes
     - Missing or added text
     - Missing or added UI elements
     - Spacing/padding differences
     - Font changes

4. **Assess impact**
   - Classify overall verdict:
     - **OK** — no meaningful differences
     - **Minor diff** — cosmetic changes, no functional impact
     - **Regression** — missing content, broken layout, or unintended change
   - List specific differences found

5. **Report**
   - Present findings with verdict
   - If regression, suggest corrective actions

## Report

```
Screenshot Comparison

Baseline: [path]
Current: [path]
Verdict: OK | MINOR DIFF | REGRESSION

Differences Found:
- [difference 1]
- [difference 2]

Recommendation: [action if regression, or "No action needed"]
```
