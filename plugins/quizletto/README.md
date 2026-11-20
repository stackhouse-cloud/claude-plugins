# Quizletto Plugin for Claude

Connect Claude Code to [Quizletto](https://www.quizletto.cloud) to create, edit, test, and publish graded or profile quizzes, issue candidate links, inspect attempts, and analyze results.

## What's included

- **MCP server (`.mcp.json`)**: Connects over Streamable HTTP to `https://api.quizletto.cloud/v1/mcp` using OAuth 2.1 + PKCE — no API key copy-paste required.
- **Skill (`skills/quizletto/SKILL.md`, `/quizletto:quizletto`)**: Guides Claude on workspace selection (`quizletto_context`), draft vs published quiz versions (`quizletto_publish_quiz`), incremental step edits, graded vs profile scoring modes, test runs, and untrusted-content safety.

## Setup

```sh
claude plugin marketplace add stackhouse-cloud/claude-plugins
claude plugin install quizletto@stackhouse
```

Inside a Claude Code session, run `/mcp` (or trigger any Quizletto prompt) to open your browser, sign in to Quizletto, and approve access.

> **Managing access:** Active Claude connections appear in Quizletto under **Settings → API tokens → Connected MCP apps**, where you can revoke access at any time.
