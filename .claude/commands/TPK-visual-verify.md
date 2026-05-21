---
description: Capture a screenshot of a running page via Playwright MCP
allowed-tools: mcp__playwright__browser_navigate, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_resize, Bash
model: sonnet
argument-hint: [url] [--name label] [--viewport 1280x800]
---

# TPK-Visual-Verify

## Purpose

Capture a screenshot of a web page using the Playwright MCP browser tools. Saves the image for visual verification or comparison.

## Variables

ARGUMENTS: $ARGUMENTS

## Instructions

- Always ensure the screenshots directory exists before saving
- Use descriptive filenames with timestamps for traceability
- Report the exact file path after capture

## Workflow

1. **Parse arguments**
   - Extract URL (required — first non-flag argument)
   - Extract `--name` for label (default: `screenshot`)
   - Extract `--viewport` as `WIDTHxHEIGHT` (default: `1280x800`)

2. **Validate URL**
   - Must start with `http://` or `https://`
   - If no URL provided, ask via AskUserQuestion

3. **Prepare**
   - Run `mkdir -p specs/screenshots` to ensure directory exists
   - If custom viewport, resize the browser window first:
     `mcp__playwright__browser_resize` with parsed width/height

4. **Navigate**
   - Use `mcp__playwright__browser_navigate` to load the URL
   - Wait for the page to be fully loaded

5. **Capture**
   - Use `mcp__playwright__browser_take_screenshot` with:
     - `type`: `"png"`
     - `filename`: `specs/screenshots/[timestamp]-[label].png`
   - Timestamp format: `YYYYMMDD-HHmmss`

6. **Report**
   - Show the file path
   - Suggest using `/TPK-screenshot-compare` for visual diffs

## Report

```
Screenshot Captured

URL: [url]
Viewport: [WxH]
Path: specs/screenshots/[timestamp]-[label].png

Next: Compare with baseline using /TPK-screenshot-compare [baseline] [current]
```
