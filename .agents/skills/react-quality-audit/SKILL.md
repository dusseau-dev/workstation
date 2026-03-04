---
name: react-quality-audit
description: >
  Combined React/Next.js code quality audit using react-doctor CLI and Vercel React best practices rules.
  Use when reviewing, auditing, or improving React/Next.js code quality. Triggers on:
  (1) QA or code review of React components,
  (2) Performance auditing of React/Next.js code,
  (3) Pre-commit or pre-PR quality checks,
  (4) After writing or modifying React components,
  (5) When user asks to "audit", "scan", "lint", or "check" React code,
  (6) When user asks to run react-doctor or apply Vercel best practices.
---

# React Quality Audit

Two-phase audit: automated lint via react-doctor CLI + manual rule-based review against Vercel React best practices (57 rules, 8 categories).

## Workflow

### Phase 1: react-doctor (automated)

Run the CLI scanner:

```bash
npx react-doctor@latest --project <project-name> --diff
```

Key flags:
- `--project <name>` — select workspace project by name
- `--diff [base]` — scan only changed files vs base branch
- `--fail-on error` — exit non-zero on errors (for CI)
- `-y` — skip prompts, scan all workspace projects
- `--verbose` — show file details per rule

Collect diagnostics JSON path from CLI output for structured results.

### Phase 2: Vercel best practices (manual review)

For each file with changes, audit against rules in priority order. Read individual rule files from `../vercel-react-best-practices/rules/<rule-id>.md` only when a violation is found, to get correct/incorrect examples.

**Priority order:**

| Pri | Category | Impact | What to look for |
|-----|----------|--------|------------------|
| 1 | `async-*` | CRITICAL | Sequential awaits, missing Promise.all, no Suspense boundaries |
| 2 | `bundle-*` | CRITICAL | Static import of heavy libs (>50KB), barrel file imports, missing next/dynamic |
| 3 | `server-*` | HIGH | Unauthenticated server actions, missing React.cache(), duplicate RSC serialization |
| 4 | `client-*` | MEDIUM-HIGH | Missing SWR dedup, non-passive scroll listeners, unversioned localStorage |
| 5 | `rerender-*` | MEDIUM | Derived state in useEffect, object deps in effects, missing React.memo, missing functional setState |
| 6 | `rendering-*` | MEDIUM | `&&` conditionals rendering `0`/`false`, static JSX inside components, missing content-visibility |
| 7 | `js-*` | LOW-MEDIUM | array.find() in loops (use Map/Set), repeated iterations, missing early returns |
| 8 | `advanced-*` | LOW | Missing useLatest, repeated app initialization |

See `references/rule-checklist.md` for the condensed per-rule checklist.

### Phase 3: Report

Present a unified table of all findings:

```
| # | File | Source | Rule | Severity | Issue | Fix |
```

Source is `react-doctor` or the Vercel rule id (e.g. `bundle-dynamic-imports`).
Severity: CRITICAL > HIGH > MEDIUM > LOW.

### Phase 4: Fix (if requested)

Apply all fixes in one pass. After fixing:
1. Re-run `npx react-doctor@latest --project <name> --diff` — confirm zero issues
2. Run `npx tsc --noEmit` — confirm zero type errors
