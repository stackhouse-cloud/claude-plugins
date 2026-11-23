# StackHouse Claude Plugins

Official [Claude Code](https://code.claude.com) plugin marketplace for [StackHouse](https://stackhouse.cloud) products.

## Available plugins

| Plugin | Install ID | Path | Description |
| --- | --- | --- | --- |
| [**Quizletto**](./plugins/quizletto) | `quizletto@stackhouse` | `plugins/quizletto` | Build graded and profile quizzes, manage workspaces and candidate links, run test attempts, and analyze results via Quizletto MCP (`https://api.quizletto.cloud/v1/mcp`). |
| [**Tixanto**](./plugins/tixanto) | `tixanto@stackhouse` | `plugins/tixanto` | Find, create, update, and comment on issues; manage cycles and epics via Tixanto MCP (`https://api.tixanto.cloud/v1/mcp/http`). |
| [**Cordo**](./plugins/cordo) | `cordo@stackhouse` | `plugins/cordo` | Explore streams, query events, and investigate ops findings via Cordo MCP (`https://api.cordo.cloud/mcp`). |

## Install in Claude Code

### From terminal

```sh
claude plugin marketplace add stackhouse-cloud/claude-plugins
claude plugin install quizletto@stackhouse
claude plugin install tixanto@stackhouse
claude plugin install cordo@stackhouse
```

### Inside an interactive Claude Code session

```text
/plugin marketplace add stackhouse-cloud/claude-plugins
/plugin install quizletto@stackhouse
/plugin install tixanto@stackhouse
/plugin install cordo@stackhouse
```

On first use: Quizletto and Tixanto open your browser for OAuth 2.1; Cordo prompts for a personal token (also configurable via `/mcp`).

### Local development & testing

Load a plugin directly during development:

```sh
claude --plugin-dir ./plugins/quizletto
claude --plugin-dir ./plugins/tixanto
claude --plugin-dir ./plugins/cordo
```

Or validate both the marketplace and plugin manifests strictly:

```sh
node --test scripts/validate.test.mjs
node scripts/validate.mjs
claude plugin validate --strict .
claude plugin validate --profile directory --strict ./plugins/quizletto
claude plugin validate --profile directory --strict ./plugins/tixanto
claude plugin validate --profile directory --strict ./plugins/cordo
```

## Repository layout & adding more StackHouse plugins

Plugins live under `plugins/<name>/` and are indexed in [`.claude-plugin/marketplace.json`](./.claude-plugin/marketplace.json):

```text
claude-plugins/
├── .claude-plugin/
│   └── marketplace.json
├── plugins/
│   ├── quizletto/
│   ├── tixanto/
│   └── cordo/
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── assets/
│       │   └── logo.svg
│       ├── skills/
│       │   └── cordo/
│       │       └── SKILL.md
│       ├── .mcp.json
│       └── README.md
└── scripts/
    ├── validate.mjs
    └── validate.test.mjs
```

Additional StackHouse plugins (such as `plugins/dokko`) can be added alongside the existing plugins and registered in `.claude-plugin/marketplace.json`.

## License

[MIT](./LICENSE)
