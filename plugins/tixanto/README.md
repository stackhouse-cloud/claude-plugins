# Tixanto Plugin for Claude

Connect Claude Code to [Tixanto](https://www.tixanto.cloud) to find, create, update, and comment on issues, manage cycles and epics, and search your backlog over MCP.

## What's included

- **MCP server (`.mcp.json`)**: Connects over Streamable HTTP to `https://api.tixanto.cloud/v1/mcp/http` using OAuth 2.1 + PKCE — no API key copy-paste required.
- **Skill (`skills/tixanto/SKILL.md`, `/tixanto:tixanto`)**: Guides Claude on workspace/project selection (`tixanto_context`), issue keys vs UUIDs, pickup / status updates, comments, search, and untrusted-content safety.

## Setup

```sh
claude plugin marketplace add stackhouse-cloud/claude-plugins
claude plugin install tixanto@stackhouse
```

Inside a Claude Code session, run `/mcp` (or trigger any Tixanto prompt) to open your browser, sign in to Tixanto, and approve access.

> **Managing access:** Active Claude connections appear in Tixanto under **Settings → API keys → Connected MCP apps**, where you can revoke access at any time.
