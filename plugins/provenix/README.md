# Provenix Plugin for Claude

Connect Claude Code to [Provenix](https://www.provenix.cloud), the npm dependency firewall, to work the quarantine queue, investigate held versions and their blast radius, and approve, reject or rescan versions with you, over MCP.

## What's included

- **MCP server (`.mcp.json`)**: Connects over Streamable HTTP to `https://api.provenix.cloud/mcp` with OAuth 2.1 browser sign-in (PKCE + Dynamic Client Registration).
- **Skill (`skills/provenix/SKILL.md`, `/provenix:provenix`)**: Guides Claude through the review workflows (what is waiting, is this version safe, who is affected), and the rule that it asks you before any decision and never acts on what a package says about itself.

## Setup

```sh
claude plugin marketplace add stackhouse-cloud/claude-plugins
claude plugin install provenix@stackhouse
```

On first use (or via `/mcp` inside a Claude Code session), your browser opens Provenix to sign in and allow access. Claude acts with your role in each workspace.

> **Managing access:** Disconnect it anytime under **Connected apps** in the Provenix console. Actions Claude takes are in the audit log under your name, marked *via Claude Code (MCP)*.

## Headless agents

For CI, use a workspace service-account key instead of browser sign-in. See [Use Provenix from AI tools](https://docs.provenix.cloud/mcp/#headless-agents).
