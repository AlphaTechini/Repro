# Repro

**Turn "it's broken" into a fix-ready GitHub issue in one sitting.**

Record a bug with [Clips](https://clips.agent-native.com). Repro's agent watches the recording, reads the console errors and failed requests it captured, fills in the bug report with evidence, asks you only what's missing (at most three questions), and files the GitHub issue.

Built with [Agent-Native](https://agent-native.com) for the Builder.io Agent-Native Hackathon.

> Status: in development. This README is a placeholder; the full product README is written once the build is complete.

- Product spec: [docs/PRD.md](docs/PRD.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Build plan: [docs/BUILD-PLAN.md](docs/BUILD-PLAN.md)
- Claims and proof: [docs/CLAIMS.md](docs/CLAIMS.md)

## Capability checks

Before building, three small scripts confirm the services Repro depends on work as documented:

```bash
cp .env.example .env   # fill in the keys you need
node --env-file=.env checks/01-llm-tool-call.mjs        # the model calls tools, and what it costs
node --env-file=.env checks/02-clips-agent-context.mjs  # a Clip's transcript, frames and browser diagnostics are readable
node --env-file=.env checks/03-github-issue.mjs         # the token can open and close an issue
```

Results go in [evidence/capability-checks.md](evidence/capability-checks.md).

## Develop

Requires Node 22.22+ and pnpm (`corepack enable`).

```bash
pnpm install
pnpm dev
```
