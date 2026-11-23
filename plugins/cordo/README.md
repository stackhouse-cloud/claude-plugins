# Cordo Plugin for Claude

Connect Claude Code to [Cordo](https://www.cordo.cloud) to discover streams, query events, run ops digests, review anomaly findings, and manage views, monitors, and channels over MCP.

## What's included

- **MCP server (`.mcp.json`)**: Connects over Streamable HTTP to `https://api.cordo.cloud/mcp` with OAuth 2.1 browser sign-in (PKCE + Dynamic Client Registration).
- **Skill (`skills/cordo/SKILL.md`, `/cordo:cordo`)**: Guides Claude on session bootstrap (`cordo_context`), stream investigation, findings, views, and untrusted-content safety.

## Setup

```sh
claude plugin marketplace add stackhouse-cloud/claude-plugins
claude plugin install cordo@stackhouse
```

On first use (or via `/mcp` inside a Claude Code session), your browser opens Cordo to sign in and approve access.

> **Managing access:** Revoke connected apps anytime under Cordo **Settings → API tokens** (under **Connected MCP apps**).
