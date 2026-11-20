# StackHouse Claude Plugins

Official [Claude Code](https://code.claude.com) plugin marketplace for [StackHouse](https://stackhouse.cloud) products.

## Available plugins

| Plugin | Install ID | Path | Description |
| --- | --- | --- | --- |
| [**Quizletto**](./plugins/quizletto) | `quizletto@stackhouse` | `plugins/quizletto` | Build graded and profile quizzes, manage workspaces and candidate links, run test attempts, and analyze results via Quizletto MCP (`https://api.quizletto.cloud/v1/mcp`). |

## Install in Claude Code

### From terminal

```sh
claude plugin marketplace add stackhouse-cloud/claude-plugins
claude plugin install quizletto@stackhouse
```

### Inside an interactive Claude Code session

```text
/plugin marketplace add stackhouse-cloud/claude-plugins
/plugin install quizletto@stackhouse
```

On first use (or via `/mcp`), Claude opens your browser to sign in to Quizletto and approve OAuth 2.1 access.

### Local development & testing

Load the plugin directly during development:

```sh
claude --plugin-dir ./plugins/quizletto
```

Or validate both the marketplace and plugin manifests strictly:

```sh
node --test scripts/validate.test.mjs
node scripts/validate.mjs
claude plugin validate --strict .
claude plugin validate --profile directory --strict ./plugins/quizletto
```

## Repository layout & adding more StackHouse plugins

Plugins live under `plugins/<name>/` and are indexed in [`.claude-plugin/marketplace.json`](./.claude-plugin/marketplace.json):

```text
claude-plugins/
├── .claude-plugin/
│   └── marketplace.json
├── plugins/
│   └── quizletto/
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── assets/
│       │   └── logo.svg
│       ├── skills/
│       │   └── quizletto/
│       │       └── SKILL.md
│       ├── .mcp.json
│       └── README.md
└── scripts/
    ├── validate.mjs
    └── validate.test.mjs
```

Additional StackHouse plugins (such as `plugins/tixanto`, `plugins/dokko`, and `plugins/cordo`) can be added alongside `plugins/quizletto` and registered in `.claude-plugin/marketplace.json`.

## License

[MIT](./LICENSE)
