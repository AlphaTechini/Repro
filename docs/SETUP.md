# Repro: Setup

## 1. `.env` (once)

```bash
cp .env.example .env
```

Fill in only:

- `OPENAI_API_KEY` (key from platform.openai.com/api-keys; the account needs a positive balance). `AGENT_ENGINE` and `AGENT_MODEL` are already set to OpenAI `gpt-5.4-mini`.
- The three `GITHUB_APP_*` values, after step 2.

Which repo issues go to is chosen inside the app, not in `.env`.

## 2. Create the Repro GitHub App (once, about 10 minutes, free)

The app files issues as its own bot (`<app-name>[bot]`), only in repos where it is installed, with permission to touch issues and nothing else.

1. Go to https://github.com/settings/apps/new
2. **GitHub App name:** must be unique across GitHub (e.g. "Repro Bug Reports"). Its slug is the name in lowercase with dashes; it appears in the app's public URL `github.com/apps/<slug>`.
3. **Homepage URL:** this repo's URL.
4. **Setup URL:** `http://localhost:<port>/github/setup` (the port `pnpm dev` prints). Tick **Redirect on update**. Add the deployed URL later.
5. **Webhook:** untick **Active**.
6. **Repository permissions:** **Issues → Read and write**. Leave everything else as No access (Metadata read-only is added automatically).
7. **Where can this GitHub App be installed:** Only on this account (switch to Any account later if others will use it).
8. **Create GitHub App.** On the next page copy the **App ID** into `GITHUB_APP_ID` and the slug into `GITHUB_APP_SLUG`.
9. Scroll to **Private keys → Generate a private key**. A `.pem` downloads. Put its contents in `GITHUB_APP_PRIVATE_KEY` on one line, replacing line breaks with `\n`.

Then in Repro: Settings → **Connect GitHub** → choose the repos → back in Repro, pick the repo.

## 3. Capability checks

```bash
node --env-file=.env checks/01-llm-tool-call.mjs
node checks/02-clips-agent-context.mjs <clips-share-link>
```

For check 02: install the Agent-Native Clips Chrome extension, sign in at clips.agent-native.com, record ~15 seconds of a real bug on a page that shows a console error or failed request, and pass the share link (new clips are public by default). Paste outputs into `evidence/capability-checks.md`.

OpenAI free tokens: OpenAI's data-sharing offer lists tool use as excluded. After check 01, open https://platform.openai.com/usage/chat-completions, group by service tier, and compare with Costs to see whether the runs were free.

## 4. Run

```bash
pnpm install
pnpm dev
```
